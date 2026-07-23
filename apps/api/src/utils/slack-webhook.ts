import { env } from "@api/env";

type SlackWebhookBlock = Record<string, unknown>;

export async function postSlackWebhookMessage(params: {
	text: string;
	webhookUrl?: string;
	blocks?: SlackWebhookBlock[];
	unfurlLinks?: boolean;
	unfurlMedia?: boolean;
}) {
	const webhookUrl = (params.webhookUrl ?? env.SLACK_WEBHOOK_URL).trim();

	if (!webhookUrl) {
		throw new Error("Slack webhook URL is not configured.");
	}

	const response = await fetch(webhookUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			text: params.text,
			blocks: params.blocks,
			unfurl_links: params.unfurlLinks ?? false,
			unfurl_media: params.unfurlMedia ?? false,
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(
			`Slack webhook request failed with ${response.status}: ${body || "unknown error"}`
		);
	}
}
