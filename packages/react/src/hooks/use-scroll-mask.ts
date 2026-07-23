import * as React from "react";

export type UseScrollMaskOptions = {
	maskHeight?: string;
	scrollbarWidth?: string;
	topThreshold?: number;
	bottomThreshold?: number;
};

export type UseScrollMaskReturn = {
	ref: React.RefObject<HTMLDivElement | null>;
	style: React.CSSProperties;
};

/**
 * Hook that provides dynamic scroll mask styles based on scroll position and scrollability.
 * Only shows gradients when content is scrollable and when not at the edges.
 *
 * @param options - Configuration for mask appearance and scroll thresholds
 * @returns Object with ref to attach to scrollable element and computed style object
 */
export function useScrollMask(
	options: UseScrollMaskOptions = {}
): UseScrollMaskReturn {
	const {
		maskHeight = "54px",
		scrollbarWidth = "12px",
		topThreshold = 2,
		bottomThreshold = 12,
	} = options;

	const ref = React.useRef<HTMLDivElement>(null);
	const [scrollState, setScrollState] = React.useState({
		isScrollable: false,
		isAtTop: true,
		isAtBottom: false,
	});

	// Check scrollability and position
	const updateScrollState = React.useCallback(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		const { scrollTop, scrollHeight, clientHeight } = element;
		const isScrollable = scrollHeight > clientHeight;
		const isAtTop = scrollTop <= topThreshold;
		const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
		const isAtBottom = distanceFromBottom <= bottomThreshold;

		setScrollState({
			isScrollable,
			isAtTop,
			isAtBottom,
		});
	}, [topThreshold, bottomThreshold]);

	// Update on scroll
	React.useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		element.addEventListener("scroll", updateScrollState, { passive: true });
		return () => {
			element.removeEventListener("scroll", updateScrollState);
		};
	}, [updateScrollState]);

	// Update on resize or content changes
	React.useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		// Initial check
		updateScrollState();

		const resizeObserver = new ResizeObserver(updateScrollState);
		resizeObserver.observe(element);

		// Also observe children changes (content updates)
		const mutationObserver = new MutationObserver(updateScrollState);
		mutationObserver.observe(element, {
			childList: true,
			subtree: true,
			characterData: true,
		});

		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
	}, [updateScrollState]);

	// Generate mask styles based on scroll state
	const style = React.useMemo<React.CSSProperties>(() => {
		const { isScrollable, isAtTop, isAtBottom } = scrollState;

		// No mask if content isn't scrollable
		if (!isScrollable) {
			return {};
		}

		// Determine which gradients to show
		const showTopGradient = !isAtTop;
		const showBottomGradient = !isAtBottom;

		// Build gradient stops
		let gradientStops: string;
		if (showTopGradient && showBottomGradient) {
			// Both gradients (middle of scroll)
			gradientStops = `transparent, black ${maskHeight}, black calc(100% - ${maskHeight}), transparent`;
		} else if (showTopGradient && !showBottomGradient) {
			// Only top gradient (at bottom)
			gradientStops = `transparent, black ${maskHeight}, black`;
		} else if (!showTopGradient && showBottomGradient) {
			// Only bottom gradient (at top)
			gradientStops = `black, black calc(100% - ${maskHeight}), transparent`;
		} else {
			// No gradients (shouldn't happen if scrollable, but handle it)
			return {};
		}

		const maskImage = `linear-gradient(to bottom, ${gradientStops}), linear-gradient(black, black)`;
		const maskSize = `calc(100% - ${scrollbarWidth}) 100%, ${scrollbarWidth} 100%`;
		const maskPosition = "0 0, 100% 0";
		const maskRepeat = "no-repeat, no-repeat";

		return {
			maskImage,
			maskSize,
			maskPosition,
			maskRepeat,
			WebkitMaskImage: maskImage,
			WebkitMaskSize: maskSize,
			WebkitMaskPosition: maskPosition,
			WebkitMaskRepeat: maskRepeat,
		};
	}, [scrollState, maskHeight, scrollbarWidth]);

	return { ref, style };
}
