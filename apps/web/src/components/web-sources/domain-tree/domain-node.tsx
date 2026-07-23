"use client";

import {
	ChevronDownIcon,
	ChevronRightIcon,
	GlobeIcon,
	Trash2Icon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { LinkSource } from "@/data/link-source-cache";
import { useLinkSourceMutations } from "../hooks/use-link-source-mutations";
import { useDomainPages } from "../hooks/use-merged-domain-tree";
import { formatBytes } from "../utils";
import { PageTreeNode } from "./page-tree-node";

type DomainNodeProps = {
	domain: string;
	sources: LinkSource[];
	totalPages: number;
	totalSizeBytes: number;
	hasActiveCrawl: boolean;
	websiteSlug: string;
	aiAgentId: string | null;
	defaultExpanded?: boolean;
};

export function DomainNode({
	domain,
	sources,
	totalPages,
	totalSizeBytes,
	hasActiveCrawl,
	websiteSlug,
	aiAgentId,
	defaultExpanded = false,
}: DomainNodeProps) {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);

	// Fetch pages lazily when expanded
	const { tree, isLoading: isLoadingPages } = useDomainPages({
		websiteSlug,
		sources,
		enabled: isExpanded,
	});

	// Mutations hook
	const {
		handleToggleIncluded,
		handleDeleteMultiple,
		handleReindexPage,
		handleDeletePage,
		handleIgnorePage,
		isToggling,
		isDeleting,
		isReindexing,
		isIgnoring,
	} = useLinkSourceMutations({
		websiteSlug,
		aiAgentId,
	});

	const handleToggleExpand = useCallback(() => {
		setIsExpanded((prev) => !prev);
	}, []);

	const handleDeleteDomain = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation(); // Prevent card expansion
			const sourceIds = sources.map((s) => s.id);
			void handleDeleteMultiple(sourceIds);
		},
		[sources, handleDeleteMultiple]
	);

	// Get the primary link source ID for the domain (first source)
	const primaryLinkSourceId = sources[0]?.id ?? "";

	return (
		<Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
			<Card className="group/domain-card border-0 bg-transparent">
				<CollapsibleTrigger asChild>
					<CardHeader
						className="-mx-1.5 cursor-pointer px-1 py-1 transition-colors hover:bg-background-200"
						onClick={handleToggleExpand}
					>
						<div className="flex items-center gap-2 pr-1">
							<GlobeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
							<span className="min-w-0 flex-1 truncate font-medium text-sm">
								{domain}
							</span>
							<span className="shrink-0 text-muted-foreground text-sm">
								{sources.length} {sources.length === 1 ? "source" : "sources"} •
								{"  "}
								{totalPages} {totalPages === 1 ? "page" : "pages"} •{"  "}
								{formatBytes(totalSizeBytes)}
							</span>
							{hasActiveCrawl && (
								<Badge className="shrink-0" variant="secondary">
									<Spinner className="mr-1 h-3 w-3" />
									Crawling
								</Badge>
							)}
							{/* Delete domain button - visible on hover */}
							<Button
								className="h-7 w-7 shrink-0 p-0 opacity-0 transition-opacity group-hover/domain-card:opacity-100"
								disabled={isDeleting || hasActiveCrawl}
								onClick={handleDeleteDomain}
								title={`Delete all ${sources.length} sources under ${domain}`}
								variant="ghost"
							>
								{isDeleting ? (
									<Spinner className="h-3.5 w-3.5" />
								) : (
									<Trash2Icon className="h-3.5 w-3.5 text-destructive" />
								)}
							</Button>
							{/* Caret on the right */}
							{isExpanded ? (
								<ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
							) : (
								<ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
							)}
						</div>
					</CardHeader>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<CardContent className="px-1 pt-4">
						{isLoadingPages ? (
							<div className="space-y-2">
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-full" />
							</div>
						) : tree.length === 0 ? (
							<p className="py-4 text-center text-muted-foreground text-sm">
								No pages found for this domain.
							</p>
						) : (
							<div className="space-y-0 px-0.5">
								{tree.map((node, index) => (
									<PageTreeNode
										ancestorsAreLastChild={[]}
										isDeleting={isDeleting}
										isIgnoring={isIgnoring}
										isLast={index === tree.length - 1}
										isReindexing={isReindexing}
										isToggling={isToggling}
										key={node.knowledgeId}
										linkSourceId={node.linkSourceId ?? primaryLinkSourceId}
										node={node}
										onDelete={handleDeletePage}
										onIgnore={handleIgnorePage}
										onReindex={handleReindexPage}
										onToggleIncluded={handleToggleIncluded}
										websiteSlug={websiteSlug}
									/>
								))}
							</div>
						)}
					</CardContent>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	);
}

export type { DomainNodeProps };
