CREATE TABLE "email_bounce_status" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"organization_id" varchar(26) NOT NULL,
	"bounce_type" text,
	"bounce_sub_type" text,
	"bounce_message" text,
	"bounced_at" timestamp,
	"complained_at" timestamp,
	"last_failure_reason" text,
	"failed_at" timestamp,
	"failure_count" varchar(10) NOT NULL,
	"suppressed" boolean NOT NULL,
	"suppressed_reason" text,
	"suppressed_at" timestamp,
	"last_event_id" varchar(255),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_bounce_status" ADD CONSTRAINT "email_bounce_status_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_bounce_status_email_org_idx" ON "email_bounce_status" USING btree ("email","organization_id");--> statement-breakpoint
CREATE INDEX "email_bounce_status_suppressed_idx" ON "email_bounce_status" USING btree ("suppressed","email");--> statement-breakpoint
CREATE INDEX "email_bounce_status_org_idx" ON "email_bounce_status" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_bounce_status_bounced_idx" ON "email_bounce_status" USING btree ("bounced_at");--> statement-breakpoint
CREATE INDEX "email_bounce_status_complained_idx" ON "email_bounce_status" USING btree ("complained_at");