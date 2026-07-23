import type { MemoryMetadata } from "./types";

export function isObjectLike(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clamp01(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	if (value <= 0) {
		return 0;
	}

	if (value >= 1) {
		return 1;
	}

	return value;
}

export function stableStringifyMetadata(metadata: MemoryMetadata): string {
	return JSON.stringify(
		Object.keys(metadata)
			.sort()
			.reduce<Record<string, unknown>>((acc, key) => {
				acc[key] = metadata[key];
				return acc;
			}, {})
	);
}

export function toDate(value: unknown): Date | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}

	if (typeof value === "string" || typeof value === "number") {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	return null;
}
