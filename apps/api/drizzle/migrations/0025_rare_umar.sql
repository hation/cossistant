CREATE TYPE "public"."knowledge_type" AS ENUM('url', 'faq', 'article');--> statement-breakpoint
CREATE TABLE "knowledge" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"organization_id" varchar(26) NOT NULL,
	"website_id" varchar(26) NOT NULL,
	"ai_agent_id" varchar(26),
	"type" "knowledge_type" NOT NULL,
	"source_url" text,
	"source_title" text,
	"origin" text NOT NULL,
	"created_by" text NOT NULL,
	"content_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ai_agent" ADD COLUMN "last_trained_at" timestamp;--> statement-breakpoint
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_website_id_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."website"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_ai_agent_id_ai_agent_id_fk" FOREIGN KEY ("ai_agent_id") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_agent_type_idx" ON "knowledge" USING btree ("ai_agent_id","type");--> statement-breakpoint
CREATE INDEX "knowledge_org_site_idx" ON "knowledge" USING btree ("organization_id","website_id");--> statement-breakpoint
CREATE INDEX "knowledge_deleted_at_idx" ON "knowledge" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "knowledge_website_type_idx" ON "knowledge" USING btree ("website_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_scope_hash_idx" ON "knowledge" USING btree ("website_id",coalesce("ai_agent_id", '00000000000000000000000000'),"content_hash");