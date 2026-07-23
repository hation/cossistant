import { afterEach, describe, expect, it } from "bun:test";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import {
	type AnnouncementContext,
	appendAnnouncementMarker,
	buildXOAuth1,
	loadChangelogRelease,
	prepareStoredDiscordAnnouncement,
	prepareStoredXAnnouncement,
	resolveChangelogFilePath,
	runWidgetReleaseAnnouncement,
} from "./announcement";

const CHANGELOG_FIXTURE = `---
version: "0.2.0"
description: "Script tag embeds, automatic theming, and smarter AI clarification"
tiny-excerpt: "Script embeds and AI clarification"
date: "2026-04-20"
author: "Cossistant Team"
discord-announcement: |
  Cossistant v0.2.0 is live.
  Script tag embeds and automatic theming are out now.
  Read the full changelog: https://cossistant.com/changelog/2026-04-20-v0.2.0
x-announcement: |
  Cossistant v0.2.0 is out with script tag embeds and automatic theming.
  https://cossistant.com/changelog/2026-04-20-v0.2.0
---

Release summary.
`;

const tempDirs: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
	const workspaceDir = await fs.mkdtemp(
		path.join(os.tmpdir(), "cossistant-release-announcement-")
	);
	tempDirs.push(workspaceDir);

	for (const [relativePath, content] of Object.entries(files)) {
		await fs.outputFile(path.join(workspaceDir, relativePath), content);
	}

	return workspaceDir;
}

function createAnnouncementContext(): AnnouncementContext {
	return {
		version: "0.2.0",
		description:
			"Script tag embeds, automatic theming, and smarter AI clarification",
		tinyExcerpt: "Script embeds and AI clarification",
		date: "2026-04-20",
		author: "Cossistant Team",
		changelogPath: "/tmp/2026-04-20-v0.2.0.mdx",
		changelogSlug: "2026-04-20-v0.2.0",
		discordAnnouncement:
			"Cossistant v0.2.0 is live.\nRead the full changelog: https://cossistant.com/changelog/2026-04-20-v0.2.0",
		xAnnouncement:
			"Cossistant v0.2.0 is out with script tag embeds.\nhttps://cossistant.com/changelog/2026-04-20-v0.2.0",
		repo: {
			owner: "cossistantcom",
			name: "cossistant-monorepo",
			fullName: "cossistantcom/cossistant-monorepo",
		},
		githubRelease: {
			id: 42,
			body: "",
			htmlUrl:
				"https://github.com/cossistantcom/cossistant-monorepo/releases/tag/%40cossistant%2Fbrowser%400.2.0",
			tagName: "@cossistant/browser@0.2.0",
			name: "@cossistant/browser v0.2.0",
		},
		links: {
			changelogUrl: "https://cossistant.com/changelog/2026-04-20-v0.2.0",
			githubReleaseUrl:
				"https://github.com/cossistantcom/cossistant-monorepo/releases/tag/%40cossistant%2Fbrowser%400.2.0",
			announcementUrl: "https://cossistant.com/changelog/2026-04-20-v0.2.0",
			announcementUrlSource: "changelog",
		},
	};
}

afterEach(async () => {
	while (tempDirs.length > 0) {
		const workspaceDir = tempDirs.pop();
		if (workspaceDir) {
			await fs.remove(workspaceDir);
		}
	}
});

describe("widget release announcement helpers", () => {
	it("loads multiline announcement frontmatter from the changelog file", async () => {
		const workspaceDir = await createWorkspace({
			"apps/web/content/changelog/2026-04-20-v0.2.0.mdx": CHANGELOG_FIXTURE,
		});

		const changelogPath = await resolveChangelogFilePath(workspaceDir, "0.2.0");
		const release = await loadChangelogRelease(workspaceDir, "0.2.0");

		expect(changelogPath.endsWith("2026-04-20-v0.2.0.mdx")).toBe(true);
		expect(release.version).toBe("0.2.0");
		expect(release.description).toContain("Script tag embeds");
		expect(release.discordAnnouncement).toContain(
			"Read the full changelog: https://cossistant.com/changelog/2026-04-20-v0.2.0"
		);
		expect(release.xAnnouncement).toContain(
			"https://cossistant.com/changelog/2026-04-20-v0.2.0"
		);
	});

	it("rejects duplicate changelog entries for the same version", async () => {
		const workspaceDir = await createWorkspace({
			"apps/web/content/changelog/2026-04-20-v0.2.0.mdx": CHANGELOG_FIXTURE,
			"apps/web/content/changelog/2026-04-21-v0.2.0.mdx": CHANGELOG_FIXTURE,
		});

		await expect(
			resolveChangelogFilePath(workspaceDir, "0.2.0")
		).rejects.toThrow("Expected exactly one changelog entry");
	});

	it("validates stored Discord and X copy and swaps in the GitHub release URL when needed", () => {
		const context = createAnnouncementContext();

		expect(
			prepareStoredDiscordAnnouncement(
				context.discordAnnouncement ?? "",
				context
			)
		).toContain(context.links.changelogUrl);
		expect(
			prepareStoredXAnnouncement(context.xAnnouncement ?? "", context)
		).toContain(context.links.changelogUrl);
		expect(() => prepareStoredXAnnouncement("Missing link", context)).toThrow(
			"x-announcement must include the changelog URL or GitHub release URL."
		);

		const fallbackContext: AnnouncementContext = {
			...context,
			links: {
				...context.links,
				announcementUrl: context.links.githubReleaseUrl,
				announcementUrlSource: "github-release",
			},
		};

		expect(
			prepareStoredDiscordAnnouncement(
				context.discordAnnouncement ?? "",
				fallbackContext
			)
		).toContain(context.links.githubReleaseUrl);
		expect(() =>
			prepareStoredXAnnouncement(
				`Cossistant update\n${"x".repeat(280)}\n${context.links.changelogUrl}`,
				context
			)
		).toThrow("x-announcement exceeds 280 characters");
	});

	it("falls back to the GitHub release URL and keeps Discord best-effort when X fails", async () => {
		const workspaceDir = await createWorkspace({
			"apps/web/content/changelog/2026-04-20-v0.2.0.mdx": CHANGELOG_FIXTURE,
		});
		const patchedBodies: string[] = [];
		let summary = "";

		const fetchImpl = (async (input, init) => {
			const url = String(input);
			if (url.includes("/releases/tags/")) {
				return new Response(
					JSON.stringify({
						id: 42,
						body: "## Browser release",
						html_url:
							"https://github.com/cossistantcom/cossistant-monorepo/releases/tag/%40cossistant%2Fbrowser%400.2.0",
						tag_name: "@cossistant/browser@0.2.0",
						name: "@cossistant/browser v0.2.0",
					}),
					{ status: 200 }
				);
			}

			if (
				url === "https://cossistant.com/changelog/2026-04-20-v0.2.0" &&
				init?.method === "HEAD"
			) {
				return new Response("missing", { status: 404 });
			}

			if (url.includes("/releases/42") && init?.method === "PATCH") {
				const body = JSON.parse(String(init.body)) as { body: string };
				patchedBodies.push(body.body);
				return new Response(JSON.stringify({ ok: true }), { status: 200 });
			}

			throw new Error(`Unexpected fetch call: ${url}`);
		}) as typeof fetch;

		const publishedDiscordAnnouncements: string[] = [];
		const result = await runWidgetReleaseAnnouncement(
			{
				version: "0.2.0",
				repo: "cossistantcom/cossistant-monorepo",
				workspaceDir,
				environment: {
					GITHUB_TOKEN: "github-token",
					DISCORD_RELEASE_WEBHOOK_URL: "https://discord.example/webhook",
				},
			},
			{
				fetchImpl,
				publishDiscordAnnouncement: async (_webhookUrl, announcement) => {
					publishedDiscordAnnouncements.push(announcement);
				},
				publishXAnnouncement: async () => {
					throw new Error("X API outage");
				},
				writeSummary: async (markdown) => {
					summary = markdown;
				},
				log: {
					log() {},
					warn() {},
					error() {},
				},
			}
		);

		expect(result.ok).toBe(false);
		expect(result.context.links.announcementUrlSource).toBe("github-release");
		expect(result.results).toHaveLength(2);
		expect(result.results[0]).toMatchObject({
			channel: "discord",
			status: "posted",
			published: true,
		});
		expect(result.results[1]).toMatchObject({
			channel: "x",
			status: "failed",
			published: false,
		});
		expect(publishedDiscordAnnouncements).toHaveLength(1);
		expect(publishedDiscordAnnouncements[0]).toContain(
			"https://github.com/cossistantcom/cossistant-monorepo/releases/tag/%40cossistant%2Fbrowser%400.2.0"
		);
		expect(patchedBodies).toHaveLength(1);
		expect(patchedBodies[0]).toContain(
			appendAnnouncementMarker("## Browser release", "discord").trim()
		);
		expect(summary).toContain("github-release");
		expect(summary).toContain("Cossistant v0.2.0 is live.");
	});

	it("uses the exact stored frontmatter copy for dry-run previews and skips marked channels", async () => {
		const customAnnouncement =
			"Edited manually before merge.\nhttps://cossistant.com/changelog/2026-04-20-v0.2.0";
		const customizedFixture = `---
version: "0.2.0"
description: "Script tag embeds, automatic theming, and smarter AI clarification"
tiny-excerpt: "Script embeds and AI clarification"
date: "2026-04-20"
author: "Cossistant Team"
discord-announcement: |
  Cossistant v0.2.0 is live.
  Script tag embeds and automatic theming are out now.
  Read the full changelog: https://cossistant.com/changelog/2026-04-20-v0.2.0
x-announcement: |
  Edited manually before merge.
  https://cossistant.com/changelog/2026-04-20-v0.2.0
---

Release summary.
`;
		const workspaceDir = await createWorkspace({
			"apps/web/content/changelog/2026-04-20-v0.2.0.mdx": customizedFixture,
		});

		const fetchImpl = (async (input, init) => {
			const url = String(input);
			if (url.includes("/releases/tags/")) {
				return new Response(
					JSON.stringify({
						id: 42,
						body: appendAnnouncementMarker("## Browser release", "discord"),
						html_url:
							"https://github.com/cossistantcom/cossistant-monorepo/releases/tag/%40cossistant%2Fbrowser%400.2.0",
						tag_name: "@cossistant/browser@0.2.0",
						name: "@cossistant/browser v0.2.0",
					}),
					{ status: 200 }
				);
			}

			if (
				url === "https://cossistant.com/changelog/2026-04-20-v0.2.0" &&
				init?.method === "HEAD"
			) {
				return new Response("", { status: 200 });
			}

			throw new Error(`Unexpected fetch call: ${url}`);
		}) as typeof fetch;

		const result = await runWidgetReleaseAnnouncement(
			{
				version: "0.2.0",
				repo: "cossistantcom/cossistant-monorepo",
				workspaceDir,
				dryRun: true,
				environment: {
					GITHUB_TOKEN: "github-token",
				},
			},
			{
				fetchImpl,
				writeSummary: async () => {},
				log: {
					log() {},
					warn() {},
					error() {},
				},
			}
		);

		expect(result.ok).toBe(true);
		expect(result.results[0]).toMatchObject({
			channel: "discord",
			status: "skipped",
		});
		expect(result.results[1]).toMatchObject({
			channel: "x",
			status: "dry-run",
			preview: customAnnouncement,
		});
	});

	it("skips channels with empty announcement frontmatter without failing the run", async () => {
		const workspaceDir = await createWorkspace({
			"apps/web/content/changelog/2026-04-20-v0.2.0.mdx":
				CHANGELOG_FIXTURE.replace(
					/x-announcement:[\s\S]*?---/,
					'x-announcement: ""\n---'
				),
		});

		const fetchImpl = (async (input) => {
			const url = String(input);
			if (url.includes("/releases/tags/")) {
				return new Response(
					JSON.stringify({
						id: 42,
						body: "",
						html_url:
							"https://github.com/cossistantcom/cossistant-monorepo/releases/tag/%40cossistant%2Fbrowser%400.2.0",
						tag_name: "@cossistant/browser@0.2.0",
						name: "@cossistant/browser v0.2.0",
					}),
					{ status: 200 }
				);
			}

			if (url === "https://cossistant.com/changelog/2026-04-20-v0.2.0") {
				return new Response("", { status: 200 });
			}

			throw new Error(`Unexpected fetch call: ${url}`);
		}) as typeof fetch;

		const result = await runWidgetReleaseAnnouncement(
			{
				version: "0.2.0",
				repo: "cossistantcom/cossistant-monorepo",
				workspaceDir,
				dryRun: true,
				environment: {
					GITHUB_TOKEN: "github-token",
				},
			},
			{
				fetchImpl,
				writeSummary: async () => {},
				log: {
					log() {},
					warn() {},
					error() {},
				},
			}
		);

		expect(result.ok).toBe(true);
		expect(result.results[0]?.status).toBe("dry-run");
		expect(result.results[1]).toMatchObject({
			channel: "x",
			status: "skipped",
		});
		expect(result.results[1]?.message).toContain(
			"Skipped because the changelog frontmatter is empty"
		);
	});

	it("builds OAuth1 auth with the X dashboard consumer env vars", () => {
		const oauth1 = buildXOAuth1({
			X_CONSUMER_KEY: "consumer-key",
			X_CONSUMER_KEY_SECRET: "consumer-secret",
			X_ACCESS_TOKEN: "access-token",
			X_ACCESS_TOKEN_SECRET: "access-token-secret",
		});
		const config = (oauth1 as any).config as {
			apiKey: string;
			apiSecret: string;
			callback: string;
			accessToken: string;
			accessTokenSecret: string;
		};

		expect(config).toEqual({
			apiKey: "consumer-key",
			apiSecret: "consumer-secret",
			callback: "oob",
			accessToken: "access-token",
			accessTokenSecret: "access-token-secret",
		});
	});

	it("reports missing X consumer env vars with the renamed keys", () => {
		expect(() =>
			buildXOAuth1({
				X_CONSUMER_KEY: "consumer-key",
				X_ACCESS_TOKEN: "access-token",
				X_ACCESS_TOKEN_SECRET: "access-token-secret",
			})
		).toThrow("X_CONSUMER_KEY_SECRET environment variable is required.");
	});
});
