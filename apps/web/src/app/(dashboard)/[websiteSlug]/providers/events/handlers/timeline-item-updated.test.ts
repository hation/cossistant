import { beforeEach, describe, expect, it, mock } from "bun:test";

const upsertConversationTimelineItemInCacheMock = mock(
	(_queryClient: unknown, _queryKey: readonly unknown[], _item: unknown) => {}
);

mock.module("@/data/conversation-message-cache", () => ({
	upsertConversationTimelineItemInCache:
		upsertConversationTimelineItemInCacheMock,
}));

const timelineItemUpdatedModulePromise = import("./timeline-item-updated");

describe("handleTimelineItemUpdated", () => {
	beforeEach(() => {
		upsertConversationTimelineItemInCacheMock.mockClear();
	});

	it("updates matching infinite timeline caches", async () => {
		const { handleTimelineItemUpdated } =
			await timelineItemUpdatedModulePromise;

		const queryClient = {
			getQueryCache: () => ({
				findAll: () => [
					{
						queryKey: [
							["conversation", "getConversationTimelineItems"],
							{
								input: {
									conversationId: "conv-1",
									websiteSlug: "acme",
								},
							},
							{ type: "infinite" },
						],
					},
					{
						queryKey: [
							["conversation", "getConversationTimelineItems"],
							{
								input: {
									conversationId: "conv-2",
									websiteSlug: "acme",
								},
							},
							{ type: "infinite" },
						],
					},
				],
			}),
		};

		handleTimelineItemUpdated({
			event: {
				type: "timelineItemUpdated",
				payload: {
					websiteId: "site-1",
					organizationId: "org-1",
					visitorId: "visitor-1",
					userId: null,
					conversationId: "conv-1",
					item: {
						id: "item-1",
						conversationId: "conv-1",
						organizationId: "org-1",
						visibility: "private",
						type: "tool",
						text: "Tool call: searchKnowledgeBase",
						parts: [],
						userId: null,
						visitorId: "visitor-1",
						aiAgentId: "ai-1",
						createdAt: "2026-01-01T00:00:00.000Z",
						deletedAt: null,
						tool: "searchKnowledgeBase",
					},
				},
			} as never,
			context: {
				queryClient: queryClient as never,
				website: {
					id: "site-1",
					slug: "acme",
				},
			} as never,
		});

		expect(upsertConversationTimelineItemInCacheMock).toHaveBeenCalledTimes(1);
		expect(
			upsertConversationTimelineItemInCacheMock.mock.calls[0]?.[1]
		).toEqual([
			["conversation", "getConversationTimelineItems"],
			{
				input: {
					conversationId: "conv-1",
					websiteSlug: "acme",
				},
			},
			{ type: "infinite" },
		]);
	});
});
