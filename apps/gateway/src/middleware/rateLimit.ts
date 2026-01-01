import { cache } from "@proofa/cache";
import { createLogger } from "@proofa/shared";
import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";

const log = createLogger("rate-limit");

export interface RateLimitOptions {
	/** Maximum number of requests allowed in the window */
	maxRequests: number;
	/** Time window in seconds */
	windowSeconds: number;
	/** Optional custom key prefix */
	keyPrefix?: string;
	/** Optional custom identifier function (defaults to IP) */
	identifier?: (c: Context) => string | Promise<string>;
}

/**
 * Rate limiting middleware using Redis sliding window
 *
 * @example
 * // Limit auth endpoints to 10 requests per 5 minutes
 * app.use('/v1/auth/*', rateLimitMiddleware({
 *   maxRequests: 10,
 *   windowSeconds: 300,
 * }));
 */
export function rateLimitMiddleware(options: RateLimitOptions) {
	const { maxRequests, windowSeconds, keyPrefix = "rate-limit", identifier } = options;

	return createMiddleware(async (c: Context, next: Next): Promise<Response | undefined> => {
		try {
			// Get identifier (IP address by default)
			const id = identifier ? await identifier(c) : getClientIp(c);

			if (!id) {
				log.warn("No identifier found for rate limiting, allowing request");
				await next();
				return;
			}

			// Create Redis key
			const path = c.req.path;
			const key = `${keyPrefix}:${id}:${path}`;

			// Increment counter
			const current = await cache.increment(key, 1);

			// Set expiry on first request
			if (current === 1) {
				await cache.setTTL(key, windowSeconds);
			}

			// Get TTL for rate limit reset time
			const ttl = await cache.ttl(key);
			const resetTime = Date.now() + ttl * 1000;

			// Set rate limit headers
			c.header("X-RateLimit-Limit", maxRequests.toString());
			c.header("X-RateLimit-Remaining", Math.max(0, maxRequests - current).toString());
			c.header("X-RateLimit-Reset", resetTime.toString());

			// Check if limit exceeded
			if (current > maxRequests) {
				log.warn({ id, path, current, maxRequests }, "Rate limit exceeded");

				c.header("Retry-After", ttl.toString());

				return c.json(
					{
						error: "Too many requests",
						message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
						retryAfter: ttl,
					},
					429,
				);
			}

			// Log if approaching limit
			if (current > maxRequests * 0.8) {
				log.debug({ id, path, current, maxRequests }, "Approaching rate limit");
			}

			await next();
			return;
		} catch (error) {
			// Don't block requests if rate limiting fails
			log.error({ err: error }, "Rate limiting error, allowing request");
			await next();
			return;
		}
	});
}

/**
 * Get client IP address from request headers
 * Checks common headers in order of preference
 */
function getClientIp(c: Context): string | null {
	// Cloudflare
	const cfConnectingIp = c.req.header("cf-connecting-ip");
	if (cfConnectingIp) return cfConnectingIp;

	// Standard forwarded headers
	const xForwardedFor = c.req.header("x-forwarded-for");
	if (xForwardedFor) {
		// Take first IP if multiple
		const firstIp = xForwardedFor.split(",")[0];
		return firstIp ? firstIp.trim() : null;
	}

	// Other common headers
	const xRealIp = c.req.header("x-real-ip");
	if (xRealIp) return xRealIp;

	// Fallback to "unknown" for local development
	return "unknown";
}

/**
 * Preset rate limiters for common use cases
 */
export const rateLimitPresets = {
	/** Strict rate limit for authentication endpoints (10 req/5min) */
	auth: rateLimitMiddleware({
		maxRequests: 10,
		windowSeconds: 300,
		keyPrefix: "rate-limit:auth",
	}),

	/** Medium rate limit for API endpoints (100 req/min) */
	api: rateLimitMiddleware({
		maxRequests: 100,
		windowSeconds: 60,
		keyPrefix: "rate-limit:api",
	}),

	/** Generous rate limit for public endpoints (1000 req/min) */
	public: rateLimitMiddleware({
		maxRequests: 1000,
		windowSeconds: 60,
		keyPrefix: "rate-limit:public",
	}),

	/** Very strict rate limit for sensitive operations (3 req/hour) */
	sensitive: rateLimitMiddleware({
		maxRequests: 3,
		windowSeconds: 3600,
		keyPrefix: "rate-limit:sensitive",
	}),
};

/**
 * Check current rate limit status without incrementing
 */
export async function checkRateLimit(
	identifier: string,
	keyPrefix: string,
): Promise<{ current: number; remaining: number; resetAt: number }> {
	const key = `${keyPrefix}:${identifier}`;
	const current = parseInt((await cache.get(key)) || "0", 10);
	const ttl = await cache.ttl(key);
	const resetAt = Date.now() + ttl * 1000;

	return {
		current,
		remaining: 0, // Would need max from config
		resetAt,
	};
}

/**
 * Clear rate limit for a specific identifier
 * Useful for admin operations or testing
 */
export async function clearRateLimit(identifier: string, keyPrefix: string): Promise<void> {
	const pattern = `${keyPrefix}:${identifier}:*`;
	const keys = await cache.keys(pattern);

	if (keys.length > 0) {
		await cache.deleteMany(keys);
		log.info({ identifier, keyPrefix, count: keys.length }, "Rate limits cleared");
	}
}
