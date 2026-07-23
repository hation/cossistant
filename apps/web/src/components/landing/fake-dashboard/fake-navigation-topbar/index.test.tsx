import { describe, expect, it, mock } from "bun:test";
import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const renderedTopbarItems: Array<{
	href?: string;
	prefetch?: boolean;
}> = [];

mock.module("next/link", () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

mock.module("@/components/ui/layout/navigation-topbar/topbar-item", () => ({
	TopbarItem: ({
		children,
		href,
		prefetch,
	}: {
		children: React.ReactNode;
		href?: string;
		prefetch?: boolean;
	}) => {
		renderedTopbarItems.push({ href, prefetch });
		return <a href={href}>{children}</a>;
	},
}));

mock.module("@/components/ui/icons", () => ({
	__esModule: true,
	default: ({ name }: { name: string }) => <span data-slot={`icon-${name}`} />,
}));

mock.module("@/components/ui/logo", () => ({
	Logo: () => <span data-slot="logo" />,
}));

const modulePromise = import("./index");

describe("FakeNavigationTopbar", () => {
	it("disables prefetch for fake dashboard links", async () => {
		renderedTopbarItems.length = 0;
		const { FakeNavigationTopbar } = await modulePromise;

		const html = renderToStaticMarkup(<FakeNavigationTopbar />);

		expect(renderedTopbarItems).toEqual([
			{ href: "/agent", prefetch: false },
			{ href: "/contacts", prefetch: false },
		]);
		expect(html).toContain('href="/"');
		expect(html).toContain("Agent");
		expect(html).toContain("Contacts");
	});
});
