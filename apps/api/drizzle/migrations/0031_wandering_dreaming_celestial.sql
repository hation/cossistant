CREATE TABLE "chunk" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"website_id" varchar(26) NOT NULL,
	"knowledge_id" varchar(26),
	"visitor_id" varchar(26),
	"contact_id" varchar(26),
	"source_type" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"chunk_index" integer,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunk" ADD CONSTRAINT "chunk_website_id_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."website"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk" ADD CONSTRAINT "chunk_knowledge_id_knowledge_id_fk" FOREIGN KEY ("knowledge_id") REFERENCES "public"."knowledge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk" ADD CONSTRAINT "chunk_visitor_id_visitor_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk" ADD CONSTRAINT "chunk_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunk_embedding_idx" ON "chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "chunk_knowledge_idx" ON "chunk" USING btree ("knowledge_id");--> statement-breakpoint
CREATE INDEX "chunk_website_idx" ON "chunk" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "chunk_visitor_idx" ON "chunk" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "chunk_contact_idx" ON "chunk" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "chunk_source_type_idx" ON "chunk" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "chunk_website_source_type_idx" ON "chunk" USING btree ("website_id","source_type");