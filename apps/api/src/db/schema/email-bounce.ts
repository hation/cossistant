import { ulidPrimaryKey, ulidReference } from "@api/utils/db/ids";
import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";

/**
 * Email bounce tracking table
 * Stores bounce, complaint, and failure information from Resend webhooks
 * Used to suppress future sends to protect email reputation
 */
export const emailBounceStatus = pgTable(
	"email_bounce_status",
	{
		id: ulidPrimaryKey("id"),
		email: varchar("email", { length: 255 }).notNull(),
		organizationId: ulidReference("organization_id")
			.notNull()
			.references(() => organization.id, {
				onDelete: "cascade",
			}),

		// Bounce information
		bounceType: text("bounce_type"), // "Permanent" | "Temporary" | null
		bounceSubType: text("bounce_sub_type"), // "Suppressed" | "General" | etc
		bounceMessage: text("bounce_message"),
		bouncedAt: timestamp("bounced_at"),

		// Complaint information
		complainedAt: timestamp("complained_at"),

		// Failure information
		lastFailureReason: text("last_failure_reason"),
		failedAt: timestamp("failed_at"),
		failureCount: varchar("failure_count", { length: 10 })
			.$defaultFn(() => "0")
			.notNull(),

		// Suppression status
		suppressed: boolean("suppressed")
			.$defaultFn(() => false)
			.notNull(),
		suppressedReason: text("suppressed_reason"), // "bounced" | "complained" | "failed_repeatedly"
		suppressedAt: timestamp("suppressed_at"),

		// Metadata
		lastEventId: varchar("last_event_id", { length: 255 }), // Resend event ID
		createdAt: timestamp("created_at")
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		// Unique constraint on email per organization
		uniqueIndex("email_bounce_status_email_org_idx").on(
			table.email,
			table.organizationId
		),
		// Index for quick suppression checks
		index("email_bounce_status_suppressed_idx").on(
			table.suppressed,
			table.email
		),
		// Index for organization queries
		index("email_bounce_status_org_idx").on(table.organizationId),
		// Index for bounce tracking
		index("email_bounce_status_bounced_idx").on(table.bouncedAt),
		// Index for complaint tracking
		index("email_bounce_status_complained_idx").on(table.complainedAt),
	]
);

export type EmailBounceStatusRecord = typeof emailBounceStatus.$inferSelect;
export type EmailBounceStatusInsert = typeof emailBounceStatus.$inferInsert;
