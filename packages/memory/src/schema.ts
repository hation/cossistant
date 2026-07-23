import type { InferSelectModel } from "drizzle-orm";
import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	varchar,
	vector,
} from "drizzle-orm/pg-core";
import type { MemoryMetadata } from "./types";

/**
 * Runtime table contract used by the package for queries.
 *
 * The host app still owns the actual SQL migration. The package uses a matching
 * Drizzle table definition so it can issue typed queries against the fixed
 * `memory_records` contract.
 *
 * `id` is deliberately modeled as text here because the package treats it as an
 * opaque string and supports both ULID-backed and UUID-backed tables.
 */
export const memoryRecords = pgTable("memory_records", {
	id: text("id").primaryKey().notNull(),
	content: text("content").notNull(),
	metadata: jsonb("metadata").$type<MemoryMetadata>().notNull(),
	priority: integer("priority").notNull(),
	embedding: vector("embedding", { dimensions: 1536 }),
	source: varchar("source", { length: 32 }),
	createdAt: timestamp("created_at", {
		withTimezone: true,
		mode: "date",
	}).notNull(),
	updatedAt: timestamp("updated_at", {
		withTimezone: true,
		mode: "date",
	}).notNull(),
});

export type MemoryRecordRow = InferSelectModel<typeof memoryRecords>;
export type MemoryRecordInsert = {
	content: string;
	metadata: MemoryMetadata;
	priority: number;
	embedding?: number[] | null;
	source?: string | null;
	createdAt: Date;
	updatedAt: Date;
};
