ALTER TYPE "public"."link_source_status" ADD VALUE 'mapping' BEFORE 'crawling';--> statement-breakpoint
ALTER TABLE "link_source" ADD COLUMN "parent_link_source_id" varchar(26);--> statement-breakpoint
ALTER TABLE "link_source" ADD COLUMN "depth" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "link_source" ADD COLUMN "discovered_pages_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "link_source" ADD COLUMN "include_paths" text[];--> statement-breakpoint
ALTER TABLE "link_source" ADD COLUMN "exclude_paths" text[];--> statement-breakpoint
CREATE INDEX "link_source_parent_idx" ON "link_source" USING btree ("parent_link_source_id");