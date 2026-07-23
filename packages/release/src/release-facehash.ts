import path from "node:path";
import { execa } from "execa";
import fs from "fs-extra";
import kleur from "kleur";
import ora from "ora";
import prompts from "prompts";

/**
 * Simple release flow for Facehash package.
 * No AI changelog - just version bump, changeset, commit, and push.
 */
export async function releaseFacehash(): Promise<void> {
	console.log(kleur.cyan().bold("\n  Facehash Release\n"));

	// Step 1: Select release type
	const { releaseType } = await prompts({
		type: "select",
		name: "releaseType",
		message: "What type of release is this?",
		choices: [
			{ title: "patch", description: "Bug fixes (0.0.x)", value: "patch" },
			{ title: "minor", description: "New features (0.x.0)", value: "minor" },
			{
				title: "major",
				description: "Breaking changes (x.0.0)",
				value: "major",
			},
		],
	});

	if (!releaseType) {
		process.exit(0);
	}

	// Step 2: Optional description
	const { description } = await prompts({
		type: "text",
		name: "description",
		message: "Brief description (optional, for commit message):",
	});

	const changeDescription = description || `Facehash ${releaseType} release`;

	// Step 3: Confirm
	const { confirm } = await prompts({
		type: "confirm",
		name: "confirm",
		message: `Release Facehash as ${releaseType}?`,
		initial: true,
	});

	if (!confirm) {
		console.log(kleur.yellow("\nRelease cancelled."));
		process.exit(0);
	}

	const spinner = ora();

	// Create changeset
	spinner.start("Creating changeset...");
	await createFacehashChangeset(releaseType, changeDescription);
	spinner.succeed("Changeset created");

	// Version packages
	spinner.start("Versioning package...");
	await execa("bun", ["run", "changeset:version"], { stdio: "pipe" });
	spinner.succeed("Package versioned");

	// Commit version changes
	spinner.start("Committing version changes...");
	await execa("git", ["add", "."]);
	await execa("git", [
		"commit",
		"-m",
		`chore(release): facehash ${releaseType}`,
	]);
	spinner.succeed("Changes committed");

	// Push commits and tags
	spinner.start("Pushing to remote...");
	await execa("git", ["push"]);
	await execa("git", ["push", "--tags"]);
	spinner.succeed("Pushed to remote");

	console.log(kleur.green().bold("\n  Facehash release completed!\n"));
}

async function createFacehashChangeset(
	releaseType: "patch" | "minor" | "major",
	description: string
): Promise<void> {
	const changesetContent = `---
"facehash": ${releaseType}
---

${description}
`;

	const filename = path.join(
		process.cwd(),
		".changeset",
		`${Date.now()}-facehash.md`
	);
	await fs.outputFile(filename, changesetContent);
}
