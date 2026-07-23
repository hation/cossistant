import type { ModelMessage } from "@api/lib/ai";
import type { SegmentedConversationEntry } from "../../../primary-pipeline/contracts";
import { isConversationToolAction } from "../../../primary-pipeline/contracts";

function normalizeText(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function toSegmentLabel(
	segment: SegmentedConversationEntry["segment"]
): string {
	switch (segment) {
		case "before_trigger":
			return "BEFORE";
		case "trigger":
			return "TRIGGER";
		case "after_trigger":
			return "AFTER";
		default:
			return "BEFORE";
	}
}

function toVisibilityLabel(
	visibility: "public" | "private"
): "PUBLIC" | "PRIVATE" {
	return visibility === "private" ? "PRIVATE" : "PUBLIC";
}

function buildHeader(entry: SegmentedConversationEntry): string {
	const segmentLabel = `[${toSegmentLabel(entry.segment)}]`;
	const visibilityLabel = `[${toVisibilityLabel(entry.visibility)}]`;

	if (isConversationToolAction(entry)) {
		return `${segmentLabel}[TOOL:${entry.toolName}]${visibilityLabel}`;
	}

	const actorLabel =
		entry.senderType === "visitor"
			? "[VISITOR]"
			: entry.senderType === "human_agent"
				? "[TEAM]"
				: "[AI]";

	return `${segmentLabel}${actorLabel}${visibilityLabel}`;
}

export function buildGenerationMessages(
	entries: SegmentedConversationEntry[]
): ModelMessage[] {
	const formatted: ModelMessage[] = [];

	for (const entry of entries) {
		const normalizedContent = normalizeText(entry.content);
		if (!normalizedContent) {
			continue;
		}

		formatted.push({
			role:
				!isConversationToolAction(entry) && entry.senderType !== "ai_agent"
					? "user"
					: "assistant",
			content: `${buildHeader(entry)} ${normalizedContent}`,
		});
	}

	return formatted;
}
