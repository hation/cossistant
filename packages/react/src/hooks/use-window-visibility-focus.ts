import { useEffect, useState } from "react";

export type WindowVisibilityFocusState = {
	isPageVisible: boolean;
	hasWindowFocus: boolean;
};

const getVisibilityFocusState = (): WindowVisibilityFocusState => {
	if (typeof document === "undefined") {
		return { isPageVisible: true, hasWindowFocus: true };
	}

	const isPageVisible = !document.hidden;
	const hasWindowFocus =
		isPageVisible &&
		(typeof document.hasFocus === "function" ? document.hasFocus() : true);

	return { isPageVisible, hasWindowFocus };
};

/**
 * Tracks document visibility and window focus so hooks can defer updates while
 * the user is away from the page.
 */
export function useWindowVisibilityFocus(): WindowVisibilityFocusState {
	const [state, setState] = useState<WindowVisibilityFocusState>(() =>
		getVisibilityFocusState()
	);

	useEffect(() => {
		if (typeof document === "undefined") {
			return;
		}

		const handleVisibilityChange = () => {
			setState(getVisibilityFocusState());
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		handleVisibilityChange();
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const syncVisibilityFocus = () => {
			setState(getVisibilityFocusState());
		};

		const handleFocus = () => {
			syncVisibilityFocus();
		};
		const handleBlur = () => {
			syncVisibilityFocus();
		};

		window.addEventListener("focus", handleFocus);
		window.addEventListener("blur", handleBlur);

		syncVisibilityFocus();

		return () => {
			window.removeEventListener("focus", handleFocus);
			window.removeEventListener("blur", handleBlur);
		};
	}, []);

	return state;
}
