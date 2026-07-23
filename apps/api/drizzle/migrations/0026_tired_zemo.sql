CREATE TYPE "public"."link_source_status" AS ENUM('pending', 'crawling', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "link_source" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"organization_id" varchar(26) NOT NULL,
	"website_id" varchar(26) NOT NULL,
	"ai_agent_id" varchar(26),
	"url" text NOT NULL,
	"status" "link_source_status" DEFAULT 'pending' NOT NULL,
	"firecrawl_job_id" text,
	"crawled_pages_count" integer DEFAULT 0 NOT NULL,
	"total_size_bytes" bigint DEFAULT 0 NOT NULL,
	"last_crawled_at" timestamp,
	"error_message" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "knowledge" ADD COLUMN "link_source_id" varchar(26);--> statement-breakpoint
ALTER TABLE "knowledge" ADD COLUMN "is_included" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge" ADD COLUMN "size_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "link_source" ADD CONSTRAINT "link_source_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_source" ADD CONSTRAINT "link_source_website_id_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."website"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_source" ADD CONSTRAINT "link_source_ai_agent_id_ai_agent_id_fk" FOREIGN KEY ("ai_agent_id") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_source_website_idx" ON "link_source" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "link_source_agent_idx" ON "link_source" USING btree ("ai_agent_id");--> statement-breakpoint
CREATE INDEX "link_source_deleted_at_idx" ON "link_source" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "link_source_status_idx" ON "link_source" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "link_source_url_unique_idx" ON "link_source" USING btree ("website_id","ai_agent_id","url");--> statement-breakpoint
CREATE INDEX "knowledge_link_source_idx" ON "knowledge" USING btree ("link_source_id");--> statement-breakpoint
CREATE INDEX "knowledge_included_idx" ON "knowledge" USING btree ("is_included");