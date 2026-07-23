ALTER TABLE "ai_agent" ADD COLUMN "training_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agent" ADD COLUMN "training_progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_agent" ADD COLUMN "training_error" text;--> statement-breakpoint
ALTER TABLE "ai_agent" ADD COLUMN "training_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "ai_agent" ADD COLUMN "trained_items_count" integer;--> statement-breakpoint
CREATE INDEX "ai_agent_training_status_idx" ON "ai_agent" USING btree ("training_status");