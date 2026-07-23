import {
	and,
	cosineDistance,
	desc,
	isNotNull,
	type SQL,
	sql,
} from "drizzle-orm";
import { MemoryQueryError } from "../errors";
import {
	buildExcludeSummaryCondition,
	buildIdEqualsCondition,
	buildSummaryOnlyCondition,
} from "../filters";
import {
	type MemoryRecordInsert,
	type MemoryRecordRow,
	memoryRecords,
} from "../schema";
import type { MemoryDatabase } from "../types";

type SqlCondition = SQL<unknown>;
type MemoryCandidateRow = Pick<
	MemoryRecordRow,
	"id" | "content" | "metadata" | "priority" | "createdAt" | "updatedAt"
>;

type SemanticCandidateRow = MemoryCandidateRow & {
	similarity: number;
};

function combineConditions(
	conditions: Array<SqlCondition | undefined>
): SqlCondition | undefined {
	const definedConditions = conditions.filter(
		(condition): condition is SqlCondition => condition !== undefined
	);

	if (definedConditions.length === 0) {
		return;
	}

	const [first, ...rest] = definedConditions;

	if (!first) {
		return;
	}

	if (rest.length === 0) {
		return first;
	}

	return and(first, ...rest) ?? first;
}

export function createMemoryRepository(db: MemoryDatabase) {
	async function insertMemoryRecord(
		input: MemoryRecordInsert
	): Promise<MemoryRecordRow> {
		try {
			const result = await db.execute(sql<MemoryRecordRow>`
				insert into memory_records (
					content,
					metadata,
					priority,
					embedding,
					source,
					created_at,
					updated_at
				)
				values (
					${input.content},
					${JSON.stringify(input.metadata)}::jsonb,
					${input.priority},
					${input.embedding ?? null},
					${input.source ?? null},
					${input.createdAt},
					${input.updatedAt}
				)
				returning
					id,
					content,
					metadata,
					priority,
					embedding,
					source,
					created_at as "createdAt",
					updated_at as "updatedAt"
			`);
			const [row] = result.rows as MemoryRecordRow[];

			if (!row) {
				throw new MemoryQueryError("Failed to insert memory record");
			}

			return row;
		} catch (cause) {
			throw new MemoryQueryError("Failed to insert memory record", { cause });
		}
	}

	async function findStructuralCandidates(params: {
		where?: SqlCondition;
		limit: number;
	}): Promise<MemoryCandidateRow[]> {
		const condition = combineConditions([
			params.where,
			buildExcludeSummaryCondition(),
		]);

		try {
			const query = db
				.select({
					id: memoryRecords.id,
					content: memoryRecords.content,
					metadata: memoryRecords.metadata,
					priority: memoryRecords.priority,
					createdAt: memoryRecords.createdAt,
					updatedAt: memoryRecords.updatedAt,
				})
				.from(memoryRecords);

			const scopedQuery =
				condition === undefined ? query : query.where(condition);

			return await scopedQuery
				.orderBy(desc(memoryRecords.priority), desc(memoryRecords.createdAt))
				.limit(params.limit);
		} catch (cause) {
			throw new MemoryQueryError("Failed to load memory candidates", { cause });
		}
	}

	async function findSemanticCandidates(params: {
		where?: SqlCondition;
		limit: number;
		queryEmbedding: number[];
	}): Promise<SemanticCandidateRow[]> {
		const condition = combineConditions([
			params.where,
			buildExcludeSummaryCondition(),
			isNotNull(memoryRecords.embedding),
		]);

		const similarity = sql<number>`1 - (${cosineDistance(
			memoryRecords.embedding,
			params.queryEmbedding
		)})`;

		try {
			const query = db
				.select({
					id: memoryRecords.id,
					content: memoryRecords.content,
					metadata: memoryRecords.metadata,
					priority: memoryRecords.priority,
					createdAt: memoryRecords.createdAt,
					updatedAt: memoryRecords.updatedAt,
					similarity,
				})
				.from(memoryRecords);

			const scopedQuery =
				condition === undefined ? query : query.where(condition);

			return await scopedQuery
				.orderBy(
					desc(similarity),
					desc(memoryRecords.priority),
					desc(memoryRecords.createdAt)
				)
				.limit(params.limit);
		} catch (cause) {
			throw new MemoryQueryError("Failed to load semantic memory candidates", {
				cause,
			});
		}
	}

	async function findStoredSummary(params: {
		where?: SqlCondition;
	}): Promise<MemoryCandidateRow | undefined> {
		const condition = combineConditions([
			params.where,
			buildSummaryOnlyCondition(),
		]);

		try {
			const query = db
				.select({
					id: memoryRecords.id,
					content: memoryRecords.content,
					metadata: memoryRecords.metadata,
					priority: memoryRecords.priority,
					createdAt: memoryRecords.createdAt,
					updatedAt: memoryRecords.updatedAt,
				})
				.from(memoryRecords);

			const scopedQuery =
				condition === undefined ? query : query.where(condition);

			const [row] = await scopedQuery
				.orderBy(desc(memoryRecords.createdAt))
				.limit(1);

			return row;
		} catch (cause) {
			throw new MemoryQueryError("Failed to load stored memory summary", {
				cause,
			});
		}
	}

	async function deleteById(id: string): Promise<number> {
		try {
			const rows = await db
				.delete(memoryRecords)
				.where(buildIdEqualsCondition(id))
				.returning({ id: memoryRecords.id });

			return rows.length;
		} catch (cause) {
			throw new MemoryQueryError("Failed to delete memory by id", { cause });
		}
	}

	async function deleteByWhere(where: SqlCondition): Promise<number> {
		try {
			const rows = await db
				.delete(memoryRecords)
				.where(where)
				.returning({ id: memoryRecords.id });

			return rows.length;
		} catch (cause) {
			throw new MemoryQueryError("Failed to delete memory by filter", {
				cause,
			});
		}
	}

	return {
		deleteById,
		deleteByWhere,
		findSemanticCandidates,
		findStoredSummary,
		findStructuralCandidates,
		insertMemoryRecord,
	};
}

export type MemoryRepository = ReturnType<typeof createMemoryRepository>;
