import { describe, expect, it } from "bun:test";

describe("web next config", () => {
	it("allows both Facehash image hosts", async () => {
		const { default: nextConfig } = await import("./next.config.mjs");
		const remotePatterns = nextConfig.images?.remotePatterns ?? [];
		const serialized = remotePatterns.map((pattern) => pattern.toString());

		expect(serialized).toContain("https://facehash.dev/**");
		expect(serialized).toContain("https://www.facehash.dev/**");
	});
});
