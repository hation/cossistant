import { beforeEach, describe, expect, it, mock } from "bun:test";

function createTinybirdToken(workspaceId: string, tokenId: string): string {
	const header = Buffer.from(
		JSON.stringify({ alg: "HS256", typ: "JWT" })
	).toString("base64url");
	const payload = Buffer.from(
		JSON.stringify({
			u: workspaceId,
			id: tokenId,
			host: null,
		})
	).toString("base64url");

	return `${header}.${payload}.signature`;
}

const modulePromise = import("./tinybird-local-diagnostics");

describe("tinybird local diagnostics", () => {
	const warnMock = mock((_message: string) => {});

	beforeEach(() => {
		warnMock.mockClear();
	});

	it("warns when local Tinybird env is stale", async () => {
		const localStatusReaderMock = mock(async () => ({
			workspaceId: "workspace-live",
			token: createTinybirdToken("workspace-live", "token-live"),
		}));
		const { warnIfTinybirdLocalEnvMismatch } = await modulePromise;

		await warnIfTinybirdLocalEnvMismatch({
			host: "http://localhost:7181",
			token: createTinybirdToken("workspace-old", "token-old"),
			signingKey: createTinybirdToken("workspace-old", "token-old"),
			workspace: "workspace-old",
			log: { warn: warnMock },
			retries: 0,
			localStatusReader: localStatusReaderMock,
		});

		expect(localStatusReaderMock).toHaveBeenCalledTimes(1);
		expect(warnMock).toHaveBeenCalledTimes(1);
		expect(warnMock.mock.calls[0]?.[0]).toContain(
			"Local Tinybird credentials look stale"
		);
		expect(warnMock.mock.calls[0]?.[0]).toContain(
			"scripts/tinybird-local-env.sh"
		);
	});

	it("does not warn when the current env matches Tinybird Local", async () => {
		const liveToken = createTinybirdToken("workspace-live", "token-live");
		const localStatusReaderMock = mock(async () => ({
			workspaceId: "workspace-live",
			token: liveToken,
		}));
		const { warnIfTinybirdLocalEnvMismatch } = await modulePromise;

		await warnIfTinybirdLocalEnvMismatch({
			host: "http://localhost:7181",
			token: liveToken,
			signingKey: liveToken,
			workspace: "workspace-live",
			log: { warn: warnMock },
			retries: 0,
			localStatusReader: localStatusReaderMock,
		});

		expect(localStatusReaderMock).toHaveBeenCalledTimes(1);
		expect(warnMock).not.toHaveBeenCalled();
	});

	it("skips diagnostics for non-local Tinybird hosts", async () => {
		const localStatusReaderMock = mock(async () => null);
		const { warnIfTinybirdLocalEnvMismatch } = await modulePromise;

		await warnIfTinybirdLocalEnvMismatch({
			host: "https://api.us-east.aws.tinybird.co",
			token: "cloud-token",
			signingKey: "cloud-signing-key",
			workspace: "workspace-cloud",
			log: { warn: warnMock },
			retries: 0,
			localStatusReader: localStatusReaderMock,
		});

		expect(localStatusReaderMock).not.toHaveBeenCalled();
		expect(warnMock).not.toHaveBeenCalled();
	});
});
