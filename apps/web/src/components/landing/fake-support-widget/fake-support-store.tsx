"use client";

import React from "react";

type FakeSupportPage = "HOME" | "CONVERSATION";

type FakeSupportNavigationState = {
	current:
		| {
				page: "HOME";
				params: Record<string, never>;
		  }
		| {
				page: "CONVERSATION";
				params: {
					conversationId: string;
					initialMessage?: string;
				};
		  };
	previousPages: never[];
};

const FakeSupportNavigationContext = React.createContext<
	| (FakeSupportNavigationState & {
			navigate: (
				page: FakeSupportPage,
				params?: { conversationId?: string; initialMessage?: string }
			) => void;
	  })
	| undefined
>(undefined);

const FakeSupportConfigContext = React.createContext<
	| {
			isOpen: boolean;
			open: () => void;
			close: () => void;
			toggle: () => void;
	  }
	| undefined
>(undefined);

type FakeSupportStoreProviderProps = {
	children: React.ReactNode;
	conversationId: string;
	initialPage?: FakeSupportPage;
	onNavigate?: (page: FakeSupportPage) => void;
};

/**
 * Fake support store provider that mimics the support store behavior.
 * Completely isolated from the real support store singleton.
 */
export function FakeSupportStoreProvider({
	children,
	conversationId,
	initialPage = "HOME",
	onNavigate,
}: FakeSupportStoreProviderProps): React.ReactElement {
	const [isOpen, setIsOpen] = React.useState(true);
	const [currentPage, setCurrentPage] =
		React.useState<FakeSupportPage>(initialPage);
	const [initialMessage, setInitialMessage] = React.useState<
		string | undefined
	>();

	const navigate = React.useCallback(
		(
			page: FakeSupportPage,
			params?: { conversationId?: string; initialMessage?: string }
		) => {
			setCurrentPage(page);
			if (params?.initialMessage) {
				setInitialMessage(params.initialMessage);
			}
			onNavigate?.(page);
		},
		[onNavigate]
	);

	const navigationValue = React.useMemo(() => {
		const current: FakeSupportNavigationState["current"] =
			currentPage === "HOME"
				? { page: "HOME" as const, params: {} as Record<string, never> }
				: {
						page: "CONVERSATION" as const,
						params: {
							conversationId,
							initialMessage,
						},
					};

		return {
			current,
			previousPages: [] as never[],
			navigate,
		};
	}, [currentPage, conversationId, initialMessage, navigate]);

	const configValue = React.useMemo(
		() => ({
			isOpen,
			open: () => setIsOpen(true),
			close: () => setIsOpen(false),
			toggle: () => setIsOpen((prev) => !prev),
		}),
		[isOpen]
	);

	return (
		<FakeSupportNavigationContext.Provider value={navigationValue}>
			<FakeSupportConfigContext.Provider value={configValue}>
				{children}
			</FakeSupportConfigContext.Provider>
		</FakeSupportNavigationContext.Provider>
	);
}

/**
 * Fake version of useSupportNavigation hook.
 * Supports HOME and CONVERSATION pages with navigation.
 */
export function useFakeSupportNavigation() {
	const context = React.useContext(FakeSupportNavigationContext);
	if (!context) {
		throw new Error(
			"useFakeSupportNavigation must be used within FakeSupportStoreProvider"
		);
	}

	return {
		current: context.current,
		page: context.current.page,
		params: context.current.params,
		previousPages: context.previousPages,
		navigate: context.navigate,
		replace: () => {},
		goBack: () => {},
		canGoBack: false,
	};
}

/**
 * Fake version of useSupportConfig hook.
 * Returns open/close state (always open for demo).
 */
export function useFakeSupportConfig() {
	const context = React.useContext(FakeSupportConfigContext);
	if (!context) {
		throw new Error(
			"useFakeSupportConfig must be used within FakeSupportStoreProvider"
		);
	}

	return context;
}
