import { describe, expect, it } from "bun:test";
import {
	CLIENT_TIMELINE_ITEM_CREATED_AT_MAX_FUTURE_SKEW_MS,
	ClientTimelineItemCreatedAtValidationError,
	normalizeClientTimelineItemCreatedAt,
} from "./client-timeline-item-created-at";

describe("normalizeClientTimelineItemCreatedAt", () => {
	const now = new Date("2026-04-17T10:00:00.000Z");

	it("returns undefined when createdAt is omitted", () => {
		expect(
			normalizeClientTimelineItemCreatedAt({
				field: "item.createdAt",
				now,
			})
		).toBeUndefined();
	});

	it("accepts the current timestamp", () => {
		const result = normalizeClientTimelineItemCreatedAt({
			createdAt: "2026-04-17T10:00:00.000Z",
			field: "item.createdAt",
			now,
		});

		expect(result?.toISOString()).toBe("2026-04-17T10:00:00.000Z");
	});

	it("accepts historical timestamps", () => {
		const result = normalizeClientTimelineItemCreatedAt({
			createdAt: "2026-04-13T10:00:00.000Z",
			field: "item.createdAt",
			now,
		});

		expect(result?.toISOString()).toBe("2026-04-13T10:00:00.000Z");
	});

	it("accepts timestamps exactly at the future boundary", () => {
		const result = normalizeClientTimelineItemCreatedAt({
			createdAt: new Date(
				now.getTime() + CLIENT_TIMELINE_ITEM_CREATED_AT_MAX_FUTURE_SKEW_MS
			).toISOString(),
			field: "item.createdAt",
			now,
		});

		expect(result?.toISOString()).toBe("2026-04-17T10:05:00.000Z");
	});

	it("rejects timestamps beyond the future boundary", () => {
		expect(() =>
			normalizeClientTimelineItemCreatedAt({
				createdAt: new Date(
					now.getTime() + CLIENT_TIMELINE_ITEM_CREATED_AT_MAX_FUTURE_SKEW_MS + 1
				).toISOString(),
				field: "item.createdAt",
				now,
			})
		).toThrow(ClientTimelineItemCreatedAtValidationError);
	});
});
