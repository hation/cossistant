// Regex patterns for list and header detection
const BULLET_PREFIX_REGEX = /^[-*]\s/;
const NUMBERED_PREFIX_REGEX = /^(\d+)\.\s/;
const HEADER_PREFIX_REGEX = /^(#{1,3})\s/;
const BULLET_LINE_REGEX = /^([-*])\s(.*)$/;
const NUMBERED_LINE_REGEX = /^(\d+)\.\s(.*)$/;

/**
 * Wrap selected text with markdown formatting.
 * If the text is already wrapped, unwrap it instead (toggle).
 */
export function toggleWrap(
	text: string,
	selectionStart: number,
	selectionEnd: number,
	wrapper: string
): { text: string; selectionStart: number; selectionEnd: number } {
	const before = text.slice(0, selectionStart);
	const selected = text.slice(selectionStart, selectionEnd);
	const after = text.slice(selectionEnd);

	const wrapperLength = wrapper.length;

	// Check if already wrapped
	const isWrapped =
		before.endsWith(wrapper) && after.startsWith(wrapper) && selected !== "";

	if (isWrapped) {
		// Unwrap
		const newBefore = before.slice(0, -wrapperLength);
		const newAfter = after.slice(wrapperLength);
		return {
			text: newBefore + selected + newAfter,
			selectionStart: selectionStart - wrapperLength,
			selectionEnd: selectionEnd - wrapperLength,
		};
	}

	// Check if selection itself contains the wrappers
	if (selected.startsWith(wrapper) && selected.endsWith(wrapper)) {
		// Unwrap from selection
		const unwrapped = selected.slice(wrapperLength, -wrapperLength);
		return {
			text: before + unwrapped + after,
			selectionStart,
			selectionEnd: selectionEnd - wrapperLength * 2,
		};
	}

	// Wrap
	return {
		text: before + wrapper + selected + wrapper + after,
		selectionStart: selectionStart + wrapperLength,
		selectionEnd: selectionEnd + wrapperLength,
	};
}

/**
 * Toggle bold formatting (**text**)
 */
export function toggleBold(
	text: string,
	selectionStart: number,
	selectionEnd: number
): { text: string; selectionStart: number; selectionEnd: number } {
	return toggleWrap(text, selectionStart, selectionEnd, "**");
}

/**
 * Toggle italic formatting (*text*)
 */
export function toggleItalic(
	text: string,
	selectionStart: number,
	selectionEnd: number
): { text: string; selectionStart: number; selectionEnd: number } {
	return toggleWrap(text, selectionStart, selectionEnd, "*");
}

/**
 * Get the current line from cursor position.
 */
export function getCurrentLine(text: string, position: number): string {
	const lineStart = text.lastIndexOf("\n", position - 1) + 1;
	const lineEnd = text.indexOf("\n", position);
	return text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
}

/**
 * Get line start position for a given cursor position.
 */
export function getLineStart(text: string, position: number): number {
	return text.lastIndexOf("\n", position - 1) + 1;
}

/**
 * Insert or toggle a bullet list item at the current line.
 */
export function insertBulletList(
	text: string,
	position: number
): { text: string; cursorPosition: number } {
	const lineStart = getLineStart(text, position);
	const currentLine = getCurrentLine(text, position);

	// Check if line already starts with bullet
	if (BULLET_PREFIX_REGEX.test(currentLine)) {
		// Remove bullet
		const newText =
			text.slice(0, lineStart) +
			currentLine.slice(2) +
			text.slice(lineStart + currentLine.length);
		return {
			text: newText,
			cursorPosition: position - 2,
		};
	}

	// Add bullet
	const newText = `${text.slice(0, lineStart)}- ${text.slice(lineStart)}`;
	return {
		text: newText,
		cursorPosition: position + 2,
	};
}

/**
 * Insert or toggle a numbered list item at the current line.
 */
export function insertNumberedList(
	text: string,
	position: number
): { text: string; cursorPosition: number } {
	const lineStart = getLineStart(text, position);
	const currentLine = getCurrentLine(text, position);

	// Check if line already starts with number
	const numberMatch = currentLine.match(NUMBERED_PREFIX_REGEX);
	if (numberMatch) {
		// Remove number
		const prefixLength = numberMatch[0].length;
		const newText =
			text.slice(0, lineStart) +
			currentLine.slice(prefixLength) +
			text.slice(lineStart + currentLine.length);
		return {
			text: newText,
			cursorPosition: position - prefixLength,
		};
	}

	// Add "1. " at the start
	const newText = `${text.slice(0, lineStart)}1. ${text.slice(lineStart)}`;
	return {
		text: newText,
		cursorPosition: position + 3,
	};
}

/**
 * Insert a header at the current line.
 */
export function insertHeader(
	text: string,
	position: number,
	level: 1 | 2 | 3 = 2
): { text: string; cursorPosition: number } {
	const lineStart = getLineStart(text, position);
	const currentLine = getCurrentLine(text, position);

	// Check if line already has a header
	const headerMatch = currentLine.match(HEADER_PREFIX_REGEX);
	if (headerMatch) {
		const hashPart = headerMatch[1] ?? "";
		const currentLevel = hashPart.length;
		if (currentLevel === level) {
			// Remove header
			const prefixLength = headerMatch[0].length;
			const newText =
				text.slice(0, lineStart) +
				currentLine.slice(prefixLength) +
				text.slice(lineStart + currentLine.length);
			return {
				text: newText,
				cursorPosition: position - prefixLength,
			};
		}
		// Change header level
		const newPrefix = `${"#".repeat(level)} `;
		const newText =
			text.slice(0, lineStart) +
			newPrefix +
			currentLine.slice(headerMatch[0].length) +
			text.slice(lineStart + currentLine.length);
		return {
			text: newText,
			cursorPosition: position + (level - currentLevel),
		};
	}

	// Add header
	const prefix = `${"#".repeat(level)} `;
	const newText = text.slice(0, lineStart) + prefix + text.slice(lineStart);
	return {
		text: newText,
		cursorPosition: position + prefix.length,
	};
}

/**
 * Handle Enter key in a list - continue the list or exit if empty.
 */
export function handleListEnter(
	text: string,
	position: number
): { text: string; cursorPosition: number } | null {
	const lineStart = getLineStart(text, position);
	const currentLine = getCurrentLine(text, position);

	// Check for bullet list
	const bulletMatch = currentLine.match(BULLET_LINE_REGEX);
	if (bulletMatch) {
		const bullet = bulletMatch[1] ?? "-";
		const content = bulletMatch[2] ?? "";
		if (content.trim() === "") {
			// Empty list item - exit list
			const newText =
				text.slice(0, lineStart) + text.slice(lineStart + currentLine.length);
			return {
				text: newText,
				cursorPosition: lineStart,
			};
		}
		// Continue list
		const newText = `${text.slice(0, position)}\n${bullet} ${text.slice(position)}`;
		return {
			text: newText,
			cursorPosition: position + 3,
		};
	}

	// Check for numbered list
	const numberMatch = currentLine.match(NUMBERED_LINE_REGEX);
	if (numberMatch) {
		const num = numberMatch[1] ?? "1";
		const content = numberMatch[2] ?? "";
		if (content.trim() === "") {
			// Empty list item - exit list
			const newText =
				text.slice(0, lineStart) + text.slice(lineStart + currentLine.length);
			return {
				text: newText,
				cursorPosition: lineStart,
			};
		}
		// Continue list with next number
		const nextNum = Number.parseInt(num, 10) + 1;
		const prefix = `${nextNum}. `;
		const newText = `${text.slice(0, position)}\n${prefix}${text.slice(position)}`;
		return {
			text: newText,
			cursorPosition: position + 1 + prefix.length,
		};
	}

	return null;
}
