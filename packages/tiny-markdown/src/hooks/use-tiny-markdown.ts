import * as React from "react";
import type {
	MarkdownComponents,
	MarkdownToken,
	SelectionState,
	UseTinyMarkdownOptions,
	UseTinyMarkdownReturn,
} from "../types";
import { parseMarkdown } from "../utils/markdown-parser";
import { mergeRefs } from "../utils/merge-refs";
import { useTinyShortcuts } from "./use-tiny-shortcuts";

/**
 * Default renderers for markdown tokens.
 * These provide basic unstyled rendering - users should provide their own for styling.
 */
const defaultComponents: Required<MarkdownComponents> = {
	strong: ({ children }) => React.createElement("strong", null, children),
	em: ({ children }) => React.createElement("em", null, children),
	code: ({ children, inline }) =>
		inline
			? React.createElement("code", null, children)
			: React.createElement(
					"pre",
					null,
					React.createElement("code", null, children)
				),
	p: ({ children }) => React.createElement("span", null, children),
	blockquote: ({ children }) =>
		React.createElement("blockquote", null, children),
	ul: ({ children }) => React.createElement("ul", null, children),
	ol: ({ children }) => React.createElement("ol", null, children),
	li: ({ children }) => React.createElement("li", null, children),
	a: ({ href, children }) =>
		React.createElement(
			"a",
			{ href, target: "_blank", rel: "noopener" },
			children
		),
	br: () => React.createElement("br"),
	mention: ({ mention }) =>
		React.createElement(
			"span",
			{ "data-mention-id": mention.id, "data-mention-type": mention.type },
			`@${mention.name}`
		),
	header: ({ level, children }) =>
		React.createElement(`h${level}`, null, children),
};

/**
 * Render tokens to React elements using provided components.
 */
function renderTokens(
	tokens: MarkdownToken[],
	components: Required<MarkdownComponents>,
	keyPrefix = ""
): React.ReactNode[] {
	return tokens.map((token, index) => {
		const key = `${keyPrefix}${index}`;

		switch (token.type) {
			case "text":
				return token.content;

			case "strong":
				return React.createElement(
					React.Fragment,
					{ key },
					components.strong({
						children: renderTokens(token.children, components, `${key}-`),
					})
				);

			case "em":
				return React.createElement(
					React.Fragment,
					{ key },
					components.em({
						children: renderTokens(token.children, components, `${key}-`),
					})
				);

			case "code":
				return React.createElement(
					React.Fragment,
					{ key },
					components.code({
						children: token.content,
						inline: token.inline,
						language: token.language,
						fileName: token.fileName,
					})
				);

			case "p":
				return React.createElement(
					React.Fragment,
					{ key },
					components.p({
						children: renderTokens(token.children, components, `${key}-`),
					})
				);

			case "blockquote":
				return React.createElement(
					React.Fragment,
					{ key },
					components.blockquote({
						children: renderTokens(token.children, components, `${key}-`),
					})
				);

			case "ul":
				return React.createElement(
					React.Fragment,
					{ key },
					components.ul({
						children: renderTokens(token.children, components, `${key}-`),
					})
				);

			case "ol":
				return React.createElement(
					React.Fragment,
					{ key },
					components.ol({
						children: renderTokens(token.children, components, `${key}-`),
					})
				);

			case "li":
				return React.createElement(
					React.Fragment,
					{ key },
					components.li({
						children: renderTokens(token.children, components, `${key}-`),
					})
				);

			case "a":
				return React.createElement(
					React.Fragment,
					{ key },
					components.a({
						href: token.href,
						children: renderTokens(token.children, components, `${key}-`),
					})
				);

			case "br":
				return React.createElement(React.Fragment, { key }, components.br());

			case "mention":
				return React.createElement(
					React.Fragment,
					{ key },
					components.mention({ mention: token.mention })
				);

			case "header":
				return React.createElement(
					React.Fragment,
					{ key },
					components.header({
						level: token.level,
						children: renderTokens(token.children, components, `${key}-`),
					})
				);

			default:
				return null;
		}
	});
}

/**
 * Core hook for the tiny-markdown editor.
 * Provides state management, token parsing, overlay rendering, and keyboard shortcuts.
 */
export function useTinyMarkdown(
	options: UseTinyMarkdownOptions = {}
): UseTinyMarkdownReturn {
	const {
		value: controlledValue,
		defaultValue = "",
		onChange,
		onSubmit,
		features = {},
		autoResize = true,
		maxHeight,
		components: userComponents = {},
	} = options;

	// Merge user components with defaults
	const components = React.useMemo(
		() => ({ ...defaultComponents, ...userComponents }),
		[userComponents]
	);

	// Controlled vs uncontrolled value
	const [internalValue, setInternalValue] = React.useState(defaultValue);
	const isControlled = controlledValue !== undefined;
	const value = isControlled ? controlledValue : internalValue;

	// Selection and focus state
	const [selection, setSelection] = React.useState<SelectionState>({
		start: 0,
		end: 0,
	});
	const [isFocused, setIsFocused] = React.useState(false);

	// Refs
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const overlayRef = React.useRef<HTMLDivElement>(null);

	// Parse tokens
	const tokens = React.useMemo(() => parseMarkdown(value), [value]);

	// Render overlay content
	const overlayContent = React.useMemo(
		() => renderTokens(tokens, components),
		[tokens, components]
	);

	// Value setter
	const setValue = React.useCallback(
		(newValue: string) => {
			if (!isControlled) {
				setInternalValue(newValue);
			}
			onChange?.(newValue);
		},
		[isControlled, onChange]
	);

	// Text manipulation helpers
	const insertText = React.useCallback(
		(text: string, position?: number) => {
			const textarea = textareaRef.current;
			const pos = position ?? textarea?.selectionStart ?? value.length;
			const newValue = value.slice(0, pos) + text + value.slice(pos);
			setValue(newValue);

			// Update cursor position
			requestAnimationFrame(() => {
				textarea?.setSelectionRange(pos + text.length, pos + text.length);
			});
		},
		[value, setValue]
	);

	const replaceRange = React.useCallback(
		(start: number, end: number, text: string) => {
			const newValue = value.slice(0, start) + text + value.slice(end);
			setValue(newValue);

			// Update cursor position
			requestAnimationFrame(() => {
				const textarea = textareaRef.current;
				const newPos = start + text.length;
				textarea?.setSelectionRange(newPos, newPos);
			});
		},
		[value, setValue]
	);

	// Keyboard shortcuts
	const shortcuts = useTinyShortcuts({
		textareaRef,
		value,
		setValue,
		features,
		onSubmit,
	});

	// Auto-resize effect
	React.useLayoutEffect(() => {
		if (!autoResize) {
			return;
		}

		const textarea = textareaRef.current;
		if (!textarea) {
			return;
		}

		// Reset height to auto to get correct scrollHeight
		textarea.style.height = "auto";
		const originalOverflow = textarea.style.overflow;
		textarea.style.overflow = "hidden";

		// Calculate new height
		let newHeight = textarea.scrollHeight;
		if (maxHeight && newHeight > maxHeight) {
			newHeight = maxHeight;
			textarea.style.overflow = "auto";
		} else {
			textarea.style.overflow = originalOverflow;
		}

		textarea.style.height = `${newHeight}px`;

		// Sync overlay height
		if (overlayRef.current) {
			overlayRef.current.style.height = `${newHeight}px`;
		}
	}, [value, autoResize, maxHeight]);

	// Scroll sync
	const handleScroll = React.useCallback(
		(e: React.UIEvent<HTMLTextAreaElement>) => {
			const textarea = e.currentTarget;
			if (overlayRef.current) {
				overlayRef.current.scrollTop = textarea.scrollTop;
				overlayRef.current.scrollLeft = textarea.scrollLeft;
			}
		},
		[]
	);

	// Selection tracking
	const handleSelect = React.useCallback(
		(e: React.SyntheticEvent<HTMLTextAreaElement>) => {
			const textarea = e.currentTarget;
			setSelection({
				start: textarea.selectionStart,
				end: textarea.selectionEnd,
			});
		},
		[]
	);

	// Focus tracking
	const handleFocus = React.useCallback(() => setIsFocused(true), []);
	const handleBlur = React.useCallback(() => setIsFocused(false), []);

	// Change handler
	const handleChange = React.useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setValue(e.target.value);
		},
		[setValue]
	);

	// Container props
	const containerProps = React.useMemo(
		() => ({
			ref: ((node: HTMLDivElement | null) => {
				(
					containerRef as React.MutableRefObject<HTMLDivElement | null>
				).current = node;
			}) as React.RefCallback<HTMLDivElement>,
			style: {
				position: "relative" as const,
				display: "inline-block",
				width: "100%",
			},
		}),
		[]
	);

	// Textarea props (hidden but receives input)
	const textareaProps = React.useMemo(
		() => ({
			ref: ((node: HTMLTextAreaElement | null) => {
				(
					textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>
				).current = node;
			}) as React.RefCallback<HTMLTextAreaElement>,
			value,
			onChange: handleChange,
			onKeyDown: shortcuts.handleKeyDown,
			onSelect: handleSelect,
			onScroll: handleScroll,
			onFocus: handleFocus,
			onBlur: handleBlur,
			style: {
				position: "absolute" as const,
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				resize: "none" as const,
				overflow: "hidden" as const,
				// Make transparent but keep for input
				color: "transparent",
				caretColor: "inherit",
				background: "transparent",
				// Ensure same typography as overlay
				font: "inherit",
				lineHeight: "inherit",
				letterSpacing: "inherit",
				wordSpacing: "inherit",
			},
		}),
		[
			value,
			handleChange,
			shortcuts.handleKeyDown,
			handleSelect,
			handleScroll,
			handleFocus,
			handleBlur,
		]
	);

	// Overlay props (visible but doesn't receive input)
	const overlayProps = React.useMemo(
		() => ({
			ref: ((node: HTMLDivElement | null) => {
				(overlayRef as React.MutableRefObject<HTMLDivElement | null>).current =
					node;
			}) as React.RefCallback<HTMLDivElement>,
			style: {
				pointerEvents: "none" as const,
				userSelect: "none" as const,
				whiteSpace: "pre-wrap" as const,
				wordWrap: "break-word" as const,
				overflowWrap: "break-word" as const,
				overflow: "hidden" as const,
				// Typography should match textarea
				font: "inherit",
				lineHeight: "inherit",
				letterSpacing: "inherit",
				wordSpacing: "inherit",
			},
		}),
		[]
	);

	return {
		// State
		value,
		selection,
		isFocused,

		// Parsed content
		tokens,

		// Actions
		setValue,
		insertText,
		replaceRange,

		// Formatting actions from shortcuts
		toggleBold: shortcuts.toggleBold,
		toggleItalic: shortcuts.toggleItalic,
		insertBulletList: shortcuts.insertBulletList,
		insertNumberedList: shortcuts.insertNumberedList,
		insertHeader: shortcuts.insertHeader,

		// Props
		containerProps,
		textareaProps,
		overlayProps,

		// Rendered content
		overlayContent,

		// Refs
		textareaRef,
		containerRef,
	};
}
