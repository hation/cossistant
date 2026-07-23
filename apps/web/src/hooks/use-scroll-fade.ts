import { useEffect, useState } from "react";

type ScrollFadeState = {
	canScrollTop: boolean;
	canScrollBottom: boolean;
	showTopFade: boolean;
	showBottomFade: boolean;
};

export const useScrollFade = (element: HTMLElement | null) => {
	const [scrollState, setScrollState] = useState<ScrollFadeState>({
		canScrollTop: false,
		canScrollBottom: false,
		showTopFade: false,
		showBottomFade: false,
	});

	useEffect(() => {
		if (!element) {
			return;
		}

		const updateScrollState = () => {
			const { scrollTop, scrollHeight, clientHeight } = element;
			const canScrollTop = scrollTop > 0;
			const canScrollBottom = scrollTop < scrollHeight - clientHeight;

			// Only show fade effects if there's actually scrollable content
			const hasScrollableContent = scrollHeight > clientHeight;

			setScrollState({
				canScrollTop,
				canScrollBottom,
				showTopFade: hasScrollableContent && canScrollTop,
				showBottomFade: hasScrollableContent && canScrollBottom,
			});
		};

		// Initial check
		updateScrollState();

		// Listen for scroll events
		element.addEventListener("scroll", updateScrollState);

		// Listen for resize events (content might change)
		const resizeObserver = new ResizeObserver(updateScrollState);
		resizeObserver.observe(element);

		return () => {
			element.removeEventListener("scroll", updateScrollState);
			resizeObserver.disconnect();
		};
	}, [element]);

	return scrollState;
};
