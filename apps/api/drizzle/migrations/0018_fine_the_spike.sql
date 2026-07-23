ALTER TABLE "conversation" DROP CONSTRAINT "conversation_resolved_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation" DROP CONSTRAINT "conversation_resolved_by_ai_agent_id_ai_agent_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_timeline_item" DROP CONSTRAINT "conversation_timeline_item_ai_agent_id_ai_agent_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_resolved_by_ai_agent_id_ai_agent_id_fk" FOREIGN KEY ("resolved_by_ai_agent_id") REFERENCES "public"."ai_agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_timeline_item" ADD CONSTRAINT "conversation_timeline_item_ai_agent_id_ai_agent_id_fk" FOREIGN KEY ("ai_agent_id") REFERENCES "public"."ai_agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_timeline_item_conv_created_idx" ON "conversation_timeline_item" USING btree ("conversation_id","created_at","id");--> statement-breakpoint
DROP TYPE "public"."message_type";