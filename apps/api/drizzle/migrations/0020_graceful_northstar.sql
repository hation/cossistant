ALTER TYPE "public"."conversation_event_type" ADD VALUE IF NOT EXISTS 'visitor_blocked';--> statement-breakpoint
ALTER TYPE "public"."conversation_event_type" ADD VALUE IF NOT EXISTS 'visitor_unblocked';--> statement-breakpoint
DROP INDEX IF EXISTS "conversation_timeline_item_org_conv_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_website_org_deleted_idx" ON "conversation" USING btree ("website_id","organization_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_timeline_item_org_conv_visibility_idx" ON "conversation_timeline_item" USING btree ("organization_id","conversation_id","visibility");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_timeline_item_org_type_deleted_idx" ON "conversation_timeline_item" USING btree ("organization_id","type","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_website_org_deleted_idx" ON "contact" USING btree ("website_id","organization_id","deleted_at");