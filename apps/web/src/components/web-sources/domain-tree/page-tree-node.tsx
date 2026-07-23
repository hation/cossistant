"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useTrainingEntryPrefetch } from "@/components/training-entries";
import { generateTreePrefix, type MergedPageNode } from "../utils";
import { PageTreeItemView } from "./page-tree-item";

type PageTreeNodeProps = {
	node: MergedPageNode;
	websiteSlug: string;
	linkSourceId: string;
	onToggleIncluded: (knowledgeId: string, isIncluded: boolean) => void;
	onReindex?: (linkSourceId: string, knowledgeId: string) => void;
	onDelete?: (knowledgeId: string) => void;
	onIgnore?: (linkSourceId: string, knowledgeId: string) => void;
	isToggling: boolean;
	isReindexing?: boolean;
	isDeleting?: boolean;
	isIgnoring?: boolean;
	// Tree visualization context
	isLast: boolean;
	ancestorsAreLastChild: boolean[];
};

export function PageTreeNode({
	node,
	websiteSlug,
	linkSourceId,
	onToggleIncluded,
	onReindex,
	onDelete,
	onIgnore,
	isToggling,
	isReindexing = false,
	isDeleting = false,
	isIgnoring = false,
	isLast,
	ancestorsAreLastChild,
}: PageTreeNodeProps) {
	const hasChildren = node.children.length > 0;
	const [isExpanded, setIsExpanded] = useState(() => !hasChildren);
	const router = useRouter();
	const { prefetchKnowledgeEntry } = useTrainingEntryPrefetch(websiteSlug);
	const detailHref = `/${websiteSlug}/agent/training/web/${node.knowledgeId}`;

	// Generate the ASCII tree prefix for this node
	const treePrefix = useMemo(
		() => generateTreePrefix({ isLast, ancestorsAreLastChild }),
		[isLast, ancestorsAreLastChild]
	);

	const handleToggleExpand = useCallback(() => {
		setIsExpanded((prev) => !prev);
	}, []);

	const handleToggleIncluded = useCallback(() => {
		onToggleIncluded(node.knowledgeId, !node.isIncluded);
	}, [node.knowledgeId, node.isIncluded, onToggleIncluded]);

	const handleViewContent = useCallback(() => {
		router.push(detailHref);
	}, [detailHref, router]);

	const handlePrefetchContent = useCallback(() => {
		prefetchKnowledgeEntry(node.knowledgeId, detailHref);
	}, [detailHref, node.knowledgeId, prefetchKnowledgeEntry]);

	const handleReindex = useCallback(() => {
		onReindex?.(linkSourceId, node.knowledgeId);
	}, [linkSourceId, node.knowledgeId, onReindex]);

	const handleDelete = useCallback(() => {
		onDelete?.(node.knowledgeId);
	}, [node.knowledgeId, onDelete]);

	const handleIgnore = useCallback(() => {
		onIgnore?.(linkSourceId, node.knowledgeId);
	}, [linkSourceId, node.knowledgeId, onIgnore]);

	return (
		<div className="select-none">
			<PageTreeItemView
				hasChildren={hasChildren}
				isDeleting={isDeleting}
				isExpanded={isExpanded}
				isIgnoring={isIgnoring}
				isIncluded={node.isIncluded}
				isReindexing={isReindexing}
				isToggling={isToggling}
				onDelete={onDelete ? handleDelete : undefined}
				onIgnore={onIgnore ? handleIgnore : undefined}
				onPrefetchContent={handlePrefetchContent}
				onReindex={onReindex ? handleReindex : undefined}
				onToggleExpand={handleToggleExpand}
				onToggleIncluded={handleToggleIncluded}
				onViewContent={handleViewContent}
				pageCount={node.descendantCount}
				path={node.path}
				sizeBytes={node.sizeBytes}
				treePrefix={treePrefix}
				url={node.url}
			/>

			{/* Children */}
			{hasChildren && isExpanded && (
				<div>
					{node.children.map((child, index) => (
						<PageTreeNode
							ancestorsAreLastChild={[...ancestorsAreLastChild, isLast]}
							isDeleting={isDeleting}
							isIgnoring={isIgnoring}
							isLast={index === node.children.length - 1}
							isReindexing={isReindexing}
							isToggling={isToggling}
							key={child.knowledgeId}
							linkSourceId={linkSourceId}
							node={child}
							onDelete={onDelete}
							onIgnore={onIgnore}
							onReindex={onReindex}
							onToggleIncluded={onToggleIncluded}
							websiteSlug={websiteSlug}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export type { PageTreeNodeProps };
