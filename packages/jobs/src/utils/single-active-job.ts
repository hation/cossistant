/**
 * Single Active Job Utility
 *
 * Ensures at most one active job for a logical ID:
 * - If no existing job → create new job
 * - If existing job is completed/failed → remove and create new job
 * - If existing job is delayed/waiting → remove and create new job (replace)
 * - If existing job is active → skip (caller should requeue later)
 * - If existing job is in an unexpected state → skip
 */

import type { Job, JobsOptions, Queue } from "bullmq";

type SimpleJob<T> = Job<T, unknown, string>;

export type SingleActiveJobResult<T> =
	| { status: "created"; job: SimpleJob<T> }
	| {
			status: "replaced";
			job: SimpleJob<T>;
			previousState: "completed" | "failed" | "waiting" | "delayed";
	  }
	| {
			status: "skipped";
			reason: "active" | "unexpected";
			existingState: string;
			existingJob: SimpleJob<T>;
			existingJobData: T;
	  };

export type AddSingleActiveJobParams<T> = {
	queue: Queue<T>;
	jobId: string;
	jobName: string;
	data: T;
	options: Omit<JobsOptions, "jobId">;
	logPrefix: string;
};

export async function addSingleActiveJob<T>(
	params: AddSingleActiveJobParams<T>
): Promise<SingleActiveJobResult<T>> {
	const { queue, jobId, jobName, data, options, logPrefix } = params;
	const existingJob = await queue.getJob(jobId);

	if (existingJob) {
		const existingState = await existingJob.getState();

		if (
			existingState === "completed" ||
			existingState === "failed" ||
			existingState === "waiting" ||
			existingState === "delayed"
		) {
			await existingJob.remove();
			console.log(`${logPrefix} Removed ${existingState} job ${jobId}`);
			const job = (await (queue as Queue).add(jobName, data, {
				...options,
				jobId,
			})) as SimpleJob<T>;
			return {
				status: "replaced",
				job,
				previousState: existingState,
			};
		}

		if (existingState === "active") {
			console.log(`${logPrefix} Job ${jobId} active, skipping enqueue`);
			return {
				status: "skipped",
				reason: "active",
				existingState,
				existingJob: existingJob as SimpleJob<T>,
				existingJobData: existingJob.data as T,
			};
		}

		console.warn(
			`${logPrefix} Job ${jobId} in unexpected state: ${existingState}, skipping`
		);
		return {
			status: "skipped",
			reason: "unexpected",
			existingState,
			existingJob: existingJob as SimpleJob<T>,
			existingJobData: existingJob.data as T,
		};
	}

	const job = (await (queue as Queue).add(jobName, data, {
		...options,
		jobId,
	})) as SimpleJob<T>;
	return { status: "created", job };
}
