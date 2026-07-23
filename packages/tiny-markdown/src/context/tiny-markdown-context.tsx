import * as React from "react";
import type { UseTinyMarkdownReturn, UseTinyMentionReturn } from "../types";

/**
 * Context for sharing editor state in compound component patterns.
 */
export type TinyMarkdownContextValue = {
	editor: UseTinyMarkdownReturn;
	mention?: UseTinyMentionReturn;
};

const TinyMarkdownContext =
	React.createContext<TinyMarkdownContextValue | null>(null);

export type TinyMarkdownProviderProps = {
	children: React.ReactNode;
	editor: UseTinyMarkdownReturn;
	mention?: UseTinyMentionReturn;
};

/**
 * Provider for sharing editor state with nested components.
 */
export function TinyMarkdownProvider({
	children,
	editor,
	mention,
}: TinyMarkdownProviderProps) {
	const value = React.useMemo(() => ({ editor, mention }), [editor, mention]);

	return (
		<TinyMarkdownContext.Provider value={value}>
			{children}
		</TinyMarkdownContext.Provider>
	);
}

/**
 * Hook to access the editor context.
 * Throws if used outside of TinyMarkdownProvider.
 */
export function useTinyMarkdownContext(): TinyMarkdownContextValue {
	const context = React.useContext(TinyMarkdownContext);
	if (!context) {
		throw new Error(
			"useTinyMarkdownContext must be used within a TinyMarkdownProvider"
		);
	}
	return context;
}

/**
 * Hook to optionally access the editor context.
 * Returns null if used outside of TinyMarkdownProvider.
 */
export function useTinyMarkdownContextSafe(): TinyMarkdownContextValue | null {
	return React.useContext(TinyMarkdownContext);
}
