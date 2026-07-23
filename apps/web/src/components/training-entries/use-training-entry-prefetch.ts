"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTRPC } from "@/lib/trpc/client";

type PrefetchResult = {
	prefetchKnowledgeEntry: (knowledgeId: string, href: string) => void;
	prefetchProposal: (requestId: string, href: string) => void;
};

export function useTrainingEntryPrefetch(websiteSlug: string): PrefetchResult {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const router = useRouter();

	const prefetchKnowledgeEntry = useCallback(
		(knowledgeId: string, href: string) => {
			router.prefetch(href);

			const queryOptions = trpc.knowledge.get.queryOptions({
				websiteSlug,
				id: knowledgeId,
			});

			if (queryClient.getQueryState(queryOptions.queryKey)?.dataUpdatedAt) {
				return;
			}

			void queryClient.prefetchQuery(queryOptions);
		},
		[queryClient, router, trpc, websiteSlug]
	);

	const prefetchProposal = useCallback(
		(requestId: string, href: string) => {
			router.prefetch(href);

			const queryOptions = trpc.knowledgeClarification.getProposal.queryOptions(
				{
					websiteSlug,
					requestId,
				}
			);

			if (queryClient.getQueryState(queryOptions.queryKey)?.dataUpdatedAt) {
				return;
			}

			void queryClient.prefetchQuery(queryOptions);
		},
		[queryClient, router, trpc, websiteSlug]
	);

	return {
		prefetchKnowledgeEntry,
		prefetchProposal,
	};
}
