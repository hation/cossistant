import type { Mention, MentionType, ParsedMention } from "../types";

/**
 * Regex to match mentions in the format: [@Name](mention:type:id)
 * The @ is inside the brackets so it becomes part of the styled link text.
 * Captures: name (without @), type, id
 */
const MENTION_REGEX = /\[@([^\]]+)\]\(mention:([^:]+):([^)]+)\)/g;

/**
 * Parse all mentions from a markdown string.
 */
export function parseMentions(text: string): ParsedMention[] {
	const mentions: ParsedMention[] = [];

	for (const match of text.matchAll(MENTION_REGEX)) {
		const raw = match[0];
		const name = match[1] ?? "";
		const type = match[2] ?? "";
		const id = match[3] ?? "";
		mentions.push({
			id,
			name,
			type: type as MentionType,
			raw,
			startIndex: match.index ?? 0,
			endIndex: (match.index ?? 0) + raw.length,
		});
	}

	return mentions;
}

/**
 * Extract just the IDs from mentions in a string.
 * Useful for notification targeting.
 */
export function extractMentionIds(text: string): string[] {
	return parseMentions(text).map((m) => m.id);
}

/**
 * Format a mention object into the markdown string format.
 * Format: [@Name](mention:type:id) - the @ is inside brackets for proper styling
 */
export function formatMention(mention: Mention): string {
	return `[@${mention.name}](mention:${mention.type}:${mention.id})`;
}

/**
 * Check if a position in the text is inside a mention.
 */
export function isPositionInMention(
	text: string,
	position: number
): ParsedMention | null {
	const mentions = parseMentions(text);
	for (const mention of mentions) {
		if (position >= mention.startIndex && position <= mention.endIndex) {
			return mention;
		}
	}
	return null;
}

/**
 * Replace all mentions in text with a display format (e.g., just the name).
 */
export function replaceMentionsWithDisplay(
	text: string,
	formatter: (mention: ParsedMention) => string = (m) => `@${m.name}`
): string {
	return text.replace(MENTION_REGEX, (raw, name, type, id) => {
		const mention: ParsedMention = {
			id,
			name,
			type: type as MentionType,
			raw,
			startIndex: 0,
			endIndex: 0,
		};
		return formatter(mention);
	});
}
