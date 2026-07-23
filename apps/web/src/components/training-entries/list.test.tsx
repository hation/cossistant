import { describe, expect, it, mock } from "bun:test";
import { Trash2Icon } from "lucide-react";
import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("next/link", () => ({
	default: ({
		children,
		href,
		prefetch: _prefetch,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		prefetch?: boolean;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

mock.module("@/components/ui/tooltip", () => ({
	TooltipOnHover: ({
		children,
		content,
	}: {
		children: React.ReactNode;
		content?: React.ReactNode;
	}) => (
		<div data-slot="mock-tooltip" data-tooltip-content={String(content ?? "")}>
			{children}
		</div>
	),
}));

const modulePromise = import("./list");

async function renderRow(props: Record<string, unknown> = {}) {
	const { TrainingEntryRow } = await modulePromise;

	return renderToStaticMarkup(
		<TrainingEntryRow
			href="/acme/agent/training/faq/faq_123"
			icon={<span>?</span>}
			primary="How do refunds work?"
			{...props}
		/>
	);
}

describe("TrainingEntryRow", () => {
	it("renders inline quick actions without the overflow trigger", async () => {
		const html = await renderRow({
			inlineActions: [
				{
					label: "Exclude from training",
					icon: <span>eye-off</span>,
					onSelect: () => {},
				},
				{
					label: "Delete FAQ",
					icon: <span>trash</span>,
					onSelect: () => {},
					destructive: true,
				},
			],
			rightMeta: <span>Excluded</span>,
		});

		expect(html).toContain('data-slot="training-entry-inline-actions"');
		expect(html).toContain("group-hover/training-entry:opacity-100");
		expect(html).toContain("group-focus-within/training-entry:opacity-100");
		expect(html).toContain("Excluded");
		expect(html).toContain("Exclude from training");
		expect(html).toContain("Delete FAQ");
		expect(html).not.toContain(
			'data-slot="training-entry-actions-menu-trigger"'
		);
	});

	it("keeps the overflow trigger when inline actions are not provided", async () => {
		const html = await renderRow({
			actions: [
				{
					label: "Delete",
					onSelect: () => {},
					Icon: Trash2Icon,
					destructive: true,
				},
			],
		});

		expect(html).toContain('data-slot="training-entry-actions-menu-trigger"');
		expect(html).not.toContain('data-slot="training-entry-inline-actions"');
	});
});
