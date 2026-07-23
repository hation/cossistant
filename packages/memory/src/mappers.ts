import { MemoryQueryError } from "./errors";
import type { MemoryRecordRow } from "./schema";
import type { MemoryItem, MemoryMetadata } from "./types";
import { toDate } from "./utils";
import { normalizeMemoryMetadata } from "./validation";

type MemoryRowLike = Pick<
	MemoryRecordRow,
	"id" | "content" | "metadata" | "priority" | "createdAt" | "updatedAt"
>;

function normalizeStoredMetadata(value: unknown): MemoryMetadata {
	try {
		return normalizeMemoryMetadata(value);
	} catch (cause) {
		throw new MemoryQueryError("Stored memory metadata is invalid", { cause });
	}
}

function normalizeStoredDate(value: unknown, label: string): Date {
	const date = toDate(value);

	if (date === null) {
		throw new MemoryQueryError(`Stored memory ${label} is invalid`);
	}

	return date;
}

export function mapRowToMemoryItem(
	row: MemoryRowLike,
	similarity?: number | null
): MemoryItem {
	if (typeof row.id !== "string" || row.id.length === 0) {
		throw new MemoryQueryError("Stored memory id must be a non-empty string");
	}

	if (typeof row.content !== "string" || row.content.length === 0) {
		throw new MemoryQueryError(
			"Stored memory content must be a non-empty string"
		);
	}

	if (!Number.isFinite(row.priority)) {
		throw new MemoryQueryError("Stored memory priority must be numeric");
	}

	return {
		id: row.id,
		content: row.content,
		metadata: normalizeStoredMetadata(row.metadata),
		priority: row.priority,
		createdAt: normalizeStoredDate(row.createdAt, "createdAt"),
		updatedAt: normalizeStoredDate(row.updatedAt, "updatedAt"),
		score: similarity ?? undefined,
	};
}
