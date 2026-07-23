"use client";

const tokens = [
	{
		title: "Widget override",
		variable: "--co-theme-background",
		description:
			"Set this on .cossistant when you want the widget to use a pinned value.",
		preview: "var(--co-theme-background, transparent)",
	},
	{
		title: "Host app token",
		variable: "--background",
		description:
			"If the widget override is missing, the widget uses your app token instead.",
		preview: "var(--background, oklch(99% 0 0))",
	},
	{
		title: "Cossistant default",
		variable: "oklch(99% 0 0)",
		description:
			"When neither token is defined, the widget falls back to the shipped default.",
		preview: "oklch(99% 0 0)",
	},
];

export function StyleTokenCascade() {
	return (
		<div className="my-10 grid gap-0">
			<div className="border border-border/60 bg-background-100/60 p-6 dark:bg-background-200/50">
				<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Theme Order
				</p>
				<h3 className="mt-1 font-heading font-medium text-xl">
					How the widget picks its background color
				</h3>
				<p className="mt-2 text-muted-foreground text-sm">
					First defined value wins. The same order applies to the other
					supported widget tokens too.
				</p>
			</div>
			<div className="grid gap-0 md:grid-cols-3">
				{tokens.map((step, index) => (
					<div
						className="hover:-translate-y-0.5 relative flex flex-col border border-border/60 bg-background-100/60 p-5 ring-1 ring-transparent transition hover:bg-background-100/80 dark:bg-background-200/50"
						key={step.variable}
					>
						<span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
							Step {index + 1}
						</span>
						<div className="my-4 flex items-start justify-between gap-3">
							<div>
								<p className="mb-2 font-medium">{step.title}</p>
								<p className="mt-1 text-muted-foreground text-sm">
									{step.description}
								</p>
							</div>
							<span
								aria-hidden="true"
								className="mt-0.5 size-5 shrink-0 border border-border/60 bg-background"
								style={{ background: step.preview }}
							/>
						</div>
						<code className="mt-auto inline-flex items-center gap-1 bg-background-200/80 px-2 py-1 font-mono text-[11px] text-muted-foreground dark:bg-background-300/60">
							{index < tokens.length - 1
								? `${step.variable} ->`
								: step.variable}
						</code>
					</div>
				))}
			</div>
			<div className="border border-border/60 bg-background-100/60 p-6 dark:bg-background-200/50">
				<p className="text-muted-foreground text-sm">
					Result: widget overrides win first, then host shadcn-style tokens,
					then Cossistant defaults. The same pattern applies to colors, radius,
					fonts, and dark mode-aware tokens.
				</p>
			</div>
		</div>
	);
}

export default StyleTokenCascade;
