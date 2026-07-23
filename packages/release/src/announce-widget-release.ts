#!/usr/bin/env bun
import fs from "node:fs/promises";
import { Command } from "commander";
import kleur from "kleur";
import {
	type RunWidgetReleaseAnnouncementOptions,
	runWidgetReleaseAnnouncement,
} from "./announcement";

function buildFatalSummary(message: string): string {
	return [
		"## Widget Release Announcements",
		"",
		"- Status: skipped",
		"- Result: announcement automation hit an internal error and was treated as best-effort.",
		"",
		"```text",
		message,
		"```",
		"",
	].join("\n");
}

async function appendStepSummary(markdown: string): Promise<void> {
	const summaryPath = process.env.GITHUB_STEP_SUMMARY?.trim();

	if (!summaryPath) {
		return;
	}

	await fs.appendFile(summaryPath, `${markdown}\n`);
}

async function main(): Promise<void> {
	const program = new Command()
		.name("announce-widget-release")
		.requiredOption("--version <version>", "Widget version to announce")
		.requiredOption(
			"--repo <owner/name>",
			"GitHub repository in owner/name form"
		)
		.option("--dry-run", "Generate previews without publishing", false);

	program.parse();
	const options = program.opts<{
		version: string;
		repo: string;
		dryRun: boolean;
	}>();

	const runOptions: RunWidgetReleaseAnnouncementOptions = {
		version: options.version,
		repo: options.repo,
		dryRun: options.dryRun,
	};

	const result = await runWidgetReleaseAnnouncement(runOptions);

	console.log(kleur.cyan().bold("\nWidget Release Announcements\n"));
	for (const channel of result.results) {
		const statusColor =
			channel.status === "posted"
				? kleur.green
				: channel.status === "dry-run" || channel.status === "skipped"
					? kleur.yellow
					: kleur.red;

		console.log(
			`${statusColor(channel.channel.toUpperCase())}: ${channel.status} - ${channel.message}`
		);
	}
	console.log(`\nAnnouncement link: ${result.context.links.announcementUrl}`);
	if (!result.ok) {
		console.log(
			kleur.yellow(
				"\nAnnouncement warnings were recorded, but this step is best-effort and will not fail CI."
			)
		);
	}
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(
		kleur.yellow(
			`Widget release announcements were skipped because of an internal error: ${message}`
		)
	);
	void appendStepSummary(buildFatalSummary(message)).catch(() => {});
});
