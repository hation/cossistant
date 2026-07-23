"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";

// Regex patterns at top level for performance
const NUMBERED_LIST_REGEX = /^(\d+)\.\s/;
const BOLD_REGEX = /\*\*(.+?)\*\*/;
const CODE_REGEX = /`([^`]+)`/;
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/;

type KnowledgePreviewModalProps = {
	websiteSlug: string;
	knowledgeId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

function formatBytes(bytes: number): string {
	if (bytes === 0) {
		return "0 B";
	}

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/**
 * Simple markdown renderer that handles basic formatting
 * without requiring heavy dependencies
 */
function MarkdownContent({ content }: { content: string }) {
	// Split content into lines and render with basic formatting
	const lines = content.split("\n");

	return (
		<div className="prose prose-sm dark:prose-invert max-w-none">
			{lines.map((line, index) => {
				const trimmedLine = line.trim();

				// Heading 1
				if (trimmedLine.startsWith("# ")) {
					return (
						<h1 className="mt-6 mb-4 font-bold text-2xl" key={index}>
							{trimmedLine.slice(2)}
						</h1>
					);
				}

				// Heading 2
				if (trimmedLine.startsWith("## ")) {
					return (
						<h2 className="mt-5 mb-3 font-bold text-xl" key={index}>
							{trimmedLine.slice(3)}
						</h2>
					);
				}

				// Heading 3
				if (trimmedLine.startsWith("### ")) {
					return (
						<h3 className="mt-4 mb-2 font-bold text-lg" key={index}>
							{trimmedLine.slice(4)}
						</h3>
					);
				}

				// Heading 4
				if (trimmedLine.startsWith("#### ")) {
					return (
						<h4 className="mt-3 mb-2 font-semibold text-base" key={index}>
							{trimmedLine.slice(5)}
						</h4>
					);
				}

				// Code block start/end (just render as pre)
				if (trimmedLine.startsWith("```")) {
					return null; // Skip code fence lines
				}

				// Bullet list
				if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
					return (
						<li className="ml-4 list-disc" key={index}>
							{renderInlineFormatting(trimmedLine.slice(2))}
						</li>
					);
				}

				// Numbered list
				const numberedMatch = trimmedLine.match(NUMBERED_LIST_REGEX);
				if (numberedMatch) {
					return (
						<li className="ml-4 list-decimal" key={index}>
							{renderInlineFormatting(
								trimmedLine.slice(numberedMatch[0].length)
							)}
						</li>
					);
				}

				// Blockquote
				if (trimmedLine.startsWith("> ")) {
					return (
						<blockquote
							className="my-2 border-primary/30 border-l-4 pl-4 text-muted-foreground italic"
							key={index}
						>
							{renderInlineFormatting(trimmedLine.slice(2))}
						</blockquote>
					);
				}

				// Empty line
				if (trimmedLine === "") {
					return <div className="h-2" key={index} />;
				}

				// Regular paragraph
				return (
					<p className="my-2" key={index}>
						{renderInlineFormatting(line)}
					</p>
				);
			})}
		</div>
	);
}

/**
 * Render inline formatting (bold, italic, code, links)
 */
function renderInlineFormatting(text: string): React.ReactNode {
	// Simple inline formatting - just handle the most common cases
	// This is a simplified version that handles basic markdown

	const parts: React.ReactNode[] = [];
	let remaining = text;
	let keyIndex = 0;

	// Process bold (**text**)
	while (remaining.length > 0) {
		const boldMatch = remaining.match(BOLD_REGEX);
		const codeMatch = remaining.match(CODE_REGEX);
		const linkMatch = remaining.match(LINK_REGEX);

		// Find the earliest match
		let earliestMatch: {
			type: "bold" | "code" | "link";
			index: number;
			length: number;
			content: string;
			href?: string;
		} | null = null;

		if (boldMatch?.index !== undefined && boldMatch[1]) {
			earliestMatch = {
				type: "bold",
				index: boldMatch.index,
				length: boldMatch[0].length,
				content: boldMatch[1],
			};
		}

		if (
			codeMatch?.index !== undefined &&
			codeMatch[1] &&
			(!earliestMatch || codeMatch.index < earliestMatch.index)
		) {
			earliestMatch = {
				type: "code",
				index: codeMatch.index,
				length: codeMatch[0].length,
				content: codeMatch[1],
			};
		}

		if (
			linkMatch?.index !== undefined &&
			linkMatch[1] &&
			linkMatch[2] &&
			(!earliestMatch || linkMatch.index < earliestMatch.index)
		) {
			earliestMatch = {
				type: "link",
				index: linkMatch.index,
				length: linkMatch[0].length,
				content: linkMatch[1],
				href: linkMatch[2],
			};
		}

		if (!earliestMatch) {
			// No more matches, add remaining text
			if (remaining) {
				parts.push(remaining);
			}
			break;
		}

		// Add text before match
		if (earliestMatch.index > 0) {
			parts.push(remaining.slice(0, earliestMatch.index));
		}

		// Add formatted element
		keyIndex++;
		if (earliestMatch.type === "bold") {
			parts.push(
				<strong className="font-semibold" key={`b-${keyIndex}`}>
					{earliestMatch.content}
				</strong>
			);
		} else if (earliestMatch.type === "code") {
			parts.push(
				<code
					className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
					key={`c-${keyIndex}`}
				>
					{earliestMatch.content}
				</code>
			);
		} else if (earliestMatch.type === "link") {
			parts.push(
				<a
					className="text-primary underline hover:text-primary/80"
					href={earliestMatch.href}
					key={`l-${keyIndex}`}
					rel="noopener noreferrer"
					target="_blank"
				>
					{earliestMatch.content}
				</a>
			);
		}

		// Continue with remaining text
		remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
	}

	return parts.length > 0 ? parts : text;
}

export function KnowledgePreviewModal({
	websiteSlug,
	knowledgeId,
	open,
	onOpenChange,
}: KnowledgePreviewModalProps) {
	const trpc = useTRPC();

	const { data, isLoading, error } = useQuery({
		...trpc.linkSource.getKnowledgeContent.queryOptions({
			websiteSlug,
			knowledgeId,
		}),
		enabled: open && Boolean(knowledgeId),
	});

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="flex h-[80vh] max-h-[800px] flex-col sm:max-w-[800px]">
				<DialogHeader>
					<div className="flex items-start gap-3">
						<FileTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
						<div className="min-w-0 flex-1">
							<DialogTitle className="truncate">
								{isLoading ? (
									<Skeleton className="h-6 w-64" />
								) : (
									(data?.sourceTitle ?? "Untitled Page")
								)}
							</DialogTitle>
							<DialogDescription className="mt-1 flex items-center gap-2">
								{isLoading ? (
									<Skeleton className="h-4 w-48" />
								) : data?.sourceUrl ? (
									<>
										<a
											className="max-w-[400px] truncate hover:underline"
											href={data.sourceUrl}
											rel="noopener noreferrer"
											target="_blank"
										>
											{data.sourceUrl}
										</a>
										<ExternalLinkIcon className="h-3 w-3 shrink-0" />
										<span className="text-muted-foreground/60">•</span>
										<span>{formatBytes(data.sizeBytes)}</span>
									</>
								) : (
									<span>No URL</span>
								)}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<ScrollArea className="flex-1 rounded border bg-muted/20 p-4">
					{isLoading ? (
						<div className="space-y-3">
							<Skeleton className="h-6 w-3/4" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
							<Skeleton className="mt-4 h-5 w-1/2" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
						</div>
					) : error ? (
						<div className="py-8 text-center text-destructive">
							Failed to load content: {error.message}
						</div>
					) : data?.markdown ? (
						<MarkdownContent content={data.markdown} />
					) : (
						<div className="py-8 text-center text-muted-foreground">
							No content available
						</div>
					)}
				</ScrollArea>

				<div className="flex justify-end gap-2 pt-2">
					{data?.sourceUrl && (
						<Button asChild variant="outline">
							<a
								href={data.sourceUrl}
								rel="noopener noreferrer"
								target="_blank"
							>
								<ExternalLinkIcon className="mr-2 h-4 w-4" />
								Open Original
							</a>
						</Button>
					)}
					<Button onClick={() => onOpenChange(false)} variant="secondary">
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
