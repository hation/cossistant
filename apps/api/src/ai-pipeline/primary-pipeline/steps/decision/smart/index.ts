import { logAiPipeline } from "../../../../logger";
import { runSmartDecisionModel } from "./model-runner";
import { buildSmartDecisionPrompt } from "./prompt";
import { clampSmartDecision, runSmartDeterministicRules } from "./rules";
import { extractDecisionSignals } from "./signals";
import type { SmartDecisionInput, SmartDecisionResult } from "./types";

function logDecision(params: {
	conversationId: string;
	result: SmartDecisionResult;
	humanActive: boolean;
	visitorBurstCount: number;
	lastHumanSecondsAgo: number | null;
}) {
	logAiPipeline({
		area: "smart-decision",
		event: "decision",
		conversationId: params.conversationId,
		fields: {
			source: params.result.source ?? "model",
			ruleId: params.result.ruleId ?? "none",
			intent: params.result.intent,
			confidence: params.result.confidence,
			humanActive: params.humanActive,
			visitorBurst: params.visitorBurstCount,
			lastHumanSecondsAgo: params.lastHumanSecondsAgo,
			reason: params.result.reasoning,
		},
	});
}

export async function runSmartDecision(
	input: SmartDecisionInput
): Promise<SmartDecisionResult> {
	const signals = extractDecisionSignals(input);
	const convId = input.conversation.id;

	logAiPipeline({
		area: "smart-decision",
		event: "start",
		conversationId: convId,
		fields: {
			humanActive: signals.humanActive,
			triggerSender: input.triggerMessage.senderType,
		},
	});

	const ruleDecision = runSmartDeterministicRules(input, signals);
	if (ruleDecision) {
		logDecision({
			conversationId: convId,
			result: ruleDecision,
			humanActive: signals.humanActive,
			visitorBurstCount: signals.visitorBurstCount,
			lastHumanSecondsAgo: signals.lastHumanSecondsAgo,
		});
		return ruleDecision;
	}

	const prompt = buildSmartDecisionPrompt(input, signals);
	const modelDecision = await runSmartDecisionModel({
		input,
		prompt,
	});

	const finalDecision = clampSmartDecision({
		modelDecision,
		signals,
	});

	logDecision({
		conversationId: convId,
		result: finalDecision,
		humanActive: signals.humanActive,
		visitorBurstCount: signals.visitorBurstCount,
		lastHumanSecondsAgo: signals.lastHumanSecondsAgo,
	});

	return finalDecision;
}

export type {
	DecisionConfidence,
	DecisionIntent,
	DecisionSignals,
	DecisionSource,
	SmartDecisionInput,
	SmartDecisionResult,
} from "./types";
