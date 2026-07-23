import {
	type InferInsertModel,
	type InferSelectModel,
	isNull,
	relations,
	sql,
} from "drizzle-orm";
import {
	bigint,
	boolean,
	index,
	jsonb,
	pgEnum,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import {
	ulidNullableReference,
	ulidPrimaryKey,
	ulidReference,
} from "../../utils/db/ids";
import { isoTimestamp as timestamp } from "../../utils/db/timestamp";
import { aiAgent } from "./ai-agent";
import { organization } from "./auth";
// Note: linkSource is imported lazily in relations to avoid circular dependency
import { website } from "./website";

export const knowledgeTypeEnum = pgEnum("knowledge_type", [
	"url",
	"faq",
	"article",
]);

export const knowledge = pgTable(
	"knowledge",
	{
		id: ulidPrimaryKey("id"),
		organizationId: ulidReference("organization_id").references(
			() => organization.id,
			{ onDelete: "cascade" }
		),
		websiteId: ulidReference("website_id").references(() => website.id, {
			onDelete: "cascade",
		}),
		aiAgentId: ulidNullableReference("ai_agent_id").references(
			() => aiAgent.id,
			{
				onDelete: "cascade",
			}
		),
		// Reference to the link source that created this knowledge entry (for URL type)
		linkSourceId: ulidNullableReference("link_source_id"),
		type: knowledgeTypeEnum("type").notNull(),
		sourceUrl: text("source_url"),
		sourceTitle: text("source_title"),
		origin: text("origin").notNull(),
		createdBy: text("created_by").notNull(),
		contentHash: text("content_hash").notNull(),
		payload: jsonb("payload").notNull(),
		metadata: jsonb("metadata"),
		// Whether this knowledge entry is included in training (for selective inclusion)
		isIncluded: boolean("is_included").default(true).notNull(),
		// Size in bytes for plan limit tracking
		sizeBytes: bigint("size_bytes", { mode: "number" }).default(0).notNull(),
		createdAt: timestamp("created_at")
			.$defaultFn(() => new Date().toISOString())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => new Date().toISOString())
			.notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("knowledge_agent_type_idx").on(table.aiAgentId, table.type),
		index("knowledge_org_site_idx").on(table.organizationId, table.websiteId),
		index("knowledge_deleted_at_idx").on(table.deletedAt),
		// Index for filtering by website + type (common list query pattern)
		index("knowledge_website_type_idx").on(table.websiteId, table.type),
		// Index for filtering by link source
		index("knowledge_link_source_idx").on(table.linkSourceId),
		// Index for included knowledge (for training queries)
		index("knowledge_included_idx").on(table.isIncluded),
		// Unique constraint (partial index excluding soft-deleted)
		uniqueIndex("knowledge_scope_hash_idx")
			.on(
				table.websiteId,
				sql`coalesce(${table.aiAgentId}, '00000000000000000000000000')`,
				table.contentHash
			)
			.where(isNull(table.deletedAt)),
	]
);

export const knowledgeRelations = relations(knowledge, ({ one }) => ({
	organization: one(organization, {
		fields: [knowledge.organizationId],
		references: [organization.id],
	}),
	website: one(website, {
		fields: [knowledge.websiteId],
		references: [website.id],
	}),
	agent: one(aiAgent, {
		fields: [knowledge.aiAgentId],
		references: [aiAgent.id],
	}),
}));

export type KnowledgeSelect = InferSelectModel<typeof knowledge>;
export type KnowledgeInsert = InferInsertModel<typeof knowledge>;
