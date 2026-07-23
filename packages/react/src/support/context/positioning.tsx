"use client";

import * as React from "react";

// =============================================================================
// Types
// =============================================================================

export type TriggerRefContextValue = {
	/** The trigger element (state-based for reactivity) */
	triggerElement: HTMLElement | null;
	/** Set the trigger element - triggers re-render when called */
	setTriggerElement: (element: HTMLElement | null) => void;
};

// =============================================================================
// Context
// =============================================================================

const TriggerRefContext = React.createContext<TriggerRefContextValue | null>(
	null
);

// =============================================================================
// Provider
// =============================================================================

export type TriggerRefProviderProps = {
	children: React.ReactNode;
};

export const TriggerRefProvider: React.FC<TriggerRefProviderProps> = ({
	children,
}) => {
	// Using state instead of ref to trigger re-renders when trigger mounts
	// This ensures Floating UI receives the reference element
	const [triggerElement, setTriggerElement] =
		React.useState<HTMLElement | null>(null);

	const value = React.useMemo<TriggerRefContextValue>(
		() => ({
			triggerElement,
			setTriggerElement,
		}),
		[triggerElement]
	);

	return (
		<TriggerRefContext.Provider value={value}>
			{children}
		</TriggerRefContext.Provider>
	);
};

// =============================================================================
// Hook
// =============================================================================

export function useTriggerRef(): TriggerRefContextValue | null {
	return React.useContext(TriggerRefContext);
}
