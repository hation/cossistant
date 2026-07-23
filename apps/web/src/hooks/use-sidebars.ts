import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useIsMobile } from "./use-mobile";

export const MIN_SIDEBAR_WIDTH = 240;
export const DEFAULT_SIDEBAR_WIDTH = 288;
export const MAX_SIDEBAR_WIDTH = 480;

export type SidebarPosition = "left" | "right";

type SidebarsState = {
	leftSidebarOpen: boolean;
	rightSidebarOpen: boolean;
	leftDesktopPreference: boolean;
	rightDesktopPreference: boolean;
	toggleLeftSidebar: () => void;
	toggleRightSidebar: () => void;
	toggleBothSidebars: () => void;
	closeBothSidebars: () => void;
	openBothSidebars: () => void;
	setSidebarOpen: (position: SidebarPosition, open: boolean) => void;
	setDesktopPreference: (position: SidebarPosition, open: boolean) => void;
};

export const useSidebarsState = create<SidebarsState>()(
	persist(
		(set, get) => ({
			leftSidebarOpen: true,
			rightSidebarOpen: true,
			leftDesktopPreference: true,
			rightDesktopPreference: true,
			toggleLeftSidebar: () => set({ leftSidebarOpen: !get().leftSidebarOpen }),
			toggleRightSidebar: () =>
				set({ rightSidebarOpen: !get().rightSidebarOpen }),
			toggleBothSidebars: () => {
				const { leftSidebarOpen, rightSidebarOpen } = get();
				// If both are open, close both. If any is closed, open both.
				const bothOpen = leftSidebarOpen && rightSidebarOpen;
				set({
					leftSidebarOpen: !bothOpen,
					rightSidebarOpen: !bothOpen,
				});
			},
			closeBothSidebars: () =>
				set({ leftSidebarOpen: false, rightSidebarOpen: false }),
			openBothSidebars: () =>
				set({ leftSidebarOpen: true, rightSidebarOpen: true }),
			setSidebarOpen: (position, open) =>
				set(
					position === "left"
						? { leftSidebarOpen: open }
						: { rightSidebarOpen: open }
				),
			setDesktopPreference: (position, open) =>
				set(
					position === "left"
						? { leftDesktopPreference: open }
						: { rightDesktopPreference: open }
				),
		}),
		{
			name: "sidebars-state",
			storage: createJSONStorage(() => localStorage),
		}
	)
);

export function useSidebar({ position }: { position: SidebarPosition }) {
	const isMobile = useIsMobile();
	const {
		leftSidebarOpen,
		rightSidebarOpen,
		leftDesktopPreference,
		rightDesktopPreference,
		setSidebarOpen,
		setDesktopPreference,
	} = useSidebarsState();

	const open = position === "left" ? leftSidebarOpen : rightSidebarOpen;
	const desktopPreference =
		position === "left" ? leftDesktopPreference : rightDesktopPreference;

	const previousIsMobile = useRef(isMobile);

	useEffect(() => {
		const wasMobile = previousIsMobile.current;

		if (!wasMobile && isMobile) {
			setDesktopPreference(position, open);
			if (open) {
				setSidebarOpen(position, false);
			}
		}

		if (wasMobile && !isMobile) {
			setSidebarOpen(position, desktopPreference);
		}

		previousIsMobile.current = isMobile;
	}, [
		desktopPreference,
		isMobile,
		open,
		position,
		setDesktopPreference,
		setSidebarOpen,
	]);

	const setOpen = useCallback(
		(nextOpen: boolean) => {
			setSidebarOpen(position, nextOpen);
			if (!isMobile) {
				setDesktopPreference(position, nextOpen);
			}
		},
		[isMobile, position, setDesktopPreference, setSidebarOpen]
	);

	const toggle = useCallback(() => {
		setOpen(!open);
	}, [open, setOpen]);

	return {
		open,
		toggle,
		setOpen,
		isMobile,
	};
}
