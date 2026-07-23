"use client";

import { format } from "date-fns";
import { XIcon } from "lucide-react";
import Link from "next/link";
import { useChangelogDismissed } from "@/hooks/use-changelog-dismissed";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

type ChangelogNotificationProps = {
	version?: string;
	description: string;
	tinyExcerpt: string;
	date: string;
	children?: React.ReactNode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	dismissible?: boolean;
};

function BaseChangelogNotification({
	version,
	description,
	tinyExcerpt,
	date,
	children,
	open,
	onOpenChange,
	dismissible = true,
	onDismiss,
}: ChangelogNotificationProps & {
	onDismiss?: (() => void) | null;
}) {
	const releaseBadge = version ? `v${version}` : "NEW";
	const overlayDescription = dismissible
		? "Latest release details for your dashboard."
		: "Latest release details for the widget.";

	return (
		<>
			<div className="flex items-center gap-1.5">
				<button
					className={cn(
						"items-center gap-2 px-1 py-0.5 font-mono text-primary/80 text-xs transition-colors hover:bg-background-300 hover:text-primary",
						dismissible ? "hidden sm:flex" : "flex"
					)}
					data-slot="changelog-notification-trigger"
					onClick={() => onOpenChange(true)}
					type="button"
				>
					<span className="rounded-xs bg-background-400 px-1.5 py-0.5 font-semibold text-[10px] leading-none">
						{releaseBadge}
					</span>
					{dismissible ? (
						<span className="hidden sm:inline">{tinyExcerpt}</span>
					) : (
						<>
							<span className="sm:hidden">What's new</span>
							<span className="hidden sm:inline">{tinyExcerpt}</span>
						</>
					)}
				</button>
				{dismissible ? (
					<button
						className="rounded-sm p-0.5 text-primary/40 transition-colors hover:bg-background-300 hover:text-primary/80"
						data-slot="changelog-notification-dismiss"
						onClick={(e) => {
							e.stopPropagation();
							onOpenChange(false);
							onDismiss?.();
						}}
						type="button"
					>
						<XIcon className="size-3" />
					</button>
				) : null}
			</div>

			{open ? (
				<ScrollArea
					aria-describedby="dashboard-changelog-description"
					aria-labelledby="dashboard-changelog-title"
					aria-modal="false"
					className="fixed inset-x-0 top-16 bottom-0 z-40 bg-background/95 backdrop-blur-sm"
					data-slot="dashboard-changelog-overlay"
					role="dialog"
				>
					<div
						className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-6 lg:px-6 lg:py-8"
						data-slot="dashboard-changelog-scroll-area"
					>
						<div
							className="relative z-10 my-auto flex w-full flex-col"
							data-slot="dashboard-changelog-panel"
						>
							<div className="flex items-start gap-3 px-5 py-5">
								<div className="flex min-w-0 flex-1 flex-col gap-3 text-center sm:text-left">
									<div className="flex items-center gap-3">
										<span className="inline-flex items-center rounded-sm bg-background-300 px-2.5 py-1 font-mono text-sm">
											{releaseBadge}
										</span>
										<time
											className="text-muted-foreground text-sm"
											dateTime={date}
										>
											{format(new Date(date), "MMM d, yyyy")}
										</time>
									</div>
									<div className="flex flex-col gap-2">
										<h2
											className="font-medium text-2xl text-primary"
											id="dashboard-changelog-title"
										>
											{description}
										</h2>
										<p
											className="text-muted-foreground text-sm"
											id="dashboard-changelog-description"
										>
											{overlayDescription}
										</p>
									</div>
								</div>
							</div>

							<div className="px-5 py-5">
								<div
									className={cn(
										"prose prose-sm dark:prose-invert max-w-none",
										"[&_figure]:rounded-[2px] [&_pre]:rounded-[2px]"
									)}
								>
									{children}
								</div>
							</div>

							<div className="px-5 pt-4 pb-5">
								<Button asChild size="sm" variant="outline">
									<Link href="/changelog">View full changelog</Link>
								</Button>
							</div>
						</div>
					</div>
				</ScrollArea>
			) : null}
		</>
	);
}

function DismissibleChangelogNotification(props: ChangelogNotificationProps) {
	const { isDismissed, dismiss } = useChangelogDismissed();

	const id = props.version ? `v${props.version}` : props.tinyExcerpt;

	if (isDismissed(id)) {
		return null;
	}

	return <BaseChangelogNotification {...props} onDismiss={() => dismiss(id)} />;
}

function NonDismissibleChangelogNotification(
	props: ChangelogNotificationProps
) {
	return <BaseChangelogNotification {...props} dismissible={false} />;
}

export function ChangelogNotification(props: ChangelogNotificationProps) {
	if (props.dismissible === false) {
		return <NonDismissibleChangelogNotification {...props} />;
	}

	return <DismissibleChangelogNotification {...props} />;
}
