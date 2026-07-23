import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("@api/env", () => ({
	env: {
		GEOIP_SERVICE_URL: "http://geoip.internal",
	},
}));

const modulePromise = import("./geoip");

describe("lookupGeoIp", () => {
	const originalFetch = globalThis.fetch;
	const originalWarn = console.warn;
	const warnMock = mock(() => {});

	beforeEach(() => {
		warnMock.mockReset();
		console.warn = warnMock;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		console.warn = originalWarn;
	});

	it("performs a direct GeoIP request for each eligible lookup", async () => {
		const fetchMock = mock(
			(async () =>
				new Response(
					JSON.stringify({
						ip: "8.8.8.8",
						found: true,
						is_public: true,
						country_code: "US",
						country: "United States",
						region: "California",
						city: "Mountain View",
						latitude: 37.386,
						longitude: -122.0838,
						timezone: "America/Los_Angeles",
						accuracy_radius_km: 20,
						asn: 15_169,
						asn_organization: "Google LLC",
						source: "maxmind",
						resolved_at: "2026-03-28T00:00:00.000Z",
					}),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
						},
					}
				)) as unknown as typeof fetch
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const { lookupGeoIp } = await modulePromise;
		const firstResult = await lookupGeoIp("8.8.8.8");
		const secondResult = await lookupGeoIp("8.8.8.8");

		expect(firstResult?.country_code).toBe("US");
		expect(secondResult?.city).toBe("Mountain View");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("returns null for non-200 responses", async () => {
		const fetchMock = mock(
			(async () =>
				new Response("boom", {
					status: 503,
				})) as unknown as typeof fetch
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const { lookupGeoIp } = await modulePromise;
		const result = await lookupGeoIp("8.8.8.8");

		expect(result).toBeNull();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(warnMock).toHaveBeenCalledTimes(1);
	});
});
