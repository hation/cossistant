import { mock } from "bun:test";

// These shared module-level mocks keep Bun test files aligned when they mock the
// same import path in separate suites and then run together in one command.
export const sharedCalculateAiCreditChargeMock = mock(() => ({
	baseCredits: 1,
	modelCredits: 1,
	toolCredits: 0,
	totalCredits: 2,
	billableToolCount: 0,
	excludedToolCount: 0,
	totalToolCount: 0,
}));

export const sharedGetMinimumAiCreditChargeMock = mock(() => ({
	baseCredits: 1,
	modelCredits: 0,
	toolCredits: 0,
	totalCredits: 1,
	billableToolCount: 0,
	excludedToolCount: 0,
	totalToolCount: 0,
}));

export const sharedResolveClarificationModelForExecutionMock = mock(
	(modelId: string) => ({
		modelIdOriginal: modelId,
		modelIdResolved: "google/gemini-3-flash-preview",
		modelMigrationApplied: modelId !== "google/gemini-3-flash-preview",
	})
);

export const sharedCreateTimelineItemMock = mock(async () => ({
	id: "timeline-1",
}));

export const sharedUpdateTimelineItemMock = mock(async () => ({
	id: "timeline-1",
}));
