import { Redis } from '@upstash/redis';
import { getEnv } from '../config/env';

let client: Redis | null = null;

/**
 * Initialize Upstash Redis client
 * Uses REST API for HTTP-based operations
 */
function initializeRedis(): Redis {
	const env = getEnv();

	return new Redis({
		url: env.UPSTASH_REDIS_REST_URL,
		token: env.UPSTASH_REDIS_REST_TOKEN,
	});
}

/**
 * Get Redis client instance (singleton)
 */
export function getRedisClient(): Redis {
	if (!client) {
		client = initializeRedis();
	}
	return client;
}

/**
 * Export singleton instance
 */
export const redisClient = getRedisClient();

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
	try {
		const result = await redisClient.ping();
		return result === 'PONG';
	} catch (error) {
		console.error('Redis health check failed:', error);
		return false;
	}
}
