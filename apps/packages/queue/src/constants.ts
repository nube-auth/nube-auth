/**
 * Queue configuration constants
 * Default settings for BullMQ queues and workers
 */

import { getRedisConfig, getWorkerConfig, getHealthCheckConfig } from "./config.js";

/**
 * Default Redis connection settings
 */
export const DEFAULT_REDIS_CONFIG = getRedisConfig();

/**
 * Job retry configuration
 */
export const JOB_RETRY_CONFIG = {
	// Payment jobs - critical, retry aggressively
	payment: {
		maxAttempts: 10,
		backoff: {
			type: "exponential",
			delay: 2000,
		},
	},
	// Webhook jobs - retry for resilience
	webhook: {
		maxAttempts: 15,
		backoff: {
			type: "exponential",
			delay: 1000,
		},
	},
	// Email jobs - moderate retries
	email: {
		maxAttempts: 5,
		backoff: {
			type: "exponential",
			delay: 5000,
		},
	},
	// Notification jobs - best effort
	notification: {
		maxAttempts: 3,
		backoff: {
			type: "fixed",
			delay: 10000,
		},
	},
	// Async tasks - lower priority
	asyncTask: {
		maxAttempts: 3,
		backoff: {
			type: "fixed",
			delay: 30000,
		},
	},
};

/**
 * Job timeout configuration (in milliseconds)
 */
export const JOB_TIMEOUT_CONFIG = {
	payment: 30000, // 30 seconds
	webhook: 60000, // 60 seconds
	email: 45000, // 45 seconds
	notification: 30000, // 30 seconds
	asyncTask: 300000, // 5 minutes
};

/**
 * Job priority levels
 */
export const JOB_PRIORITY = {
	CRITICAL: 1,
	HIGH: 5,
	NORMAL: 10,
	LOW: 20,
	DEFERRED: 100,
};

/**
 * Default worker options
 */
export const DEFAULT_WORKER_OPTIONS = getWorkerConfig();

/**
 * Queue default options
 */
export const QUEUE_DEFAULT_OPTIONS = {
	defaultJobOptions: {
		removeOnComplete: {
			age: 3600, // Remove completed jobs after 1 hour
		},
		removeOnFail: {
			age: 604800, // Keep failed jobs for 7 days
		},
	},
	settings: {
		// Stalledness check
		maxStalledCount: 3,
		maxStalledInterval: 5000,
		// Lock renew time
		lockDuration: 30000,
		lockRenewTime: 15000,
	},
};

/**
 * Job event names for monitoring
 */
export const JOB_EVENTS = {
	QUEUED: "queued",
	STARTED: "started",
	PROGRESS: "progress",
	COMPLETED: "completed",
	FAILED: "failed",
	CANCELLED: "cancelled",
	STALLED: "stalled",
	WAITING: "waiting",
};

/**
 * Worker event names for monitoring
 */
export const WORKER_EVENTS = {
	READY: "ready",
	CLOSED: "closed",
	ERROR: "error",
	FAILED: "failed",
	COMPLETED: "completed",
	DRAINED: "drained",
};

/**
 * Queue names (matching enum in types)
 */
export const QUEUE_NAMES = {
	PAYMENTS: "payments",
	WEBHOOKS: "webhooks",
	EMAILS: "emails",
	NOTIFICATIONS: "notifications",
	ASYNC_TASKS: "async-tasks",
} as const;

/**
 * Health check configuration
 */
export const HEALTH_CHECK_CONFIG = getHealthCheckConfig();
