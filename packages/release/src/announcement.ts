import path from "node:path";
import { Client, OAuth1 } from "@xdevplatform/xdk";
import fs from "fs-extra";
import { parse as parseYaml } from "yaml";

export const DEFAULT_CHANGELOG_BASE_URL = "https://cossistant.com";
export const BROWSER_PACKAGE_NAME = "@cossistant/browser";
export const X_POST_CHAR_LIMIT = 280;
export const DISCORD_MESSAGE_CHAR_LIMIT = 2000;

const GITHUB_API_BASE_URL = "https://api.github.com";
const ANNOUNCEMENT_MARKERS = {
	discord: "<!-- cossistant:release-announcement:discord -->",
	x: "<!-- cossistant:release-announcement:x -->",
} as const;
const MAX_GITHUB_RELEASE_LOOKUP_ATTEMPTS = 3;

export type AnnouncementChannel = keyof typeof ANNOUNCEMENT_MARKERS;

export type ChangelogRelease = {
	version: string;
	description: string;
	tinyExcerpt: string;
	date: string;
	author: string;
	changelogPath: string;
	changelogSlug: string;
	discordAnnouncement?: string;
	xAnnouncement?: string;
};

export type RepoRef = {
	owner: string;
	name: string;
	fullName: string;
};

export type GitHubRelease = {
	id: number;
	body: string;
	htmlUrl: string;
	tagName: string;
	name: string;
};

export type AnnouncementLinks = {
	changelogUrl: string;
	githubReleaseUrl: string;
	announcementUrl: string;
	announcementUrlSource: "changelog" | "github-release";
};

export type AnnouncementContext = ChangelogRelease & {
	repo: RepoRef;
	githubRelease: GitHubRelease;
	links: AnnouncementLinks;
};

export type ChannelResult = {
	channel: AnnouncementChannel;
	status: "posted" | "skipped" | "dry-run" | "failed";
	message: string;
	preview: string;
	published: boolean;
};

export type RunWidgetReleaseAnnouncementOptions = {
	version: string;
	repo: string;
	dryRun?: boolean;
	workspaceDir?: string;
	environment?: Record<string, string | undefined>;
};

export type RunWidgetReleaseAnnouncementDependencies = {
	fetchImpl: typeof fetch;
	publishDiscordAnnouncement: (
		webhookUrl: string,
		announcement: string,
		fetchImpl: typeof fetch
	) => Promise<void>;
	publishXAnnouncement: (
		announcement: string,
		environment: Record<string, string | undefined>
	) => Promise<void>;
	writeSummary: (markdown: string) => Promise<void>;
	log: Pick<Console, "log" | "warn" | "error">;
};

export type RunWidgetReleaseAnnouncementResult = {
	ok: boolean;
	context: AnnouncementContext;
	results: ChannelResult[];
	summary: string;
};

type ChannelAnnouncementState = {
	announcement: string | null;
	skipMessage?: string;
	skipPreview?: string;
};

type Frontmatter = {
	version?: string;
	description?: string;
	date?: string;
	author?: string;
	"tiny-excerpt"?: string;
	"discord-announcement"?: string;
	"x-announcement"?: string;
};

type GitHubReleaseApiResponse = {
	id: number;
	body?: string | null;
	html_url: string;
	tag_name: string;
	name: string;
};

export function parseRepoRef(repo: string): RepoRef {
	const [owner, name, ...rest] = repo.split("/");

	if (!(owner && name) || rest.length > 0) {
		throw new Error(
			`Expected repo in owner/name form, received "${repo || "<empty>"}".`
		);
	}

	return {
		owner,
		name,
		fullName: `${owner}/${name}`,
	};
}

export function getBrowserReleaseTag(version: string): string {
	return `${BROWSER_PACKAGE_NAME}@${version}`;
}

export function buildFallbackGitHubReleaseUrl(
	repo: RepoRef,
	releaseTag: string
): string {
	return `https://github.com/${repo.fullName}/releases/tag/${encodeURIComponent(releaseTag)}`;
}

export async function resolveChangelogFilePath(
	workspaceDir: string,
	version: string
): Promise<string> {
	const changelogDir = path.join(workspaceDir, "apps/web/content/changelog");

	if (!(await fs.pathExists(changelogDir))) {
		throw new Error(`Changelog directory not found: ${changelogDir}`);
	}

	const suffix = `-v${version}.mdx`;
	const matches = (await fs.readdir(changelogDir))
		.filter((filename) => filename.endsWith(suffix))
		.sort();

	if (matches.length === 0) {
		throw new Error(
			`No changelog entry found for version ${version} in ${changelogDir}.`
		);
	}

	if (matches.length > 1) {
		throw new Error(
			`Expected exactly one changelog entry for version ${version}, found ${matches.length}: ${matches.join(", ")}`
		);
	}

	return path.join(changelogDir, matches[0] ?? "");
}

export function parseFrontmatter(content: string): {
	frontmatter: Frontmatter;
	body: string;
} {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

	if (!match) {
		throw new Error("Expected changelog file to start with frontmatter.");
	}

	const rawFrontmatter = match[1] ?? "";
	const body = match[2] ?? "";

	try {
		const frontmatter = (parseYaml(rawFrontmatter) ?? {}) as Frontmatter;
		return { frontmatter, body };
	} catch (error) {
		throw new Error(
			`Failed to parse changelog frontmatter: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

export function parseChangelogRelease(
	content: string,
	changelogPath: string
): ChangelogRelease {
	const { frontmatter } = parseFrontmatter(content);
	const version = frontmatter.version?.trim();
	const description = frontmatter.description?.trim();
	const date = frontmatter.date?.trim();
	const author = frontmatter.author?.trim() ?? "Cossistant Team";

	if (!version) {
		throw new Error(
			`Missing "version" in changelog frontmatter: ${changelogPath}`
		);
	}

	if (!description) {
		throw new Error(
			`Missing "description" in changelog frontmatter: ${changelogPath}`
		);
	}

	if (!date) {
		throw new Error(
			`Missing "date" in changelog frontmatter: ${changelogPath}`
		);
	}

	return {
		version,
		description,
		tinyExcerpt:
			frontmatter["tiny-excerpt"]?.trim() || "New widget release available",
		date,
		author,
		changelogPath,
		changelogSlug: path.basename(changelogPath, ".mdx"),
		discordAnnouncement: frontmatter["discord-announcement"],
		xAnnouncement: frontmatter["x-announcement"],
	};
}

export async function loadChangelogRelease(
	workspaceDir: string,
	version: string
): Promise<ChangelogRelease> {
	const changelogPath = await resolveChangelogFilePath(workspaceDir, version);
	const content = await fs.readFile(changelogPath, "utf-8");
	return parseChangelogRelease(content, changelogPath);
}

function normalizeBaseUrl(rawUrl: string | undefined): string {
	const candidate = rawUrl?.trim() || DEFAULT_CHANGELOG_BASE_URL;
	return candidate.replace(/\/+$/, "");
}

export function buildChangelogUrl(
	baseUrl: string | undefined,
	slug: string
): string {
	return `${normalizeBaseUrl(baseUrl)}/changelog/${slug}`;
}

export async function isUrlReachable(
	url: string,
	fetchImpl: typeof fetch
): Promise<boolean> {
	try {
		const headResponse = await fetchImpl(url, {
			method: "HEAD",
			redirect: "follow",
		});

		if (headResponse.ok) {
			return true;
		}

		if (![405, 501].includes(headResponse.status)) {
			return false;
		}
	} catch {
		// Ignore HEAD failures and fall back to GET below.
	}

	try {
		const getResponse = await fetchImpl(url, {
			method: "GET",
			redirect: "follow",
		});
		return getResponse.ok;
	} catch {
		return false;
	}
}

export async function resolveAnnouncementLinks(options: {
	baseUrl?: string;
	changelogSlug: string;
	githubReleaseUrl: string;
	fetchImpl: typeof fetch;
}): Promise<AnnouncementLinks> {
	const changelogUrl = buildChangelogUrl(
		options.baseUrl,
		options.changelogSlug
	);
	const changelogAvailable = await isUrlReachable(
		changelogUrl,
		options.fetchImpl
	);

	return {
		changelogUrl,
		githubReleaseUrl: options.githubReleaseUrl,
		announcementUrl: changelogAvailable
			? changelogUrl
			: options.githubReleaseUrl,
		announcementUrlSource: changelogAvailable ? "changelog" : "github-release",
	};
}

export function hasAnnouncementMarker(
	body: string,
	channel: AnnouncementChannel
): boolean {
	return body.includes(ANNOUNCEMENT_MARKERS[channel]);
}

export function appendAnnouncementMarker(
	body: string,
	channel: AnnouncementChannel
): string {
	if (hasAnnouncementMarker(body, channel)) {
		return body;
	}

	const trimmedBody = body.trimEnd();
	const separator = trimmedBody ? "\n\n" : "";
	return `${trimmedBody}${separator}${ANNOUNCEMENT_MARKERS[channel]}\n`;
}

function getRequiredEnv(
	environment: Record<string, string | undefined>,
	key: string
): string {
	const value = environment[key]?.trim();
	if (!value) {
		throw new Error(`${key} environment variable is required.`);
	}
	return value;
}

function normalizeStoredAnnouncementText(text: string): string {
	return text.replace(/\r\n/g, "\n").trim();
}

function getChannelAnnouncementState(
	channel: AnnouncementChannel,
	storedAnnouncement: string | undefined,
	context: AnnouncementContext
): ChannelAnnouncementState {
	const normalized = storedAnnouncement
		? normalizeStoredAnnouncementText(storedAnnouncement)
		: "";

	if (!normalized) {
		return {
			announcement: null,
			skipMessage:
				"Skipped because the changelog frontmatter is empty for this channel.",
			skipPreview:
				"No content stored in changelog frontmatter, so nothing was published.",
		};
	}

	const announcement =
		channel === "discord"
			? prepareStoredDiscordAnnouncement(normalized, context)
			: prepareStoredXAnnouncement(normalized, context);

	return { announcement };
}

function hasAnyReleaseLink(
	text: string,
	context: AnnouncementContext
): boolean {
	return (
		text.includes(context.links.changelogUrl) ||
		text.includes(context.links.githubReleaseUrl)
	);
}

function applyAnnouncementUrlFallback(
	text: string,
	context: AnnouncementContext
): string {
	if (context.links.announcementUrlSource !== "github-release") {
		return text;
	}

	return text.replaceAll(
		context.links.changelogUrl,
		context.links.githubReleaseUrl
	);
}

export function prepareStoredDiscordAnnouncement(
	text: string,
	context: AnnouncementContext
): string {
	const normalized = normalizeStoredAnnouncementText(text);

	if (!normalized) {
		throw new Error("Missing discord-announcement frontmatter.");
	}

	if (!hasAnyReleaseLink(normalized, context)) {
		throw new Error(
			"discord-announcement must include the changelog URL or GitHub release URL."
		);
	}

	const announcement = applyAnnouncementUrlFallback(normalized, context);

	if (announcement.length > DISCORD_MESSAGE_CHAR_LIMIT) {
		throw new Error(
			`discord-announcement exceeds ${DISCORD_MESSAGE_CHAR_LIMIT} characters.`
		);
	}

	return announcement;
}

export function prepareStoredXAnnouncement(
	text: string,
	context: AnnouncementContext
): string {
	const normalized = normalizeStoredAnnouncementText(text);

	if (!normalized) {
		throw new Error("Missing x-announcement frontmatter.");
	}

	if (!hasAnyReleaseLink(normalized, context)) {
		throw new Error(
			"x-announcement must include the changelog URL or GitHub release URL."
		);
	}

	const announcement = applyAnnouncementUrlFallback(normalized, context);

	if (announcement.length > X_POST_CHAR_LIMIT) {
		throw new Error(
			`x-announcement exceeds ${X_POST_CHAR_LIMIT} characters after link normalization.`
		);
	}

	return announcement;
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseGitHubError(response: Response): Promise<string> {
	const text = await response.text();
	return text.trim() || `GitHub API responded with ${response.status}`;
}

export async function fetchGitHubReleaseByTag(options: {
	repo: RepoRef;
	releaseTag: string;
	githubToken: string;
	fetchImpl: typeof fetch;
}): Promise<GitHubRelease> {
	const url = `${GITHUB_API_BASE_URL}/repos/${options.repo.fullName}/releases/tags/${encodeURIComponent(options.releaseTag)}`;

	for (
		let attempt = 1;
		attempt <= MAX_GITHUB_RELEASE_LOOKUP_ATTEMPTS;
		attempt += 1
	) {
		const response = await options.fetchImpl(url, {
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${options.githubToken}`,
				"User-Agent": "cossistant-release-announcer",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});

		if (response.ok) {
			const json =
				(await response.json()) as unknown as GitHubReleaseApiResponse;

			return {
				id: json.id,
				body: json.body ?? "",
				htmlUrl: json.html_url,
				tagName: json.tag_name,
				name: json.name,
			};
		}

		if (
			response.status === 404 &&
			attempt < MAX_GITHUB_RELEASE_LOOKUP_ATTEMPTS
		) {
			await sleep(1000 * attempt);
			continue;
		}

		throw new Error(await parseGitHubError(response));
	}

	throw new Error(
		`GitHub release ${options.releaseTag} could not be resolved after retries.`
	);
}

export async function updateGitHubReleaseBody(options: {
	repo: RepoRef;
	releaseId: number;
	body: string;
	githubToken: string;
	fetchImpl: typeof fetch;
}): Promise<void> {
	const url = `${GITHUB_API_BASE_URL}/repos/${options.repo.fullName}/releases/${options.releaseId}`;
	const response = await options.fetchImpl(url, {
		method: "PATCH",
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${options.githubToken}`,
			"Content-Type": "application/json",
			"User-Agent": "cossistant-release-announcer",
			"X-GitHub-Api-Version": "2022-11-28",
		},
		body: JSON.stringify({
			body: options.body,
		}),
	});

	if (!response.ok) {
		throw new Error(await parseGitHubError(response));
	}
}

export async function publishDiscordAnnouncement(
	webhookUrl: string,
	announcement: string,
	fetchImpl: typeof fetch
): Promise<void> {
	const url = webhookUrl.includes("?")
		? `${webhookUrl}&wait=true`
		: `${webhookUrl}?wait=true`;
	const response = await fetchImpl(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			content: announcement,
			allowed_mentions: {
				parse: [],
			},
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`Discord webhook failed with ${response.status}: ${text.trim() || response.statusText}`
		);
	}
}

export async function publishXAnnouncement(
	announcement: string,
	environment: Record<string, string | undefined>
): Promise<void> {
	const client = new Client({
		oauth1: buildXOAuth1(environment),
	});
	await client.posts.create({
		text: announcement,
	});
}

export function buildXOAuth1(
	environment: Record<string, string | undefined>
): OAuth1 {
	return new OAuth1({
		apiKey: getRequiredEnv(environment, "X_CONSUMER_KEY"),
		apiSecret: getRequiredEnv(environment, "X_CONSUMER_KEY_SECRET"),
		callback: "oob",
		accessToken: getRequiredEnv(environment, "X_ACCESS_TOKEN"),
		accessTokenSecret: getRequiredEnv(environment, "X_ACCESS_TOKEN_SECRET"),
	});
}

function renderSummary(result: RunWidgetReleaseAnnouncementResult): string {
	const lines = [
		"## Widget Release Announcements",
		"",
		`- Version: ${result.context.version}`,
		`- Changelog entry: ${result.context.changelogSlug}`,
		`- Announcement link: ${result.context.links.announcementUrl} (${result.context.links.announcementUrlSource})`,
		"",
	];

	for (const channelResult of result.results) {
		lines.push(
			`- ${channelResult.channel}: ${channelResult.status}${channelResult.published ? " (published)" : ""} - ${channelResult.message}`
		);
	}

	for (const channelResult of result.results) {
		lines.push(
			"",
			`<details><summary>${channelResult.channel.toUpperCase()} Preview</summary>`,
			"",
			"```text",
			channelResult.preview,
			"```",
			"</details>"
		);
	}

	lines.push("");
	return lines.join("\n");
}

async function defaultWriteSummary(markdown: string): Promise<void> {
	const summaryPath = process.env.GITHUB_STEP_SUMMARY?.trim();

	if (!summaryPath) {
		return;
	}

	await fs.appendFile(summaryPath, `${markdown}\n`);
}

export async function runWidgetReleaseAnnouncement(
	options: RunWidgetReleaseAnnouncementOptions,
	dependencies: Partial<RunWidgetReleaseAnnouncementDependencies> = {}
): Promise<RunWidgetReleaseAnnouncementResult> {
	const environment = options.environment ?? process.env;
	const fetchImpl = dependencies.fetchImpl ?? fetch;
	const log = dependencies.log ?? console;
	const workspaceDir = path.resolve(options.workspaceDir ?? process.cwd());
	const repo = parseRepoRef(options.repo);
	const changelogRelease = await loadChangelogRelease(
		workspaceDir,
		options.version
	);
	const releaseTag = getBrowserReleaseTag(changelogRelease.version);
	const githubToken = environment.GITHUB_TOKEN?.trim();

	let githubRelease: GitHubRelease;
	if (githubToken) {
		githubRelease = await fetchGitHubReleaseByTag({
			repo,
			releaseTag,
			githubToken,
			fetchImpl,
		});
	} else if (options.dryRun) {
		githubRelease = {
			id: 0,
			body: "",
			htmlUrl: buildFallbackGitHubReleaseUrl(repo, releaseTag),
			tagName: releaseTag,
			name: `${BROWSER_PACKAGE_NAME} v${changelogRelease.version}`,
		};
	} else {
		throw new Error("GITHUB_TOKEN environment variable is required.");
	}

	const links = await resolveAnnouncementLinks({
		baseUrl: environment.ANNOUNCEMENT_CHANGELOG_BASE_URL,
		changelogSlug: changelogRelease.changelogSlug,
		githubReleaseUrl: githubRelease.htmlUrl,
		fetchImpl,
	});

	const context: AnnouncementContext = {
		...changelogRelease,
		repo,
		githubRelease,
		links,
	};

	let currentReleaseBody = githubRelease.body;
	const results: ChannelResult[] = [];

	const channels: AnnouncementChannel[] = ["discord", "x"];

	for (const channel of channels) {
		if (hasAnnouncementMarker(currentReleaseBody, channel)) {
			results.push({
				channel,
				status: "skipped",
				message: "Already marked as announced on the GitHub release.",
				preview:
					"Skipped because the GitHub release body already contains the announcement marker.",
				published: false,
			});
			continue;
		}

		try {
			const storedAnnouncement =
				channel === "discord"
					? context.discordAnnouncement
					: context.xAnnouncement;
			const channelState = getChannelAnnouncementState(
				channel,
				storedAnnouncement,
				context
			);

			if (!channelState.announcement) {
				results.push({
					channel,
					status: "skipped",
					message:
						channelState.skipMessage ??
						"Skipped because no changelog frontmatter was stored.",
					preview:
						channelState.skipPreview ??
						"No content stored in changelog frontmatter.",
					published: false,
				});
				continue;
			}

			const announcement = channelState.announcement;

			if (options.dryRun) {
				results.push({
					channel,
					status: "dry-run",
					message: "Validated stored changelog copy without publishing.",
					preview: announcement,
					published: false,
				});
				continue;
			}

			if (channel === "discord") {
				const webhookUrl = getRequiredEnv(
					environment,
					"DISCORD_RELEASE_WEBHOOK_URL"
				);
				await (
					dependencies.publishDiscordAnnouncement ?? publishDiscordAnnouncement
				)(webhookUrl, announcement, fetchImpl);
			} else {
				await (dependencies.publishXAnnouncement ?? publishXAnnouncement)(
					announcement,
					environment
				);
			}

			if (!githubToken) {
				throw new Error(
					"GITHUB_TOKEN environment variable is required to persist announcement markers."
				);
			}

			const nextReleaseBody = appendAnnouncementMarker(
				currentReleaseBody,
				channel
			);
			try {
				await updateGitHubReleaseBody({
					repo,
					releaseId: githubRelease.id,
					body: nextReleaseBody,
					githubToken,
					fetchImpl,
				});
				currentReleaseBody = nextReleaseBody;
				results.push({
					channel,
					status: "posted",
					message: "Published stored changelog copy successfully.",
					preview: announcement,
					published: true,
				});
				log.log(
					`Published ${channel} announcement for widget v${context.version}.`
				);
			} catch (error) {
				results.push({
					channel,
					status: "failed",
					message: `Published, but failed to persist the GitHub marker: ${error instanceof Error ? error.message : String(error)}`,
					preview: announcement,
					published: true,
				});
			}
		} catch (error) {
			results.push({
				channel,
				status: "failed",
				message: error instanceof Error ? error.message : String(error),
				preview: "No preview generated.",
				published: false,
			});
			log.error(
				`Failed to publish ${channel} announcement for widget v${context.version}:`,
				error
			);
		}
	}

	const ok = results.every((result) => result.status !== "failed");
	const output: RunWidgetReleaseAnnouncementResult = {
		ok,
		context,
		results,
		summary: "",
	};
	output.summary = renderSummary(output);
	await (dependencies.writeSummary ?? defaultWriteSummary)(output.summary);

	return output;
}
