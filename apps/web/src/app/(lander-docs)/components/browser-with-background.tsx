import type { ReactNode } from "react";
import { BrowserShell } from "@/components/showcase/browser-shell";
import { cn } from "@/lib/utils";
import { BrowserWithBackgroundLayer } from "./browser-with-background-layer";

type BrowserWithBackgroundProps = {
	children?: ReactNode;
	containerClassName?: string;
	browserClassName?: string;
	contentClassName?: string;
};

export function BrowserWithBackground({
	children,
	containerClassName = "",
	browserClassName = "",
	contentClassName = "",
}: BrowserWithBackgroundProps) {
	return (
		<div
			className={cn(
				"relative flex w-full items-center justify-center overflow-hidden bg-background dark:bg-background-200",
				containerClassName
			)}
		>
			<BrowserWithBackgroundLayer />
			<div
				className={cn(
					"pointer-events-none relative z-10 flex flex-1 items-center justify-center overflow-hidden",
					contentClassName
				)}
			>
				<BrowserShell
					className={cn("fake-browser-wrapper", browserClassName)}
					contentClassName="bg-background"
				>
					{children}
				</BrowserShell>
			</div>
		</div>
	);
}
