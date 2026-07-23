import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TINYBIRD_PROJECT_DIR = fileURLToPath(
	new URL("../../../../tinybird", import.meta.url)
);

export type TinybirdLocalStatus = {
	workspaceId: string;
	token: string;
};

type ExecFileLike = (
	command: string,
	args: string[],
	options: { cwd: string }
) => Promise<{ stdout: string; stderr: string }>;

export function parseTinybirdLocalStatusOutput(
	stdout: string
): TinybirdLocalStatus {
	const workspaceIdMatch = stdout.match(/^workspace_id:\s*(.+)$/m);
	const tokenMatch = stdout.match(/^token:\s*(.+)$/m);

	if (!(workspaceIdMatch?.[1] && tokenMatch?.[1])) {
		throw new Error(
			`Could not parse Tinybird Local status output:\n${stdout.trim()}`
		);
	}

	return {
		workspaceId: workspaceIdMatch[1].trim(),
		token: tokenMatch[1].trim(),
	};
}

export function parseTinybirdJwtOutput(stdout: string): string {
	const tokenMatch = stdout.match(
		/The token is:\s*([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/
	);

	if (!tokenMatch?.[1]) {
		throw new Error(`Could not parse Tinybird JWT output:\n${stdout.trim()}`);
	}

	return tokenMatch[1];
}

export async function readTinybirdLocalStatus(
	execFileImpl: ExecFileLike = execFileAsync
): Promise<TinybirdLocalStatus> {
	const { stdout } = await execFileImpl("tb", ["local", "status"], {
		cwd: TINYBIRD_PROJECT_DIR,
	});

	return parseTinybirdLocalStatusOutput(stdout);
}

export async function createTinybirdLocalJwt(
	websiteId: string,
	pipes: readonly string[],
	execFileImpl: ExecFileLike = execFileAsync
): Promise<string> {
	const args = [
		"token",
		"create",
		"jwt",
		`frontend_${websiteId}`,
		"--ttl",
		"10m",
	];

	for (const pipe of pipes) {
		args.push(
			"--scope",
			"PIPES:READ",
			"--resource",
			pipe,
			"--fixed-params",
			`website_id=${websiteId}`
		);
	}

	const { stdout } = await execFileImpl("tb", args, {
		cwd: TINYBIRD_PROJECT_DIR,
	});

	return parseTinybirdJwtOutput(stdout);
}
