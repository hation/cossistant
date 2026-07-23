CREATE INDEX "api_key_key_active_idx" ON "api_key" USING btree ("key","is_active");--> statement-breakpoint
CREATE INDEX "member_org_role_idx" ON "member" USING btree ("organization_id","role");--> statement-breakpoint
CREATE INDEX "visitor_id_org_idx" ON "visitor" USING btree ("id","organization_id");