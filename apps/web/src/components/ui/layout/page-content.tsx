"use client";

import type { RefObject } from "react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "../scroll-area";

type PageContentProps = {
	children: React.ReactNode;
	className?: string;
	ref?: RefObject<HTMLDivElement | null>;
};

export const PageContent = ({ children, className, ref }: PageContentProps) => (
	<ScrollArea
		className={cn("relative flex h-full flex-1 flex-col p-4 pt-14", className)}
		maskHeight="150px"
		orientation="vertical"
		ref={ref}
		scrollMask
	>
		{children}
	</ScrollArea>
);
