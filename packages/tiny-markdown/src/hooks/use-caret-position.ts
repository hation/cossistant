import * as React from "react";
import type {
	CaretCoordinates,
	UseCaretPositionOptions,
	UseCaretPositionReturn,
} from "../types";

/**
 * Creates a mirror element to measure text dimensions.
 * This technique is used to calculate caret position in textareas.
 */
function createMirrorElement(textarea: HTMLTextAreaElement): HTMLDivElement {
	const mirror = document.createElement("div");
	const computed = window.getComputedStyle(textarea);

	// Copy all relevant styles
	const stylesToCopy = [
		"fontFamily",
		"fontSize",
		"fontWeight",
		"fontStyle",
		"letterSpacing",
		"textTransform",
		"wordSpacing",
		"textIndent",
		"whiteSpace",
		"wordWrap",
		"wordBreak",
		"overflowWrap",
		"lineHeight",
		"padding",
		"paddingTop",
		"paddingRight",
		"paddingBottom",
		"paddingLeft",
		"border",
		"borderWidth",
		"boxSizing",
	] as const;

	for (const style of stylesToCopy) {
		mirror.style[style] = computed[style];
	}

	// Set width to match textarea
	mirror.style.width = `${textarea.clientWidth}px`;

	// Hide but keep in layout for measurement
	mirror.style.position = "absolute";
	mirror.style.visibility = "hidden";
	mirror.style.whiteSpace = "pre-wrap";
	mirror.style.overflow = "hidden";

	return mirror;
}

/**
 * Get caret coordinates relative to the textarea/container.
 */
function getCaretCoordinatesFromTextarea(
	textarea: HTMLTextAreaElement,
	position: number
): CaretCoordinates {
	const mirror = createMirrorElement(textarea);
	document.body.appendChild(mirror);

	try {
		const text = textarea.value.substring(0, position);

		// Create a span for the caret position
		const textNode = document.createTextNode(text);
		const caretSpan = document.createElement("span");
		caretSpan.textContent = "\u200b"; // Zero-width space

		mirror.appendChild(textNode);
		mirror.appendChild(caretSpan);

		const caretRect = caretSpan.getBoundingClientRect();
		const mirrorRect = mirror.getBoundingClientRect();

		// Get line height from computed styles
		const lineHeight =
			Number.parseFloat(window.getComputedStyle(textarea).lineHeight) ||
			Number.parseFloat(window.getComputedStyle(textarea).fontSize) * 1.2;

		return {
			top: caretRect.top - mirrorRect.top - textarea.scrollTop,
			left: caretRect.left - mirrorRect.left - textarea.scrollLeft,
			height: lineHeight,
		};
	} finally {
		document.body.removeChild(mirror);
	}
}

/**
 * Hook to get caret pixel coordinates from a textarea.
 * Useful for positioning popovers (like mention suggestions) near the cursor.
 */
export function useCaretPosition({
	textareaRef,
	containerRef,
}: UseCaretPositionOptions): UseCaretPositionReturn {
	const getCaretCoordinates = React.useCallback(
		(position?: number): CaretCoordinates | null => {
			const textarea = textareaRef.current;
			if (!textarea) {
				return null;
			}

			const pos = position ?? textarea.selectionStart;

			try {
				return getCaretCoordinatesFromTextarea(textarea, pos);
			} catch {
				return null;
			}
		},
		[textareaRef]
	);

	const getCurrentLine = React.useCallback((): string => {
		const textarea = textareaRef.current;
		if (!textarea) {
			return "";
		}

		const { value, selectionStart } = textarea;
		const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
		const lineEnd = value.indexOf("\n", selectionStart);
		return value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
	}, [textareaRef]);

	return {
		getCaretCoordinates,
		getCurrentLine,
	};
}
