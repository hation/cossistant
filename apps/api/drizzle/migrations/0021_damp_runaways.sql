ALTER TYPE "public"."conversation_event_type" ADD VALUE 'visitor_identified';--> statement-breakpoint
ALTER TYPE "public"."conversation_timeline_type" ADD VALUE 'identification';--> statement-breakpoint
CREATE TABLE "member_notification_setting" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"member_id" varchar(26) NOT NULL,
	"organization_id" varchar(26) NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean NOT NULL,
	"config" jsonb,
	"priority" integer NOT NULL,
	"delay_seconds" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "notification_settings" jsonb;--> statement-breakpoint
ALTER TABLE "member_notification_setting" ADD CONSTRAINT "member_notification_setting_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_notification_setting" ADD CONSTRAINT "member_notification_setting_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_notification_setting_member_idx" ON "member_notification_setting" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_notification_setting_org_idx" ON "member_notification_setting" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_notification_setting_channel_idx" ON "member_notification_setting" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "member_notification_setting_priority_idx" ON "member_notification_setting" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "member_notification_setting_member_channel_idx" ON "member_notification_setting" USING btree ("member_id","channel");