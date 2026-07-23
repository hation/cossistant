"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import {
	Page,
	PageContent,
	PageHeader,
	PageHeaderTitle,
} from "@/components/ui/layout";
import { cn } from "@/lib/utils";

type TrainingEntryDetailLayoutProps = {
	backHref: string;
	title: string;
	headerActions?: ReactNode;
	children: ReactNode;
	contentClassName?: string;
};

export function TrainingEntryDetailLayout({
	backHref,
	title,
	headerActions,
	children,
	contentClassName,
}: TrainingEntryDetailLayoutProps) {
	return (
		<Page>
			<PageHeader className="border-b bg-background pr-3 pl-4 text-sm 2xl:border-transparent 2xl:bg-transparent dark:bg-background-50 dark:2xl:border-transparent 2xl:dark:bg-transparent">
				<div className="flex min-w-0 flex-1 items-center justify-between gap-4">
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<Link className="-ml-1.5 shrink-0" href={backHref}>
							<Button
								aria-label="Go back"
								className="px-1 text-sm"
								size="sm"
								variant="ghost"
							>
								<Icon name="arrow-left" />
							</Button>
						</Link>
						<div className="min-w-0 flex-1">
							<PageHeaderTitle className="truncate text-sm">
								{title}
							</PageHeaderTitle>
						</div>
					</div>
					{headerActions ? (
						<div className="flex shrink-0 items-center gap-2">
							{headerActions}
						</div>
					) : null}
				</div>
			</PageHeader>
			<PageContent className="px-4 py-8 pt-20">
				<div
					className={cn(
						"mx-auto flex w-full max-w-3xl flex-col gap-8",
						contentClassName
					)}
				>
					{children}
				</div>
			</PageContent>
		</Page>
	);
}

export type { TrainingEntryDetailLayoutProps };
