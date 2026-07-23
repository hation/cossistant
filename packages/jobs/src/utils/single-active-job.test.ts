/**
 * Tests for single active job utility
 *
 * Verifies strict single-job behavior for AI agent queue:
 * - waiting/delayed jobs are replaced with newest
 * - active jobs are not duplicated
 */

import { describe, expect, it, mock } from "bun:test";
import {
	addSingleActiveJob,
	type SingleActiveJobResult,
} from "./single-active-job";

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

describe("addSingleActiveJob", () => {
	const defaultJobData: TestJobData = {
		conversationId: "conv-123",
		workflowRunId: "run-456",
		messageId: "msg-789",
	};

	const defaultParams = {
		jobId: "test-job-1",
		jobName: "test-job",
		data: defaultJobData,
		options: { delay: 0 },
		logPrefix: "[test]",
	};

	it("creates a new job when none exists", async () => {
		const queue = createMockQueue<TestJobData>(null);
		const result = await addSingleActiveJob({
			...defaultParams,
			queue: queue as unknown as Parameters<
				typeof addSingleActiveJob<TestJobData>
			>[0]["queue"],
		});

		expect(result.status).toBe("created");
		expect(queue.add).toHaveBeenCalledTimes(1);
	});

	it("replaces waiting job with newest", async () => {
		const existingJob = createMockJob(
			"test-job-1",
			{ ...defaultJobData, workflowRunId: "old-run" },
			"waiting"
		);
		const queue = createMockQueue(existingJob);

		const result = (await addSingleActiveJob({
			...defaultParams,
			queue: queue as unknown as Parameters<
				typeof addSingleActiveJob<TestJobData>
			>[0]["queue"],
		})) as Extract<SingleActiveJobResult<TestJobData>, { status: "replaced" }>;

		expect(result.status).toBe("replaced");
		expect(result.previousState).toBe("waiting");
		expect(existingJob.remove).toHaveBeenCalledTimes(1);
		expect(queue.add).toHaveBeenCalledTimes(1);
	});

	it("replaces delayed job with newest", async () => {
		const existingJob = createMockJob(
			"test-job-1",
			{ ...defaultJobData, workflowRunId: "old-run" },
			"delayed"
		);
		const queue = createMockQueue(existingJob);

		const result = (await addSingleActiveJob({
			...defaultParams,
			queue: queue as unknown as Parameters<
				typeof addSingleActiveJob<TestJobData>
			>[0]["queue"],
		})) as Extract<SingleActiveJobResult<TestJobData>, { status: "replaced" }>;

		expect(result.status).toBe("replaced");
		expect(result.previousState).toBe("delayed");
	});

	it("skips enqueue when job is active", async () => {
		const existingJob = createMockJob(
			"test-job-1",
			{ ...defaultJobData, workflowRunId: "active-run" },
			"active"
		);
		const queue = createMockQueue(existingJob);

		const result = (await addSingleActiveJob({
			...defaultParams,
			queue: queue as unknown as Parameters<
				typeof addSingleActiveJob<TestJobData>
			>[0]["queue"],
		})) as Extract<SingleActiveJobResult<TestJobData>, { status: "skipped" }>;

		expect(result.status).toBe("skipped");
		expect(result.reason).toBe("active");
		expect(queue.add).not.toHaveBeenCalled();
	});
});
