/**
 * Tests for debounced job utility
 *
 * These tests verify the critical behavior that ensures workflow state
 * stays in sync with queued jobs.
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { addDebouncedJob, type DebouncedJobResult } from "./debounced-job";

// Mock BullMQ Queue and Job types
type MockJobState =
	| "completed"
	| "failed"
	| "delayed"
	| "waiting"
	| "active"
	| "unknown";

type MockJob<T> = {
	id: string;
	data: T;
	getState: () => Promise<MockJobState>;
	remove: () => Promise<void>;
};

type MockQueue<T> = {
	getJob: (jobId: string) => Promise<MockJob<T> | null>;
	add: (name: string, data: T, opts: { jobId: string }) => Promise<MockJob<T>>;
};

function createMockJob<T>(
	id: string,
	data: T,
	state: MockJobState
): MockJob<T> {
	return {
		id,
		data,
		getState: mock(() => Promise.resolve(state)),
		remove: mock(() => Promise.resolve()),
	};
}

function createMockQueue<T>(existingJob: MockJob<T> | null): MockQueue<T> {
	return {
		getJob: mock(() => Promise.resolve(existingJob)),
		add: mock((name: string, data: T, opts: { jobId: string }) =>
			Promise.resolve(createMockJob(opts.jobId, data, "delayed"))
		),
	};
}

type TestJobData = {
	conversationId: string;
	workflowRunId: string;
	messageId: string;
};

describe("addDebouncedJob", () => {
	const defaultJobData: TestJobData = {
		conversationId: "conv-123",
		workflowRunId: "run-456",
		messageId: "msg-789",
	};

	const defaultParams = {
		jobId: "test-job-1",
		jobName: "test-job",
		data: defaultJobData,
		options: { delay: 3000 },
		logPrefix: "[test]",
	};

	describe("when no existing job", () => {
		it("creates a new job", async () => {
			const queue = createMockQueue<TestJobData>(null);

			const result = await addDebouncedJob({
				...defaultParams,
				queue: queue as unknown as Parameters<
					typeof addDebouncedJob<TestJobData>
				>[0]["queue"],
			});

			expect(result.status).toBe("created");
			expect(queue.add).toHaveBeenCalledTimes(1);
		});

		it("returns the created job", async () => {
			const queue = createMockQueue<TestJobData>(null);

			const result = (await addDebouncedJob({
				...defaultParams,
				queue: queue as unknown as Parameters<
					typeof addDebouncedJob<TestJobData>
				>[0]["queue"],
			})) as Extract<DebouncedJobResult<TestJobData>, { status: "created" }>;

			expect(result.status).toBe("created");
			expect(result.job).toBeDefined();
			expect(result.job.id).toBe("test-job-1");
		});
	});

	describe("when existing job is completed", () => {
		it("removes and replaces the completed job", async () => {
			const existingJob = createMockJob(
				"test-job-1",
				{ ...defaultJobData, workflowRunId: "old-run" },
				"completed"
			);
			const queue = createMockQueue(existingJob);

			const result = await addDebouncedJob({
				...defaultParams,
				queue: queue as unknown as Parameters<
					typeof addDebouncedJob<TestJobData>
				>[0]["queue"],
			});

			expect(result.status).toBe("replaced");
			expect(existingJob.remove).toHaveBeenCalledTimes(1);
			expect(queue.add).toHaveBeenCalledTimes(1);
		});
	});

	describe("when existing job is failed", () => {
		it("removes and replaces the failed job", async () => {
			const existingJob = createMockJob(
				"test-job-1",
				{ ...defaultJobData, workflowRunId: "old-run" },
				"failed"
			);
			const queue = createMockQueue(existingJob);

			const result = await addDebouncedJob({
				...defaultParams,
				queue: queue as unknown as Parameters<
					typeof addDebouncedJob<TestJobData>
				>[0]["queue"],
			});

			expect(result.status).toBe("replaced");
			expect((result as { previousState: string }).previousState).toBe(
				"failed"
			);
		});
	});

	describe("when existing job is delayed (CRITICAL - debouncing)", () => {
		it("skips creating new job", async () => {
			const existingJob = createMockJob(
				"test-job-1",
				{ ...defaultJobData, workflowRunId: "existing-run-id" },
				"delayed"
			);
			const queue = createMockQueue(existingJob);

			const result = await addDebouncedJob({
				...defaultParams,
				queue: queue as unknown as Parameters<
					typeof addDebouncedJob<TestJobData>
				>[0]["queue"],
			});

			expect(result.status).toBe("skipped");
			expect(queue.add).not.toHaveBeenCalled();
		});

		it("returns existing job data for state synchronization", async () => {
			const existingJobData = {
				...defaultJobData,
				workflowRunId: "existing-workflow-run-id",
				messageId: "original-msg",
			};
			const existingJob = createMockJob(
				"test-job-1",
				existingJobData,
				"delayed"
			);
			const queue = createMockQueue(existingJob);

			const result = (await addDebouncedJob({
				...defaultParams,
				queue: queue as unknown as Parameters<
					typeof addDebouncedJob<TestJobData>
				>[0]["queue"],
			})) as Extract<DebouncedJobResult<TestJobData>, { status: "skipped" }>;

			expect(result.status).toBe("skipped");
			expect(result.reason).toBe("debouncing");
			expect(result.existingJob).toBeDefined();
			expect(result.existingJobData).toEqual(existingJobData);
			expect(result.existingJobData.workflowRunId).toBe(
				"existing-workflow-run-id"
			);
		});

		it("preserves the existing job's workflowRunId for caller to sync", async () => {
			// This is the CRITICAL test - when a job is skipped, callers need
			// the existing job's workflowRunId to sync their workflow state
			const existingWorkflowRunId = "run-abc-123";
			const newWorkflowRunId = "run-xyz-789";

			const existingJob = createMockJob(
				"test-job-1",
				{ ...defaultJobData, workflowRunId: existingWorkflowRunId },
				"delayed"
			);
			const queue = createMockQueue(existingJob);

			const result = (await addDebouncedJob({
				...defaultParams,
				data: { ...defaultJobData, workflowRunId: newWorkflowRunId },
				queue: queue as unknown as Parameters<
					typeof addDebouncedJob<TestJobData>
				>[0]["queue"],
			})) as Extract<DebouncedJobResult<TestJobData>, { status: "skipped" }>;

			// The existing job's workflowRunId should be returned, NOT the new one
			expect(result.existingJobData.workflowRunId).toBe(existingWorkflowRunId);
			expect(result.existingJobData.workflowRunId).not.toBe(newWorkflowRunId);
		});
	});

	describe("when existing job is waiting", () => {
		it("skips and returns existing job data", async () => {
			const existingJob = createMockJob(
				"test-job-1",
				{ ...defaultJobData, workflowRunId: "waiting-run" },
				"waiting"
			);
			const queue = createMockQueue(existingJob);

			const result = (await addDebouncedJob({
				...defaultParams,
				queue: queue as unknown as Parameters<
					typeof addDebouncedJob<TestJobData>
				>[0]["queue"],
			})) as Extract<DebouncedJobResult<TestJobData>, { status: "skipped" }>;

			expect(result.status).toBe("skipped");
			expect(result.reason).toBe("debouncing");
			expect(result.existingJobData.workflowRunId).toBe("waiting-run");
		});
	});

	describe("when existing job is active", () => {
		it("creates a new job with unique ID to supersede", async () => {
			const existingJob = createMockJob("test-job-1", defaultJobData, "active");
			const queue = createMockQueue(existingJob);

			const result = await addDebouncedJob({
				...defaultParams,
				queue: queue as unknown as Parameters<
					typeof addDebouncedJob<TestJobData>
				>[0]["queue"],
			});

			expect(result.status).toBe("created");
			expect(queue.add).toHaveBeenCalledTimes(1);
		});
	});

	describe("when existing job is in unexpected state", () => {
		it("skips and returns existing job data", async () => {
			const existingJob = createMockJob(
				"test-job-1",
				{ ...defaultJobData, workflowRunId: "unknown-run" },
				"unknown"
			);
			const queue = createMockQueue(existingJob);

			const result = (await addDebouncedJob({
				...defaultParams,
				queue: queue as unknown as Parameters<
					typeof addDebouncedJob<TestJobData>
				>[0]["queue"],
			})) as Extract<DebouncedJobResult<TestJobData>, { status: "skipped" }>;

			expect(result.status).toBe("skipped");
			expect(result.reason).toBe("unexpected");
			expect(result.existingJobData).toBeDefined();
		});
	});
});

describe("workflow state synchronization", () => {
	/**
	 * This describes the CRITICAL scenario that was causing messages to be skipped:
	 *
	 * 1. Message 1 arrives → creates job with workflowRunId-A → sets state to runId-A
	 * 2. Message 2 arrives quickly → tries to create job with workflowRunId-B
	 * 3. Job B is SKIPPED (debouncing) because Job A is still delayed
	 * 4. OLD BUG: State was set to runId-B BEFORE enqueueing
	 * 5. Job A runs, checks isWorkflowRunActive(runId-A) against state(runId-B)
	 * 6. Returns FALSE → Job A self-supersedes → NO RESPONSE SENT
	 *
	 * FIX: When skipped, return the existing job's data so caller can sync state
	 */
	it("scenario: rapid messages should not cause missed AI responses", async () => {
		// Simulate the scenario
		const existingJobData: TestJobData = {
			conversationId: "conv-123",
			workflowRunId: "workflow-run-A",
			messageId: "msg-1",
		};

		const newJobData: TestJobData = {
			conversationId: "conv-123",
			workflowRunId: "workflow-run-B",
			messageId: "msg-2",
		};

		// Job A is already queued and delayed
		const existingJob = createMockJob(
			"ai-agent-conv-123",
			existingJobData,
			"delayed"
		);
		const queue = createMockQueue(existingJob);

		// Try to queue Job B
		const result = (await addDebouncedJob({
			queue: queue as unknown as Parameters<
				typeof addDebouncedJob<TestJobData>
			>[0]["queue"],
			jobId: "ai-agent-conv-123",
			jobName: "ai-agent",
			data: newJobData,
			options: { delay: 3000 },
			logPrefix: "[test]",
		})) as Extract<DebouncedJobResult<TestJobData>, { status: "skipped" }>;

		// Job B should be skipped
		expect(result.status).toBe("skipped");

		// CRITICAL: The existing job's workflowRunId should be returned
		// This allows the caller to sync workflow state to match Job A
		expect(result.existingJobData.workflowRunId).toBe("workflow-run-A");

		// The caller should then:
		// 1. NOT set workflow state to "workflow-run-B"
		// 2. Instead ensure workflow state matches "workflow-run-A"
		// 3. This way, when Job A runs and checks isWorkflowRunActive("workflow-run-A"),
		//    it will return TRUE and the job will proceed
	});
});
