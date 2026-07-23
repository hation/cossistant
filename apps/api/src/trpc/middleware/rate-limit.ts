import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../init";

/**
 * Rate limiting middleware for TRPC procedures
 * Note: The actual rate limiting is now handled at the Hono middleware level
 * This is kept for TRPC-specific rate limiting if needed
 */
export const withRateLimitMiddleware = async (opts: {
	ctx: TRPCContext;
	// biome-ignore lint/suspicious/noExplicitAny: ok here
	next: () => Promise<any>;
}) => {
	// Rate limiting is now handled at the Hono level
	// This middleware can be used for additional TRPC-specific rate limiting
	// For example, you could implement user-based or procedure-specific limits here

	// For now, just pass through to the next middleware
	// The Hono rate limiter will have already applied limits before we get here
	return opts.next();
};
