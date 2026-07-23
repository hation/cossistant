"use client";

import * as React from "react";

/**
 * Controlled state context for the Support widget.
 * Allows external control of widget open/close state.
 */
export type ControlledStateContextValue = {
	/**
	 * Controlled open state (undefined = uncontrolled)
	 */
	open: boolean | undefined;
	/**
	 * Callback when open state should change
	 */
	onOpenChange: ((open: boolean) => void) | undefined;
	/**
	 * Whether the component is in controlled mode
	 */
	isControlled: boolean;
};

const ControlledStateContext =
	React.createContext<ControlledStateContextValue | null>(null);

export type ControlledStateProviderProps = {
	/**
	 * Controlled open state
	 */
	open?: boolean;
	/**
	 * Callback when open state changes
	 */
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
};

/**
 * Provider for controlled widget state.
 * Wraps the Support component to enable controlled mode.
 */
export const ControlledStateProvider: React.FC<
	ControlledStateProviderProps
> = ({ open, onOpenChange, children }) => {
	const value = React.useMemo<ControlledStateContextValue>(
		() => ({
			open,
			onOpenChange,
			isControlled: open !== undefined,
		}),
		[open, onOpenChange]
	);

	return (
		<ControlledStateContext.Provider value={value}>
			{children}
		</ControlledStateContext.Provider>
	);
};

/**
 * Access controlled state context.
 * Returns null if not inside a ControlledStateProvider.
 */
export function useControlledState(): ControlledStateContextValue | null {
	return React.useContext(ControlledStateContext);
}
