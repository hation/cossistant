"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import Icon, { type IconName } from "../../icons";

type SidebarChildItem = {
	label: string;
	href: string;
	active?: boolean;
	rightItem?: ReactNode;
};

type SidebarItemProps = {
	children: ReactNode;
	iconName?: IconName;
	actions?: ReactNode;
	rightItem?: ReactNode;
	href?: string;
	onClick?: () => void;
	className?: string;
	active?: boolean;
	items?: SidebarChildItem[];
	defaultOpen?: boolean;
};

export function SidebarItem({
	children,
	iconName,
	actions,
	href,
	onClick,
	className,
	active = false,
	rightItem,
	items,
	defaultOpen = false,
}: SidebarItemProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	const baseClasses = cn(
		"group/btn relative flex h-10 items-center gap-2.5 rounded px-3 py-1 text-primary/80 text-sm transition-colors",
		"hover:bg-background-100 hover:text-primary dark:hover:bg-background-300",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		active && "bg-background-100 text-primary dark:bg-background-300",
		className
	);

	const content = (
		<>
			{iconName && (
				<span
					className={cn(
						"relative flex size-5 shrink-0 items-center justify-center opacity-40 transition-all duration-100 group-hover/btn:rotate-[-4deg] group-hover/btn:opacity-80",
						{
							"rotate-[-2deg] opacity-90 group-hover/btn:opacity-80": active,
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
			<span className="flex-1 truncate">{children}</span>
			{rightItem}
			{actions && (
				<span className="opacity-0 transition-opacity group-hover/btn:opacity-100">
					{actions}
				</span>
			)}
		</>
	);

	// If items are provided, render as a collapsible section
	if (items && items.length > 0) {
		return (
			<Collapsible onOpenChange={setIsOpen} open={isOpen}>
				<CollapsibleTrigger asChild>
					<button className={cn(baseClasses, "w-full text-left")} type="button">
						{iconName && (
							<span
								className={cn(
									"relative flex size-6 shrink-0 items-center justify-center opacity-40 transition-all duration-100 group-hover/btn:rotate-[-4deg] group-hover/btn:opacity-80"
								)}
							>
								<Icon
									className="size-4"
									filledOnHover
									name={iconName}
									variant="default"
								/>
							</span>
						)}
						<span className="flex-1 truncate">{children}</span>
						<span
							className={cn(
								"flex size-6 shrink-0 items-center justify-center opacity-40 transition-transform duration-200",
								isOpen && "rotate-180"
							)}
						>
							<Icon className="size-4" name="chevron-down" variant="default" />
						</span>
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="mt-1 flex flex-col gap-0.5">
						{items.map((item) => (
							<Link
								className={cn(
									"group/btn relative flex h-9 items-center gap-2.5 rounded py-1 pr-3 pl-5.5 text-primary/70 text-sm transition-colors",
									"hover:bg-background-100 hover:text-primary dark:hover:bg-background-300",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									item.active &&
										"bg-background-100 text-primary dark:bg-background-300"
								)}
								href={item.href}
								key={item.href}
							>
								<span
									className={cn(
										"size-1 shrink-0 rounded-full bg-current opacity-30",
										item.active && "opacity-70"
									)}
								/>
								<span className="flex-1 truncate pl-2">{item.label}</span>
								{item.rightItem}
							</Link>
						))}
					</div>
				</CollapsibleContent>
			</Collapsible>
		);
	}

	if (href) {
		return (
			<Link className={baseClasses} href={href} onClick={onClick}>
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
