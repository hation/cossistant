CREATE TABLE "ai_agent_prompt_document" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"organization_id" varchar(26) NOT NULL,
	"website_id" varchar(26) NOT NULL,
	"ai_agent_id" varchar(26) NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" varchar(26),
	"updated_by_user_id" varchar(26),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_agent_prompt_document" ADD CONSTRAINT "ai_agent_prompt_document_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_prompt_document" ADD CONSTRAINT "ai_agent_prompt_document_website_id_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."website"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_prompt_document" ADD CONSTRAINT "ai_agent_prompt_document_ai_agent_id_ai_agent_id_fk" FOREIGN KEY ("ai_agent_id") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_prompt_document" ADD CONSTRAINT "ai_agent_prompt_document_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_prompt_document" ADD CONSTRAINT "ai_agent_prompt_document_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_agent_prompt_document_scope_idx" ON "ai_agent_prompt_document" USING btree ("organization_id","website_id","ai_agent_id");--> statement-breakpoint
CREATE INDEX "ai_agent_prompt_document_kind_enabled_idx" ON "ai_agent_prompt_document" USING btree ("ai_agent_id","kind","enabled","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_agent_prompt_document_unique_name_per_agent" ON "ai_agent_prompt_document" USING btree ("organization_id","website_id","ai_agent_id","name");