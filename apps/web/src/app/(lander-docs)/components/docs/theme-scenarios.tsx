"use client";

const scenarios = [
	{
		eyebrow: "Best default",
		title: "Do nothing",
		description:
			"If your app already exposes shadcn-style tokens, import the widget CSS and render <Support />.",
		setup: "No extra theme CSS",
		result:
			"The widget picks up host colors, radius, fonts, and dark mode automatically.",
	},
	{
		eyebrow: "Pinned brand",
		title: "Set --co-theme-*",
		description:
			"Use explicit widget tokens when the widget should keep the same branded values across apps.",
		setup: ".cossistant { --co-theme-primary: ... }",
		result:
			"Widget overrides win over host tokens without changing the rest of the app.",
	},
	{
		eyebrow: "Forced mode",
		title: 'Use theme="dark"',
		description:
			"Use the theme prop when the widget should stay dark instead of following the page theme.",
		setup: '<Support theme="dark" />',
		result:
			"Color mode is pinned while the rest of the theming contract stays the same.",
	},
];

export function ThemeScenarios() {
	return (
		<div className="my-10 grid gap-0 md:grid-cols-3">
			{scenarios.map((scenario) => (
				<div
					className="flex flex-col border border-border/60 bg-background-100/60 p-5 dark:bg-background-200/50"
					key={scenario.title}
				>
					<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						{scenario.eyebrow}
					</p>
					<h3 className="mt-2 font-heading font-medium text-lg">
						{scenario.title}
					</h3>
					<p className="mt-3 text-muted-foreground text-sm leading-relaxed">
						{scenario.description}
					</p>
					<div className="mt-5 border border-border/60 border-dashed bg-background/80 p-3 dark:bg-background-300/30">
						<p className="font-medium text-xs uppercase tracking-wide">Setup</p>
						<code className="mt-2 inline-flex bg-background-200/80 px-2 py-1 font-mono text-[11px] text-muted-foreground dark:bg-background-300/60">
							{scenario.setup}
						</code>
					</div>
					<p className="mt-4 text-sm leading-relaxed">{scenario.result}</p>
				</div>
			))}
		</div>
	);
}

export default ThemeScenarios;
