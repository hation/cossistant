import type { MarkdownToken, ParsedMention } from "../types";

/**
 * Simple markdown parser that converts text into tokens for overlay rendering.
 * This is intentionally lightweight - we only need to parse for visual preview,
 * not full markdown compliance.
 */

// Regex patterns for inline parsing
const MENTION_REGEX = /\[@([^\]]+)\]\(mention:([^:]+):([^)]+)\)/;
const BOLD_REGEX = /\*\*(.+?)\*\*/;
const ITALIC_REGEX = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/;
const CODE_INLINE_REGEX = /`([^`]+)`/;
const CODE_FENCE_OPEN_REGEX = /^```(.*)$/;
const CODE_FENCE_CLOSE_REGEX = /^```\s*$/;
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/;
const CODE_FENCE_INFO_TOKEN_REGEX = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g;
const FILE_METADATA_KEYS = new Set(["file", "filename", "name", "title"]);
const FILENAME_COMMENT_PREFIXES = [/^\/\/\s*(.+)$/, /^#\s*(.+)$/];
const BLOCK_COMMENT_FILENAME_REGEX = /^\/\*\s*(.+?)\s*\*\/$/;

// Regex patterns for block-level parsing
const HEADER_REGEX = /^(#{1,3})\s+(.*)$/;
const BULLET_LIST_REGEX = /^[-*]\s+(.*)$/;
const NUMBERED_LIST_REGEX = /^\d+\.\s+(.*)$/;
const BLOCKQUOTE_REGEX = /^>\s*(.*)$/;

// Regex patterns for hasMarkdownFormatting check
const BOLD_CHECK_REGEX = /\*\*.+?\*\*/;
const ITALIC_CHECK_REGEX = /\*.+?\*/;
const CODE_CHECK_REGEX = /`.+?`/;
const CODE_FENCE_CHECK_REGEX = /^```\s*/m;
const LINK_CHECK_REGEX = /\[.+?\]\(.+?\)/;
const HEADER_CHECK_REGEX = /^#{1,3}\s/m;
const BULLET_CHECK_REGEX = /^[-*]\s/m;
const NUMBERED_CHECK_REGEX = /^\d+\.\s/m;
const BLOCKQUOTE_CHECK_REGEX = /^>\s/m;

type ParsedCodeFenceInfo = {
	language?: string;
	fileName?: string;
};

function stripWrappedQuotes(value: string): string {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}

	return trimmed;
}

function looksLikeFileName(value: string): boolean {
	const trimmed = value.trim();
	if (!trimmed || trimmed.includes(" ")) {
		return false;
	}

	if (trimmed.includes("/") || trimmed.includes("\\")) {
		return true;
	}

	return /^[\w.-]+\.[\w.-]+$/.test(trimmed) || /^\.[\w.-]+$/.test(trimmed);
}

function parseCodeFenceInfo(info: string): ParsedCodeFenceInfo {
	const normalizedInfo = info.trim();
	if (!normalizedInfo) {
		return {};
	}

	const tokens =
		normalizedInfo
			.match(CODE_FENCE_INFO_TOKEN_REGEX)
			?.map(stripWrappedQuotes) ?? [];
	if (tokens.length === 0) {
		return {};
	}

	let language: string | undefined;
	let fileName: string | undefined;
	let cursor = 0;

	const firstToken = tokens[0];
	if (
		firstToken &&
		!firstToken.includes("=") &&
		/^[a-zA-Z0-9_-]+$/.test(firstToken)
	) {
		language = firstToken;
		cursor = 1;
	}

	for (let index = cursor; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (!token) {
			continue;
		}

		const assignmentIndex = token.indexOf("=");
		if (assignmentIndex > 0) {
			const key = token.slice(0, assignmentIndex).trim().toLowerCase();
			const value = stripWrappedQuotes(token.slice(assignmentIndex + 1));

			if (key === "lang" && !language && value) {
				language = value;
			}

			if (FILE_METADATA_KEYS.has(key) && !fileName && value) {
				fileName = value;
			}
			continue;
		}

		if (
			!fileName &&
			token !== "showLineNumbers" &&
			!token.startsWith("{") &&
			looksLikeFileName(token)
		) {
			fileName = token;
		}
	}

	return { language, fileName };
}

function inferFileNameFromFirstCommentLine(code: string): string | undefined {
	const firstLine = code.split("\n")[0]?.trim();
	if (!firstLine) {
		return;
	}

	for (const regex of FILENAME_COMMENT_PREFIXES) {
		const match = firstLine.match(regex);
		const candidate = stripWrappedQuotes(match?.[1] ?? "");
		if (looksLikeFileName(candidate)) {
			return candidate;
		}
	}

	const blockCommentMatch = firstLine.match(BLOCK_COMMENT_FILENAME_REGEX);
	const blockCandidate = stripWrappedQuotes(blockCommentMatch?.[1] ?? "");
	if (looksLikeFileName(blockCandidate)) {
		return blockCandidate;
	}

	return;
}

/**
 * Parse inline markdown into tokens.
 * Handles: bold, italic, inline code, links, mentions
 */
export function parseInline(text: string): MarkdownToken[] {
	const tokens: MarkdownToken[] = [];
	let remaining = text;
	let position = 0;

	while (remaining.length > 0) {
		// Find the earliest match
		let earliestMatch: {
			type: string;
			index: number;
			match: RegExpExecArray;
		} | null = null;

		const patterns = [
			{ type: "mention", regex: new RegExp(MENTION_REGEX.source) },
			{ type: "bold", regex: new RegExp(BOLD_REGEX.source) },
			{ type: "code", regex: new RegExp(CODE_INLINE_REGEX.source) },
			{ type: "link", regex: new RegExp(LINK_REGEX.source) },
			{ type: "italic", regex: new RegExp(ITALIC_REGEX.source) },
		];

		for (const { type: patternType, regex } of patterns) {
			const patternMatch = regex.exec(remaining);
			if (
				patternMatch &&
				(earliestMatch === null || patternMatch.index < earliestMatch.index)
			) {
				earliestMatch = {
					type: patternType,
					index: patternMatch.index,
					match: patternMatch,
				};
			}
		}

		if (earliestMatch === null) {
			// No more matches - add remaining as text
			if (remaining.length > 0) {
				tokens.push({ type: "text", content: remaining });
			}
			break;
		}

		// Add text before the match
		if (earliestMatch.index > 0) {
			tokens.push({
				type: "text",
				content: remaining.slice(0, earliestMatch.index),
			});
		}

		// Add the matched token
		const { type, match } = earliestMatch;
		const raw = match[0];

		switch (type) {
			case "mention": {
				const name = match[1] ?? "";
				const mentionType = match[2] ?? "";
				const id = match[3] ?? "";
				const mention: ParsedMention = {
					id,
					name,
					type: mentionType as ParsedMention["type"],
					raw,
					startIndex: position + earliestMatch.index,
					endIndex: position + earliestMatch.index + raw.length,
				};
				tokens.push({ type: "mention", mention });
				break;
			}
			case "bold":
				tokens.push({
					type: "strong",
					children: parseInline(match[1] ?? ""),
				});
				break;
			case "italic":
				tokens.push({
					type: "em",
					children: parseInline(match[1] ?? ""),
				});
				break;
			case "code":
				tokens.push({
					type: "code",
					content: match[1] ?? "",
					inline: true,
				});
				break;
			case "link": {
				const href = match[2] ?? "";
				// Skip mention links (they have mention: prefix)
				if (href.startsWith("mention:")) {
					tokens.push({ type: "text", content: raw });
				} else {
					tokens.push({
						type: "a",
						href,
						children: parseInline(match[1] ?? ""),
					});
				}
				break;
			}
			default:
				// Unknown type, treat as text
				tokens.push({ type: "text", content: raw });
				break;
		}

		// Move past the match
		position += earliestMatch.index + raw.length;
		remaining = remaining.slice(earliestMatch.index + raw.length);
	}

	return tokens;
}

/**
 * Parse a line to detect block-level elements.
 */
function parseLine(line: string): MarkdownToken | null {
	// Header
	const headerMatch = line.match(HEADER_REGEX);
	if (headerMatch) {
		const hashPart = headerMatch[1] ?? "";
		const level = Math.min(3, Math.max(1, hashPart.length)) as 1 | 2 | 3;
		return {
			type: "header",
			level,
			children: parseInline(headerMatch[2] ?? ""),
		};
	}

	// Unordered list item
	const bulletMatch = line.match(BULLET_LIST_REGEX);
	if (bulletMatch) {
		return {
			type: "li",
			children: parseInline(bulletMatch[1] ?? ""),
		};
	}

	// Ordered list item
	const numberMatch = line.match(NUMBERED_LIST_REGEX);
	if (numberMatch) {
		return {
			type: "li",
			children: parseInline(numberMatch[1] ?? ""),
		};
	}

	// Blockquote
	const quoteMatch = line.match(BLOCKQUOTE_REGEX);
	if (quoteMatch) {
		return {
			type: "blockquote",
			children: parseInline(quoteMatch[1] ?? ""),
		};
	}

	return null;
}

/**
 * Group consecutive list items into lists.
 */
function groupLists(tokens: MarkdownToken[]): MarkdownToken[] {
	const result: MarkdownToken[] = [];
	let currentList: { type: "ul" | "ol"; items: MarkdownToken[] } | null = null;

	for (const token of tokens) {
		if (token.type === "li") {
			if (!currentList) {
				// Start a new list - detect type from original line (we lose this info, default to ul)
				currentList = { type: "ul", items: [] };
			}
			currentList.items.push(token);
		} else {
			if (currentList) {
				// End current list
				result.push({
					type: currentList.type,
					children: currentList.items,
				});
				currentList = null;
			}
			result.push(token);
		}
	}

	// Don't forget trailing list
	if (currentList) {
		result.push({
			type: currentList.type,
			children: currentList.items,
		});
	}

	return result;
}

/**
 * Parse markdown text into tokens.
 */
export function parseMarkdown(text: string): MarkdownToken[] {
	if (!text) {
		return [];
	}

	const lines = text.split("\n");
	const tokens: MarkdownToken[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		const codeFenceStart = line.match(CODE_FENCE_OPEN_REGEX);

		if (codeFenceStart) {
			const fenceInfo = parseCodeFenceInfo(codeFenceStart[1] ?? "");
			const codeLines: string[] = [];

			index += 1;
			while (index < lines.length) {
				const currentLine = lines[index] ?? "";
				if (CODE_FENCE_CLOSE_REGEX.test(currentLine)) {
					break;
				}

				codeLines.push(currentLine);
				index += 1;
			}

			const codeContent = codeLines.join("\n");
			const fileName =
				fenceInfo.fileName ?? inferFileNameFromFirstCommentLine(codeContent);

			tokens.push({
				type: "code",
				content: codeContent,
				inline: false,
				language: fenceInfo.language,
				fileName,
			});
			continue;
		}

		// Empty line = line break
		if (line.trim() === "") {
			tokens.push({ type: "br" });
			continue;
		}

		// Try to parse as block element
		const blockToken = parseLine(line);
		if (blockToken) {
			tokens.push(blockToken);
			continue;
		}

		// Regular paragraph/inline content
		tokens.push({
			type: "p",
			children: parseInline(line),
		});
	}

	// Group consecutive list items
	return groupLists(tokens);
}

/**
 * Check if text contains any markdown formatting.
 */
export function hasMarkdownFormatting(text: string): boolean {
	return (
		BOLD_CHECK_REGEX.test(text) ||
		ITALIC_CHECK_REGEX.test(text) ||
		CODE_CHECK_REGEX.test(text) ||
		CODE_FENCE_CHECK_REGEX.test(text) ||
		LINK_CHECK_REGEX.test(text) ||
		HEADER_CHECK_REGEX.test(text) ||
		BULLET_CHECK_REGEX.test(text) ||
		NUMBERED_CHECK_REGEX.test(text) ||
		BLOCKQUOTE_CHECK_REGEX.test(text)
	);
}
