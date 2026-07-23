import type { PrimaryPipelineMetrics } from "../contracts";

type StageMetricKey = Exclude<keyof PrimaryPipelineMetrics, "totalMs">;

export type MutableStageMetrics = Record<StageMetricKey, number>;

export function createStageMetrics(): MutableStageMetrics {
	return {
		intakeMs: 0,
		decisionMs: 0,
		generationMs: 0,
	};
}

export async function measureStage<T>(
	metrics: MutableStageMetrics,
	stage: StageMetricKey,
	run: () => Promise<T>
): Promise<T> {
	const startedAt = Date.now();
	try {
		return await run();
	} finally {
		metrics[stage] = Date.now() - startedAt;
	}
}

export function finalizeStageMetrics(params: {
	metrics: MutableStageMetrics;
	pipelineStartedAt: number;
}): PrimaryPipelineMetrics {
	return {
		...params.metrics,
		totalMs: Date.now() - params.pipelineStartedAt,
	};
}
