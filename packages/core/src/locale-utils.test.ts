import { describe, expect, it } from "bun:test";
import { normalizeLocale } from "./locale-utils";

describe("normalizeLocale", () => {
	it("normalizes locale codes to base language (en-US -> en, en-GB -> en)", () => {
		expect(normalizeLocale("en-US")).toBe("en");
		expect(normalizeLocale("en-GB")).toBe("en");
		expect(normalizeLocale("fr-FR")).toBe("fr");
		expect(normalizeLocale("fr-CA")).toBe("fr");
		expect(normalizeLocale("es-ES")).toBe("es");
		expect(normalizeLocale("es-MX")).toBe("es");
		expect(normalizeLocale("de-DE")).toBe("de");
		expect(normalizeLocale("pt-BR")).toBe("pt");
	});

	it("handles already normalized locales", () => {
		expect(normalizeLocale("en")).toBe("en");
		expect(normalizeLocale("fr")).toBe("fr");
		expect(normalizeLocale("es")).toBe("es");
	});

	it("handles case insensitivity", () => {
		expect(normalizeLocale("EN-US")).toBe("en");
		expect(normalizeLocale("Fr-FR")).toBe("fr");
		expect(normalizeLocale("ES")).toBe("es");
	});

	it("returns null for null or undefined input", () => {
		expect(normalizeLocale(null)).toBe(null);
		expect(normalizeLocale(undefined)).toBe(null);
	});

	it("returns null for empty string", () => {
		expect(normalizeLocale("")).toBe(null);
	});
});
