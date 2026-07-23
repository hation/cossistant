import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LogoTextSVG } from "./logo";

describe("LogoTextSVG", () => {
	it("renders the logo mark as a single punched-out shape", () => {
		const html = renderToStaticMarkup(<LogoTextSVG />);

		expect(html.match(/<path/g)?.length).toBe(2);
		expect(html).toContain('fill-rule="evenodd"');
	});
});
