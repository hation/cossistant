import type { RedisOptions } from "ioredis";
import { Redis } from "ioredis";

export type RedisClient = Redis;

const MAX_RECONNECT_DELAY_MS = 30_000;

function baseRedisOptions(): Pick<
	RedisOptions,
	| "maxRetriesPerRequest"
	| "enableAutoPipelining"
	| "retryStrategy"
	| "reconnectOnError"
	| "family"
> {
	return {
		family: 0,
		maxRetriesPerRequest: null,
		enableAutoPipelining: true,
		retryStrategy: (attempt: number) =>
			Math.min(1000 * 2 ** attempt, MAX_RECONNECT_DELAY_MS),
		reconnectOnError: (error: Error) => {
			console.error("[redis] reconnect on error", error);
			return true;
		},
	};
}

function parseRedisUrl(
	url: string
): Omit<
	RedisOptions,
	| "maxRetriesPerRequest"
	| "enableAutoPipelining"
	| "retryStrategy"
	| "reconnectOnError"
> {
	const parsed = new URL(url);

	const dbPath = parsed.pathname?.replace("/", "");
	const db = dbPath === "" ? undefined : Number.parseInt(dbPath ?? "", 10);

	const options: RedisOptions = {
		host: parsed.hostname,
		port: parsed.port ? Number.parseInt(parsed.port, 10) : undefined,
		username: parsed.username || undefined,
		password: parsed.password || undefined,
		db: Number.isNaN(db) ? undefined : db,
	};

	if (parsed.protocol === "rediss:") {
		options.tls = {};
	}

	return options;
}

export function getRedisConnectionOptions(url: string): RedisOptions {
	return {
		...parseRedisUrl(url),
		...baseRedisOptions(),
	};
}

/**
 * BullMQ accepts plain ioredis connection options. This helper keeps workers and
 * producers in sync with the exact same configuration knobs Bull expects.
 */
export function getBullConnectionOptions(url: string): RedisOptions {
	return getRedisConnectionOptions(url);
}

export function getSafeRedisUrl(url: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.password) {
			parsed.password = "******";
		}
		return parsed.toString();
	} catch {
		return url;
	}
}

/**
 * Create a new Redis connection
 * Each caller gets its own connection instance - no shared global state.
 */
export function createRedisConnection(url: string): Redis {
	const redis = new Redis(getRedisConnectionOptions(url));

	redis.on("error", (error: Error) => {
		console.error("[redis] error", error);
	});

	redis.on("ready", () => {
		console.log("[redis] Connected to Redis successfully");
	});

	return redis;
}
