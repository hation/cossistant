import type { RouterOutputs } from "@api/trpc/types";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

// Link source types
export type LinkSourceListResponse = RouterOutputs["linkSource"]["list"];
export type LinkSource = LinkSourceListResponse["items"][number];
export type LinkSourceStatus = LinkSource["status"];

// Knowledge types for a link source
export type KnowledgeListResponse =
	RouterOutputs["linkSource"]["listKnowledgeByLinkSource"];
export type KnowledgePage = KnowledgeListResponse["items"][number];

// Query key helpers
export function createLinkSourceListQueryKey(websiteSlug: string) {
	return [["linkSource", "list"], { input: { websiteSlug } }] as const;
}

export function createLinkSourceGetQueryKey(
	websiteSlug: string,
	linkSourceId: string
) {
	return [
		["linkSource", "get"],
		{ input: { websiteSlug, id: linkSourceId } },
	] as const;
}

export function createKnowledgeByLinkSourceQueryKey(
	websiteSlug: string,
	linkSourceId: string
) {
	return [
		["linkSource", "listKnowledgeByLinkSource"],
		{ input: { websiteSlug, linkSourceId } },
	] as const;
}

export function createTrainingStatsQueryKey(websiteSlug: string) {
	return [
		["linkSource", "getTrainingStats"],
		{ input: { websiteSlug } },
	] as const;
}

// Query key input extraction
type LinkSourceQueryInput = {
	websiteSlug?: string;
};

type QueryKeyInput = {
	input?: LinkSourceQueryInput;
	type?: string;
};

function extractQueryInput(
	queryKey: readonly unknown[]
): LinkSourceQueryInput | null {
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

/**
 * Update a link source in the list cache
 */
export function updateLinkSourceInCache(
	queryClient: QueryClient,
	queryKey: readonly unknown[],
	linkSourceId: string,
	updater: (linkSource: LinkSource) => LinkSource
): void {
	queryClient.setQueryData<LinkSourceListResponse | undefined>(
		queryKey,
		(existing) => {
			if (!existing) {
				return existing;
			}

			let updated = false;
			const items = existing.items.map((item) => {
				if (item.id !== linkSourceId) {
					return item;
				}

				updated = true;
				return updater(item);
			});

			if (!updated) {
				return existing;
			}

			return {
				...existing,
				items,
			};
		}
	);
}

/**
 * Add a new link source to the beginning of the list cache
 */
export function prependLinkSourceInCache(
	queryClient: QueryClient,
	queryKey: readonly unknown[],
	linkSource: LinkSource
): void {
	queryClient.setQueryData<LinkSourceListResponse | undefined>(
		queryKey,
		(existing) => {
			if (!existing) {
				return {
					items: [linkSource],
					pagination: {
						page: 1,
						limit: 20,
						total: 1,
						hasMore: false,
					},
				};
			}

			// Don't add if already exists
			if (existing.items.some((item) => item.id === linkSource.id)) {
				return existing;
			}

			return {
				...existing,
				items: [linkSource, ...existing.items],
				pagination: {
					...existing.pagination,
					total: existing.pagination.total + 1,
				},
			};
		}
	);
}

/**
 * Remove a link source from the list cache
 */
export function removeLinkSourceFromCache(
	queryClient: QueryClient,
	queryKey: readonly unknown[],
	linkSourceId: string
): void {
	queryClient.setQueryData<LinkSourceListResponse | undefined>(
		queryKey,
		(existing) => {
			if (!existing) {
				return existing;
			}

			const items = existing.items.filter((item) => item.id !== linkSourceId);

			if (items.length === existing.items.length) {
				return existing;
			}

			return {
				...existing,
				items,
				pagination: {
					...existing.pagination,
					total: Math.max(0, existing.pagination.total - 1),
				},
			};
		}
	);
}

/**
 * Iterate over all link source list queries for a website
 */
export function forEachLinkSourceListQuery(
	queryClient: QueryClient,
	websiteSlug: string,
	callback: (queryKey: readonly unknown[]) => void
): void {
	const queries = queryClient
		.getQueryCache()
		.findAll({ queryKey: [["linkSource", "list"]] });

	for (const query of queries) {
		const queryKey = query.queryKey as readonly unknown[];
		const input = extractQueryInput(queryKey);

		if (!input) {
			continue;
		}

		if (input.websiteSlug && input.websiteSlug !== websiteSlug) {
			continue;
		}

		callback(queryKey);
	}
}

/**
 * Update a knowledge page in the cache
 */
export function updateKnowledgePageInCache(
	queryClient: QueryClient,
	queryKey: readonly unknown[],
	knowledgeId: string,
	updater: (page: KnowledgePage) => KnowledgePage
): void {
	queryClient.setQueryData<KnowledgeListResponse | undefined>(
		queryKey,
		(existing) => {
			if (!existing) {
				return existing;
			}

			let updated = false;
			const items = existing.items.map((item) => {
				if (item.id !== knowledgeId) {
					return item;
				}

				updated = true;
				return updater(item);
			});

			if (!updated) {
				return existing;
			}

			return {
				...existing,
				items,
			};
		}
	);
}

/**
 * Remove a knowledge page from the cache
 */
export function removeKnowledgePageFromCache(
	queryClient: QueryClient,
	queryKey: readonly unknown[],
	knowledgeId: string
): void {
	queryClient.setQueryData<KnowledgeListResponse | undefined>(
		queryKey,
		(existing) => {
			if (!existing) {
				return existing;
			}

			const items = existing.items.filter((item) => item.id !== knowledgeId);

			if (items.length === existing.items.length) {
				return existing;
			}

			return {
				...existing,
				items,
				pagination: {
					...existing.pagination,
					total: Math.max(0, existing.pagination.total - 1),
				},
			};
		}
	);
}

/**
 * Group link sources by domain for tree display
 */
export function groupLinkSourcesByDomain(
	linkSources: LinkSource[]
): Map<string, LinkSource[]> {
	const groups = new Map<string, LinkSource[]>();

	for (const source of linkSources) {
		try {
			const url = new URL(source.url);
			const domain = url.hostname;

			const existing = groups.get(domain) ?? [];
			existing.push(source);
			groups.set(domain, existing);
		} catch {
			// Invalid URL, add to "unknown" group
			const existing = groups.get("unknown") ?? [];
			existing.push(source);
			groups.set("unknown", existing);
		}
	}

	return groups;
}

/**
 * Build a tree structure from knowledge pages for display
 */
export type PageTreeNode = {
	url: string;
	path: string;
	title: string | null;
	knowledgeId: string;
	isIncluded: boolean;
	sizeBytes: number;
	children: PageTreeNode[];
};

export function buildPageTree(pages: KnowledgePage[]): PageTreeNode[] {
	const root: PageTreeNode[] = [];
	const nodeMap = new Map<string, PageTreeNode>();

	// Sort pages by URL path depth
	const sortedPages = [...pages].sort((a, b) => {
		const pathA = a.sourceUrl ? new URL(a.sourceUrl).pathname : "";
		const pathB = b.sourceUrl ? new URL(b.sourceUrl).pathname : "";
		return pathA.split("/").length - pathB.split("/").length;
	});

	for (const page of sortedPages) {
		if (!page.sourceUrl) {
			continue;
		}

		try {
			const url = new URL(page.sourceUrl);
			const path = url.pathname;

			const node: PageTreeNode = {
				url: page.sourceUrl,
				path,
				title: page.sourceTitle,
				knowledgeId: page.id,
				isIncluded: page.isIncluded,
				sizeBytes: page.sizeBytes,
				children: [],
			};

			nodeMap.set(path, node);

			// Find parent
			const segments = path.split("/").filter(Boolean);
			let parentPath = "";

			if (segments.length > 1) {
				parentPath = `/${segments.slice(0, -1).join("/")}`;
			}

			const parent = parentPath ? nodeMap.get(parentPath) : null;

			if (parent) {
				parent.children.push(node);
			} else {
				root.push(node);
			}
		} catch {
			// Invalid URL, add to root
			root.push({
				url: page.sourceUrl,
				path: page.sourceUrl,
				title: page.sourceTitle,
				knowledgeId: page.id,
				isIncluded: page.isIncluded,
				sizeBytes: page.sizeBytes,
				children: [],
			});
		}
	}

	return root;
}
