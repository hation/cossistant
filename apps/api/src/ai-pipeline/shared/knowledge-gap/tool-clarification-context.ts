import { buildConversationTranscript } from "@api/ai-pipeline/primary-pipeline/steps/intake/history";
import type { KnowledgeClarificationSearchEvidence } from "@api/lib/knowledge-clarification-context";
import { buildConversationClarificationContextSnapshot } from "@api/lib/knowledge-clarification-context";
import type { PipelineToolContext } from "../tools/contracts";

export async function buildToolDrivenClarificationContext(params: {
	ctx: Pick<
		PipelineToolContext,
		| "db"
		| "conversationId"
		| "organizationId"
		| "websiteId"
		| "triggerMessageId"
		| "triggerMessageCreatedAt"
	>;
	searchEvidence: KnowledgeClarificationSearchEvidence[];
}) {
	const conversationHistory = await buildConversationTranscript(params.ctx.db, {
		conversationId: params.ctx.conversationId,
		organizationId: params.ctx.organizationId,
		websiteId: params.ctx.websiteId,
		maxCreatedAt: params.ctx.triggerMessageCreatedAt ?? null,
	});
	const triggerMessage =
		conversationHistory.find(
			(entry) =>
				"messageId" in entry && entry.messageId === params.ctx.triggerMessageId
		) ?? null;
	const resolvedTriggerMessage =
		triggerMessage && "senderType" in triggerMessage ? triggerMessage : null;

	return {
		conversationHistory,
		triggerMessage: resolvedTriggerMessage,
		contextSnapshot: buildConversationClarificationContextSnapshot({
			conversationHistory,
			triggerMessage: resolvedTriggerMessage,
			searchEvidence: params.searchEvidence,
		}),
	};
}
