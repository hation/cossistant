import { readTinybirdLocalStatus } from "@api/lib/tinybird-local-cli";

type TinybirdLocalDiagnosticsOptions = {
	host: string;
	token: string;
	signingKey?: string;
	workspace: string;
	fetchImpl?: typeof fetch;
	log?: Pick<Console, "warn">;
	retries?: number;
	retryDelayMs?: number;
	localStatusReader?: () => Promise<{
		workspaceId: string;
		token: string;
	} | null>;
};

type TinybirdTokenPayload = {
	u?: unknown;
	id?: unknown;
};

const LOCAL_TINYBIRD_RECOVERY_HINT =
	"Recovery: run scripts/tinybird-local-env.sh, copy TINYBIRD_TOKEN/TINYBIRD_SIGNING_KEY/TINYBIRD_WORKSPACE into apps/api/.env and apps/workers/.env, restart API/workers, then hard refresh the dashboard.";

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isLocalTinybirdHost(host: string): boolean {
	try {
		const url = new URL(host);
		return url.hostname === "localhost" || url.hostname === "127.0.0.1";
	} catch {
		return false;
	}
}

export function decodeTinybirdToken(token: string): {
	workspaceId: string | null;
	tokenId: string | null;
} {
	try {
		const [, payload] = token.split(".");
		if (!payload) {
			return { workspaceId: null, tokenId: null };
		}

		const decoded = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf8")
		) as TinybirdTokenPayload;

		return {
			workspaceId: typeof decoded.u === "string" ? decoded.u : null,
			tokenId: typeof decoded.id === "string" ? decoded.id : null,
		};
	} catch {
		return { workspaceId: null, tokenId: null };
	}
}

function buildLocalMismatchMessage({
	host,
	envWorkspace,
	liveWorkspace,
	envToken,
	signingToken,
	liveToken,
	liveTokenLabel,
}: {
	host: string;
	envWorkspace: string;
	liveWorkspace: string | null;
	envToken: string;
	signingToken: string;
	liveToken: string;
	liveTokenLabel: string;
}): string | null {
	const mismatches: string[] = [];
	const envTokenDetails = decodeTinybirdToken(envToken);
	const signingTokenDetails = decodeTinybirdToken(signingToken);
	const liveTokenDetails = decodeTinybirdToken(liveToken);

	if (envWorkspace !== (liveWorkspace ?? "")) {
		mismatches.push(
			`TINYBIRD_WORKSPACE=${envWorkspace || "<empty>"} but Tinybird Local is using ${liveWorkspace || "<unknown>"}.`
		);
	}

	if (envToken !== liveToken) {
		mismatches.push(
			`TINYBIRD_TOKEN does not match the current Tinybird Local ${liveTokenLabel} (env token id=${envTokenDetails.tokenId || "<unknown>"}, local token id=${liveTokenDetails.tokenId || "<unknown>"}).`
		);
	}

	if (signingToken !== liveToken) {
		mismatches.push(
			`The JWT signing token does not match the current Tinybird Local ${liveTokenLabel} (env signing token id=${signingTokenDetails.tokenId || "<unknown>"}, local token id=${liveTokenDetails.tokenId || "<unknown>"}).`
		);
	}

	if (mismatches.length === 0) {
		return null;
	}

	return `[Tinybird Local] Local Tinybird credentials look stale for ${host}. ${mismatches.join(" ")} ${LOCAL_TINYBIRD_RECOVERY_HINT}`;
}

export async function warnIfTinybirdLocalEnvMismatch({
	host,
	token,
	signingKey = "",
	workspace,
	fetchImpl = fetch,
	log = console,
	retries = 10,
	retryDelayMs = 1000,
	localStatusReader = async () => {
		try {
			const status = await readTinybirdLocalStatus();
			return { workspaceId: status.workspaceId, token: status.token };
		} catch {
			return null;
		}
	},
}: TinybirdLocalDiagnosticsOptions): Promise<void> {
	if (!isLocalTinybirdHost(host)) {
		return;
	}

	const signingToken = signingKey || token;
	const localStatus = await localStatusReader();

	if (localStatus) {
		const mismatchMessage = buildLocalMismatchMessage({
			host,
			envWorkspace: workspace,
			liveWorkspace: localStatus.workspaceId,
			envToken: token,
			signingToken,
			liveToken: localStatus.token,
			liveTokenLabel: "tb local status token",
		});

		if (mismatchMessage) {
			log.warn(mismatchMessage);
		}

		return;
	}

	const tokensUrl = `${host.replace(/\/$/, "")}/tokens`;

	for (let attempt = 0; attempt <= retries; attempt += 1) {
		try {
			const response = await fetchImpl(tokensUrl);
			if (!response.ok) {
				throw new Error(`Tinybird Local /tokens returned ${response.status}`);
			}

			const payload = (await response.json()) as {
				workspace_admin_token?: unknown;
			};
			if (
				typeof payload.workspace_admin_token !== "string" ||
				payload.workspace_admin_token.length === 0
			) {
				log.warn(
					`[Tinybird Local] Could not validate local Tinybird env because ${tokensUrl} did not return workspace_admin_token. ${LOCAL_TINYBIRD_RECOVERY_HINT}`
				);
				return;
			}

			const liveToken = payload.workspace_admin_token;
			const liveWorkspace = decodeTinybirdToken(liveToken).workspaceId;
			const mismatchMessage = buildLocalMismatchMessage({
				host,
				envWorkspace: workspace,
				liveWorkspace,
				envToken: token,
				signingToken,
				liveToken,
				liveTokenLabel: "workspace_admin_token",
			});

			if (mismatchMessage) {
				log.warn(mismatchMessage);
			}

			return;
		} catch (error) {
			if (attempt === retries) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				log.warn(
					`[Tinybird Local] Could not reach ${tokensUrl} to validate local Tinybird env: ${errorMessage}. ${LOCAL_TINYBIRD_RECOVERY_HINT}`
				);
				return;
			}

			await sleep(retryDelayMs);
		}
	}
}
