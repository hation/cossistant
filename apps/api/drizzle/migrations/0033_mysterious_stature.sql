ALTER TYPE "public"."conversation_event_type" ADD VALUE IF NOT EXISTS 'ai_analyzed';--> statement-breakpoint
ALTER TYPE "public"."conversation_event_type" ADD VALUE IF NOT EXISTS 'title_generated';--> statement-breakpoint
ALTER TYPE "public"."conversation_event_type" ADD VALUE IF NOT EXISTS 'ai_escalated';--> statement-breakpoint
ALTER TABLE "ai_agent" ADD COLUMN "behavior_settings" jsonb;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "escalated_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "escalated_by_ai_agent_id" varchar(26);--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "escalation_reason" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "ai_paused_until" timestamp;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_escalated_by_ai_agent_id_ai_agent_id_fk" FOREIGN KEY ("escalated_by_ai_agent_id") REFERENCES "public"."ai_agent"("id") ON DELETE set null ON UPDATE no action;