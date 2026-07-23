import * as React from "react";
import type {
	CaretCoordinates,
	Mention,
	UseTinyMentionOptions,
	UseTinyMentionReturn,
} from "../types";
import { formatMention as formatMentionUtil } from "../utils/mention-parser";
import { useCaretPosition } from "./use-caret-position";

// Regex for whitespace detection
const WHITESPACE_REGEX = /\s/;

/**
 * Debounce hook for search queries.
 */
function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = React.useState(value);

	React.useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(timer);
		};
	}, [value, delay]);

	return debouncedValue;
}

/**
 * Extract the mention query from text at a given position.
 * Returns the query string and trigger position, or null if not in a mention context.
 */
function extractMentionQuery(
	text: string,
	position: number,
	trigger: string
): { query: string; triggerPosition: number } | null {
	// Look backwards from cursor to find the trigger
	let triggerPos = -1;

	for (let i = position - 1; i >= 0; i--) {
		const char = text[i];
		if (char === undefined) {
			break;
		}

		// Found the trigger
		if (char === trigger) {
			// Check if trigger is at start or preceded by whitespace
			const prevChar = text[i - 1];
			if (
				i === 0 ||
				(prevChar !== undefined && WHITESPACE_REGEX.test(prevChar))
			) {
				triggerPos = i;
				break;
			}
			// Trigger not valid (not at word boundary)
			return null;
		}

		// Hit whitespace without finding trigger - no active mention
		if (WHITESPACE_REGEX.test(char)) {
			return null;
		}
	}

	if (triggerPos === -1) {
		return null;
	}

	// Extract query (everything between trigger and cursor)
	const query = text.slice(triggerPos + trigger.length, position);

	return { query, triggerPosition: triggerPos };
}

/**
 * Hook for mention functionality.
 * Handles @ detection, search, keyboard navigation, and selection.
 */
export function useTinyMention({
	textareaRef,
	containerRef,
	value,
	cursorPosition,
	onSearch,
	onSelect,
	trigger = "@",
	debounceMs = 150,
	minQueryLength = 0,
	maxResults = 5,
}: UseTinyMentionOptions): UseTinyMentionReturn {
	// State
	const [isActive, setIsActive] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const [triggerPosition, setTriggerPosition] = React.useState<number | null>(
		null
	);
	const [results, setResults] = React.useState<Mention[]>([]);
	const [highlightedIndex, setHighlightedIndex] = React.useState(0);
	const [isLoading, setIsLoading] = React.useState(false);

	// Caret position for popover
	const { getCaretCoordinates } = useCaretPosition({
		textareaRef,
		containerRef,
	});
	const [caretPosition, setCaretPosition] =
		React.useState<CaretCoordinates | null>(null);

	// Debounced query for search
	const debouncedQuery = useDebounce(query, debounceMs);

	// Detect mention context when cursor position or value changes
	React.useEffect(() => {
		const mentionContext = extractMentionQuery(value, cursorPosition, trigger);

		if (mentionContext) {
			setIsActive(true);
			setQuery(mentionContext.query);
			setTriggerPosition(mentionContext.triggerPosition);

			// Update caret position
			const coords = getCaretCoordinates(cursorPosition);
			setCaretPosition(coords);
		} else {
			setIsActive(false);
			setQuery("");
			setTriggerPosition(null);
			setResults([]);
			setHighlightedIndex(0);
		}
	}, [value, cursorPosition, trigger, getCaretCoordinates]);

	// Search when debounced query changes
	React.useEffect(() => {
		if (!isActive) {
			return;
		}
		if (debouncedQuery.length < minQueryLength) {
			setResults([]);
			return;
		}

		let cancelled = false;
		setIsLoading(true);

		const doSearch = async () => {
			try {
				const searchResults = await Promise.resolve(onSearch(debouncedQuery));
				if (!cancelled) {
					setResults(searchResults.slice(0, maxResults));
					setHighlightedIndex(0);
				}
			} catch (error) {
				if (!cancelled) {
					setResults([]);
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		doSearch();

		return () => {
			cancelled = true;
		};
	}, [debouncedQuery, isActive, minQueryLength, maxResults, onSearch]);

	// Format mention for insertion
	const formatMention = React.useCallback(
		(mention: Mention): string => formatMentionUtil(mention),
		[]
	);

	// Select a mention
	const selectMention = React.useCallback(
		(mention: Mention) => {
			onSelect?.(mention);
			setIsActive(false);
			setQuery("");
			setTriggerPosition(null);
			setResults([]);
			setHighlightedIndex(0);
		},
		[onSelect]
	);

	// Select the currently highlighted mention
	const selectHighlighted = React.useCallback(() => {
		const mention = results[highlightedIndex];
		if (mention) {
			selectMention(mention);
		}
	}, [results, highlightedIndex, selectMention]);

	// Navigation
	const highlightNext = React.useCallback(() => {
		setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
	}, [results.length]);

	const highlightPrevious = React.useCallback(() => {
		setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
	}, [results.length]);

	// Close the mention popover
	const close = React.useCallback(() => {
		setIsActive(false);
		setQuery("");
		setTriggerPosition(null);
		setResults([]);
		setHighlightedIndex(0);
	}, []);

	// Keyboard handler - returns true if the event was handled
	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
			if (!isActive) {
				return false;
			}

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					highlightNext();
					return true;

				case "ArrowUp":
					e.preventDefault();
					highlightPrevious();
					return true;

				case "Enter":
				case "Tab":
					if (results.length > 0) {
						e.preventDefault();
						selectHighlighted();
						return true;
					}
					return false;

				case "Escape":
					e.preventDefault();
					close();
					return true;

				default:
					return false;
			}
		},
		[
			isActive,
			results.length,
			highlightNext,
			highlightPrevious,
			selectHighlighted,
			close,
		]
	);

	return {
		// State
		isActive,
		query,
		results,
		highlightedIndex,
		isLoading,
		triggerPosition,

		// Popover positioning
		caretPosition,

		// Actions
		selectMention,
		selectHighlighted,
		highlightNext,
		highlightPrevious,
		close,

		// Keyboard handler
		handleKeyDown,

		// Helper
		formatMention,
	};
}
