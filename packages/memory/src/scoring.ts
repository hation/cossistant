import type { MemoryItem } from "./types";
import { clamp01, stableStringifyMetadata } from "./utils";

export type MemoryCandidate = Omit<MemoryItem, "score"> & {
	similarity?: number | null;
	score?: number;
};

const PRIORITY_WEIGHT = 0.3;
const FRESHNESS_WEIGHT = 0.25;
const SEMANTIC_WEIGHT = 0.45;
const NO_SEMANTIC_PRIORITY_WEIGHT = 0.55;
const NO_SEMANTIC_FRESHNESS_WEIGHT = 0.45;
const FRESHNESS_HALF_LIFE_HOURS = 24 * 30;

export function normalizePriorityScore(priority: number): number {
	return clamp01(1 - 1 / (1 + Math.max(priority, 0)));
}

export function calculateFreshnessScore(
	createdAt: Date,
	now: Date = new Date()
): number {
	const ageHours = Math.max(
		0,
		(now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
	);

	return clamp01(1 / (1 + ageHours / FRESHNESS_HALF_LIFE_HOURS));
}

export function normalizeSemanticScore(similarity?: number | null): number {
	return clamp01(similarity ?? 0);
}

export function calculateFinalScore(
	candidate: MemoryCandidate,
	now: Date = new Date()
): number {
	const priorityScore = normalizePriorityScore(candidate.priority);
	const freshnessScore = calculateFreshnessScore(candidate.createdAt, now);
	const semanticScore = normalizeSemanticScore(candidate.similarity);
	const hasSemantic =
		candidate.similarity !== undefined && candidate.similarity !== null;

	if (hasSemantic) {
		return (
			semanticScore * SEMANTIC_WEIGHT +
			priorityScore * PRIORITY_WEIGHT +
			freshnessScore * FRESHNESS_WEIGHT
		);
	}

	return (
		priorityScore * NO_SEMANTIC_PRIORITY_WEIGHT +
		freshnessScore * NO_SEMANTIC_FRESHNESS_WEIGHT
	);
}

export function mergeCandidatesById(
	candidates: MemoryCandidate[]
): MemoryCandidate[] {
	const byId = new Map<string, MemoryCandidate>();

	for (const candidate of candidates) {
		const existing = byId.get(candidate.id);

		if (!existing) {
			byId.set(candidate.id, { ...candidate });
			continue;
		}

		byId.set(candidate.id, {
			...existing,
			similarity: Math.max(
				normalizeSemanticScore(existing.similarity),
				normalizeSemanticScore(candidate.similarity)
			),
		});
	}

	return Array.from(byId.values());
}

export function dedupeCandidates(
	candidates: MemoryCandidate[]
): MemoryCandidate[] {
	const bySignature = new Map<string, MemoryCandidate>();

	for (const candidate of candidates) {
		const signature = `${candidate.content.trim()}\u0000${stableStringifyMetadata(
			candidate.metadata
		)}`;
		const existing = bySignature.get(signature);

		if (
			!existing ||
			(candidate.score ?? 0) > (existing.score ?? 0) ||
			((candidate.score ?? 0) === (existing.score ?? 0) &&
				candidate.createdAt.getTime() > existing.createdAt.getTime())
		) {
			bySignature.set(signature, candidate);
		}
	}

	return Array.from(bySignature.values());
}

export function rankCandidates(
	candidates: MemoryCandidate[],
	now: Date = new Date()
): MemoryItem[] {
	return dedupeCandidates(
		mergeCandidatesById(candidates).map((candidate) => ({
			...candidate,
			score: calculateFinalScore(candidate, now),
		}))
	).sort((left, right) => {
		if ((right.score ?? 0) !== (left.score ?? 0)) {
			return (right.score ?? 0) - (left.score ?? 0);
		}

		if (right.priority !== left.priority) {
			return right.priority - left.priority;
		}

		if (right.createdAt.getTime() !== left.createdAt.getTime()) {
			return right.createdAt.getTime() - left.createdAt.getTime();
		}

		return left.id.localeCompare(right.id);
	});
}
