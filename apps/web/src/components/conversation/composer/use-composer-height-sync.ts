"use client";

import type { RefObject } from "react";
import { useLayoutEffect, useRef } from "react";

const CONVERSATION_TIMELINE_ID = "conversation-timeline";
// Keep this aligned with the shared conversation timeline primitive.
const CONVERSATION_TIMELINE_BOTTOM_THRESHOLD_PX = 12;

type UseComposerHeightSyncOptions = {
	containerRef: RefObject<HTMLDivElement | null>;
	onHeightChange?: (height: number) => void;
};

type TimelineViewportMetrics = Pick<
	HTMLDivElement,
	"clientHeight" | "scrollHeight" | "scrollTop"
>;

type ConversationTimelineDocument = Pick<Document, "getElementById">;

export function isTimelinePinnedToBottom(
	timeline: TimelineViewportMetrics
): boolean {
	const distanceFromBottom =
		timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight;

	return distanceFromBottom <= CONVERSATION_TIMELINE_BOTTOM_THRESHOLD_PX;
}

function getConversationTimeline(
	timelineDocument: ConversationTimelineDocument | undefined
): HTMLDivElement | null {
	if (!timelineDocument) {
		return null;
	}

	return timelineDocument.getElementById(
		CONVERSATION_TIMELINE_ID
	) as HTMLDivElement | null;
}

export function scrollConversationTimelineToBottom(
	timelineDocument: ConversationTimelineDocument | undefined
): boolean {
	const timeline = getConversationTimeline(timelineDocument);
	if (!timeline) {
		return false;
	}

	timeline.scrollTo({
		top: timeline.scrollHeight,
	});

	return true;
}

export function useComposerHeightSync({
	containerRef,
	onHeightChange,
}: UseComposerHeightSyncOptions) {
	const previousHeightRef = useRef(0);
	const pendingFollowBottomFrameRef = useRef<number | null>(null);

	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const cancelPendingFollowBottom = () => {
			if (
				pendingFollowBottomFrameRef.current !== null &&
				typeof cancelAnimationFrame === "function"
			) {
				cancelAnimationFrame(pendingFollowBottomFrameRef.current);
			}

			pendingFollowBottomFrameRef.current = null;
		};

		const reportHeight = () => {
			const currentHeight = container.getBoundingClientRect().height;
			if (currentHeight === previousHeightRef.current) {
				return;
			}

			const timeline =
				typeof document === "undefined"
					? null
					: getConversationTimeline(document);
			const shouldFollowBottom = timeline
				? isTimelinePinnedToBottom(timeline)
				: false;

			if (!shouldFollowBottom) {
				cancelPendingFollowBottom();
			}

			onHeightChange?.(currentHeight);
			previousHeightRef.current = currentHeight;

			if (
				!(
					shouldFollowBottom &&
					typeof document !== "undefined" &&
					typeof requestAnimationFrame === "function"
				)
			) {
				return;
			}

			cancelPendingFollowBottom();
			pendingFollowBottomFrameRef.current = requestAnimationFrame(() => {
				pendingFollowBottomFrameRef.current = null;
				scrollConversationTimelineToBottom(document);
			});
		};

		reportHeight();

		if (typeof ResizeObserver === "undefined") {
			return cancelPendingFollowBottom;
		}

		const resizeObserver = new ResizeObserver(() => {
			reportHeight();
		});

		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			cancelPendingFollowBottom();
		};
	}, [containerRef, onHeightChange]);
}
