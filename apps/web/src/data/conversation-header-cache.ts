import type { RouterOutputs } from "@api/trpc/types";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

export type ConversationHeadersPage =
	RouterOutputs["conversation"]["listConversationsHeaders"];
export type ConversationHeader = ConversationHeadersPage["items"][number];

export function createConversationHeadersInfiniteQueryKey(
	baseQueryKey: readonly unknown[]
) {
	return [...baseQueryKey, { type: "infinite" }] as const;
}

function hasConversation(
	page: ConversationHeadersPage,
	conversationId: string
): boolean {
	return page.items.some((item) => item.id === conversationId);
}

export function prependConversationHeaderInCache(
	queryClient: QueryClient,
	queryKey: readonly unknown[],
	header: ConversationHeader
): void {
	queryClient.setQueryData<InfiniteData<ConversationHeadersPage>>(
		queryKey,
		(existing) => {
			if (!existing) {
				return {
					pages: [
						{
							items: [header],
							nextCursor: null,
						},
					],
					pageParams: [null],
				} satisfies InfiniteData<ConversationHeadersPage>;
			}

			if (existing.pages.some((page) => hasConversation(page, header.id))) {
				return existing;
			}

			if (existing.pages.length === 0) {
				return {
					pages: [
						{
							items: [header],
							nextCursor: null,
						},
					],
					pageParams: [...existing.pageParams],
				} satisfies InfiniteData<ConversationHeadersPage>;
			}

			const [firstPage, ...rest] = existing.pages;

			// firstPage is guaranteed to exist since we checked pages.length > 0 above
			if (!firstPage) {
				return existing;
			}

			return {
				pages: [
					{
						...firstPage,
						items: [header, ...firstPage.items],
					},
					...rest,
				],
				pageParams: [...existing.pageParams],
			};
		}
	);
}

function updateConversationHeaderInInfiniteData(
	existing: InfiniteData<ConversationHeadersPage> | undefined,
	conversationId: string,
	updater: (header: ConversationHeader) => ConversationHeader
): InfiniteData<ConversationHeadersPage> | undefined {
	if (!existing) {
		return existing;
	}

	let updated = false;

	const pages = existing.pages.map((page) => {
		let pageUpdated = false;

		const items = page.items.map((item) => {
			if (item.id !== conversationId) {
				return item;
			}

			updated = true;
			pageUpdated = true;

			return updater(item);
		});

		if (!pageUpdated) {
			return page;
		}

		return {
			...page,
			items,
		};
	});

	if (!updated) {
		return existing;
	}

	return {
		pages,
		pageParams: [...existing.pageParams],
	} satisfies InfiniteData<ConversationHeadersPage>;
}

export function updateConversationHeaderInCache(
	queryClient: QueryClient,
	queryKey: readonly unknown[],
	conversationId: string,
	updater: (header: ConversationHeader) => ConversationHeader
): void {
	queryClient.setQueryData<InfiniteData<ConversationHeadersPage> | undefined>(
		queryKey,
		(existing) =>
			updateConversationHeaderInInfiniteData(existing, conversationId, updater)
	);
}

type ConversationHeadersQueryInput = {
	websiteSlug?: string;
};

type QueryKeyInput = {
	input?: ConversationHeadersQueryInput;
	type?: string;
};

function extractHeadersQueryInput(
	queryKey: readonly unknown[]
): ConversationHeadersQueryInput | null {
	if (queryKey.length < 2) {
		return null;
	}

	const maybeInput = queryKey[1];
	if (!maybeInput || typeof maybeInput !== "object") {
		return null;
	}

	const input = (maybeInput as QueryKeyInput).input;
	if (!input || typeof input !== "object") {
		return null;
	}

	return input;
}

function isInfiniteQueryKey(queryKey: readonly unknown[]): boolean {
	const marker = queryKey[2];
	return Boolean(
		marker &&
			typeof marker === "object" &&
			"type" in marker &&
			(marker as QueryKeyInput).type === "infinite"
	);
}

export function forEachConversationHeadersQuery(
	queryClient: QueryClient,
	websiteSlug: string,
	callback: (queryKey: readonly unknown[]) => void
): void {
	const queries = queryClient
		.getQueryCache()
		.findAll({ queryKey: [["conversation", "listConversationsHeaders"]] });

	for (const query of queries) {
		const queryKey = query.queryKey as readonly unknown[];

		if (!isInfiniteQueryKey(queryKey)) {
			continue;
		}

		const input = extractHeadersQueryInput(queryKey);
		if (!input) {
			continue;
		}

		if (input.websiteSlug && input.websiteSlug !== websiteSlug) {
			continue;
		}

		callback(queryKey);
	}
}
