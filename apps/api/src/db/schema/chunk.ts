import {
	type InferInsertModel,
	type InferSelectModel,
	relations,
} from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	vector,
} from "drizzle-orm/pg-core";
import {
	ulidNullableReference,
	ulidPrimaryKey,
	ulidReference,
} from "../../utils/db/ids";
import { isoTimestamp as timestamp } from "../../utils/db/timestamp";
import { knowledge } from "./knowledge";
import { contact, visitor, website } from "./website";

/**
 * Chunk table for storing document chunks with vector embeddings.
 * Used for RAG (Retrieval-Augmented Generation) in the AI agent system.
 *
 * Chunks can be sourced from:
 * - Knowledge entries (articles, FAQs, URLs)
 * - Visitor memories/preferences
 * - Contact memories/preferences
 */
export const chunk = pgTable(
	"chunk",
	{
		id: ulidPrimaryKey("id"),
		// Website is REQUIRED - ensures data isolation between websites
		websiteId: ulidReference("website_id")
			.notNull()
			.references(() => website.id, { onDelete: "cascade" }),
		// Source references (nullable - depends on sourceType)
		knowledgeId: ulidNullableReference("knowledge_id").references(
			() => knowledge.id,
			{
				onDelete: "cascade",
			}
		),
		// Visitor/Contact references (visitors can be linked to contacts)
		visitorId: ulidNullableReference("visitor_id").references(
			() => visitor.id,
			{
				onDelete: "cascade",
			}
		),
		contactId: ulidNullableReference("contact_id").references(
			() => contact.id,
			{
				onDelete: "cascade",
			}
		),
		// Type discriminator: 'knowledge' | 'visitor_memory' | 'contact_memory'
		sourceType: text("source_type").notNull(),
		// The actual chunk content
		content: text("content").notNull(),
		// OpenAI text-embedding-3-small produces 1536-dimensional vectors
		embedding: vector("embedding", { dimensions: 1536 }),
		// Chunk position in original document
		chunkIndex: integer("chunk_index"),
		// Additional metadata (title, url, etc.)
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at")
			.$defaultFn(() => new Date().toISOString())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => new Date().toISOString())
			.notNull(),
	},
	(table) => [
		// HNSW index for fast vector similarity search
		index("chunk_embedding_idx").using(
			"hnsw",
			table.embedding.op("vector_cosine_ops")
		),
		// Query pattern indexes
		index("chunk_knowledge_idx").on(table.knowledgeId),
		index("chunk_website_idx").on(table.websiteId),
		index("chunk_visitor_idx").on(table.visitorId),
		index("chunk_contact_idx").on(table.contactId),
		index("chunk_source_type_idx").on(table.sourceType),
		// Composite index for common query patterns
		index("chunk_website_source_type_idx").on(
			table.websiteId,
			table.sourceType
		),
	]
);

export const chunkRelations = relations(chunk, ({ one }) => ({
	website: one(website, {
		fields: [chunk.websiteId],
		references: [website.id],
	}),
	knowledge: one(knowledge, {
		fields: [chunk.knowledgeId],
		references: [knowledge.id],
	}),
	visitor: one(visitor, {
		fields: [chunk.visitorId],
		references: [visitor.id],
	}),
	contact: one(contact, {
		fields: [chunk.contactId],
		references: [contact.id],
	}),
}));

export type ChunkSelect = InferSelectModel<typeof chunk>;
export type ChunkInsert = InferInsertModel<typeof chunk>;
