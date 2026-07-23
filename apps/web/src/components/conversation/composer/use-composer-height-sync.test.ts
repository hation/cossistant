import { describe, expect, it, mock } from "bun:test";
import {
	isTimelinePinnedToBottom,
	scrollConversationTimelineToBottom,
} from "./use-composer-height-sync";

function createTimeline({
	clientHeight,
	scrollHeight,
	scrollTop,
}: {
	clientHeight: number;
	scrollHeight: number;
	scrollTop: number;
}) {
	return {
		clientHeight,
		scrollHeight,
		scrollTop,
		scrollTo: mock(() => {}),
	} as unknown as HTMLDivElement;
}

function createTimelineDocument(timeline: HTMLDivElement | null) {
	return {
		getElementById: mock((id: string) =>
			id === "conversation-timeline" ? timeline : null
		),
	} as Pick<Document, "getElementById">;
}

describe("isTimelinePinnedToBottom", () => {
	it("treats a timeline within the shared bottom threshold as pinned", () => {
		const timeline = createTimeline({
			clientHeight: 300,
			scrollHeight: 612,
			scrollTop: 300,
		});

		expect(isTimelinePinnedToBottom(timeline)).toBe(true);
	});

	it("treats a timeline scrolled above the bottom threshold as not pinned", () => {
		const timeline = createTimeline({
			clientHeight: 300,
			scrollHeight: 700,
			scrollTop: 380,
		});

		expect(isTimelinePinnedToBottom(timeline)).toBe(false);
	});
});

describe("scrollConversationTimelineToBottom", () => {
	it("snaps a pinned timeline to the bottom after the composer grows", () => {
		const timeline = createTimeline({
			clientHeight: 300,
			scrollHeight: 920,
			scrollTop: 620,
		});
		const timelineDocument = createTimelineDocument(timeline);

		expect(isTimelinePinnedToBottom(timeline)).toBe(true);
		expect(scrollConversationTimelineToBottom(timelineDocument)).toBe(true);
		expect(timeline.scrollTo).toHaveBeenCalledWith({
			top: 920,
		});
	});

	it("keeps a pinned timeline at the bottom after the composer shrinks", () => {
		const timeline = createTimeline({
			clientHeight: 360,
			scrollHeight: 940,
			scrollTop: 580,
		});
		const timelineDocument = createTimelineDocument(timeline);

		expect(isTimelinePinnedToBottom(timeline)).toBe(true);
		expect(scrollConversationTimelineToBottom(timelineDocument)).toBe(true);
		expect(timeline.scrollTo).toHaveBeenCalledWith({
			top: 940,
		});
	});

	it("does not auto-follow when the user scrolled up past the threshold", () => {
		const timeline = createTimeline({
			clientHeight: 300,
			scrollHeight: 920,
			scrollTop: 560,
		});
		const timelineDocument = createTimelineDocument(timeline);

		const shouldFollowBottom = isTimelinePinnedToBottom(timeline);

		if (shouldFollowBottom) {
			scrollConversationTimelineToBottom(timelineDocument);
		}

		expect(shouldFollowBottom).toBe(false);
		expect(timeline.scrollTo).not.toHaveBeenCalled();
	});

	it("no-ops when document is unavailable", () => {
		expect(scrollConversationTimelineToBottom(undefined)).toBe(false);
	});

	it("no-ops when the timeline element cannot be found", () => {
		const timelineDocument = createTimelineDocument(null);

		expect(scrollConversationTimelineToBottom(timelineDocument)).toBe(false);
		expect(timelineDocument.getElementById).toHaveBeenCalledWith(
			"conversation-timeline"
		);
	});
});
