import { describe, expect, it } from "bun:test";
import { toFacehashHandler } from "./handler";

describe("toFacehashHandler", () => {
	it("returns png by default", async () => {
		const { GET } = toFacehashHandler();
		const response = await GET(
			new Request("https://facehash.dev/api/avatar?name=agent-47")
		);
		const body = await response.arrayBuffer();

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("image/png");
		expect(response.headers.get("Cache-Control")).toBe(
			"public, max-age=31536000, immutable"
		);
		expect(body.byteLength).toBeGreaterThan(0);
	});

	it("returns svg markup when requested", async () => {
		const { GET } = toFacehashHandler();
		const response = await GET(
			new Request(
				"https://facehash.dev/api/avatar?name=agent-47&format=svg&size=128"
			)
		);
		const body = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe(
			"image/svg+xml; charset=utf-8"
		);
		expect(body).toContain("<svg");
		expect(body).toContain('width="128"');
		expect(body).toContain("agent-47");
	});

	it("supports front pose for svg output", async () => {
		const { GET } = toFacehashHandler();
		const seeded = await GET(
			new Request(
				"https://facehash.dev/api/avatar?name=agent-47&format=svg&size=128&pose=seed"
			)
		);
		const front = await GET(
			new Request(
				"https://facehash.dev/api/avatar?name=agent-47&format=svg&size=128&pose=front"
			)
		);

		const seededBody = await seeded.text();
		const frontBody = await front.text();

		expect(seededBody).not.toBe(frontBody);
		expect(frontBody).toContain("scale(1 1)");
	});

	it("returns svg error content when name is missing", async () => {
		const { GET } = toFacehashHandler();
		const response = await GET(
			new Request("https://facehash.dev/api/avatar?format=svg")
		);
		const body = await response.text();

		expect(response.status).toBe(400);
		expect(response.headers.get("Content-Type")).toBe(
			"image/svg+xml; charset=utf-8"
		);
		expect(body).toContain("Missing ?name= parameter");
	});
});
