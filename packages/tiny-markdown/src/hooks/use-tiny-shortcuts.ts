import * as React from "react";
import type { UseTinyShortcutsOptions, UseTinyShortcutsReturn } from "../types";
import {
	handleListEnter,
	toggleBold as transformBold,
	insertBulletList as transformBulletList,
	insertHeader as transformHeader,
	toggleItalic as transformItalic,
	insertNumberedList as transformNumberedList,
} from "../utils/markdown-transforms";

/**
 * Hook for markdown keyboard shortcuts.
 * Handles Cmd/Ctrl+B (bold), Cmd/Ctrl+I (italic), Enter (submit/list), etc.
 */
export function useTinyShortcuts({
	textareaRef,
	value,
	setValue,
	features = {},
	onSubmit,
}: UseTinyShortcutsOptions): UseTinyShortcutsReturn {
	const {
		bold = true,
		italic = true,
		bulletLists = true,
		numberedLists = true,
		headers = false,
		lineBreaks = true,
	} = features;

	const getSelection = React.useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) {
			return { start: 0, end: 0 };
		}
		return {
			start: textarea.selectionStart,
			end: textarea.selectionEnd,
		};
	}, [textareaRef]);

	const setSelection = React.useCallback(
		(start: number, end: number) => {
			const textarea = textareaRef.current;
			if (!textarea) {
				return;
			}
			// Use requestAnimationFrame to ensure the DOM has updated
			requestAnimationFrame(() => {
				textarea.setSelectionRange(start, end);
				textarea.focus();
			});
		},
		[textareaRef]
	);

	const toggleBold = React.useCallback(() => {
		if (!bold) {
			return;
		}
		const { start, end } = getSelection();
		const result = transformBold(value, start, end);
		setValue(result.text);
		setSelection(result.selectionStart, result.selectionEnd);
	}, [bold, value, setValue, getSelection, setSelection]);

	const toggleItalic = React.useCallback(() => {
		if (!italic) {
			return;
		}
		const { start, end } = getSelection();
		const result = transformItalic(value, start, end);
		setValue(result.text);
		setSelection(result.selectionStart, result.selectionEnd);
	}, [italic, value, setValue, getSelection, setSelection]);

	const insertBulletList = React.useCallback(() => {
		if (!bulletLists) {
			return;
		}
		const { start } = getSelection();
		const result = transformBulletList(value, start);
		setValue(result.text);
		setSelection(result.cursorPosition, result.cursorPosition);
	}, [bulletLists, value, setValue, getSelection, setSelection]);

	const insertNumberedList = React.useCallback(() => {
		if (!numberedLists) {
			return;
		}
		const { start } = getSelection();
		const result = transformNumberedList(value, start);
		setValue(result.text);
		setSelection(result.cursorPosition, result.cursorPosition);
	}, [numberedLists, value, setValue, getSelection, setSelection]);

	const insertHeader = React.useCallback(
		(level: 1 | 2 | 3 = 2) => {
			if (!headers) {
				return;
			}
			const { start } = getSelection();
			const result = transformHeader(value, start, level);
			setValue(result.text);
			setSelection(result.cursorPosition, result.cursorPosition);
		},
		[headers, value, setValue, getSelection, setSelection]
	);

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			const isMod = e.metaKey || e.ctrlKey;

			// Cmd/Ctrl + B = Bold
			if (isMod && e.key === "b" && bold) {
				e.preventDefault();
				toggleBold();
				return;
			}

			// Cmd/Ctrl + I = Italic
			if (isMod && e.key === "i" && italic) {
				e.preventDefault();
				toggleItalic();
				return;
			}

			// Enter handling
			if (e.key === "Enter") {
				// Shift+Enter = newline (if lineBreaks enabled)
				if (e.shiftKey && lineBreaks) {
					// Let default behavior happen (insert newline)
					return;
				}

				// Check for list continuation
				if (bulletLists || numberedLists) {
					const { start } = getSelection();
					const listResult = handleListEnter(value, start);
					if (listResult) {
						e.preventDefault();
						setValue(listResult.text);
						setSelection(listResult.cursorPosition, listResult.cursorPosition);
						return;
					}
				}

				// Regular Enter = submit
				if (!e.shiftKey && onSubmit) {
					e.preventDefault();
					onSubmit();
					return;
				}
			}
		},
		[
			bold,
			italic,
			bulletLists,
			numberedLists,
			lineBreaks,
			value,
			setValue,
			toggleBold,
			toggleItalic,
			getSelection,
			setSelection,
			onSubmit,
		]
	);

	return {
		handleKeyDown,
		toggleBold,
		toggleItalic,
		insertBulletList,
		insertNumberedList,
		insertHeader,
	};
}
