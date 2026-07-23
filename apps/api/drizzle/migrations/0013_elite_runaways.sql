CREATE TYPE "public"."conversation_sentiment" AS ENUM('positive', 'negative', 'neutral');--> statement-breakpoint
CREATE TABLE "conversation_seen" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"organization_id" varchar(26) NOT NULL,
	"conversation_id" varchar(18) NOT NULL,
	"user_id" varchar(26),
	"visitor_id" varchar(26),
	"ai_agent_id" varchar(26),
	"last_seen_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_tag" RENAME TO "conversation_view";--> statement-breakpoint
ALTER TABLE "tag" RENAME TO "view";--> statement-breakpoint
ALTER TABLE "conversation_view" RENAME COLUMN "tag_id" TO "view_id";--> statement-breakpoint
ALTER TABLE "conversation_view" DROP CONSTRAINT "conversation_tag_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_view" DROP CONSTRAINT "conversation_tag_conversation_id_conversation_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_view" DROP CONSTRAINT "conversation_tag_tag_id_tag_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_view" DROP CONSTRAINT "conversation_tag_added_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_view" DROP CONSTRAINT "conversation_tag_added_by_ai_agent_id_ai_agent_id_fk";
--> statement-breakpoint
ALTER TABLE "view" DROP CONSTRAINT "tag_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "view" DROP CONSTRAINT "tag_website_id_website_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "status" SET DEFAULT 'open'::text;--> statement-breakpoint
DROP TYPE "public"."conversation_status";--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('open', 'resolved', 'spam');--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."conversation_status";--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "status" SET DATA TYPE "public"."conversation_status" USING "status"::"public"."conversation_status";--> statement-breakpoint
DROP INDEX "conversation_tag_org_idx";--> statement-breakpoint
DROP INDEX "conversation_tag_conv_idx";--> statement-breakpoint
DROP INDEX "conversation_tag_tag_idx";--> statement-breakpoint
DROP INDEX "conversation_tag_unique";--> statement-breakpoint
DROP INDEX "conversation_tag_deleted_at_idx";--> statement-breakpoint
DROP INDEX "tag_org_idx";--> statement-breakpoint
DROP INDEX "tag_website_idx";--> statement-breakpoint
DROP INDEX "tag_website_name_idx";--> statement-breakpoint
DROP INDEX "tag_deleted_at_idx";--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "sentiment" "conversation_sentiment";--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "sentiment_confidence" real;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "read_by" jsonb;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "last_message_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "last_message_by_id" varchar(26);--> statement-breakpoint
ALTER TABLE "conversation_seen" ADD CONSTRAINT "conversation_seen_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_seen" ADD CONSTRAINT "conversation_seen_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_seen" ADD CONSTRAINT "conversation_seen_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_seen" ADD CONSTRAINT "conversation_seen_visitor_id_visitor_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_seen" ADD CONSTRAINT "conversation_seen_ai_agent_id_ai_agent_id_fk" FOREIGN KEY ("ai_agent_id") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cs_org_idx" ON "conversation_seen" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "cs_conv_last_seen_idx" ON "conversation_seen" USING btree ("conversation_id","last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cs_unique_user" ON "conversation_seen" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cs_unique_visitor" ON "conversation_seen" USING btree ("conversation_id","visitor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cs_unique_ai" ON "conversation_seen" USING btree ("conversation_id","ai_agent_id");--> statement-breakpoint
ALTER TABLE "conversation_view" ADD CONSTRAINT "conversation_view_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view" ADD CONSTRAINT "conversation_view_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view" ADD CONSTRAINT "conversation_view_view_id_view_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."view"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view" ADD CONSTRAINT "conversation_view_added_by_user_id_user_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_view" ADD CONSTRAINT "conversation_view_added_by_ai_agent_id_ai_agent_id_fk" FOREIGN KEY ("added_by_ai_agent_id") REFERENCES "public"."ai_agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "view" ADD CONSTRAINT "view_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "view" ADD CONSTRAINT "view_website_id_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."website"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_view_org_idx" ON "conversation_view" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "conversation_view_conv_idx" ON "conversation_view" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_view_view_idx" ON "conversation_view" USING btree ("view_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_view_unique" ON "conversation_view" USING btree ("conversation_id","view_id");--> statement-breakpoint
CREATE INDEX "conversation_view_deleted_at_idx" ON "conversation_view" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "view_org_idx" ON "view" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "view_website_idx" ON "view" USING btree ("website_id");--> statement-breakpoint
CREATE UNIQUE INDEX "view_website_name_idx" ON "view" USING btree ("website_id","name");--> statement-breakpoint
CREATE INDEX "view_deleted_at_idx" ON "view" USING btree ("deleted_at");