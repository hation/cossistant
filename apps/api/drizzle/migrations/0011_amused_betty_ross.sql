ALTER TABLE "message" ADD COLUMN "website_id" varchar(26) NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_website_id_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."website"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_org_website_idx" ON "conversation" USING btree ("website_id","updated_at");--> statement-breakpoint
CREATE INDEX "message_org_website_idx" ON "message" USING btree ("website_id","updated_at");