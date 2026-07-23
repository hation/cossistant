/**
 * Text chunking utility for splitting documents into smaller pieces
 * for embedding generation in the RAG system.
 */

export type TextChunk = {
	content: string;
	index: number;
	startOffset: number;
	endOffset: number;
};

export type ChunkOptions = {
	/** Target chunk size in characters (default: 1000) */
	chunkSize?: number;
	/** Overlap between chunks in characters (default: 200) */
	chunkOverlap?: number;
};

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

// Separators in order of preference (paragraph → sentence → word → character)
const SEPARATORS = [
	"\n\n", // Paragraph break
	"\n", // Line break
	". ", // Sentence end
	"? ", // Question end
	"! ", // Exclamation end
	"; ", // Semicolon
	": ", // Colon
	", ", // Comma
	" ", // Word break
	"", // Character level (last resort)
];

/**
 * Recursively split text into chunks using hierarchical separators.
 * Tries to split on natural boundaries (paragraphs, sentences, words).
 */
export function chunkText(
	text: string,
	options: ChunkOptions = {}
): TextChunk[] {
	const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
	const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

	if (!text || text.trim().length === 0) {
		return [];
	}

	const chunks: TextChunk[] = [];
	const splits = recursiveSplit(text, SEPARATORS, chunkSize);

	let currentChunk = "";
	let currentStart = 0;
	let offset = 0;

	for (const split of splits) {
		// If adding this split would exceed chunk size, finalize current chunk
		if (
			currentChunk.length + split.length > chunkSize &&
			currentChunk.length > 0
		) {
			chunks.push({
				content: currentChunk.trim(),
				index: chunks.length,
				startOffset: currentStart,
				endOffset: offset,
			});

			// Start new chunk with overlap
			const overlapText = getOverlapText(currentChunk, chunkOverlap);
			currentChunk = overlapText + split;
			currentStart = offset - overlapText.length;
		} else {
			currentChunk += split;
		}

		offset += split.length;
	}

	// Add final chunk if non-empty
	if (currentChunk.trim().length > 0) {
		chunks.push({
			content: currentChunk.trim(),
			index: chunks.length,
			startOffset: currentStart,
			endOffset: offset,
		});
	}

	return chunks;
}

/**
 * Recursively split text using a hierarchy of separators.
 * Falls back to finer-grained separators when chunks are too large.
 */
function recursiveSplit(
	text: string,
	separators: string[],
	chunkSize: number
): string[] {
	if (text.length <= chunkSize || separators.length === 0) {
		return [text];
	}

	const separator = separators[0];
	const remainingSeparators = separators.slice(1);

	// Split by current separator
	const parts = splitKeepingSeparator(text, separator);

	const result: string[] = [];
	for (const part of parts) {
		if (part.length <= chunkSize) {
			result.push(part);
		} else {
			// Part is still too large, try finer separator
			result.push(...recursiveSplit(part, remainingSeparators, chunkSize));
		}
	}

	return result;
}

/**
 * Split text by separator, keeping the separator attached to the preceding part.
 */
function splitKeepingSeparator(text: string, separator: string): string[] {
	if (separator === "") {
		// Character-level split
		return text.split("");
	}

	const parts: string[] = [];
	let remaining = text;

	while (remaining.length > 0) {
		const index = remaining.indexOf(separator);
		if (index === -1) {
			parts.push(remaining);
			break;
		}

		// Include separator in the split part
		parts.push(remaining.slice(0, index + separator.length));
		remaining = remaining.slice(index + separator.length);
	}

	return parts.filter((p) => p.length > 0);
}

/**
 * Get the last N characters of text for overlap, respecting word boundaries.
 */
function getOverlapText(text: string, overlapSize: number): string {
	if (text.length <= overlapSize) {
		return text;
	}

	const overlapStart = text.length - overlapSize;
	let overlap = text.slice(overlapStart);

	// Try to start at a word boundary
	const spaceIndex = overlap.indexOf(" ");
	if (spaceIndex > 0 && spaceIndex < overlap.length / 2) {
		overlap = overlap.slice(spaceIndex + 1);
	}

	return overlap;
}

/**
 * Extract plain text content from a knowledge entry payload.
 * Handles different knowledge types (url, faq, article).
 */
export function extractTextFromKnowledgePayload(
	type: "url" | "faq" | "article",
	payload: unknown
): string {
	if (!payload || typeof payload !== "object") {
		return "";
	}

	const data = payload as Record<string, unknown>;

	switch (type) {
		case "url": {
			// URL knowledge has markdown content
			const markdown = data.markdown as string | undefined;
			const title = data.title as string | undefined;
			return title ? `# ${title}\n\n${markdown ?? ""}` : (markdown ?? "");
		}
		case "faq": {
			// FAQ has question and answer
			const question = data.question as string | undefined;
			const answer = data.answer as string | undefined;
			return `Q: ${question ?? ""}\n\nA: ${answer ?? ""}`;
		}
		case "article": {
			// Article has title and content (markdown)
			const title = data.title as string | undefined;
			const content = data.content as string | undefined;
			return title ? `# ${title}\n\n${content ?? ""}` : (content ?? "");
		}
		default:
			return "";
	}
}

/**
 * Generate metadata for a chunk based on its source knowledge entry.
 */
export function generateChunkMetadata(
	type: "url" | "faq" | "article",
	payload: unknown,
	sourceUrl?: string | null,
	sourceTitle?: string | null
): Record<string, unknown> {
	const metadata: Record<string, unknown> = {
		sourceType: type,
	};

	if (sourceUrl) {
		metadata.url = sourceUrl;
	}

	if (sourceTitle) {
		metadata.title = sourceTitle;
	}

	// Add type-specific metadata
	if (payload && typeof payload === "object") {
		const data = payload as Record<string, unknown>;

		switch (type) {
			case "faq": {
				if (data.question) {
					metadata.question = data.question;
				}
				if (data.categories) {
					metadata.categories = data.categories;
				}
				break;
			}
			case "article": {
				if (data.title) {
					metadata.title = data.title;
				}
				break;
			}
			default: {
				// No type-specific metadata needed for URL sources or other types
				break;
			}
		}
	}

	return metadata;
}
