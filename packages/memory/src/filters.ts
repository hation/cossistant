import { and, or, type SQL, sql } from "drizzle-orm";
import { MemoryQueryError } from "./errors";
import { memoryRecords } from "./schema";
import type { MemoryMetadata, MemoryWhere } from "./types";
import { RESERVED_SUMMARY_KIND } from "./validation";

type SqlCondition = SQL<unknown>;
type AndMemoryWhere = {
	and: MemoryWhere[];
};
type OrMemoryWhere = {
	or: MemoryWhere[];
};

function buildMetadataContainsCondition(
	metadata: MemoryMetadata
): SqlCondition {
	return sql`${memoryRecords.metadata} @> ${JSON.stringify(metadata)}::jsonb`;
}

function isLogicalWhereNode(value: MemoryWhere, key: "and" | "or"): boolean {
	return (
		typeof value === "object" &&
		value !== null &&
		key in value &&
		Object.keys(value).length === 1 &&
		Array.isArray((value as Record<string, unknown>)[key])
	);
}

function isAndWhereNode(value: MemoryWhere): value is AndMemoryWhere {
	return isLogicalWhereNode(value, "and");
}

function isOrWhereNode(value: MemoryWhere): value is OrMemoryWhere {
	return isLogicalWhereNode(value, "or");
}

function combineLogicalConditions(
	operator: "and" | "or",
	conditions: SqlCondition[]
): SqlCondition {
	const [first, ...rest] = conditions;

	if (!first) {
		throw new MemoryQueryError(
			"Memory filter cannot compile an empty logical node"
		);
	}

	if (rest.length === 0) {
		return first;
	}

	return operator === "and"
		? (and(first, ...rest) ?? first)
		: (or(first, ...rest) ?? first);
}

export function compileMemoryWhere(
	where?: MemoryWhere
): SqlCondition | undefined {
	if (where === undefined) {
		return;
	}

	if (isAndWhereNode(where)) {
		return combineLogicalConditions(
			"and",
			where.and
				.map((entry) => compileMemoryWhere(entry))
				.filter(
					(condition): condition is SqlCondition => condition !== undefined
				)
		);
	}

	if (isOrWhereNode(where)) {
		return combineLogicalConditions(
			"or",
			where.or
				.map((entry) => compileMemoryWhere(entry))
				.filter(
					(condition): condition is SqlCondition => condition !== undefined
				)
		);
	}

	return buildMetadataContainsCondition(where as MemoryMetadata);
}

export function buildIdEqualsCondition(id: string): SqlCondition {
	return sql`${memoryRecords.id}::text = ${id}`;
}

export function buildSummaryOnlyCondition(): SqlCondition {
	return buildMetadataContainsCondition({ kind: RESERVED_SUMMARY_KIND });
}

export function buildExcludeSummaryCondition(): SqlCondition {
	return sql`not (${buildSummaryOnlyCondition()})`;
}
