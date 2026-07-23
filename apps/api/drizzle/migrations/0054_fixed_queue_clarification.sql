ALTER TABLE "knowledge_clarification_request"
ADD COLUMN IF NOT EXISTS "question_plan" jsonb;
