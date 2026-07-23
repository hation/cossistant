"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Icon, { type IconName } from "../../icons";

type SidebarItemProps = {
	children: ReactNode;
	iconName?: IconName;
	actions?: ReactNode;
	href?: string;
	prefetch?: boolean;
	onClick?: () => void;
	className?: string;
	active?: boolean;
	hideLabelOnMobile?: boolean;
	external?: boolean;
};

export function TopbarItem({
	children,
	iconName,
	actions,
	href,
	prefetch = true,
	onClick,
	className,
	active = false,
	hideLabelOnMobile = false,
	external = false,
}: SidebarItemProps) {
	const baseClasses = cn(
		"group/btn relative flex items-center gap-2 rounded px-2 py-1 text-primary/80 text-sm transition-colors",
		"hover:bg-background-100 hover:bg-background-300 hover:text-primary",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		{
			"bg-background-300 text-primary dark:bg-background-300": active,
			"px-1 md:px-2": hideLabelOnMobile,
		},
		className
	);

	const content = (
		<>
			{iconName && (
				<span
					className={cn(
						"flex size-5 shrink-0 items-center justify-center opacity-60 transition-all duration-100 group-hover/btn:rotate-[-4deg] group-hover/btn:opacity-80",
						{
							"rotate-[-2deg] opacity-100 group-hover/btn:opacity-100": active,
						}
					)}
				>
					<Icon
						className="size-4"
						filledOnHover={!active}
						name={iconName}
						variant={active ? "filled" : "default"}
					/>
				</span>
			)}
			<span
				className={cn("flex-1 truncate", {
					"hidden md:block": hideLabelOnMobile,
				})}
			>
				{children}
			</span>
			{actions && (
				<span className="opacity-0 transition-opacity group-hover/btn:opacity-100">
					{actions}
				</span>
			)}
			{external && (
				<span className="opacity-80 transition-opacity group-hover/btn:opacity-100">
					<Icon
						className="-mt-2.5 -ml-1.5 group-hover/btn:-translate-y-0.5 size-2 rotate-[-45deg] transition-transform duration-200 group-hover/btn:translate-x-0.5"
						name="arrow-right"
						variant="default"
					/>
				</span>
			)}
		</>
	);

	if (href) {
		return (
			<Link
				className={baseClasses}
				href={href}
				onClick={onClick}
				prefetch={prefetch}
			>
				{content}
			</Link>
		);
	}

	return (
		<button
			className={cn(baseClasses, "w-full text-left")}
			onClick={onClick}
			type="button"
		>
			{content}
		</button>
	);
}
