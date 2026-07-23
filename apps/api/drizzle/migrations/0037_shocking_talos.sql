ALTER TABLE "conversation" ADD COLUMN "visitor_rating" integer;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "visitor_rating_at" timestamp;--> statement-breakpoint
CREATE INDEX "conversation_org_website_started_idx" ON "conversation" USING btree ("organization_id","website_id","started_at","deleted_at");--> statement-breakpoint
CREATE INDEX "conversation_org_website_first_response_idx" ON "conversation" USING btree ("organization_id","website_id","first_response_at","deleted_at");--> statement-breakpoint
CREATE INDEX "conversation_org_website_resolved_idx" ON "conversation" USING btree ("organization_id","website_id","resolved_at","deleted_at");--> statement-breakpoint
CREATE INDEX "conversation_org_website_rating_idx" ON "conversation" USING btree ("organization_id","website_id","visitor_rating_at","deleted_at");--> statement-breakpoint
CREATE INDEX "visitor_org_website_last_seen_idx" ON "visitor" USING btree ("organization_id","website_id","last_seen_at","deleted_at");