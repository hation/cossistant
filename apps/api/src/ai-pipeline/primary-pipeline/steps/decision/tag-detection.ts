import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { RoleAwareMessage } from "../../contracts";

const MARKDOWN_MENTION_REGEX = /\[@([^\]]+)\]\(mention:([^:]+):([^)]+)\)/g;
const PLAINTEXT_MENTION_REGEX = /@([a-zA-Z0-9][a-zA-Z0-9 _-]{0,60})/g;
const TRAILING_PUNCTUATION_REGEX = /[.,!?]+$/;

export type TagDetectionResult = {
	tagged: boolean;
	source: "markdown" | "text" | null;
	cleanedText: string;
};

function normalizeName(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.replace(/\s+/g, " ");
}

function hasMarkdownTag(text: string, aiAgentId: string): boolean {
	for (const match of text.matchAll(MARKDOWN_MENTION_REGEX)) {
		const mentionType = (match[2] ?? "").toLowerCase();
		const mentionId = match[3] ?? "";
		if (mentionId !== aiAgentId) {
			continue;
		}
		if (mentionType === "ai-agent" || mentionType === "ai_agent") {
			return true;
		}
	}

	return false;
}

function hasPlainTextTag(text: string, aiAgentName: string): boolean {
	const normalizedAgentName = normalizeName(aiAgentName);
	if (!normalizedAgentName) {
		return false;
	}

	const normalizedAgentNameNoSpace = normalizedAgentName.replace(/\s+/g, "");
	const agentWordCount = normalizedAgentName.split(" ").length;

	for (const match of text.matchAll(PLAINTEXT_MENTION_REGEX)) {
		const rawMention = (match[1] ?? "").replace(TRAILING_PUNCTUATION_REGEX, "");
		const normalizedMention = normalizeName(rawMention);
		if (!normalizedMention) {
			continue;
		}

		const mentionWords = normalizedMention.split(" ");
		const leadingCandidate = mentionWords.slice(0, agentWordCount).join(" ");
		if (leadingCandidate === normalizedAgentName) {
			return true;
		}
		if (leadingCandidate.replace(/\s+/g, "") === normalizedAgentNameNoSpace) {
			return true;
		}
	}

	return false;
}

function stripMarkdownMention(text: string): string {
	return text.replace(MARKDOWN_MENTION_REGEX, (_raw, name) => `@${name}`);
}

export function stripLeadingTag(text: string, aiAgentName: string): string {
	const trimmed = text.trim();
	if (!trimmed.startsWith("@")) {
		return trimmed;
	}

	const normalizedAgentName = normalizeName(aiAgentName);
	if (!normalizedAgentName) {
		return trimmed;
	}

	const normalizedAgentNameNoSpace = normalizedAgentName.replace(/\s+/g, "");
	const agentWordCount = aiAgentName.trim().split(/\s+/).filter(Boolean).length;
	if (agentWordCount === 0) {
		return trimmed;
	}

	const words = trimmed.slice(1).split(/\s+/);
	const leadingCandidate = words.slice(0, agentWordCount).join(" ");
	const normalizedLeadingCandidate = normalizeName(leadingCandidate);

	if (
		normalizedLeadingCandidate !== normalizedAgentName &&
		normalizedLeadingCandidate.replace(/\s+/g, "") !==
			normalizedAgentNameNoSpace
	) {
		return trimmed;
	}

	const command = words.slice(agentWordCount).join(" ").trim();
	return command || trimmed;
}

export function detectAiTag(params: {
	message: RoleAwareMessage;
	aiAgent: Pick<AiAgentSelect, "id" | "name">;
}): TagDetectionResult {
	const cleanedText = stripMarkdownMention(params.message.content);

	if (hasMarkdownTag(params.message.content, params.aiAgent.id)) {
		return {
			tagged: true,
			source: "markdown",
			cleanedText,
		};
	}

	if (hasPlainTextTag(cleanedText, params.aiAgent.name)) {
		return {
			tagged: true,
			source: "text",
			cleanedText,
		};
	}

	return {
		tagged: false,
		source: null,
		cleanedText,
	};
}
