/**
 * Queue service configuration
 * Loads and validates environment variables
 */

/**
 * Get Redis configuration from environment variables
 */
export function getRedisConfig() {
	return {
		host: process.env['REDIS_HOST'] || "localhost",
		port: parseInt(process.env['REDIS_PORT'] || "6379"),
		password: process.env['REDIS_PASSWORD'],
		db: parseInt(process.env['REDIS_DB'] || "0"),
		username: process.env['REDIS_USERNAME'],
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
		concurrency: parseInt(process.env['WORKER_CONCURRENCY'] || "10"),
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
		interval: parseInt(process.env['HEALTH_CHECK_INTERVAL'] || "30000"), // 30 seconds
		timeout: parseInt(process.env['HEALTH_CHECK_TIMEOUT'] || "5000"), // 5 seconds
		redisCheckEnabled: true,
		queueStatsEnabled: true,
	};
}
