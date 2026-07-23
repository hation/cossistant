ALTER TABLE "waiting_list_entry" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "waiting_list_entry" CASCADE;--> statement-breakpoint
ALTER TABLE "website" ALTER COLUMN "default_participant_ids" SET DEFAULT '[]'::jsonb;