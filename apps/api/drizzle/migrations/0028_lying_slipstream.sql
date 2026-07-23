DROP INDEX "knowledge_scope_hash_idx";--> statement-breakpoint
DROP INDEX "link_source_url_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_scope_hash_idx" ON "knowledge" USING btree ("website_id",coalesce("ai_agent_id", '00000000000000000000000000'),"content_hash") WHERE "knowledge"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "link_source_url_unique_idx" ON "link_source" USING btree ("website_id","ai_agent_id","url") WHERE "link_source"."deleted_at" is null;