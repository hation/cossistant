ALTER TABLE "visitor" ADD COLUMN "browser" varchar(100);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "browser_version" varchar(50);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "os" varchar(100);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "os_version" varchar(50);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "device" varchar(100);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "device_type" varchar(50);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "ip" varchar(45);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "region" varchar(100);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "country_code" varchar(2);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "latitude" real;--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "longitude" real;--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "language" varchar(10);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "timezone" varchar(100);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "screen_resolution" varchar(20);--> statement-breakpoint
ALTER TABLE "visitor" ADD COLUMN "viewport" varchar(20);