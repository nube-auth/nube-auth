import type { Session } from "@proofa/shared";
import { getRedisClient } from "./client.js";

/**
 * Rate limit check
 * Returns true if rate limit is exceeded
 *
 * @param key Identifier for rate limiting
 * @param limit Maximum number of requests
 * @param window Time window in seconds
 * @returns true if rate limited, false otherwise
 */
export async function rateLimit(key: string, limit: number, window: number): Promise<boolean> {
	const redis = getRedisClient();
	const fullKey = `ratelimit:${key}`;

	try {
		const current = await redis.incr(fullKey);

		if (current === 1) {
			// First request in this window, set expiry
			await redis.expire(fullKey, window);
		}

		return current > limit;
	} catch (error) {
		console.error("Rate limit check failed:", error);
		return false; // Fail open - don't block on Redis errors
	}
}

/**
 * Get value from cache
 *
 * @param key Cache key
 * @returns Cached value or null
 */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
	const redis = getRedisClient();
	const fullKey = `cache:${key}`;

	try {
		const value = await redis.get(fullKey);
		return value ? (JSON.parse(value as string) as T) : null;
	} catch (error) {
		console.error("Cache get failed:", error);
		return null;
	}
}

/**
 * Set value in cache
 *
 * @param key Cache key
 * @param value Value to cache
 * @param ttlSeconds TTL in seconds
 */
export async function cacheSet<T = unknown>(key: string, value: T, ttlSeconds: number): Promise<void> {
	const redis = getRedisClient();
	const fullKey = `cache:${key}`;

	try {
		const serialized = typeof value === "string" ? value : JSON.stringify(value);
		await redis.setex(fullKey, ttlSeconds, serialized);
	} catch (error) {
		console.error("Cache set failed:", error);
	}
}

/**
 * Get session from cache
 *
 * @param sessionId Session identifier
 * @returns Session data or null
 */
export async function sessionGet(sessionId: string): Promise<Session | null> {
	const redis = getRedisClient();
	const fullKey = `session:${sessionId}`;

	try {
		const value = await redis.get(fullKey);
		return value ? (JSON.parse(value as string) as Session) : null;
	} catch (error) {
		console.error("Session get failed:", error);
		return null;
	}
}

/**
 * Store session in cache
 *
 * @param sessionId Session identifier
 * @param session Session data
 * @param ttlSeconds TTL in seconds
 */
export async function sessionSet(sessionId: string, session: Session, ttlSeconds: number): Promise<void> {
	const redis = getRedisClient();
	const fullKey = `session:${sessionId}`;

	try {
		const serialized = JSON.stringify(session);
		await redis.setex(fullKey, ttlSeconds, serialized);
	} catch (error) {
		console.error("Session set failed:", error);
	}
}
