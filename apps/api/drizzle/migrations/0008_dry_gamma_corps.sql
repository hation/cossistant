ALTER TABLE "visitor" RENAME COLUMN "last_connected_at" TO "last_seen_at";--> statement-breakpoint
DROP INDEX "visitor_org_connected_idx";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
CREATE INDEX "user_last_seen_at_idx" ON "user" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "visitor_org_last_seen_idx" ON "visitor" USING btree ("organization_id","last_seen_at");