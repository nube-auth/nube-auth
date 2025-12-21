/**
 * Key prefix patterns for Redis
 */
export const KEY_PREFIXES = {
	CACHE: 'cache',
	SESSION: 'session',
	RATELIMIT: 'ratelimit',
	TEMP: 'temp',
} as const;

/**
 * Default TTL values in seconds
 */
export const DEFAULT_TTLS = {
	/** Short-lived temporary data (5 minutes) */
	SHORT: 5 * 60,

	/** Standard cache TTL (1 hour) */
	STANDARD: 60 * 60,

	/** Session TTL (28 days) */
	SESSION: 28 * 24 * 60 * 60,

	/** Long-lived cache (7 days) */
	LONG: 7 * 24 * 60 * 60,
} as const;

/**
 * Rate limiting windows in seconds
 */
export const RATE_LIMIT_WINDOWS = {
	/** Very short window (1 minute) */
	MINUTE: 60,

	/** Standard window (1 hour) */
	HOUR: 60 * 60,

	/** Long window (24 hours) */
	DAY: 24 * 60 * 60,
} as const;
