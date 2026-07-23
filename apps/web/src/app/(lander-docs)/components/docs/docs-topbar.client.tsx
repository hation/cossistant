"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import type { LatestRelease } from "@/lib/latest-release";
import { cn } from "@/lib/utils";
import { FullWidthBorder } from "../full-width-border";
import { LLMCopyButton, ViewOptions } from "../page-actions";

type DocsTopBarClientProps = {
	widgetVersion: string;
	markdownUrl: string;
	githubUrl: string;
	latestRelease?: LatestRelease | null;
	previous?: {
		url: string;
		name?: React.ReactNode;
	} | null;
	next?: {
		url: string;
		name?: React.ReactNode;
	} | null;
};

export function DocsTopBarClient({
	widgetVersion,
	markdownUrl,
	githubUrl,
	latestRelease,
	previous,
	next,
}: DocsTopBarClientProps) {
	return (
		<div
			className="fixed top-[68px] right-0 left-0 z-40"
			data-slot="docs-topbar"
		>
			<div className="fixed top-[68px] right-0 left-0 h-(--docs-topbar-height) min-w-screen bg-background/95 backdrop-blur-sm" />
			<div className="container-wrapper relative mx-auto bg-background/95 backdrop-blur-sm">
				<div className="container relative flex h-(--docs-topbar-height) min-w-0 items-center justify-between gap-3 px-4 lg:px-6">
					<div className="flex min-w-0 items-center gap-2">
						<Badge
							className="shrink-0 rounded px-2 py-1 font-mono text-[11px] leading-none"
							variant="secondary"
						>
							Widget v{widgetVersion}
						</Badge>
						{latestRelease ? (
							<Link
								className="min-w-0 truncate px-1 py-0.5 font-mono text-primary/80 text-xs transition-colors hover:bg-background-300 hover:text-primary"
								data-slot="docs-topbar-whats-new"
								href="/changelog"
							>
								NEW: {latestRelease.tinyExcerpt}
							</Link>
						) : null}
					</div>
					<div
						className={cn(
							"no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto",
							"[&_a]:shrink-0 [&_button]:shrink-0"
						)}
						data-slot="docs-topbar-actions"
					>
						{previous ? (
							<Button
								asChild
								className="extend-touch-target size-8 shadow-none md:size-7"
								size="icon"
								variant="secondary"
							>
								<Link href={previous.url}>
									<Icon name="arrow-left" />
									<span className="sr-only">Previous</span>
								</Link>
							</Button>
						) : null}
						{next ? (
							<Button
								asChild
								className="extend-touch-target size-8 shadow-none md:size-7"
								size="icon"
								variant="secondary"
							>
								<Link href={next.url}>
									<Icon name="arrow-right" />
									<span className="sr-only">Next</span>
								</Link>
							</Button>
						) : null}
						<LLMCopyButton markdownUrl={markdownUrl} />
						<ViewOptions githubUrl={githubUrl} markdownUrl={markdownUrl} />
					</div>
					<FullWidthBorder className="bottom-0" />
				</div>
			</div>
		</div>
	);
}
