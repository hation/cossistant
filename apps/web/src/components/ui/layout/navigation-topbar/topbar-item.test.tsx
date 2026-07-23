import { describe, expect, it, mock } from "bun:test";
import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const renderedLinks: Array<{ href: string; prefetch: boolean | undefined }> =
	[];

mock.module("next/link", () => ({
	default: ({
		children,
		href,
		prefetch,
	}: {
		children: React.ReactNode;
		href: string;
		prefetch?: boolean;
	}) => {
		renderedLinks.push({ href, prefetch });
		return (
			<a data-prefetch={String(prefetch)} href={href}>
				{children}
			</a>
		);
	},
}));

mock.module("../../icons", () => ({
	__esModule: true,
	default: ({ name }: { name: string }) => <span data-slot={`icon-${name}`} />,
}));

const modulePromise = import("./topbar-item");

describe("TopbarItem", () => {
	it("forwards prefetch={false} to next/link", async () => {
		renderedLinks.length = 0;
		const { TopbarItem } = await modulePromise;

		const html = renderToStaticMarkup(
			<TopbarItem href="/agent" prefetch={false}>
				Agent
			</TopbarItem>
		);

		expect(renderedLinks).toEqual([{ href: "/agent", prefetch: false }]);
		expect(html).toContain('href="/agent"');
		expect(html).toContain('data-prefetch="false"');
	});

	it("keeps linked items prefetched by default", async () => {
		renderedLinks.length = 0;
		const { TopbarItem } = await modulePromise;

		const html = renderToStaticMarkup(
			<TopbarItem href="/acme/inbox">Inbox</TopbarItem>
		);

		expect(renderedLinks).toEqual([{ href: "/acme/inbox", prefetch: true }]);
		expect(html).toContain('href="/acme/inbox"');
		expect(html).toContain("Inbox");
		expect(html).toContain('data-prefetch="true"');
	});
});
