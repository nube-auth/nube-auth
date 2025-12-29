import { cache } from "@proofa/cache";
import type { Context } from "hono";
import { createLogger } from "../utils/logger";
import { ErrorResponses } from "../utils/errors";

const log = createLogger("lockout");

const LOCKOUT_PREFIX = "lockout:";
const ATTEMPT_PREFIX = "attempt:";

/**
 * Account lockout configuration
 */
export interface LockoutConfig {
	/** Maximum number of failed attempts before lockout */
	maxAttempts: number;
	/** Lockout duration in minutes */
	lockoutMinutes: number;
	/** Attempt window in minutes (how long to track attempts) */
	attemptWindowMinutes: number;
}

/**
 * Default lockout configuration
 */
export const DEFAULT_LOCKOUT_CONFIG: LockoutConfig = {
	maxAttempts: 5,
	lockoutMinutes: 30,
	attemptWindowMinutes: 15,
};

/**
 * Check if an identifier (email, IP, etc.) is currently locked out
 * @returns Object with isLocked status and remaining time if locked
 */
export async function checkLockout(
	identifier: string,
	type: string = "auth",
): Promise<{ isLocked: boolean; remainingMinutes?: number }> {
	const key = `${LOCKOUT_PREFIX}${type}:${identifier}`;
	const lockedUntil = await cache.get<number>(key);

	if (!lockedUntil) {
		return { isLocked: false };
	}

	const now = Math.floor(Date.now() / 1000);
	if (lockedUntil > now) {
		const remainingMinutes = Math.ceil((lockedUntil - now) / 60);
		return { isLocked: true, remainingMinutes };
	}

	// Lockout expired, clean up
	await cache.delete(key);
	return { isLocked: false };
}

/**
 * Record a failed attempt and check if lockout should be triggered
 * @returns Object with shouldLock status and current attempt count
 */
export async function recordFailedAttempt(
	identifier: string,
	type: string = "auth",
	config: LockoutConfig = DEFAULT_LOCKOUT_CONFIG,
): Promise<{ shouldLock: boolean; attempts: number; remainingAttempts: number }> {
	const attemptKey = `${ATTEMPT_PREFIX}${type}:${identifier}`;
	const now = Math.floor(Date.now() / 1000);

	// Increment attempt count
	const attempts = await cache.increment(attemptKey);

	// Set TTL on first attempt
	if (attempts === 1) {
		await cache.expire(attemptKey, config.attemptWindowMinutes * 60);
	}

	const shouldLock = attempts >= config.maxAttempts;
	const remainingAttempts = Math.max(0, config.maxAttempts - attempts);

	log.info({
		identifier,
		type,
		attempts,
		shouldLock,
		remainingAttempts,
	}, "Failed attempt recorded");

	if (shouldLock) {
		await lockAccount(identifier, type, config.lockoutMinutes);
		await cache.delete(attemptKey); // Clear attempts after lockout
	}

	return { shouldLock, attempts, remainingAttempts };
}

/**
 * Lock an account for a specified duration
 */
export async function lockAccount(
	identifier: string,
	type: string = "auth",
	minutes: number,
): Promise<void> {
	const key = `${LOCKOUT_PREFIX}${type}:${identifier}`;
	const now = Math.floor(Date.now() / 1000);
	const lockedUntil = now + minutes * 60;

	await cache.set(key, lockedUntil, minutes * 60);

	log.warn({
		identifier,
		type,
		minutes,
		lockedUntil,
	}, "Account locked");
}

/**
 * Clear lockout and attempts for an identifier
 * Used for manual unlock or after successful authentication
 */
export async function clearLockout(
	identifier: string,
	type: string = "auth",
): Promise<void> {
	const lockoutKey = `${LOCKOUT_PREFIX}${type}:${identifier}`;
	const attemptKey = `${ATTEMPT_PREFIX}${type}:${identifier}`;

	await Promise.all([
		cache.delete(lockoutKey),
		cache.delete(attemptKey),
	]);

	log.info({ identifier, type }, "Lockout cleared");
}

/**
 * Get current attempt count for an identifier
 */
export async function getAttemptCount(
	identifier: string,
	type: string = "auth",
): Promise<number> {
	const key = `${ATTEMPT_PREFIX}${type}:${identifier}`;
	const attempts = await cache.get<number>(key);
	return attempts || 0;
}

/**
 * Middleware to check account lockout before processing request
 * Extracts identifier from request (email, IP, etc.)
 */
export function lockoutMiddleware(options: {
	/** Function to extract identifier from context */
	getIdentifier: (c: Context) => string | Promise<string>;
	/** Lockout type (for namespacing) */
	type?: string;
	/** Custom lockout configuration */
	config?: LockoutConfig;
}) {
	const { getIdentifier, type = "auth", config = DEFAULT_LOCKOUT_CONFIG } = options;

	return async (c: Context, next: () => Promise<void>) => {
		try {
			const identifier = await getIdentifier(c);
			if (!identifier) {
				await next();
				return;
			}

			const { isLocked, remainingMinutes } = await checkLockout(identifier, type);

			if (isLocked) {
				log.warn({ identifier, type, remainingMinutes }, "Lockout middleware: Access blocked");
				return c.json(ErrorResponses.AccountLocked(remainingMinutes), 429);
			}

			// Store identifier in context for use in route handlers
			c.set("lockoutIdentifier", identifier);
			c.set("lockoutType", type);

			await next();
		} catch (error) {
			log.error({ error }, "Lockout middleware error");
			// Don't block request on lockout check failure
			await next();
		}
	};
}

/**
 * Helper to extract email from request body
 */
export async function getEmailFromBody(c: Context): Promise<string> {
	try {
		const body = await c.req.json();
		return body.email || "";
	} catch {
		return "";
	}
}

/**
 * Helper to extract IP address from request
 */
export function getIpFromRequest(c: Context): string {
	return (
		c.req.header("x-forwarded-for")?.split(",")[0] ||
		c.req.header("x-real-ip") ||
		"unknown"
	);
}
