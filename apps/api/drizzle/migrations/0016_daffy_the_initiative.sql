CREATE TABLE "contact" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"external_id" varchar(255),
	"name" text,
	"email" text,
	"image" text,
	"metadata" jsonb,
	"website_id" varchar(26) NOT NULL,
	"organization_id" varchar(26) NOT NULL,
	"contact_organization_id" varchar(26),
	"user_id" varchar(26),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "contact_organization" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"external_id" varchar(255),
	"domain" text,
	"description" text,
	"metadata" jsonb,
	"website_id" varchar(26) NOT NULL,
	"organization_id" varchar(26) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "visitor" DROP CONSTRAINT "visitor_externalId_unique";--> statement-breakpoint
DROP INDEX "visitor_external_id_website_idx";--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "contact_id" varchar(26);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "is_test" boolean;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_website_id_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."website"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_contact_organization_id_contact_organization_id_fk" FOREIGN KEY ("contact_organization_id") REFERENCES "public"."contact_organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_organization" ADD CONSTRAINT "contact_organization_website_id_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."website"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_organization" ADD CONSTRAINT "contact_organization_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_website_idx" ON "contact" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "contact_org_idx" ON "contact" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contact_org_website_idx" ON "contact" USING btree ("organization_id","website_id");--> statement-breakpoint
CREATE INDEX "contact_contact_org_idx" ON "contact" USING btree ("contact_organization_id");--> statement-breakpoint
CREATE INDEX "contact_user_idx" ON "contact" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_email_website_idx" ON "contact" USING btree ("email","website_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_external_id_website_idx" ON "contact" USING btree ("external_id","website_id");--> statement-breakpoint
CREATE INDEX "contact_deleted_at_idx" ON "contact" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "contact_org_site_idx" ON "contact_organization" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "contact_org_org_idx" ON "contact_organization" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_org_external_id_website_idx" ON "contact_organization" USING btree ("external_id","website_id");--> statement-breakpoint
CREATE INDEX "contact_org_deleted_at_idx" ON "contact_organization" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "visitor" ADD CONSTRAINT "visitor_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visitor_contact_idx" ON "visitor" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "visitor_contact_website_idx" ON "visitor" USING btree ("contact_id","website_id");--> statement-breakpoint
ALTER TABLE "visitor" DROP COLUMN "externalId";--> statement-breakpoint
ALTER TABLE "visitor" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "visitor" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "visitor" DROP COLUMN "image";--> statement-breakpoint
ALTER TABLE "visitor" DROP COLUMN "metadata";