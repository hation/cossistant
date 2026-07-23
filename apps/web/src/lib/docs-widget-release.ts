import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
	getLatestRelease,
	getLatestReleaseBody,
	type LatestRelease,
} from "@/lib/latest-release";

export type DocsWidgetRelease = {
	widgetVersion: string;
	latestRelease: LatestRelease | null;
	latestReleaseBody: ReturnType<typeof getLatestReleaseBody>;
};

const WIDGET_PACKAGE_JSON_RELATIVE_PATH = path.join(
	"packages",
	"react",
	"package.json"
);

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
	return (
		error instanceof Error &&
		"code" in error &&
		(error as NodeJS.ErrnoException).code === "ENOENT"
	);
}

export async function findWidgetPackageJsonPath(
	startDir = process.cwd()
): Promise<string> {
	let currentDir = path.resolve(startDir);

	while (true) {
		const candidatePath = path.join(
			currentDir,
			WIDGET_PACKAGE_JSON_RELATIVE_PATH
		);

		try {
			await access(candidatePath);
			return candidatePath;
		} catch (error) {
			if (!isNotFoundError(error)) {
				throw error;
			}
		}

		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) {
			throw new Error(
				`Unable to find ${WIDGET_PACKAGE_JSON_RELATIVE_PATH} from ${startDir}`
			);
		}

		currentDir = parentDir;
	}
}

export async function getDocsWidgetRelease(): Promise<DocsWidgetRelease> {
	const widgetPackageJsonPath = await findWidgetPackageJsonPath();
	const packageJson = JSON.parse(
		await readFile(widgetPackageJsonPath, "utf8")
	) as {
		version?: string;
	};

	return {
		widgetVersion:
			typeof packageJson.version === "string" ? packageJson.version : "",
		latestRelease: getLatestRelease(),
		latestReleaseBody: getLatestReleaseBody(),
	};
}
