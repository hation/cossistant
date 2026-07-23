"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTRPC } from "@/lib/trpc/client";

type UseConversationTimelineItemsOptions = {
	limit?: number;
	enabled?: boolean;
};

const DEFAULT_PAGE_LIMIT = 50;

// 5 minutes
const STALE_TIME = 300_000;

export function useConversationTimelineItems({
	websiteSlug,
	conversationId,
	options,
}: {
	websiteSlug: string;
	conversationId: string;
	options?: UseConversationTimelineItemsOptions;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const baseQueryKey =
		trpc.conversation.getConversationTimelineItems.queryOptions({
			websiteSlug,
			conversationId,
			// ensure cache key differentiates by page size
			limit: options?.limit ?? DEFAULT_PAGE_LIMIT,
		}).queryKey;

	const query = useInfiniteQuery({
		queryKey: [...baseQueryKey, { type: "infinite" }],
		queryFn: async ({ pageParam }) => {
			const response = await queryClient.fetchQuery(
				trpc.conversation.getConversationTimelineItems.queryOptions({
					websiteSlug,
					conversationId,
					limit: options?.limit ?? DEFAULT_PAGE_LIMIT,
					cursor: pageParam ?? null,
				})
			);

			return response;
		},
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: null as string | null,
		enabled: options?.enabled ?? true,
		staleTime: STALE_TIME,
	});

	const pages = query.data?.pages;
	// dataUpdatedAt changes on every cache update (including setQueryData from WebSocket events)
	// This ensures the useMemo re-runs when new items arrive via realtime events
	const dataUpdatedAt = query.dataUpdatedAt;

	const items = useMemo(() => {
		if (!pages) {
			return [];
		}

		return pages
			.flatMap((page) => page.items)
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	}, [pages, dataUpdatedAt]);

	return {
		items,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isFetchingNextPage: query.isFetchingNextPage,
		hasNextPage: query.hasNextPage,
		fetchNextPage: query.fetchNextPage,
		error: query.error,
		refetch: query.refetch,
	};
}
