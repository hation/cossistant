"use client";

import type { CategoryType } from "./types";

type CategoryHeaderProps = {
	category: CategoryType;
	label: string;
	count: number;
};

export function CategoryHeader({
	category,
	label,
	count,
}: CategoryHeaderProps) {
	return (
		<div className="flex h-full max-h-[48px] flex-col justify-end">
			<div
				className={"flex items-center gap-1 px-1 pb-1 text-primary/80 text-sm"}
			>
				<span>{label}</span>
				<span className="tracking-wider">[{count}]</span>
			</div>
		</div>
	);
}
