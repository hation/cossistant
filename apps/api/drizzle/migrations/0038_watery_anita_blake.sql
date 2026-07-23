CREATE TABLE "feedback" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"organization_id" varchar(26) NOT NULL,
	"website_id" varchar(26) NOT NULL,
	"conversation_id" varchar(18),
	"visitor_id" varchar(26),
	"contact_id" varchar(26),
	"rating" integer NOT NULL,
	"comment" text,
	"trigger" text,
	"source" text DEFAULT 'widget' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_website_id_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."website"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_visitor_id_visitor_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_org_website_created_idx" ON "feedback" USING btree ("organization_id","website_id","created_at","deleted_at");--> statement-breakpoint
CREATE INDEX "feedback_org_website_trigger_idx" ON "feedback" USING btree ("organization_id","website_id","trigger","deleted_at");--> statement-breakpoint
CREATE INDEX "feedback_website_idx" ON "feedback" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "feedback_conversation_idx" ON "feedback" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "feedback_visitor_idx" ON "feedback" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "feedback_contact_idx" ON "feedback" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "feedback_deleted_at_idx" ON "feedback" USING btree ("deleted_at");