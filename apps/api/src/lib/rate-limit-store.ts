import { env } from "@api/env";
import type { Store } from "hono-rate-limiter";
import RedisStore, { type RedisReply } from "rate-limit-redis";
import { getRedis, waitForRedis } from "../redis";

/**
 * Create a Redis store for hono-rate-limiter using ioredis so that multiple
 * API replicas can share throttling state.
 */
export function createRedisRateLimitStore(): Store {
	if (!env.REDIS_URL) {
		throw new Error("REDIS_URL is not configured");
	}

	const redisClient = getRedis();
	const connectPromise = waitForRedis().catch((error) => {
		console.error("Redis rate limit connect error:", error);
		throw error;
	});

	const store = new RedisStore({
		sendCommand: async (command: string, ...args: string[]) => {
			try {
				await connectPromise;
				return (await redisClient.call(command, ...args)) as RedisReply;
			} catch (error) {
				console.error("Redis rate limit command error:", error);
				throw error;
			}
		},
		prefix: "rate-limit:",
	});

	return store as unknown as Store;
}

/**
 * Create an in-memory fallback store for development
 */
export function createMemoryRateLimitStore(): Store {
	// This will use the default MemoryStore from hono-rate-limiter
	return undefined as unknown as Store; // Let hono-rate-limiter use its default
}

/**
 * Get the appropriate rate limit store based on environment
 */
export function getRateLimitStore(): Store | undefined {
	// Use Redis in production, memory store in development
	if (env.NODE_ENV === "production" || env.REDIS_URL) {
		try {
			return createRedisRateLimitStore();
		} catch (error) {
			console.error("Failed to create Redis rate limit store:", error);
			console.warn("Falling back to memory store");
			return; // Fall back to default memory store
		}
	}

	// In development without Redis, use memory store
	return; // Use default memory store
}
