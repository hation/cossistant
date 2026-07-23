"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronRightIcon, EyeIcon } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
	buildPageTree,
	type KnowledgePage,
	type PageTreeNode,
} from "@/data/link-source-cache";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type PageTreeProps = {
	websiteSlug: string;
	linkSourceId: string;
	onScanSubpages?: (knowledgeId: string) => void;
};

type PageTreeNodeProps = {
	node: PageTreeNode;
	depth: number;
	websiteSlug: string;
	onToggleIncluded: (knowledgeId: string, isIncluded: boolean) => void;
	onScanSubpages?: (knowledgeId: string) => void;
	onViewContent: (knowledgeId: string) => void;
	isToggling: boolean;
};

function PageTreeNodeComponent({
	node,
	depth,
	websiteSlug,
	onToggleIncluded,
	onScanSubpages,
	onViewContent,
	isToggling,
}: PageTreeNodeProps) {
	const [isExpanded, setIsExpanded] = useState(depth < 2);
	const hasChildren = node.children.length > 0;

	const handleToggle = useCallback(() => {
		onToggleIncluded(node.knowledgeId, !node.isIncluded);
	}, [node.knowledgeId, node.isIncluded, onToggleIncluded]);

	const handleScan = useCallback(() => {
		onScanSubpages?.(node.knowledgeId);
	}, [node.knowledgeId, onScanSubpages]);

	const handleViewContent = useCallback(() => {
		onViewContent(node.knowledgeId);
	}, [node.knowledgeId, onViewContent]);

	// Extract just the last path segment for display
	const displayName = useMemo(() => {
		const segments = node.path.split("/").filter(Boolean);
		return segments.at(-1) ?? node.path;
	}, [node.path]);

	return (
		<div className="select-none">
			<div
				className={cn(
					"group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50",
					!node.isIncluded && "opacity-50"
				)}
				style={{ paddingLeft: `${depth * 16 + 8}px` }}
			>
				{/* Expand/collapse button */}
				<button
					className={cn(
						"flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground",
						!hasChildren && "invisible"
					)}
					onClick={() => setIsExpanded(!isExpanded)}
					type="button"
				>
					{isExpanded ? (
						<ChevronDownIcon className="h-3 w-3" />
					) : (
						<ChevronRightIcon className="h-3 w-3" />
					)}
				</button>

				{/* Include checkbox */}
				<Checkbox
					checked={node.isIncluded}
					className="h-4 w-4"
					disabled={isToggling}
					onCheckedChange={handleToggle}
				/>

				{/* Page info - clickable to view content */}
				<button
					className="flex min-w-0 flex-1 cursor-pointer flex-col text-left hover:text-primary"
					onClick={handleViewContent}
					type="button"
				>
					<span className="truncate text-sm" title={node.title ?? node.url}>
						{node.title ?? displayName}
					</span>
					<span
						className="truncate text-muted-foreground text-xs"
						title={node.url}
					>
						{displayName}
					</span>
				</button>

				{/* Size */}
				<span className="shrink-0 text-muted-foreground text-xs">
					{formatBytes(node.sizeBytes)}
				</span>

				{/* View content button */}
				<Button
					className="invisible h-6 w-6 p-0 group-hover:visible"
					onClick={handleViewContent}
					size="sm"
					title="View content"
					variant="ghost"
				>
					<EyeIcon className="h-3.5 w-3.5" />
				</Button>

				{/* Scan subpages button */}
				{onScanSubpages && (
					<Button
						className="invisible h-6 px-2 text-xs group-hover:visible"
						onClick={handleScan}
						size="sm"
						variant="ghost"
					>
						Scan
					</Button>
				)}
			</div>

			{/* Children */}
			{hasChildren && isExpanded && (
				<div>
					{node.children.map((child) => (
						<PageTreeNodeComponent
							depth={depth + 1}
							isToggling={isToggling}
							key={child.knowledgeId}
							node={child}
							onScanSubpages={onScanSubpages}
							onToggleIncluded={onToggleIncluded}
							onViewContent={onViewContent}
							websiteSlug={websiteSlug}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function formatBytes(bytes: number): string {
	if (bytes === 0) {
		return "0 B";
	}

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export function PageTree({
	websiteSlug,
	linkSourceId,
	onScanSubpages,
}: PageTreeProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [, setKnowledgeId] = useQueryState("knowledge", parseAsString);

	// Fetch knowledge pages for this link source
	const { data, isLoading, error } = useQuery(
		trpc.linkSource.listKnowledgeByLinkSource.queryOptions({
			websiteSlug,
			linkSourceId,
			limit: 100,
		})
	);

	// Toggle inclusion mutation
	const toggleMutation = useMutation(
		trpc.linkSource.toggleKnowledgeIncluded.mutationOptions({
			onMutate: async ({ knowledgeId, isIncluded }) => {
				// Cancel outgoing refetches
				await queryClient.cancelQueries({
					queryKey: trpc.linkSource.listKnowledgeByLinkSource.queryKey({
						websiteSlug,
						linkSourceId,
					}),
				});

				// Snapshot previous value
				const previousData = queryClient.getQueryData(
					trpc.linkSource.listKnowledgeByLinkSource.queryKey({
						websiteSlug,
						linkSourceId,
					})
				);

				// Optimistically update the cache
				queryClient.setQueryData(
					trpc.linkSource.listKnowledgeByLinkSource.queryKey({
						websiteSlug,
						linkSourceId,
					}),
					(old: typeof data) => {
						if (!old) {
							return old;
						}

						return {
							...old,
							items: old.items.map((item: KnowledgePage) =>
								item.id === knowledgeId ? { ...item, isIncluded } : item
							),
						};
					}
				);

				return { previousData };
			},
			onError: (_error, _variables, context) => {
				// Rollback on error
				if (context?.previousData) {
					queryClient.setQueryData(
						trpc.linkSource.listKnowledgeByLinkSource.queryKey({
							websiteSlug,
							linkSourceId,
						}),
						context.previousData
					);
				}
			},
			onSettled: () => {
				// Invalidate to refetch
				void queryClient.invalidateQueries({
					queryKey: trpc.linkSource.listKnowledgeByLinkSource.queryKey({
						websiteSlug,
						linkSourceId,
					}),
				});
			},
		})
	);

	// Build tree structure
	const tree = useMemo(() => {
		if (!data?.items) {
			return [];
		}

		return buildPageTree(data.items);
	}, [data?.items]);

	const handleToggleIncluded = useCallback(
		(knowledgeId: string, isIncluded: boolean) => {
			toggleMutation.mutate({
				websiteSlug,
				knowledgeId,
				isIncluded,
			});
		},
		[toggleMutation, websiteSlug]
	);

	const handleViewContent = useCallback(
		(knowledgeId: string) => {
			void setKnowledgeId(knowledgeId);
		},
		[setKnowledgeId]
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Spinner className="h-6 w-6" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 text-destructive text-sm">
				Failed to load pages: {error.message}
			</div>
		);
	}

	if (tree.length === 0) {
		return (
			<div className="p-4 text-muted-foreground text-sm">
				No pages found for this source.
			</div>
		);
	}

	return (
		<ScrollArea className="h-full">
			<div className="p-2">
				{tree.map((node) => (
					<PageTreeNodeComponent
						depth={0}
						isToggling={toggleMutation.isPending}
						key={node.knowledgeId}
						node={node}
						onScanSubpages={onScanSubpages}
						onToggleIncluded={handleToggleIncluded}
						onViewContent={handleViewContent}
						websiteSlug={websiteSlug}
					/>
				))}
			</div>
		</ScrollArea>
	);
}

export type { PageTreeProps };
