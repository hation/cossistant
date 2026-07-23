import { describe, expect, it, mock } from "bun:test";
import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";

let dismissed = false;

mock.module("next/link", () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

mock.module("@/hooks/use-changelog-dismissed", () => ({
	useChangelogDismissed: () => ({
		dismiss: () => {},
		isDismissed: () => dismissed,
	}),
}));

const modulePromise = import("./changelog-notification");

async function renderNotification(
	props: Partial<{
		date: string;
		description: string;
		dismissible: boolean;
		onOpenChange: (open: boolean) => void;
		open: boolean;
		tinyExcerpt: string;
		version: string;
	}> = {}
) {
	const { ChangelogNotification } = await modulePromise;
	return renderToStaticMarkup(
		<ChangelogNotification
			date="2026-03-11"
			description="Major agent improvements"
			onOpenChange={() => {}}
			open={false}
			tinyExcerpt="Smarter AI agent"
			version="0.1.2"
			{...props}
		>
			<div>Improved tool calling and memory behavior.</div>
		</ChangelogNotification>
	);
}

describe("ChangelogNotification", () => {
	it("renders the full-screen dashboard overlay when open", async () => {
		dismissed = false;
		const html = await renderNotification({ open: true });

		expect(html).toContain('data-slot="dashboard-changelog-overlay"');
		expect(html).toContain('data-slot="dashboard-changelog-panel"');
		expect(html).toContain('data-slot="dashboard-changelog-scroll-area"');
		expect(html).toContain("max-w-2xl");
		expect(html).toContain("Major agent improvements");
		expect(html).toContain("Improved tool calling and memory behavior.");
		expect(html).toContain('href="/changelog"');
	});

	it("does not render the overlay when closed", async () => {
		dismissed = false;
		const html = await renderNotification({ open: false });

		expect(html).not.toContain('data-slot="dashboard-changelog-overlay"');
		expect(html).toContain('data-slot="changelog-notification-trigger"');
	});

	it("does not render anything when the release is dismissed", async () => {
		dismissed = true;
		const html = await renderNotification({ open: true });

		expect(html).toBe("");
	});

	it("renders a non-dismissible docs version without the dismiss button", async () => {
		dismissed = false;
		const html = await renderNotification({
			dismissible: false,
			open: false,
		});

		expect(html).toContain('data-slot="changelog-notification-trigger"');
		expect(html).not.toContain('data-slot="changelog-notification-dismiss"');
		expect(html).toContain("What&#x27;s new");
	});

	it("ignores the dismissed store in non-dismissible docs mode", async () => {
		dismissed = true;
		const html = await renderNotification({
			dismissible: false,
			open: true,
		});

		expect(html).toContain('data-slot="dashboard-changelog-overlay"');
		expect(html).toContain("Latest release details for the widget.");
	});
});
