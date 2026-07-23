import { db } from "@api/db";
import {
	getNotificationData,
	getVisitorEmailForNotification,
	isVisitorEmailNotificationEnabled,
} from "@api/utils/notification-helpers";
import { getWorkflowUrl } from "@api/utils/workflow";
import {
	clearWorkflowState,
	getWorkflowState,
	isActiveWorkflow,
	type WorkflowDirection,
} from "@api/utils/workflow-dedup-manager";
import { MESSAGE_NOTIFICATION_DELAY_MINUTES } from "@api/workflows/constants";
import { serve } from "@upstash/workflow/hono";
import { Hono } from "hono";
import type { MemberSentMessageData, VisitorSentMessageData } from "../types";
import { sendMemberEmailNotification } from "./member-email-notifier";
import {
	sendVisitorEmailNotification,
	type VisitorRecipient,
} from "./visitor-email-notifier";

type BaseMessagePayload = {
	conversationId: string;
	websiteId: string;
	organizationId: string;
};

type SetupResult<P extends BaseMessagePayload> =
	| { status: "missing" | "inactive" | "no-state" }
	| {
			status: "ok";
			payload: P;
			workflowState: NonNullable<Awaited<ReturnType<typeof getWorkflowState>>>;
			workflowRunId?: string;
	  };

async function runWorkflowSetup<P extends BaseMessagePayload>(
	context: Parameters<Parameters<typeof serve<P>>[0]>[0],
	direction: WorkflowDirection
): Promise<SetupResult<P>> {
	return context.run("setup", async () => {
		const payload = context.requestPayload as P | null;
		const workflowRunId: string | undefined =
			context.headers.get("upstash-workflow-runid") ?? undefined;

		if (!payload) {
			console.error("[workflow] Missing payload in message workflow");
			return { status: "missing" as const };
		}

		if (workflowRunId) {
			const active = await isActiveWorkflow(
				payload.conversationId,
				direction,
				workflowRunId
			);

			if (!active) {
				console.log(
					`[workflow] Workflow ${workflowRunId} is no longer active for ${payload.conversationId}, exiting`
				);
				return { status: "inactive" as const };
			}
		}

		const workflowState = await getWorkflowState(
			payload.conversationId,
			direction
		);

		if (!workflowState) {
			console.error(
				`[workflow] No workflow state found for ${payload.conversationId}, this should not happen`
			);
			return { status: "no-state" as const };
		}

		return { status: "ok", payload, workflowState, workflowRunId };
	});
}

async function prepareNotificationData({
	conversationId,
	websiteId,
	organizationId,
	excludeUserId,
	includeVisitorRecipient,
}: {
	conversationId: string;
	websiteId: string;
	organizationId: string;
	excludeUserId?: string;
	includeVisitorRecipient: boolean;
}) {
	const { conversation, websiteInfo, participants } = await getNotificationData(
		db,
		{
			conversationId,
			websiteId,
			organizationId,
			excludeUserId,
		}
	);

	if (!(conversation && websiteInfo)) {
		return null;
	}

	const memberRecipients = participants.map((participant) => ({
		kind: "member" as const,
		userId: participant.userId,
		memberId: participant.memberId,
		email: participant.userEmail,
	}));

	let visitorRecipient: VisitorRecipient | null = null;

	if (includeVisitorRecipient && conversation.visitorId) {
		const visitorInfo = await getVisitorEmailForNotification(db, {
			visitorId: conversation.visitorId,
			websiteId,
		});

		if (visitorInfo?.contactEmail) {
			const visitorNotificationsEnabled =
				await isVisitorEmailNotificationEnabled(db, {
					visitorId: conversation.visitorId,
					websiteId,
				});

			if (visitorNotificationsEnabled) {
				visitorRecipient = {
					kind: "visitor",
					visitorId: conversation.visitorId,
					email: visitorInfo.contactEmail,
				};
			}
		}
	}

	return {
		conversationId,
		websiteId,
		organizationId,
		conversation,
		websiteInfo,
		memberRecipients,
		visitorRecipient,
	};
}

const messageWorkflow = new Hono();

messageWorkflow.post(
	"/member-sent-message",
	serve<MemberSentMessageData>(
		async (context) => {
			const direction: WorkflowDirection = "member-to-visitor";

			const setup = await runWorkflowSetup<MemberSentMessageData>(
				context,
				direction
			);

			if (setup.status !== "ok") {
				return;
			}

			const {
				payload: { conversationId, websiteId, organizationId, senderId },
				workflowState,
			} = setup;

			// Step 1: Prepare data (conversation, website, participants, seen state, recipients)
			const prepared = await prepareNotificationData({
				conversationId,
				websiteId,
				organizationId,
				excludeUserId: senderId,
				includeVisitorRecipient: true,
			});

			if (!prepared) {
				return;
			}

			// Step 2: Apply a single global delay for all recipients
			const globalDelaySeconds = MESSAGE_NOTIFICATION_DELAY_MINUTES * 60;

			if (globalDelaySeconds > 0) {
				await context.sleep("global-delay", globalDelaySeconds);
			}

			// Step 3: Send notifications and clean up within a single workflow run
			await context.run("process-notifications", async () => {
				// Send emails to member recipients using the shared helper
				for (const recipient of prepared.memberRecipients) {
					await sendMemberEmailNotification({
						db,
						recipient,
						conversationId: prepared.conversationId,
						organizationId: prepared.organizationId,
						websiteInfo: prepared.websiteInfo,
						workflowState,
					});
				}

				if (prepared.visitorRecipient) {
					await sendVisitorEmailNotification({
						db,
						recipient: prepared.visitorRecipient,
						conversationId: prepared.conversationId,
						organizationId: prepared.organizationId,
						websiteInfo: prepared.websiteInfo,
						workflowState,
					});
				}

				await clearWorkflowState(conversationId, direction);
			});
		},
		{
			url: getWorkflowUrl("MEMBER_SENT_MESSAGE"),
		}
	)
);

messageWorkflow.post(
	"/visitor-sent-message",
	serve<VisitorSentMessageData>(
		async (context) => {
			const direction: WorkflowDirection = "visitor-to-member";

			const setup = await runWorkflowSetup<VisitorSentMessageData>(
				context,
				direction
			);

			if (setup.status !== "ok") {
				return;
			}

			const {
				payload: { conversationId, websiteId, organizationId },
				workflowState,
			} = setup;

			// Step 1: Prepare data (conversation, website, participants, seen state, recipients)
			const prepared = await prepareNotificationData({
				conversationId,
				websiteId,
				organizationId,
				includeVisitorRecipient: false,
			});

			if (!prepared) {
				return;
			}

			// Step 2: Apply a single global delay for email notifications
			// Note: Push notifications are sent immediately in triggerVisitorSentMessageWorkflow,
			// this workflow only handles delayed email notifications
			const globalDelaySeconds = MESSAGE_NOTIFICATION_DELAY_MINUTES * 60;

			if (globalDelaySeconds > 0) {
				await context.sleep("global-delay", globalDelaySeconds);
			}

			// Step 3: Send email notifications and clean up within a single workflow run
			await context.run("process-notifications", async () => {
				// Send emails to member recipients using the shared helper
				for (const recipient of prepared.memberRecipients) {
					await sendMemberEmailNotification({
						db,
						recipient,
						conversationId: prepared.conversationId,
						organizationId: prepared.organizationId,
						websiteInfo: prepared.websiteInfo,
						workflowState,
					});
				}

				await clearWorkflowState(conversationId, direction);
			});
		},
		{
			url: getWorkflowUrl("VISITOR_SENT_MESSAGE"),
		}
	)
);

export default messageWorkflow;
