"use client";

import {
	BanIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	ExternalLinkIcon,
	MoreHorizontalIcon,
	RefreshCwIcon,
	ToggleLeftIcon,
	ToggleRightIcon,
	Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { formatBytes, getPathDisplayName } from "../utils";

type PageTreeItemViewProps = {
	path: string;
	url: string;
	sizeBytes: number;
	treePrefix: string;
	isIncluded: boolean;
	hasChildren: boolean;
	isExpanded: boolean;
	pageCount: number;
	onToggleExpand?: () => void;
	onToggleIncluded?: () => void;
	onReindex?: () => void;
	onDelete?: () => void;
	onIgnore?: () => void;
	onViewContent?: () => void;
	onPrefetchContent?: () => void;
	isToggling?: boolean;
	isReindexing?: boolean;
	isDeleting?: boolean;
	isIgnoring?: boolean;
};

export function PageTreeItemView({
	path,
	url,
	sizeBytes,
	treePrefix,
	isIncluded,
	hasChildren,
	isExpanded,
	pageCount,
	onToggleExpand,
	onToggleIncluded,
	onReindex,
	onDelete,
	onIgnore,
	onViewContent,
	onPrefetchContent,
	isToggling = false,
	isReindexing = false,
	isDeleting = false,
	isIgnoring = false,
}: PageTreeItemViewProps) {
	const isAnyActionPending =
		isToggling || isReindexing || isDeleting || isIgnoring;
	const pageCountLabel = pageCount === 1 ? "1 page" : `${pageCount} pages`;

	return (
		<div
			className={cn(
				"group/tree-item -ml-4 -mr-3.5 relative flex items-center gap-2 px-2 py-0 text-sm",
				"transition-colors hover:bg-muted/50",
				"focus-visible:outline-none focus-visible:ring-0",
				!isIncluded && "opacity-50"
			)}
		>
			{/* Tree prefix - ASCII art visualization */}
			<span className="shrink-0 overflow-clip whitespace-pre font-light font-mono text-2xl text-primary/20 leading-[1.27] tracking-[0.020em]">
				{treePrefix}
			</span>

			{/* Page info - clickable to view content */}
			<button
				className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 overflow-hidden pr-2 text-left transition-colors hover:text-primary"
				onClick={onViewContent}
				onFocus={onPrefetchContent}
				onMouseEnter={onPrefetchContent}
				type="button"
			>
				<span className="min-w-0 truncate font-mono text-sm" title={url}>
					{getPathDisplayName(path)}
				</span>
				<span className="shrink-0 text-muted-foreground text-xs">
					{formatBytes(sizeBytes)}
				</span>
			</button>

			<div className="relative flex min-w-[52px] shrink-0 items-center justify-end">
				<div className="flex items-center gap-2 transition-opacity group-hover/tree-item:opacity-0">
					{!isIncluded && (
						<span className="shrink-0 bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
							Excluded
						</span>
					)}
				</div>

				<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/tree-item:pointer-events-auto group-hover/tree-item:opacity-100">
					<Button
						asChild
						className="h-6 w-6 p-0"
						size="sm"
						title="Open page"
						variant="ghost"
					>
						<a href={url} rel="noopener noreferrer" target="_blank">
							<ExternalLinkIcon className="h-3.5 w-3.5" />
						</a>
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								className="h-6 w-6 p-0"
								disabled={isAnyActionPending}
								size="sm"
								title="More actions"
								variant="ghost"
							>
								{isAnyActionPending ? (
									<Spinner className="h-3.5 w-3.5" />
								) : (
									<MoreHorizontalIcon className="h-3.5 w-3.5" />
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-auto">
							{onReindex && (
								<DropdownMenuItem
									disabled={isAnyActionPending}
									onClick={onReindex}
								>
									<RefreshCwIcon className="mr-2 h-4 w-4" />
									Re-index
								</DropdownMenuItem>
							)}
							{onToggleIncluded && (
								<DropdownMenuItem
									disabled={isAnyActionPending}
									onClick={onToggleIncluded}
								>
									{isIncluded ? (
										<>
											<ToggleLeftIcon className="mr-2 h-4 w-4" />
											Exclude from training
										</>
									) : (
										<>
											<ToggleRightIcon className="mr-2 h-4 w-4" />
											Include in training
										</>
									)}
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							{onDelete && (
								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									disabled={isAnyActionPending}
									onClick={onDelete}
								>
									<Trash2Icon className="mr-2 h-4 w-4" />
									Delete
								</DropdownMenuItem>
							)}
							{onIgnore && (
								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									disabled={isAnyActionPending}
									onClick={onIgnore}
								>
									<BanIcon className="mr-2 h-4 w-4" />
									Ignore (exclude forever)
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
				{hasChildren && (
					<span className="shrink-0 text-muted-foreground text-xs">
						{pageCountLabel}
					</span>
				)}
				<button
					aria-label={isExpanded ? "Collapse pages" : "Expand pages"}
					className={cn(
						"flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground",
						!hasChildren && "invisible"
					)}
					onClick={onToggleExpand}
					type="button"
				>
					{isExpanded ? (
						<ChevronDownIcon className="size-4" />
					) : (
						<ChevronRightIcon className="size-4" />
					)}
				</button>
			</div>
		</div>
	);
}

export type { PageTreeItemViewProps };
