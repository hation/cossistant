/**
 * Utilities for formatting message content into plain text previews.
 * Used in conversation lists, email notifications, and other preview contexts.
 */

/**
 * Regex to match mentions in the format: [@Name](mention:type:id)
 * Captures the name (without @) for replacement.
 */
const MENTION_REGEX = /\[@([^\]]+)\]\(mention:[^:]+:[^)]+\)/g;

/**
 * Regex to match markdown links in the format: [text](url)
 * Captures the link text for replacement.
 * Note: This runs AFTER mention replacement to avoid matching mention syntax.
 */
const LINK_REGEX = /\[([^\]]+)\]\([^)]+\)/g;

/**
 * Formats a message for plain text preview display.
 *
 * Transforms:
 * - Mentions: `[@Name](mention:type:id)` → `@Name`
 * - Links: `[text](url)` → `text`
 *
 * @example
 * ```ts
 * formatMessagePreview("Hey [@Anthony](mention:user:123), check [this](https://example.com)!")
 * // Returns: "Hey @Anthony, check this!"
 * ```
 */
export function formatMessagePreview(text: string): string {
	if (!text) {
		return "";
	}

	// First, handle mentions: [@Name](mention:type:id) → @Name
	// Must run before link regex since mentions also use [](syntax)
	let result = text.replace(MENTION_REGEX, "@$1");

	// Then, handle regular links: [text](url) → text
	result = result.replace(LINK_REGEX, "$1");

	return result;
}
