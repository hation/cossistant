"use client";

import { type LucideIcon, MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type TrainingEntryMenuAction = {
	label: string;
	onSelect: () => void;
	Icon: LucideIcon;
	disabled?: boolean;
	destructive?: boolean;
	separatorBefore?: boolean;
};

type TrainingEntryInlineAction = {
	label: string;
	onSelect: () => void;
	icon: ReactNode;
	disabled?: boolean;
	destructive?: boolean;
};

type TrainingEntryListProps = {
	isLoading?: boolean;
	emptyState?: ReactNode;
	children: ReactNode;
	className?: string;
	loadingCount?: number;
};

type TrainingEntryListSectionProps = {
	title?: string;
	description?: string;
	children: ReactNode;
	className?: string;
};

type TrainingEntryRowProps = {
	href?: string;
	onClick?: () => void;
	onHoverPrefetch?: () => void;
	icon: ReactNode;
	primary: string;
	rightMeta?: ReactNode;
	actions?: TrainingEntryMenuAction[];
	inlineActions?: TrainingEntryInlineAction[];
	focused?: boolean;
	className?: string;
};

function TrainingEntryRowContent({
	icon,
	primary,
}: Pick<TrainingEntryRowProps, "icon" | "primary">) {
	return (
		<div className="flex min-w-0 flex-1 items-center gap-3">
			<div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background-200 text-primary dark:bg-background-400">
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-primary">{primary}</p>
			</div>
		</div>
	);
}

export function TrainingEntryList({
	isLoading = false,
	emptyState,
	children,
	className,
	loadingCount = 4,
}: TrainingEntryListProps) {
	const childCount = Array.isArray(children)
		? children.length
		: Number(Boolean(children));

	if (isLoading) {
		return (
			<div className={cn("space-y-1", className)}>
				{Array.from({ length: loadingCount }).map((_, index) => (
					<div
						className="flex items-center gap-3 rounded px-2 py-2"
						key={`training-entry-skeleton-${index}`}
					>
						<Skeleton className="size-8 rounded-[8px]" />
						<div className="flex min-w-0 flex-1 items-center gap-4">
							<Skeleton className="h-4 w-52 shrink-0" />
							<Skeleton className="hidden h-4 flex-1 md:block" />
						</div>
						<Skeleton className="h-4 w-24 shrink-0" />
					</div>
				))}
			</div>
		);
	}

	if (childCount === 0) {
		return emptyState ?? null;
	}

	return <div className={cn("space-y-1", className)}>{children}</div>;
}

export function TrainingEntryListSection({
	title,
	description,
	children,
	className,
}: TrainingEntryListSectionProps) {
	return (
		<section className={cn("space-y-2", className)}>
			<div className="px-0">
				{title ? <div className="font-medium text-sm">{title}</div> : null}
				{description ? (
					<p className="text-muted-foreground text-sm">{description}</p>
				) : null}
			</div>
			{children}
		</section>
	);
}

export function TrainingEntryRow({
	href,
	onClick,
	onHoverPrefetch,
	icon,
	primary,
	rightMeta,
	actions = [],
	inlineActions = [],
	focused = false,
	className,
}: TrainingEntryRowProps) {
	const hasInlineActions = inlineActions.length > 0;
	const baseClasses = cn(
		"group/training-entry relative flex w-full min-w-0 items-center gap-3 rounded px-2 py-2 text-left text-sm transition-colors",
		"bg-transparent hover:bg-background-200/80 dark:hover:bg-background-300/70",
		focused && "bg-background-200 text-primary dark:bg-background-300",
		className
	);
	const contentClasses =
		"flex min-w-0 flex-1 items-center gap-3 rounded-[inherit] focus-visible:outline-none focus-visible:ring-0";

	const content = <TrainingEntryRowContent icon={icon} primary={primary} />;

	const handleInlineActionClick =
		(action: TrainingEntryInlineAction) =>
		(event: MouseEvent<HTMLButtonElement>) => {
			event.preventDefault();
			event.stopPropagation();
			action.onSelect();
		};

	return (
		<div className={baseClasses}>
			{href ? (
				<Link
					className={contentClasses}
					href={href}
					onFocus={onHoverPrefetch}
					onMouseEnter={onHoverPrefetch}
					prefetch={false}
				>
					{content}
				</Link>
			) : (
				<button
					className={contentClasses}
					onClick={onClick}
					onFocus={onHoverPrefetch}
					onMouseEnter={onHoverPrefetch}
					type="button"
				>
					{content}
				</button>
			)}
			{rightMeta || hasInlineActions || actions.length > 0 ? (
				<div className="grid shrink-0 items-center justify-items-end">
					{rightMeta ? (
						<div
							className={cn(
								"col-start-1 row-start-1 flex items-center gap-2 justify-self-end",
								hasInlineActions &&
									"transition-opacity duration-150 group-focus-within/training-entry:pointer-events-none group-focus-within/training-entry:opacity-0 group-hover/training-entry:pointer-events-none group-hover/training-entry:opacity-0"
							)}
							data-slot="training-entry-right-meta"
						>
							{rightMeta}
						</div>
					) : null}
					{hasInlineActions ? (
						<div
							className={cn(
								"col-start-1 row-start-1 flex items-center justify-end gap-2 justify-self-end opacity-0 transition-opacity duration-150",
								"pointer-events-none group-hover/training-entry:pointer-events-auto group-hover/training-entry:opacity-100",
								"group-focus-within/training-entry:pointer-events-auto group-focus-within/training-entry:opacity-100"
							)}
							data-slot="training-entry-inline-actions"
						>
							{inlineActions.map((action) => (
								<TooltipOnHover
									content={action.label}
									delay={150}
									key={action.label}
								>
									<Button
										aria-label={action.label}
										className={cn(
											action.destructive &&
												"[&_svg]:text-destructive/70 hover:[&_svg]:text-destructive focus-visible:[&_svg]:text-destructive"
										)}
										data-slot="training-entry-inline-action"
										disabled={action.disabled}
										onClick={handleInlineActionClick(action)}
										size="icon-small"
										type="button"
										variant="ghost"
									>
										{action.icon}
									</Button>
								</TooltipOnHover>
							))}
						</div>
					) : actions.length > 0 ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-focus-within/training-entry:opacity-100 group-hover/training-entry:opacity-100"
									data-slot="training-entry-actions-menu-trigger"
									size="icon"
									variant="ghost"
								>
									<MoreHorizontalIcon className="size-4" />
									<span className="sr-only">Open entry actions</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{actions.map((action) => [
									action.separatorBefore ? (
										<DropdownMenuSeparator key={`${action.label}-separator`} />
									) : null,
									<DropdownMenuItem
										className={
											action.destructive
												? "text-destructive focus:text-destructive"
												: undefined
										}
										disabled={action.disabled}
										key={action.label}
										onClick={action.onSelect}
									>
										<action.Icon className="mr-2 size-4" />
										{action.label}
									</DropdownMenuItem>,
								])}
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>
			) : null}
		</div>
	);
}

export type {
	TrainingEntryInlineAction,
	TrainingEntryListProps,
	TrainingEntryListSectionProps,
	TrainingEntryMenuAction,
	TrainingEntryRowProps,
};
