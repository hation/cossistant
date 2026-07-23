CREATE TYPE "public"."conversation_timeline_type" AS ENUM('message', 'event');--> statement-breakpoint
ALTER TYPE "public"."message_visibility" RENAME TO "item_visibility";--> statement-breakpoint
CREATE TABLE "conversation_timeline_item" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"conversation_id" varchar(18) NOT NULL,
	"organization_id" varchar(26) NOT NULL,
	"visibility" "item_visibility" DEFAULT 'public' NOT NULL,
	"type" "conversation_timeline_type" NOT NULL,
	"text" text,
	"parts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"user_id" varchar(26),
	"visitor_id" varchar(26),
	"ai_agent_id" varchar(26),
	"created_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
DROP TABLE "conversation_event" CASCADE;--> statement-breakpoint
DROP TABLE "message" CASCADE;--> statement-breakpoint
ALTER TABLE "conversation_timeline_item" ADD CONSTRAINT "conversation_timeline_item_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_timeline_item" ADD CONSTRAINT "conversation_timeline_item_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_timeline_item" ADD CONSTRAINT "conversation_timeline_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_timeline_item" ADD CONSTRAINT "conversation_timeline_item_visitor_id_visitor_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_timeline_item" ADD CONSTRAINT "conversation_timeline_item_ai_agent_id_ai_agent_id_fk" FOREIGN KEY ("ai_agent_id") REFERENCES "public"."ai_agent"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_timeline_item_org_conv_idx" ON "conversation_timeline_item" USING btree ("organization_id","conversation_id");--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "read_by";