import { getBehaviorSettings } from "@api/ai-pipeline/shared/settings";
import type { Database } from "@api/db";
import { getAiAgentById } from "@api/db/queries/ai-agent";
import { listActiveWebsiteViews } from "@api/db/queries/view";
import type { AiAgentToolId } from "@cossistant/types";
import { logAiPipeline } from "../logger";
import {
	loadConversationSeed,
	loadIntakeContext,
} from "../primary-pipeline/steps/intake/load-context";
import { resolveAndPersistModel } from "../primary-pipeline/steps/intake/model-resolution";
import {
	emitPipelineProcessingCompletedSafely,
	type PipelineRealtimeConversationTarget,
} from "../shared/events";
import {
	type GenerationRuntimeResult,
	runGenerationRuntime,
} from "../shared/generation";
import { BACKGROUND_ONE_SHOT_TOOL_NAMES } from "../shared/tools/background-one-shot";
import { runBackgroundKnowledgeGapReview } from "./knowledge-gap-review";
import { runBackgroundTitleReview } from "./title-review";

export type BackgroundPipelineInput = {
	conversationId: string;
	websiteId: string;
	organizationId: string;
	aiAgentId: string;
	sourceMessageId: string;
	sourceMessageCreatedAt: string;
	workflowRunId: string;
	jobId: string;
};

export type BackgroundPipelineResult = {
	status: "completed" | "skipped" | "error";
	reason?: string;
	error?: string;
	metrics: {
		intakeMs: number;
		analysisMs: number;
		executionMs: number;
		totalMs: number;
	};
};

type BackgroundPipelineContext = {
	db: Database;
	input: BackgroundPipelineInput;
};

type BackgroundIntakeReadyData = {
	status: "ready";
	aiAgent: NonNullable<Awaited<ReturnType<typeof getAiAgentById>>>;
	toolAllowlist: AiAgentToolId[];
	conversation: NonNullable<
		Awaited<ReturnType<typeof loadConversationSeed>>["conversation"]
	>;
	websiteDefaultLanguage: Awaited<
		ReturnType<typeof loadIntakeContext>
	>["websiteDefaultLanguage"];
	visitorLanguage: Awaited<
		ReturnType<typeof loadIntakeContext>
	>["visitorLanguage"];
	autoTranslateEnabled: Awaited<
		ReturnType<typeof loadIntakeContext>
	>["autoTranslateEnabled"];
	generationEntries: Awaited<
		ReturnType<typeof loadIntakeContext>
	>["generationEntries"];
	conversationHistory: Awaited<
		ReturnType<typeof loadIntakeContext>
	>["conversationHistory"];
	visitorContext: Awaited<
		ReturnType<typeof loadIntakeContext>
	>["visitorContext"];
	conversationState: Awaited<
		ReturnType<typeof loadIntakeContext>
	>["conversationState"];
	triggerMessage: Awaited<
		ReturnType<typeof loadIntakeContext>
	>["triggerMessage"];
	hasLaterHumanMessage: Awaited<
		ReturnType<typeof loadIntakeContext>
	>["hasLaterHumanMessage"];
	hasLaterAiMessage: Awaited<
		ReturnType<typeof loadIntakeContext>
	>["hasLaterAiMessage"];
	availableViews: Awaited<ReturnType<typeof listActiveWebsiteViews>>;
	titleReviewEnabled: boolean;
};

type BackgroundIntakeResult =
	| BackgroundIntakeReadyData
	| {
			status: "skipped";
			reason: string;
	  };

type BackgroundPipelineCompletionEmitter = (params: {
	conversation?: PipelineRealtimeConversationTarget;
	aiAgentId?: string;
	status: "success" | "skipped" | "error";
	action?: string | null;
	reason?: string | null;
}) => Promise<void>;

type BackgroundPipelinePhaseMetrics = {
	intakeMs: number;
	analysisMs: number;
	executionMs: number;
};

const BACKGROUND_ANALYSIS_TOOL_IDS = BACKGROUND_ONE_SHOT_TOOL_NAMES.filter(
	(toolId) => toolId !== "requestKnowledgeClarification"
) as readonly AiAgentToolId[];

function getBackgroundToolAllowlist(
	aiAgent: Awaited<ReturnType<typeof getAiAgentById>>
): AiAgentToolId[] {
	if (!aiAgent) {
		return ["skip"];
	}

	const settings = getBehaviorSettings(aiAgent);
	const allowlist = BACKGROUND_ANALYSIS_TOOL_IDS.filter((toolId) => {
		switch (toolId) {
			case "updateConversationTitle":
				return false;
			case "updateSentiment":
				return settings.autoAnalyzeSentiment;
			case "setPriority":
				return settings.canSetPriority;
			case "categorizeConversation":
				return settings.autoCategorize && settings.canCategorize;
			default:
				return false;
		}
	});

	return [...allowlist, "skip"];
}

function hasBackgroundAnalysisWork(
	toolAllowlist: readonly AiAgentToolId[]
): boolean {
	return toolAllowlist.some((toolId) => toolId !== "skip");
}

function hasTitleReviewEnabled(
	aiAgent: Awaited<ReturnType<typeof getAiAgentById>>
): boolean {
	return aiAgent ? getBehaviorSettings(aiAgent).autoGenerateTitle : false;
}

function hasBackgroundMutation(result: GenerationRuntimeResult): boolean {
	const mutationCounts =
		result.mutationToolCallsByName ?? result.toolCallsByName;

	return BACKGROUND_ANALYSIS_TOOL_IDS.some(
		(toolId) => (mutationCounts[toolId] ?? 0) > 0
	);
}

async function runBackgroundIntake(
	ctx: BackgroundPipelineContext
): Promise<BackgroundIntakeResult> {
	const aiAgent = await getAiAgentById(ctx.db, {
		aiAgentId: ctx.input.aiAgentId,
	});
	if (!aiAgent?.isActive) {
		return {
			status: "skipped",
			reason: "Background analysis requires an active AI agent",
		};
	}

	const toolAllowlist = getBackgroundToolAllowlist(aiAgent);
	const titleReviewEnabled = hasTitleReviewEnabled(aiAgent);
	if (!(titleReviewEnabled || hasBackgroundAnalysisWork(toolAllowlist))) {
		return {
			status: "skipped",
			reason: "No background analysis capabilities enabled",
		};
	}

	const { aiAgent: resolvedAiAgent } = await resolveAndPersistModel({
		db: ctx.db,
		aiAgent,
		conversationId: ctx.input.conversationId,
	});

	const { conversation, triggerMetadata } = await loadConversationSeed(ctx.db, {
		conversationId: ctx.input.conversationId,
		messageId: ctx.input.sourceMessageId,
		organizationId: ctx.input.organizationId,
	});

	if (!conversation) {
		return {
			status: "skipped",
			reason: `Conversation ${ctx.input.conversationId} not found`,
		};
	}

	if (!triggerMetadata) {
		return {
			status: "skipped",
			reason: `Source message ${ctx.input.sourceMessageId} not found`,
		};
	}

	if (triggerMetadata.conversationId !== ctx.input.conversationId) {
		return {
			status: "skipped",
			reason: `Source message ${ctx.input.sourceMessageId} does not belong to conversation ${ctx.input.conversationId}`,
		};
	}

	const intakeContext = await loadIntakeContext(ctx.db, {
		conversationId: ctx.input.conversationId,
		organizationId: ctx.input.organizationId,
		websiteId: ctx.input.websiteId,
		visitorId: conversation.visitorId,
		conversation,
		triggerMetadata,
	});

	const availableViews = toolAllowlist.includes("categorizeConversation")
		? await listActiveWebsiteViews(ctx.db, {
				websiteId: ctx.input.websiteId,
			})
		: [];

	return {
		status: "ready",
		aiAgent: resolvedAiAgent,
		toolAllowlist,
		conversation,
		websiteDefaultLanguage: intakeContext.websiteDefaultLanguage,
		visitorLanguage: intakeContext.visitorLanguage,
		autoTranslateEnabled: intakeContext.autoTranslateEnabled,
		generationEntries: intakeContext.generationEntries,
		conversationHistory: intakeContext.conversationHistory,
		visitorContext: intakeContext.visitorContext,
		conversationState: intakeContext.conversationState,
		triggerMessage: intakeContext.triggerMessage,
		hasLaterHumanMessage: intakeContext.hasLaterHumanMessage,
		hasLaterAiMessage: intakeContext.hasLaterAiMessage,
		availableViews,
		titleReviewEnabled,
	};
}

async function runBackgroundAnalysis(params: {
	ctx: BackgroundPipelineContext;
	intake: BackgroundIntakeReadyData;
}): Promise<GenerationRuntimeResult> {
	return runGenerationRuntime({
		db: params.ctx.db,
		pipelineKind: "background",
		mode: "background_only",
		aiAgent: params.intake.aiAgent,
		conversation: params.intake.conversation,
		websiteDefaultLanguage: params.intake.websiteDefaultLanguage,
		visitorLanguage: params.intake.visitorLanguage,
		autoTranslateEnabled: params.intake.autoTranslateEnabled,
		generationEntries: params.intake.generationEntries,
		visitorContext: params.intake.visitorContext,
		conversationState: params.intake.conversationState,
		humanCommand: null,
		workflowRunId: params.ctx.input.workflowRunId,
		triggerMessageId: params.ctx.input.sourceMessageId,
		triggerMessageText: params.intake.triggerMessage?.content ?? null,
		triggerMessageCreatedAt: params.ctx.input.sourceMessageCreatedAt,
		triggerSenderType: params.intake.triggerMessage?.senderType,
		triggerVisibility: params.intake.triggerMessage?.visibility,
		hasLaterHumanMessage: params.intake.hasLaterHumanMessage,
		hasLaterAiMessage: params.intake.hasLaterAiMessage,
		allowPublicMessages: false,
		availableViews: params.intake.availableViews.map((view) => ({
			id: view.id,
			name: view.name,
			description: view.description,
			prompt: view.prompt,
		})),
		toolAllowlist: params.intake.toolAllowlist,
	});
}

function buildBackgroundPipelineResult(params: {
	status: BackgroundPipelineResult["status"];
	startTime: number;
	metrics: BackgroundPipelinePhaseMetrics;
	reason?: string;
	error?: string;
}): BackgroundPipelineResult {
	return {
		status: params.status,
		...(params.reason ? { reason: params.reason } : {}),
		...(params.error ? { error: params.error } : {}),
		metrics: {
			intakeMs: params.metrics.intakeMs,
			analysisMs: params.metrics.analysisMs,
			executionMs: params.metrics.executionMs,
			totalMs: Date.now() - params.startTime,
		},
	};
}

/**
 * Background pipeline shell.
 * Scheduling and queue orchestration are implemented first; triage actions will be added later.
 */
export async function runBackgroundPipeline(
	ctx: BackgroundPipelineContext
): Promise<BackgroundPipelineResult> {
	const startTime = Date.now();
	const { conversationId, workflowRunId, jobId } = ctx.input;
	let intakeMs = 0;
	let analysisMs = 0;
	let executionMs = 0;
	const completionConversation: PipelineRealtimeConversationTarget = {
		id: ctx.input.conversationId,
		websiteId: ctx.input.websiteId,
		organizationId: ctx.input.organizationId,
		visitorId: null,
	};

	const emitProcessingCompletedSafe = async (params: {
		conversation?: PipelineRealtimeConversationTarget;
		aiAgentId?: string;
		status: "success" | "skipped" | "error";
		action?: string | null;
		reason?: string | null;
	}) => {
		await emitPipelineProcessingCompletedSafely({
			conversation: params.conversation ?? completionConversation,
			aiAgentId: params.aiAgentId ?? ctx.input.aiAgentId,
			workflowRunId: ctx.input.workflowRunId,
			status: params.status,
			action: params.action,
			reason: params.reason,
			audience: "dashboard",
			pipelineArea: "background",
			logConversationId: conversationId,
		});
	};

	try {
		logAiPipeline({
			area: "background",
			event: "start",
			conversationId,
			fields: {
				workflowRunId,
				jobId,
				sourceMessageId: ctx.input.sourceMessageId,
			},
		});

		const intakeStartedAt = Date.now();
		const intakeResult = await runBackgroundIntake(ctx);
		intakeMs = Date.now() - intakeStartedAt;

		if (intakeResult.status !== "ready") {
			logAiPipeline({
				area: "background",
				event: "skip",
				conversationId,
				fields: {
					reason: intakeResult.reason,
				},
			});

			await emitProcessingCompletedSafe({
				status: "skipped",
				reason: intakeResult.reason,
			});
			return buildBackgroundPipelineResult({
				status: "skipped",
				reason: intakeResult.reason,
				startTime,
				metrics: {
					intakeMs,
					analysisMs,
					executionMs,
				},
			});
		}

		const analysisStartedAt = Date.now();
		const titleReviewResult = intakeResult.titleReviewEnabled
			? await runBackgroundTitleReview({
					db: ctx.db,
					aiAgent: intakeResult.aiAgent,
					conversation: intakeResult.conversation,
					organizationId: ctx.input.organizationId,
					websiteId: ctx.input.websiteId,
					aiAgentId: ctx.input.aiAgentId,
					websiteDefaultLanguage: intakeResult.websiteDefaultLanguage,
					visitorLanguage: intakeResult.visitorLanguage,
					autoTranslateEnabled: intakeResult.autoTranslateEnabled !== false,
					conversationHistory: intakeResult.conversationHistory,
					triggerMessage: intakeResult.triggerMessage,
				})
			: ({
					status: "skipped",
					reason: "disabled",
				} as const);

		const generationResult = await runBackgroundAnalysis({
			ctx,
			intake: intakeResult,
		});
		analysisMs = Date.now() - analysisStartedAt;

		if (generationResult.status === "error") {
			const errorMessage =
				generationResult.error ?? "Background analysis failed";
			logAiPipeline({
				area: "background",
				event: "error",
				level: "error",
				conversationId,
				fields: {
					message: errorMessage,
					failureCode: generationResult.failureCode,
				},
			});

			await emitProcessingCompletedSafe({
				conversation: intakeResult.conversation,
				aiAgentId: intakeResult.aiAgent.id,
				status: "error",
				reason: errorMessage,
			});
			return buildBackgroundPipelineResult({
				status: "error",
				error: errorMessage,
				startTime,
				metrics: {
					intakeMs,
					analysisMs,
					executionMs,
				},
			});
		}

		const executionStartedAt = Date.now();
		const knowledgeGapReviewResult = await runBackgroundKnowledgeGapReview({
			db: ctx.db,
			input: ctx.input,
			intake: {
				aiAgent: intakeResult.aiAgent,
				conversation: intakeResult.conversation,
				conversationHistory: intakeResult.conversationHistory,
				triggerMessage: intakeResult.triggerMessage,
			},
		});

		if (knowledgeGapReviewResult.status === "created") {
			logAiPipeline({
				area: "background",
				event: "knowledge_gap_clarification_created",
				conversationId,
				fields: {
					requestId: knowledgeGapReviewResult.requestId,
					created: knowledgeGapReviewResult.created,
					topicSummary: knowledgeGapReviewResult.topicSummary,
					reason: knowledgeGapReviewResult.reason,
				},
			});

			await emitProcessingCompletedSafe({
				conversation: intakeResult.conversation,
				aiAgentId: intakeResult.aiAgent.id,
				status: "success",
				action: "requestKnowledgeClarification",
				reason: knowledgeGapReviewResult.reason,
			});
			executionMs = Date.now() - executionStartedAt;
			return buildBackgroundPipelineResult({
				status: "completed",
				startTime,
				metrics: {
					intakeMs,
					analysisMs,
					executionMs,
				},
			});
		}

		const titleReviewUpdated = titleReviewResult.status === "updated";
		if (!(titleReviewUpdated || hasBackgroundMutation(generationResult))) {
			logAiPipeline({
				area: "background",
				event: "skip",
				conversationId,
				fields: {
					reason:
						knowledgeGapReviewResult.reason === "review_skipped"
							? generationResult.action.reasoning
							: `${generationResult.action.reasoning} | knowledgeGapReview=${knowledgeGapReviewResult.reason}`,
				},
			});

			await emitProcessingCompletedSafe({
				conversation: intakeResult.conversation,
				aiAgentId: intakeResult.aiAgent.id,
				status: "skipped",
				action: generationResult.action.action,
				reason: generationResult.action.reasoning,
			});
			executionMs = Date.now() - executionStartedAt;
			return buildBackgroundPipelineResult({
				status: "skipped",
				reason: generationResult.action.reasoning,
				startTime,
				metrics: {
					intakeMs,
					analysisMs,
					executionMs,
				},
			});
		}

		logAiPipeline({
			area: "background",
			event: "completed",
			conversationId,
			fields: {
				workflowRunId,
				jobId,
				sourceMessageId: ctx.input.sourceMessageId,
				toolCalls: generationResult.totalToolCalls,
			},
		});

		await emitProcessingCompletedSafe({
			conversation: intakeResult.conversation,
			aiAgentId: intakeResult.aiAgent.id,
			status: "success",
			action: titleReviewUpdated
				? "updateConversationTitle"
				: generationResult.action.action,
			reason: titleReviewUpdated
				? titleReviewResult.reason
				: generationResult.action.reasoning,
		});
		executionMs = Date.now() - executionStartedAt;
		return buildBackgroundPipelineResult({
			status: "completed",
			startTime,
			metrics: {
				intakeMs,
				analysisMs,
				executionMs,
			},
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Background pipeline failed";

		logAiPipeline({
			area: "background",
			event: "error",
			level: "error",
			conversationId,
			fields: {
				message,
			},
			error,
		});

		await emitProcessingCompletedSafe({
			status: "error",
			reason: message,
		});
		return buildBackgroundPipelineResult({
			status: "error",
			error: message,
			startTime,
			metrics: {
				intakeMs,
				analysisMs,
				executionMs,
			},
		});
	}
}
