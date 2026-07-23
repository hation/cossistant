import type * as React from "react";
import { cn } from "@/lib/utils";

export function ValueGroup({
	children,
	className,
	header,
}: {
	children: React.ReactNode;
	className?: string;
	header?: string;
}) {
	return (
		<div className={cn("mt-4 flex flex-col gap-2 px-2", className)}>
			{header && (
				<p className="mt-2 text-primary/80 text-xs uppercase">{header}</p>
			)}
			{children}
		</div>
	);
}
