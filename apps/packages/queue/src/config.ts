/**
 * Queue service configuration
 * Loads and validates environment variables
 */

/**
 * Get Redis configuration from environment variables.
 * Prefers individual REDIS_HOST/PORT/PASSWORD vars, falls back to parsing REDIS_URL.
 */
export function getRedisConfig() {
	// If REDIS_HOST is explicitly set, use individual vars
	if (process.env["REDIS_HOST"]) {
		return {
			host: process.env["REDIS_HOST"],
			port: parseInt(process.env["REDIS_PORT"] || "6379", 10),
			password: process.env["REDIS_PASSWORD"],
			db: parseInt(process.env["REDIS_DB"] || "0", 10),
			username: process.env["REDIS_USERNAME"],
			maxRetriesPerRequest: null,
			enableReadyCheck: false,
			enableOfflineQueue: false,
		};
	}

	// Fall back to parsing REDIS_URL (e.g. Railway sets this as a connection string)
	const redisUrl = process.env["REDIS_URL"];
	if (redisUrl) {
		try {
			const parsed = new URL(redisUrl);
			return {
				host: parsed.hostname,
				port: parsed.port ? parseInt(parsed.port, 10) : 6379,
				password: parsed.password || undefined,
				username: parsed.username || undefined,
				db: parseInt(process.env["REDIS_DB"] || "0", 10),
				maxRetriesPerRequest: null,
				enableReadyCheck: false,
				enableOfflineQueue: false,
			};
		} catch {
			// Fall through to default if URL is malformed
		}
	}

	return {
		host: "localhost",
		port: 6379,
		password: undefined,
		db: parseInt(process.env["REDIS_DB"] || "0", 10),
		username: undefined,
		maxRetriesPerRequest: null,
		enableReadyCheck: false,
		enableOfflineQueue: false,
	};
}

/**
 * Get worker configuration from environment variables
 */
export function getWorkerConfig() {
	return {
		concurrency: parseInt(process.env["WORKER_CONCURRENCY"] || "10", 10),
		autorun: true,
		settings: {
			lockDuration: 30000,
			lockRenewTime: 15000,
			maxStalledCount: 3,
			maxStalledInterval: 5000,
			retryProcessDelay: 1000,
		},
	};
}

/**
 * Get health check configuration from environment variables
 */
export function getHealthCheckConfig() {
	return {
		interval: parseInt(process.env["HEALTH_CHECK_INTERVAL"] || "30000", 10), // 30 seconds
		timeout: parseInt(process.env["HEALTH_CHECK_TIMEOUT"] || "5000", 10), // 5 seconds
		redisCheckEnabled: true,
		queueStatsEnabled: true,
	};
}
