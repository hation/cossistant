import { describe, expect, it } from "bun:test";
import { validateRealtimeEvent } from "../src/realtime-events";

describe("realtime-events", () => {
	it("accepts retry-required active clarification updates", () => {
		const payload = validateRealtimeEvent("conversationUpdated", {
			websiteId: "site_1",
			organizationId: "org_1",
			visitorId: "visitor_1",
			userId: null,
			conversationId: "conv_1",
			updates: {
				titleSource: "ai",
				activeClarification: {
					requestId: "01JKCM0FJ8T8Q6W0M3Q2A1B9CD",
					status: "retry_required",
					topicSummary: "Clarify account deletion.",
					engagementMode: "owner",
					linkedConversationCount: 0,
					question: null,
					currentSuggestedAnswers: null,
					currentQuestionInputMode: null,
					currentQuestionScope: null,
					stepIndex: 1,
					maxSteps: 3,
					progress: null,
					updatedAt: "2026-03-17T10:54:40.208Z",
				},
			},
			aiAgentId: null,
		});

		expect(payload.updates.activeClarification).toMatchObject({
			status: "retry_required",
			question: null,
		});
		expect(payload.updates.titleSource).toBe("ai");
	});

	it("accepts clarification progress payloads on conversation updates", () => {
		const payload = validateRealtimeEvent("conversationUpdated", {
			websiteId: "site_1",
			organizationId: "org_1",
			visitorId: "visitor_1",
			userId: null,
			conversationId: "conv_1",
			updates: {
				activeClarification: {
					requestId: "01JKCM0FJ8T8Q6W0M3Q2A1B9CD",
					status: "analyzing",
					topicSummary: "Clarify account deletion.",
					engagementMode: "owner",
					linkedConversationCount: 0,
					question: null,
					currentSuggestedAnswers: null,
					currentQuestionInputMode: null,
					currentQuestionScope: null,
					stepIndex: 1,
					maxSteps: 3,
					progress: {
						phase: "reviewing_evidence",
						label: "Reviewing what we know",
						detail:
							"Cross-checking the conversation and existing help content.",
						attempt: 1,
						toolName: "kb_search",
						startedAt: "2026-03-17T10:54:40.208Z",
					},
					updatedAt: "2026-03-17T10:54:40.208Z",
				},
			},
			aiAgentId: null,
		});

		expect(payload.updates.activeClarification?.progress).toMatchObject({
			phase: "reviewing_evidence",
			toolName: "kb_search",
		});
	});
});
