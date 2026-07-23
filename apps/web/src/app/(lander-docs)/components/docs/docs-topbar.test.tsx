import { describe, expect, it, mock } from "bun:test";
import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
		children: React.ReactNode;
		href: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

mock.module("../page-actions", () => ({
	LLMCopyButton: ({ markdownUrl }: { markdownUrl: string }) => (
		<button
			data-markdown-url={markdownUrl}
			data-slot="mock-copy-page"
			type="button"
		/>
	),
	ViewOptions: ({
		githubUrl,
		markdownUrl,
	}: {
		githubUrl: string;
		markdownUrl: string;
	}) => (
		<button
			data-github-url={githubUrl}
			data-markdown-url={markdownUrl}
			data-slot="mock-view-options"
			type="button"
		/>
	),
}));

mock.module("@/components/ui/button", () => ({
	Button: ({
		asChild,
		children,
		...props
	}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
		asChild?: boolean;
		children: React.ReactNode;
	}) =>
		asChild ? (
			children
		) : (
			<button {...props} type={props.type ?? "button"}>
				{children}
			</button>
		),
}));

mock.module("@/components/ui/badge", () => ({
	Badge: ({
		children,
		...props
	}: React.HTMLAttributes<HTMLSpanElement> & {
		children: React.ReactNode;
	}) => <span {...props}>{children}</span>,
}));

mock.module("@/components/ui/icons", () => ({
	__esModule: true,
	default: ({ name }: { name: string }) => <span data-icon={name} />,
}));

const modulePromise = import("./docs-topbar.client");

type RenderDocsTopBarProps = Partial<{
	widgetVersion: string;
	markdownUrl: string;
	githubUrl: string;
	latestRelease: {
		version: string;
		description: string;
		tinyExcerpt: string;
		date: string;
	} | null;
	changelogContent: React.ReactNode;
	previous: {
		url: string;
		name: string;
	} | null;
	next: {
		url: string;
		name: string;
	} | null;
}>;

async function renderDocsTopBar(props: RenderDocsTopBarProps = {}) {
	const { DocsTopBarClient } = await modulePromise;

	return renderToStaticMarkup(
		<DocsTopBarClient
			githubUrl="https://github.com/cossistantcom/cossistant/blob/main/apps/web/content/docs/quickstart/index.mdx"
			latestRelease={{
				version: "0.1.2",
				description: "Script embeds and AI clarification",
				tinyExcerpt: "Script embeds and AI clarification",
				date: "2026-04-20",
			}}
			markdownUrl="/docs/quickstart.mdx"
			next={{ name: "React", url: "/docs/quickstart/react" }}
			previous={{ name: "Overview", url: "/docs" }}
			widgetVersion="0.2.0"
			{...props}
		/>
	);
}

describe("DocsTopBarClient", () => {
	it("renders the widget version, what's new link, and page actions", async () => {
		const html = await renderDocsTopBar();

		expect(html).toContain("Widget v0.2.0");
		expect(html).toContain('data-slot="docs-topbar-whats-new"');
		expect(html).toContain("NEW: Script embeds and AI clarification");
		expect(html).toContain('href="/changelog"');
		expect(html).toContain('href="/docs"');
		expect(html).toContain('href="/docs/quickstart/react"');
		expect(html).toContain('data-icon="arrow-left"');
		expect(html).toContain('data-icon="arrow-right"');
		expect(html).toContain('data-slot="mock-copy-page"');
		expect(html).toContain('data-slot="mock-view-options"');
	});

	it("omits missing neighbour controls while keeping copy actions", async () => {
		const html = await renderDocsTopBar({
			next: null,
			previous: null,
		});

		expect(html).not.toContain('data-icon="arrow-left"');
		expect(html).not.toContain('data-icon="arrow-right"');
		expect(html).toContain('data-slot="mock-copy-page"');
		expect(html).toContain('data-slot="mock-view-options"');
	});

	it("keeps the version badge when there is no changelog entry", async () => {
		const html = await renderDocsTopBar({
			latestRelease: null,
		});

		expect(html).toContain("Widget v0.2.0");
		expect(html).not.toContain('data-slot="docs-topbar-whats-new"');
	});
});
