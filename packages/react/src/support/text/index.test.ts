import { describe, expect, it } from "bun:test";

import {
	BUILTIN_LOCALES,
	buildLocaleChain,
	createTextUtils,
	normalizeOverrides,
	resolveMessage,
} from "./runtime";

describe("support text locale resolution", () => {
	it("builds a locale preference chain with fallbacks and normalizes locales (en-GB, en-US -> en)", () => {
		// All variants of "fr" (fr-CA, fr-ca) normalize to just "fr"
		const chain = buildLocaleChain(["fr-CA", "es", null, "fr-ca"]);
		expect(chain).toEqual(["fr", "es", "en"]);
	});

	it("prefers locale-specific overrides over defaults", () => {
		const overrides = normalizeOverrides({
			"common.brand.watermark": {
				fr: "Propulsé par",
				en: "Powered",
			},
		});

		const message = resolveMessage(
			"common.brand.watermark",
			["fr", "en"],
			overrides
		);
		expect(message).toBe("Propulsé par");
	});

	it("normalizes locale-specific overrides and falls back to any-locale overrides", () => {
		const overrides = normalizeOverrides({
			"common.brand.watermark": {
				en: "Powered (UK)",
			},
			"common.actions.askQuestion": "Reach out",
		});

		const exact = resolveMessage("common.brand.watermark", ["en"], overrides);
		expect(exact).toBe("Powered (UK)");

		const anyLocale = resolveMessage(
			"common.actions.askQuestion",
			["es"],
			overrides
		);
		expect(anyLocale).toBe("Reach out");
	});

	it("falls back to built-in locales when no override is present", () => {
		const overrides = normalizeOverrides({});
		const message = resolveMessage("common.brand.watermark", ["de"], overrides);
		expect(message).toBe(BUILTIN_LOCALES.en["common.brand.watermark"]);
	});

	it("resolves the spam-specific conversation closed message", () => {
		const overrides = normalizeOverrides({});
		const message = resolveMessage(
			"component.conversationPage.spamMessage",
			["en"],
			overrides
		);

		expect(message).toBe(
			BUILTIN_LOCALES.en["component.conversationPage.spamMessage"]
		);
	});

	it("provides locale-aware time of day labels", () => {
		const originalGetHours = Date.prototype.getHours;
		// Mock window to simulate browser environment (timeOfDay returns SSR fallback when window is undefined)
		const originalWindow = globalThis.window;
		// @ts-expect-error - mocking window for test
		globalThis.window = {};

		try {
			const { timeOfDay } = createTextUtils("fr", true);

			Date.prototype.getHours = function getHours() {
				return 9;
			};
			const morning = timeOfDay();

			Date.prototype.getHours = function getHours() {
				return 16;
			};
			const afternoon = timeOfDay();

			Date.prototype.getHours = function getHours() {
				return 22;
			};
			const evening = timeOfDay();

			expect(morning.token).toBe("morning");
			expect(typeof morning.label).toBe("string");
			expect(morning.label.length).toBeGreaterThan(0);

			expect(afternoon.token).toBe("afternoon");
			expect(typeof afternoon.label).toBe("string");
			expect(afternoon.label.length).toBeGreaterThan(0);

			expect(evening.token).toBe("evening");
			expect(typeof evening.label).toBe("string");
			expect(evening.label.length).toBeGreaterThan(0);
		} finally {
			Date.prototype.getHours = originalGetHours;
			globalThis.window = originalWindow;
		}
	});

	it("returns stable morning value during SSR to avoid hydration mismatch", () => {
		const { timeOfDay } = createTextUtils("en", false);
		const result = timeOfDay();

		expect(result.token).toBe("morning");
		expect(typeof result.label).toBe("string");
		expect(result.label.length).toBeGreaterThan(0);
	});
});
