"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const PACKAGE_MANAGERS = [
	{ id: "npm", command: "npm i facehash" },
	{ id: "bun", command: "bun add facehash" },
	{ id: "pnpm", command: "pnpm add facehash" },
	{ id: "yarn", command: "yarn add facehash" },
] as const;

export function InstallCommand() {
	const [selected, setSelected] = useState<string>("npm");
	const [copied, setCopied] = useState(false);

	const selectedPm = PACKAGE_MANAGERS.find((pm) => pm.id === selected);

	const handleCopy = async () => {
		if (selectedPm) {
			await navigator.clipboard.writeText(selectedPm.command);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<div className="-ml-8 md:-ml-12 relative w-[calc(100%+4rem)] bg-[var(--foreground)]/[0.03] px-8 md:w-[calc(100%+6rem)] md:px-12">
			{/* Full-width top border */}
			<div
				className="-translate-x-1/2 pointer-events-none absolute top-0 left-1/2 w-screen border-[var(--border)] border-t border-dashed"
				style={{ zIndex: -30 }}
			/>
			{/* Full-width bottom border */}
			<div
				className="-translate-x-1/2 pointer-events-none absolute bottom-0 left-1/2 w-screen border-[var(--border)] border-b border-dashed"
				style={{ zIndex: -30 }}
			/>

			{/* Tabs */}
			<div className="relative flex py-4">
				{PACKAGE_MANAGERS.map((pm) => (
					<button
						className={cn(
							"px-1 py-1 text-xs transition-colors",
							selected === pm.id
								? "bg-[var(--background)] text-[var(--foreground)]"
								: "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
						)}
						key={pm.id}
						onClick={() => setSelected(pm.id)}
						type="button"
					>
						<span className={selected === pm.id ? "opacity-100" : "opacity-0"}>
							[
						</span>
						{pm.id}
						<span className={selected === pm.id ? "opacity-100" : "opacity-0"}>
							]
						</span>
					</button>
				))}
			</div>
			{/* Command */}
			<div className="relative flex items-center justify-between pb-4">
				<code className="text-base">
					<span className="pointer-events-none select-none opacity-50">
						$&nbsp;
					</span>
					{selectedPm?.command}
				</code>
				<button
					className="p-1 transition-colors hover:bg-[var(--border)]"
					onClick={handleCopy}
					title="Copy to clipboard"
					type="button"
				>
					{copied ? (
						<Check className="h-3.5 w-3.5 text-green-500" />
					) : (
						<Copy className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
					)}
				</button>
			</div>
		</div>
	);
}
