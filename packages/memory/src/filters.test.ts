import { describe, expect, it } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import {
	buildExcludeSummaryCondition,
	buildIdEqualsCondition,
	buildSummaryOnlyCondition,
	compileMemoryWhere,
} from "./filters";

const dialect = new PgDialect();

function toSql(condition: ReturnType<typeof compileMemoryWhere>) {
	if (condition === undefined) {
		throw new Error("Expected compiled SQL condition");
	}

	return dialect.sqlToQuery(condition);
}

describe("filters", () => {
	it("compiles equality filters with jsonb containment", () => {
		const query = toSql(compileMemoryWhere({ userId: "user_1" }));

		expect(query.sql).toContain(`"memory_records"."metadata" @> $1::jsonb`);
		expect(query.params).toEqual(['{"userId":"user_1"}']);
	});

	it("compiles nested and/or filters deterministically", () => {
		const query = toSql(
			compileMemoryWhere({
				and: [
					{ appId: "app_1" },
					{
						or: [{ conversationId: "conv_1" }, { topic: "billing" }],
					},
				],
			})
		);

		expect(query.sql).toBe(
			'("memory_records"."metadata" @> $1::jsonb and ("memory_records"."metadata" @> $2::jsonb or "memory_records"."metadata" @> $3::jsonb))'
		);
		expect(query.params).toEqual([
			'{"appId":"app_1"}',
			'{"conversationId":"conv_1"}',
			'{"topic":"billing"}',
		]);
	});

	it("supports numeric, boolean, and null metadata values", () => {
		const query = toSql(
			compileMemoryWhere({
				priorityBand: 2,
				isPinned: true,
				archivedAt: null,
			})
		);

		expect(query.params).toEqual([
			'{"priorityBand":2,"isPinned":true,"archivedAt":null}',
		]);
	});

	it("treats ids as opaque strings in delete filters", () => {
		const query = dialect.sqlToQuery(
			buildIdEqualsCondition("550e8400-e29b-41d4-a716-446655440000")
		);

		expect(query.sql).toBe(`"memory_records"."id"::text = $1`);
		expect(query.params).toEqual(["550e8400-e29b-41d4-a716-446655440000"]);
	});

	it("builds explicit summary include/exclude conditions", () => {
		const includeQuery = dialect.sqlToQuery(buildSummaryOnlyCondition());
		const excludeQuery = dialect.sqlToQuery(buildExcludeSummaryCondition());

		expect(includeQuery.params).toEqual(['{"kind":"summary"}']);
		expect(excludeQuery.sql).toContain("not");
	});
});
