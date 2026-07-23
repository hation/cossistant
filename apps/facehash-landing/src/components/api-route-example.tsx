"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const CODE = `// app/api/avatar/route.ts
import { toFacehashHandler } from "facehash/next";

export const { GET } = toFacehashHandler();`;

const USAGE = `// use it anywhere you need a URL
<img src="/api/avatar?name=john" />

// raw svg for icons, favicons, or browser UI
https://yoursite.com/api/avatar?name=john&format=svg&pose=front`;

export function ApiRouteExample() {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(CODE);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
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

			<div className="relative flex items-center justify-between py-4">
				<span className="text-[var(--muted-foreground)] text-xs">
					need an image URL instead?
				</span>
				<button
					className="p-1 transition-colors hover:bg-[var(--border)]"
					onClick={handleCopy}
					type="button"
				>
					{copied ? (
						<Check className="h-3.5 w-3.5 text-green-500" />
					) : (
						<Copy className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
					)}
				</button>
			</div>
			<pre className="relative overflow-x-auto py-4 text-sm">
				<code>{CODE}</code>
			</pre>
			<div className="border-[var(--border)] border-t border-dashed py-4">
				<pre className="overflow-x-auto text-[var(--muted-foreground)] text-sm">
					<code>{USAGE}</code>
				</pre>
			</div>
		</div>
	);
}
