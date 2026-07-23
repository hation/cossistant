import { describe, expect, it } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm/sql";
import { Memory } from "./memory";
import type { MemoryRepository } from "./repositories/memory-repository";
import type { MemoryRecordInsert, MemoryRecordRow } from "./schema";
import type { MemoryEmbeddingModel, MemoryOptions } from "./types";

const dialect = new PgDialect();

function createDbStub(): MemoryOptions["db"] {
	return {
		delete() {},
		execute() {},
		insert() {},
		select() {},
		transaction() {},
		update() {},
	} as unknown as MemoryOptions["db"];
}

function createRow(overrides: Partial<MemoryRecordRow> = {}): MemoryRecordRow {
	return {
		id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
		content: "Stored memory",
		metadata: {},
		priority: 1,
		embedding: null,
		source: "system",
		createdAt: new Date("2026-03-22T10:00:00.000Z"),
		updatedAt: new Date("2026-03-22T10:00:00.000Z"),
		...overrides,
	};
}

function createRepository(
	overrides: Partial<MemoryRepository> = {}
): MemoryRepository {
	return {
		deleteById: async () => 0,
		deleteByWhere: async () => 0,
		findSemanticCandidates: async () => [],
		findStoredSummary: async () => {
			return;
		},
		findStructuralCandidates: async () => [],
		insertMemoryRecord: async (input: MemoryRecordInsert) =>
			createRow({
				content: input.content,
				metadata: input.metadata,
				priority: input.priority,
				embedding: input.embedding ?? null,
				source: input.source ?? null,
				createdAt: input.createdAt,
				updatedAt: input.updatedAt,
			}),
		...overrides,
	};
}

function attachRepository(memory: Memory, repository: MemoryRepository): void {
	(
		memory as unknown as {
			repository: MemoryRepository;
		}
	).repository = repository;
}

function createEmbedding(values: number[]): number[] {
	return [...values, ...Array.from({ length: 1536 - values.length }, () => 0)];
}

function createEmbeddingModel(
	mapper: (value: string) => number[]
): MemoryEmbeddingModel {
	return {
		specificationVersion: "v3",
		provider: "memory-test",
		modelId: "memory-test-embed",
		maxEmbeddingsPerCall: 32,
		supportsParallelCalls: true,
		async doEmbed(options) {
			return {
				embeddings: options.values.map((value) => mapper(value)),
				warnings: [],
			};
		},
	} as MemoryEmbeddingModel;
}

function toSql(condition: SQL<unknown>): {
	sql: string;
	params: unknown[];
} {
	const query = dialect.sqlToQuery(condition);
	return {
		sql: query.sql,
		params: query.params,
	};
}

describe("Memory", () => {
	it("constructs with a postgres drizzle database config", () => {
		const memory = new Memory({
			db: createDbStub(),
		});

		expect(memory).toBeInstanceOf(Memory);
	});

	it("rejects non-drizzle database-like values", () => {
		expect(
			() =>
				new Memory({
					db: {} as MemoryOptions["db"],
				})
		).toThrow(/Drizzle PostgreSQL database instance/);
	});

	it("rejects database-like values that do not expose execute", () => {
		expect(
			() =>
				new Memory({
					db: {
						delete() {},
						insert() {},
						select() {},
						transaction() {},
						update() {},
					} as unknown as MemoryOptions["db"],
				})
		).toThrow(/Drizzle PostgreSQL database instance/);
	});

	it("rejects string model ids in the models object", () => {
		expect(
			() =>
				new Memory({
					db: createDbStub(),
					models: {
						embed: "openai/text-embedding-3-small",
					} as unknown as MemoryOptions["models"],
				})
		).toThrow(/must be an AI SDK model instance/);
	});

	it("remember stores normalized input and returns the inserted string id", async () => {
		const now = new Date("2026-03-22T10:00:00.000Z");
		let insertedRecord: MemoryRecordInsert | undefined;

		const memory = new Memory({
			db: createDbStub(),
			models: {
				embed: createEmbeddingModel((value) =>
					value.includes("Stripe")
						? createEmbedding([1, 0])
						: createEmbedding([0, 1])
				),
			},
			now: () => now,
		});

		attachRepository(
			memory,
			createRepository({
				insertMemoryRecord: async (input) => {
					insertedRecord = input;
					return createRow({
						id: "01JV0M2T2BEMM3J4Z6R2J7D1PH",
						content: input.content,
						metadata: input.metadata,
						priority: input.priority,
						embedding: input.embedding ?? null,
						source: input.source ?? null,
						createdAt: input.createdAt,
						updatedAt: input.updatedAt,
					});
				},
			})
		);

		const result = await memory.remember({
			content: "User already shared Stripe webhook logs",
		});

		expect(result).toEqual({
			id: "01JV0M2T2BEMM3J4Z6R2J7D1PH",
			createdAt: now,
		});
		expect(insertedRecord).toMatchObject({
			content: "User already shared Stripe webhook logs",
			metadata: {},
			priority: 1,
			source: "system",
			createdAt: now,
		});
		expect(insertedRecord?.updatedAt.toISOString()).toBe(now.toISOString());
		expect(insertedRecord?.embedding?.slice(0, 2)).toEqual([1, 0]);
	});

	it("context ranks merged candidates, applies semantic retrieval, and returns stored summaries separately", async () => {
		const now = new Date("2026-03-22T12:00:00.000Z");
		let queryEmbedding: number[] | undefined;

		const memory = new Memory({
			db: createDbStub(),
			models: {
				embed: createEmbeddingModel((value) =>
					value.includes("billing")
						? createEmbedding([1, 0])
						: createEmbedding([0, 1])
				),
			},
			now: () => now,
		});

		attachRepository(
			memory,
			createRepository({
				findStructuralCandidates: async () => [
					createRow({
						id: "01RECENTLOW000000000000000",
						content: "Recent support note",
						metadata: { kind: "note", userId: "user_1" },
						priority: 1,
						createdAt: new Date("2026-03-22T11:30:00.000Z"),
						updatedAt: new Date("2026-03-22T11:30:00.000Z"),
					}),
					createRow({
						id: "550e8400-e29b-41d4-a716-446655440000",
						content: "Critical billing issue after upgrading Next.js",
						metadata: { kind: "note", userId: "user_1" },
						priority: 5,
						createdAt: new Date("2026-03-10T08:00:00.000Z"),
						updatedAt: new Date("2026-03-10T08:00:00.000Z"),
					}),
					createRow({
						id: "01DUPLICATE0000000000000000",
						content: "Critical billing issue after upgrading Next.js",
						metadata: { kind: "note", userId: "user_1" },
						priority: 4,
						createdAt: new Date("2026-03-09T08:00:00.000Z"),
						updatedAt: new Date("2026-03-09T08:00:00.000Z"),
					}),
				],
				findSemanticCandidates: async (params) => {
					queryEmbedding = params.queryEmbedding;

					return [
						{
							...createRow({
								id: "550e8400-e29b-41d4-a716-446655440000",
								content: "Critical billing issue after upgrading Next.js",
								metadata: { kind: "note", userId: "user_1" },
								priority: 5,
								createdAt: new Date("2026-03-10T08:00:00.000Z"),
								updatedAt: new Date("2026-03-10T08:00:00.000Z"),
							}),
							similarity: 0.98,
						},
					];
				},
				findStoredSummary: async () =>
					createRow({
						id: "01SUMMARY00000000000000000",
						content:
							"Earlier billing debugging has already covered webhook logs and deploy history.",
						metadata: { kind: "summary", userId: "user_1" },
						createdAt: new Date("2026-03-20T00:00:00.000Z"),
						updatedAt: new Date("2026-03-20T00:00:00.000Z"),
					}),
			})
		);

		const result = await memory.context({
			where: {
				and: [{ userId: "user_1" }, { kind: "note" }],
			},
			text: "billing failure after deploy",
			limit: 2,
			includeSummary: true,
		});

		expect(queryEmbedding?.slice(0, 2)).toEqual([1, 0]);
		expect(result.summary).toBe(
			"Earlier billing debugging has already covered webhook logs and deploy history."
		);
		expect(result.items).toHaveLength(2);
		expect(result.items.map((item) => item.id)).toEqual([
			"550e8400-e29b-41d4-a716-446655440000",
			"01RECENTLOW000000000000000",
		]);
		expect(result.items[0]?.score).toBeDefined();
	});

	it("forget deletes by opaque string id", async () => {
		let deletedId: string | undefined;

		const memory = new Memory({
			db: createDbStub(),
		});

		attachRepository(
			memory,
			createRepository({
				deleteById: async (id) => {
					deletedId = id;
					return 1;
				},
			})
		);

		const result = await memory.forget({
			id: "01JV0M2T2BEMM3J4Z6R2J7D1PH",
		});

		expect(deletedId).toBe("01JV0M2T2BEMM3J4Z6R2J7D1PH");
		expect(result).toEqual({ deletedCount: 1 });
	});

	it("forget compiles where filters before deleting", async () => {
		let deleteWhere: SQL<unknown> | undefined;

		const memory = new Memory({
			db: createDbStub(),
		});

		attachRepository(
			memory,
			createRepository({
				deleteByWhere: async (where) => {
					deleteWhere = where;
					return 2;
				},
			})
		);

		const result = await memory.forget({
			where: {
				and: [{ userId: "user_1" }, { topic: "billing" }],
			},
		});

		expect(result).toEqual({ deletedCount: 2 });
		expect(deleteWhere).toBeDefined();

		if (!deleteWhere) {
			throw new Error("Expected compiled delete filter");
		}

		expect(toSql(deleteWhere).params).toEqual([
			'{"userId":"user_1"}',
			'{"topic":"billing"}',
		]);
	});
});
