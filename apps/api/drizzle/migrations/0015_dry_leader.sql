ALTER TABLE "visitor" ADD COLUMN "blocked_at" timestamp;--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "blocked_by_user_id" varchar(26);--> statement-breakpoint
ALTER TABLE "visitor" ADD CONSTRAINT "visitor_blocked_by_user_id_user_id_fk" FOREIGN KEY ("blocked_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;