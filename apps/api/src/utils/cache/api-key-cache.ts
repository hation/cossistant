import type { Database } from "@api/db";
import { apiKey } from "@api/db/schema";
import { eq } from "drizzle-orm";

export const API_KEY_CACHE_TAG = "api-key" as const;

export const getApiKeyCacheTagForKey = (key: string) =>
	`${API_KEY_CACHE_TAG}:${key}`;

export async function invalidateApiKeyCacheForWebsite(
	db: Database,
	websiteId: string
): Promise<void> {
	const keys = await db
		.select({ key: apiKey.key })
		.from(apiKey)
		.where(eq(apiKey.websiteId, websiteId));

	if (keys.length === 0) {
		return;
	}

	const keyTags = keys
		.map(({ key }) => key)
		.filter(
			(value): value is string => typeof value === "string" && value.length > 0
		)
		.map((value) => getApiKeyCacheTagForKey(value));

	if (keyTags.length === 0) {
		return;
	}

	const uniqueTags = Array.from(new Set(keyTags));

	await db.$cache.invalidate({ tags: uniqueTags });
}
