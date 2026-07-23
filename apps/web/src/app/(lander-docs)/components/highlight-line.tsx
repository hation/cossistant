import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const highlightLineVariants = cva(
	"mr-1 mb-[3px] inline-flex h-4 items-center rounded border px-1 align-middle font-medium font-mono text-[9px] text-primary uppercase",
	{
		variants: {
			variant: {
				new: "border-primary/20 bg-cossistant-green/20 text-primary dark:border-cossistant-green/60 dark:text-cossistant-green",
				updated:
					"border-primary/20 bg-cossistant-blue/20 text-primary dark:border-cossistant-blue/60 dark:text-cossistant-blue",
				fixed:
					"border-primary/20 bg-cossistant-yellow/20 text-primary dark:border-cossistant-yellow/60 dark:text-cossistant-yellow",
				removed:
					"border-primary/20 bg-cossistant-red/20 text-primary dark:border-cossistant-red/60 dark:text-cossistant-red",
			},
		},
		defaultVariants: {
			variant: "new",
		},
	}
);

export type HighlightLineProps = React.ComponentProps<"span"> &
	VariantProps<typeof highlightLineVariants>;

export function HighlightLine({
	children,
	variant,
	className,
	...props
}: HighlightLineProps) {
	return (
		<span
			className={cn(
				"text-primary/80 [&>p]:m-0 [&>p]:inline [&>p]:text-primary/90",
				className
			)}
			{...props}
		>
			<span className={cn(highlightLineVariants({ variant }))}>
				{variant ?? "new"}
			</span>{" "}
			{children}
		</span>
	);
}
