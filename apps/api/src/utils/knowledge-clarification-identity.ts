import { createHash } from "node:crypto";
import type { KnowledgeClarificationContextSnapshot } from "@api/lib/knowledge-clarification-context";

export function normalizeClarificationTopicSummary(value: string): string {
	return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function buildClarificationTopicFingerprint(
	topicSummary: string | null | undefined
): string | null {
	const normalized = normalizeClarificationTopicSummary(topicSummary ?? "");
	if (!normalized) {
		return null;
	}

	return createHash("md5").update(normalized).digest("hex");
}

export function getClarificationSourceTriggerMessageId(
	contextSnapshot: KnowledgeClarificationContextSnapshot | null | undefined
): string | null {
	const messageId = contextSnapshot?.sourceTrigger.messageId?.trim() ?? "";
	return messageId || null;
}
