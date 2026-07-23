ALTER TYPE "public"."knowledge_clarification_status" RENAME TO "knowledge_clarification_status_old_0052";
--> statement-breakpoint
CREATE TYPE "public"."knowledge_clarification_status" AS ENUM(
	'analyzing',
	'awaiting_answer',
	'retry_required',
	'draft_ready',
	'deferred',
	'applied',
	'dismissed'
);
--> statement-breakpoint
ALTER TABLE "knowledge_clarification_request"
ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "knowledge_clarification_request"
ALTER COLUMN "status" TYPE "public"."knowledge_clarification_status"
USING (
	CASE
		WHEN "status" = 'deferred' AND "last_error" IS NOT NULL THEN 'retry_required'
		ELSE "status"::text
	END
)::"public"."knowledge_clarification_status";
--> statement-breakpoint
ALTER TABLE "knowledge_clarification_request"
ALTER COLUMN "status" SET DEFAULT 'awaiting_answer';
--> statement-breakpoint
DROP TYPE "public"."knowledge_clarification_status_old_0052";
--> statement-breakpoint
ALTER TABLE "knowledge_clarification_request"
ADD COLUMN IF NOT EXISTS "source_trigger_message_id" text;
--> statement-breakpoint
ALTER TABLE "knowledge_clarification_request"
ADD COLUMN IF NOT EXISTS "topic_fingerprint" varchar(32);
--> statement-breakpoint
UPDATE "knowledge_clarification_request"
SET "source_trigger_message_id" = NULLIF(
	TRIM("context_snapshot"->'sourceTrigger'->>'messageId'),
	''
)
WHERE "source_trigger_message_id" IS NULL
	AND "context_snapshot" IS NOT NULL;
--> statement-breakpoint
UPDATE "knowledge_clarification_request"
SET "topic_fingerprint" = md5(
	LOWER(
		REGEXP_REPLACE(
			TRIM(COALESCE("topic_summary", '')),
			'\s+',
			' ',
			'g'
		)
	)
)
WHERE "topic_fingerprint" IS NULL
	AND TRIM(COALESCE("topic_summary", '')) <> '';
--> statement-breakpoint
WITH "ranked_trigger_duplicates" AS (
	SELECT
		"id",
		ROW_NUMBER() OVER (
			PARTITION BY "conversation_id", "source_trigger_message_id"
			ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
		) AS "rn"
	FROM "knowledge_clarification_request"
	WHERE "conversation_id" IS NOT NULL
		AND "source_trigger_message_id" IS NOT NULL
)
UPDATE "knowledge_clarification_request" AS "request"
SET "source_trigger_message_id" = NULL
FROM "ranked_trigger_duplicates" AS "duplicate"
WHERE "request"."id" = "duplicate"."id"
	AND "duplicate"."rn" > 1;
--> statement-breakpoint
WITH "ranked_topic_duplicates" AS (
	SELECT
		"id",
		ROW_NUMBER() OVER (
			PARTITION BY "conversation_id", "topic_fingerprint"
			ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
		) AS "rn"
	FROM "knowledge_clarification_request"
	WHERE "source" = 'conversation'
		AND "conversation_id" IS NOT NULL
		AND "source_trigger_message_id" IS NULL
		AND "topic_fingerprint" IS NOT NULL
		AND "status" IN (
			'analyzing',
			'awaiting_answer',
			'retry_required',
			'draft_ready',
			'deferred'
		)
)
UPDATE "knowledge_clarification_request" AS "request"
SET "topic_fingerprint" = NULL
FROM "ranked_topic_duplicates" AS "duplicate"
WHERE "request"."id" = "duplicate"."id"
	AND "duplicate"."rn" > 1;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_clarification_request_source_trigger_message_idx"
ON "knowledge_clarification_request" USING btree ("source_trigger_message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_clarification_request_topic_fingerprint_idx"
ON "knowledge_clarification_request" USING btree ("topic_fingerprint");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_clarification_request_conv_trigger_unique"
ON "knowledge_clarification_request" USING btree (
	"conversation_id",
	"source_trigger_message_id"
)
WHERE "knowledge_clarification_request"."conversation_id" IS NOT NULL
	AND "knowledge_clarification_request"."source_trigger_message_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_clarification_request_conv_topic_fingerprint_unique"
ON "knowledge_clarification_request" USING btree (
	"conversation_id",
	"topic_fingerprint"
)
WHERE "knowledge_clarification_request"."source" = 'conversation'
	AND "knowledge_clarification_request"."conversation_id" IS NOT NULL
	AND "knowledge_clarification_request"."source_trigger_message_id" IS NULL
	AND "knowledge_clarification_request"."topic_fingerprint" IS NOT NULL
	AND "knowledge_clarification_request"."status" IN (
		'analyzing',
		'awaiting_answer',
		'retry_required',
		'draft_ready',
		'deferred'
	);
