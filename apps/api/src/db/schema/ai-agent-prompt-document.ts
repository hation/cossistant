import {
	type InferInsertModel,
	type InferSelectModel,
	relations,
} from "drizzle-orm";
import {
	boolean,
	index,
	integer,
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
import { organization, user } from "./auth";
import { website } from "./website";

export type AiAgentPromptDocumentKind = "core" | "skill";

export const aiAgentPromptDocument = pgTable(
	"ai_agent_prompt_document",
	{
		id: ulidPrimaryKey("id"),
		organizationId: ulidReference("organization_id").references(
			() => organization.id,
			{ onDelete: "cascade" }
		),
		websiteId: ulidReference("website_id").references(() => website.id, {
			onDelete: "cascade",
		}),
		aiAgentId: ulidReference("ai_agent_id").references(() => aiAgent.id, {
			onDelete: "cascade",
		}),
		kind: text("kind").$type<AiAgentPromptDocumentKind>().notNull(),
		name: text("name").notNull(),
		content: text("content").notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		priority: integer("priority").default(0).notNull(),
		createdByUserId: ulidNullableReference("created_by_user_id").references(
			() => user.id,
			{ onDelete: "set null" }
		),
		updatedByUserId: ulidNullableReference("updated_by_user_id").references(
			() => user.id,
			{ onDelete: "set null" }
		),
		createdAt: timestamp("created_at")
			.$defaultFn(() => new Date().toISOString())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => new Date().toISOString())
			.notNull(),
	},
	(table) => [
		index("ai_agent_prompt_document_scope_idx").on(
			table.organizationId,
			table.websiteId,
			table.aiAgentId
		),
		index("ai_agent_prompt_document_kind_enabled_idx").on(
			table.aiAgentId,
			table.kind,
			table.enabled,
			table.priority
		),
		uniqueIndex("ai_agent_prompt_document_unique_name_per_agent").on(
			table.organizationId,
			table.websiteId,
			table.aiAgentId,
			table.name
		),
	]
);

export const aiAgentPromptDocumentRelations = relations(
	aiAgentPromptDocument,
	({ one }) => ({
		organization: one(organization, {
			fields: [aiAgentPromptDocument.organizationId],
			references: [organization.id],
		}),
		website: one(website, {
			fields: [aiAgentPromptDocument.websiteId],
			references: [website.id],
		}),
		aiAgent: one(aiAgent, {
			fields: [aiAgentPromptDocument.aiAgentId],
			references: [aiAgent.id],
		}),
		createdByUser: one(user, {
			fields: [aiAgentPromptDocument.createdByUserId],
			references: [user.id],
		}),
		updatedByUser: one(user, {
			fields: [aiAgentPromptDocument.updatedByUserId],
			references: [user.id],
		}),
	})
);

export type AiAgentPromptDocumentSelect = InferSelectModel<
	typeof aiAgentPromptDocument
>;
export type AiAgentPromptDocumentInsert = InferInsertModel<
	typeof aiAgentPromptDocument
>;
