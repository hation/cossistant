import { describe, expect, it } from "bun:test";
import {
	calculateFinalScore,
	type MemoryCandidate,
	rankCandidates,
} from "./scoring";

const NOW = new Date("2026-03-22T12:00:00.000Z");

function createCandidate(
	overrides: Partial<MemoryCandidate> = {}
): MemoryCandidate {
	return {
		id: "candidate-default",
		content: "Memory candidate",
		metadata: { kind: "note" },
		priority: 1,
		createdAt: new Date("2026-03-22T11:00:00.000Z"),
		updatedAt: new Date("2026-03-22T11:00:00.000Z"),
		...overrides,
	};
}

describe("scoring", () => {
	it("lets materially higher priority beat recent low-priority notes", () => {
		const recentLow = createCandidate({
			id: "recent-low",
			priority: 1,
			createdAt: new Date("2026-03-22T11:30:00.000Z"),
		});
		const olderHigh = createCandidate({
			id: "older-high",
			priority: 5,
			createdAt: new Date("2026-03-12T12:00:00.000Z"),
		});

		const ranked = rankCandidates([recentLow, olderHigh], NOW);

		expect(ranked[0]?.id).toBe("older-high");
	});

	it("still lets freshness boost recent notes over slightly stronger stale ones", () => {
		const recentLow = createCandidate({
			id: "recent-low",
			priority: 1,
			createdAt: new Date("2026-03-22T11:30:00.000Z"),
		});
		const staleMedium = createCandidate({
			id: "stale-medium",
			priority: 2,
			createdAt: new Date("2026-03-12T12:00:00.000Z"),
		});

		const ranked = rankCandidates([staleMedium, recentLow], NOW);

		expect(ranked[0]?.id).toBe("recent-low");
	});

	it("only applies semantic lift when similarity is present", () => {
		const baseline = createCandidate({
			id: "baseline",
			priority: 3,
			createdAt: new Date("2026-03-18T12:00:00.000Z"),
		});
		const semanticMatch = createCandidate({
			id: "semantic-match",
			priority: 3,
			createdAt: new Date("2026-03-18T12:00:00.000Z"),
			similarity: 0.95,
		});

		expect(calculateFinalScore(semanticMatch, NOW)).toBeGreaterThan(
			calculateFinalScore(baseline, NOW)
		);
	});

	it("deduplicates near-identical content conservatively by keeping the stronger candidate", () => {
		const duplicateOlder = createCandidate({
			id: "duplicate-older",
			content: "User prefers email updates",
			metadata: { kind: "note", userId: "user_1" },
			priority: 2,
			createdAt: new Date("2026-03-10T12:00:00.000Z"),
		});
		const duplicateNewer = createCandidate({
			id: "duplicate-newer",
			content: "User prefers email updates",
			metadata: { kind: "note", userId: "user_1" },
			priority: 3,
			createdAt: new Date("2026-03-22T11:00:00.000Z"),
		});

		const ranked = rankCandidates([duplicateOlder, duplicateNewer], NOW);

		expect(ranked).toHaveLength(1);
		expect(ranked[0]?.id).toBe("duplicate-newer");
	});
});
