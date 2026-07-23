import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Spinner } from "./spinner";

function countOccurrences(html: string, pattern: string): number {
	return html.split(pattern).length - 1;
}

const MOTION_STYLE_VARIABLES = [
	"--co-spinner-orbit-start-x",
	"--co-spinner-orbit-start-y",
	"--co-spinner-orbit-peak-x",
	"--co-spinner-orbit-peak-y",
	"--co-spinner-wave-start-x",
	"--co-spinner-wave-start-y",
	"--co-spinner-wave-peak-x",
	"--co-spinner-wave-peak-y",
	"--co-spinner-pulse-peak-x",
	"--co-spinner-pulse-peak-y",
] as const;

describe("Spinner", () => {
	it("renders a 3x3 grid of cells", () => {
		const html = renderToStaticMarkup(<Spinner />);

		expect(html).toContain('data-co-spinner="true"');
		expect(countOccurrences(html, 'data-co-spinner-cell="true"')).toBe(9);
		expect(html).not.toContain("--co-spinner-radius");
		for (const variableName of MOTION_STYLE_VARIABLES) {
			expect(html).not.toContain(variableName);
		}
	});

	it("renders stable auto-variant markup for SSR", () => {
		const firstHtml = renderToStaticMarkup(<Spinner />);
		const secondHtml = renderToStaticMarkup(<Spinner />);

		expect(firstHtml).toBe(secondHtml);
		expect(firstHtml).toMatch(/data-co-spinner-variant="(orbit|wave|pulse)"/);
	});

	it("uses the requested explicit variant", () => {
		const html = renderToStaticMarkup(<Spinner variant="pulse" />);

		expect(html).toContain('data-co-spinner-variant="pulse"');
	});
});
