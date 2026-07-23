/**
 * Tests for workflow state management
 *
 * The workflow state system tracks which job run is "active" for a given
 * conversation and direction. This is critical for preventing duplicate
 * responses and ensuring proper supersession of stale jobs.
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
	clearWorkflowPending,
	clearWorkflowState,
	generateWorkflowRunId,
	getWorkflowPending,
	getWorkflowState,
	isWorkflowRunActive,
	setWorkflowPending,
	setWorkflowState,
	type WorkflowDirection,
	type WorkflowPendingJob,
	type WorkflowState,
} from "./workflow-state";

// Mock Redis client
type MockRedis = {
	get: (key: string) => Promise<string | null>;
	setex: (key: string, ttl: number, value: string) => Promise<void>;
	del: (key: string) => Promise<void>;
};

function createMockRedis(storedState: WorkflowState | null = null): MockRedis {
	return {
		get: mock(() =>
			Promise.resolve(storedState ? JSON.stringify(storedState) : null)
		),
		setex: mock(() => Promise.resolve()),
		del: mock(() => Promise.resolve()),
	};
}

function createMockRedisWithPending(
	storedPending: WorkflowPendingJob | null = null
): MockRedis {
	return {
		get: mock(() =>
			Promise.resolve(storedPending ? JSON.stringify(storedPending) : null)
		),
		setex: mock(() => Promise.resolve()),
		del: mock(() => Promise.resolve()),
	};
}

describe("generateWorkflowRunId", () => {
	it("generates unique IDs for the same conversation with delay", async () => {
		const id1 = generateWorkflowRunId("conv-123", "ai-agent-response");
		// Wait 1ms to ensure timestamp difference
		await new Promise((resolve) => setTimeout(resolve, 2));
		const id2 = generateWorkflowRunId("conv-123", "ai-agent-response");

		// Should be different due to timestamp
		expect(id1).not.toBe(id2);
	});

	it("includes conversation ID in the generated ID", () => {
		const id = generateWorkflowRunId("conv-abc-123", "ai-agent-response");
		expect(id).toContain("conv-abc-123");
	});

	it("includes direction in the generated ID", () => {
		const id = generateWorkflowRunId("conv-123", "ai-agent-response");
		expect(id).toContain("ai-agent-response");
	});
});

describe("getWorkflowState", () => {
	it("returns null when no state exists", async () => {
		const redis = createMockRedis(null);
		const state = await getWorkflowState(
			redis as unknown as Parameters<typeof getWorkflowState>[0],
			"conv-123",
			"ai-agent-response"
		);
		expect(state).toBeNull();
	});

	it("returns stored state when it exists", async () => {
		const storedState: WorkflowState = {
			workflowRunId: "run-123",
			initialMessageId: "msg-456",
			initialMessageCreatedAt: "2024-01-01T00:00:00Z",
			conversationId: "conv-123",
			direction: "ai-agent-response",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:00Z",
		};
		const redis = createMockRedis(storedState);

		const state = await getWorkflowState(
			redis as unknown as Parameters<typeof getWorkflowState>[0],
			"conv-123",
			"ai-agent-response"
		);

		expect(state).toEqual(storedState);
	});
});

describe("setWorkflowState", () => {
	it("stores state with TTL", async () => {
		const redis = createMockRedis();
		const state: WorkflowState = {
			workflowRunId: "run-123",
			initialMessageId: "msg-456",
			initialMessageCreatedAt: "2024-01-01T00:00:00Z",
			conversationId: "conv-123",
			direction: "ai-agent-response",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:00Z",
		};

		await setWorkflowState(
			redis as unknown as Parameters<typeof setWorkflowState>[0],
			state
		);

		expect(redis.setex).toHaveBeenCalledTimes(1);
	});
});

describe("clearWorkflowState", () => {
	it("deletes state for conversation and direction", async () => {
		const redis = createMockRedis();

		await clearWorkflowState(
			redis as unknown as Parameters<typeof clearWorkflowState>[0],
			"conv-123",
			"ai-agent-response"
		);

		expect(redis.del).toHaveBeenCalledTimes(1);
	});
});

describe("isWorkflowRunActive", () => {
	it("returns true when workflowRunId matches stored state", async () => {
		const storedState: WorkflowState = {
			workflowRunId: "run-active-123",
			initialMessageId: "msg-456",
			initialMessageCreatedAt: "2024-01-01T00:00:00Z",
			conversationId: "conv-123",
			direction: "ai-agent-response",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:00Z",
		};
		const redis = createMockRedis(storedState);

		const isActive = await isWorkflowRunActive(
			redis as unknown as Parameters<typeof isWorkflowRunActive>[0],
			"conv-123",
			"ai-agent-response",
			"run-active-123"
		);

		expect(isActive).toBe(true);
	});

	it("returns false when workflowRunId does not match", async () => {
		const storedState: WorkflowState = {
			workflowRunId: "run-newer-456",
			initialMessageId: "msg-456",
			initialMessageCreatedAt: "2024-01-01T00:00:00Z",
			conversationId: "conv-123",
			direction: "ai-agent-response",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:00Z",
		};
		const redis = createMockRedis(storedState);

		const isActive = await isWorkflowRunActive(
			redis as unknown as Parameters<typeof isWorkflowRunActive>[0],
			"conv-123",
			"ai-agent-response",
			"run-old-123"
		);

		expect(isActive).toBe(false);
	});

	it("returns false when no state exists", async () => {
		const redis = createMockRedis(null);

		const isActive = await isWorkflowRunActive(
			redis as unknown as Parameters<typeof isWorkflowRunActive>[0],
			"conv-123",
			"ai-agent-response",
			"run-123"
		);

		expect(isActive).toBe(false);
	});
});

describe("workflow state synchronization scenarios", () => {
	/**
	 * Critical scenario: Ensuring workers can check if they should proceed
	 */
	describe("supersession check", () => {
		it("old job should not proceed when superseded by newer workflow", async () => {
			// Newer message created a new workflow run
			const storedState: WorkflowState = {
				workflowRunId: "workflow-run-NEW",
				initialMessageId: "msg-original",
				initialMessageCreatedAt: "2024-01-01T00:00:00Z",
				conversationId: "conv-123",
				direction: "ai-agent-response",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:01Z",
			};
			const redis = createMockRedis(storedState);

			// Old job checks if it should proceed with OLD workflow run ID
			const shouldOldJobProceed = await isWorkflowRunActive(
				redis as unknown as Parameters<typeof isWorkflowRunActive>[0],
				"conv-123",
				"ai-agent-response",
				"workflow-run-OLD"
			);

			expect(shouldOldJobProceed).toBe(false);
		});

		it("current job should proceed when state matches", async () => {
			const storedState: WorkflowState = {
				workflowRunId: "workflow-run-CURRENT",
				initialMessageId: "msg-original",
				initialMessageCreatedAt: "2024-01-01T00:00:00Z",
				conversationId: "conv-123",
				direction: "ai-agent-response",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};
			const redis = createMockRedis(storedState);

			const shouldCurrentJobProceed = await isWorkflowRunActive(
				redis as unknown as Parameters<typeof isWorkflowRunActive>[0],
				"conv-123",
				"ai-agent-response",
				"workflow-run-CURRENT"
			);

			expect(shouldCurrentJobProceed).toBe(true);
		});
	});

	/**
	 * The fixed scenario: When job is skipped due to debouncing,
	 * state should be synced to existing job's workflowRunId
	 */
	describe("debouncing sync scenario", () => {
		it("after syncing state, existing job should be able to proceed", async () => {
			// Job A is queued with workflowRunId-A
			// Job B tries to queue but is skipped (debouncing)
			// Caller syncs state to workflowRunId-A (from existing job data)
			// Job A now runs and checks isWorkflowRunActive

			const syncedState: WorkflowState = {
				workflowRunId: "workflow-run-A", // Synced to existing job's ID
				initialMessageId: "msg-1",
				initialMessageCreatedAt: "2024-01-01T00:00:00Z",
				conversationId: "conv-123",
				direction: "ai-agent-response",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:01Z", // Updated but workflowRunId unchanged
			};
			const redis = createMockRedis(syncedState);

			// Job A checks if it should proceed
			const shouldJobAProceed = await isWorkflowRunActive(
				redis as unknown as Parameters<typeof isWorkflowRunActive>[0],
				"conv-123",
				"ai-agent-response",
				"workflow-run-A"
			);

			// Job A should proceed because state was synced correctly
			expect(shouldJobAProceed).toBe(true);
		});
	});
});

describe("workflow pending state", () => {
	it("stores pending payload with TTL", async () => {
		const redis = createMockRedisWithPending();
		const pending: WorkflowPendingJob = {
			workflowRunId: "run-pending-1",
			conversationId: "conv-123",
			direction: "ai-agent-response",
			messageId: "msg-123",
			messageCreatedAt: "2024-01-01T00:00:00Z",
			organizationId: "org-1",
			websiteId: "web-1",
			visitorId: "visitor-1",
			aiAgentId: "ai-1",
			createdAt: "2024-01-01T00:00:00Z",
		};

		await setWorkflowPending(
			redis as unknown as Parameters<typeof setWorkflowPending>[0],
			pending
		);

		expect(redis.setex).toHaveBeenCalledTimes(1);
	});

	it("reads pending payload when it exists", async () => {
		const pending: WorkflowPendingJob = {
			workflowRunId: "run-pending-2",
			conversationId: "conv-123",
			direction: "ai-agent-response",
			messageId: "msg-456",
			messageCreatedAt: "2024-01-01T00:00:00Z",
			organizationId: "org-1",
			websiteId: "web-1",
			visitorId: "visitor-1",
			aiAgentId: "ai-1",
			createdAt: "2024-01-01T00:00:00Z",
		};
		const redis = createMockRedisWithPending(pending);

		const result = await getWorkflowPending(
			redis as unknown as Parameters<typeof getWorkflowPending>[0],
			"conv-123",
			"ai-agent-response"
		);

		expect(result).toEqual(pending);
	});

	it("clears pending only when workflowRunId matches", async () => {
		const pending: WorkflowPendingJob = {
			workflowRunId: "run-pending-3",
			conversationId: "conv-123",
			direction: "ai-agent-response",
			messageId: "msg-789",
			messageCreatedAt: "2024-01-01T00:00:00Z",
			organizationId: "org-1",
			websiteId: "web-1",
			visitorId: "visitor-1",
			aiAgentId: "ai-1",
			createdAt: "2024-01-01T00:00:00Z",
		};
		const redis = createMockRedisWithPending(pending);

		const clearedWrong = await clearWorkflowPending(
			redis as unknown as Parameters<typeof clearWorkflowPending>[0],
			"conv-123",
			"ai-agent-response",
			"run-other"
		);
		expect(clearedWrong).toBe(false);

		const clearedRight = await clearWorkflowPending(
			redis as unknown as Parameters<typeof clearWorkflowPending>[0],
			"conv-123",
			"ai-agent-response",
			"run-pending-3"
		);
		expect(clearedRight).toBe(true);
	});
});
