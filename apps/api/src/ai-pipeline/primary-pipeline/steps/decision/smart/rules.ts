import type {
	DecisionSignals,
	SmartDecisionInput,
	SmartDecisionResult,
} from "./types";

export function observeDecision(params: {
	reasoning: string;
	confidence: "high" | "medium" | "low";
	source: "rule" | "fallback";
	ruleId: string;
}): SmartDecisionResult {
	return {
		intent: "observe",
		reasoning: params.reasoning,
		confidence: params.confidence,
		source: params.source,
		ruleId: params.ruleId,
	};
}

export function runSmartDeterministicRules(
	input: SmartDecisionInput,
	signals: DecisionSignals
): SmartDecisionResult | null {
	if (input.triggerMessage.senderType === "visitor" && signals.humanActive) {
		if (signals.triggerIsShortAckOrGreeting) {
			return observeDecision({
				reasoning:
					"Visitor acknowledgement while human is active does not need AI.",
				confidence: "high",
				source: "rule",
				ruleId: "visitor_ack_with_human_active_observe",
			});
		}

		if (signals.triggerIsSingleNonQuestion) {
			return observeDecision({
				reasoning:
					"Single non-question visitor message while human is active should not be interrupted.",
				confidence: "medium",
				source: "rule",
				ruleId: "visitor_single_non_question_human_active_observe",
			});
		}
	}

	return null;
}

export function clampSmartDecision(params: {
	modelDecision: SmartDecisionResult;
	signals: DecisionSignals;
}): SmartDecisionResult {
	const { modelDecision, signals } = params;

	if (modelDecision.intent !== "respond") {
		return modelDecision;
	}
	if (!signals.humanActive) {
		return modelDecision;
	}
	if (modelDecision.confidence === "high") {
		return modelDecision;
	}
	if (signals.triggerIsQuestionOrRequest) {
		return modelDecision;
	}

	return observeDecision({
		reasoning:
			"Conservative clamp applied: low-confidence response during active human handling.",
		confidence: "medium",
		source: "rule",
		ruleId: "post_model_human_active_low_confidence_observe",
	});
}
