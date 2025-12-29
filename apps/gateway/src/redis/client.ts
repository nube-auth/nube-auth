import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env";

let client: RedisClientType | null = null;

/**
 * Initialize Redis client
 */
async function initializeRedis(): Promise<RedisClientType> {
	const redisClient = createClient({
		url: env.REDIS_URL,
	});

	redisClient.on("error", (err) => {
		console.error("Redis Client Error:", err);
	});

	await redisClient.connect();
	return redisClient;
}

/**
 * Get Redis client instance (singleton)
 */
export async function getRedisClient(): Promise<RedisClientType> {
	if (!client || !client.isOpen) {
		client = await initializeRedis();
	}
	return client;
}

/**
 * Export singleton client
 */
export const redisClient = {
	async get(key: string): Promise<string | null> {
		const client = await getRedisClient();
		return client.get(key);
	},

	async set(key: string, value: string): Promise<void> {
		const client = await getRedisClient();
		await client.set(key, value);
	},

	async setex(key: string, seconds: number, value: string): Promise<void> {
		const client = await getRedisClient();
		await client.setEx(key, seconds, value);
	},

	async del(...keys: string[]): Promise<void> {
		const client = await getRedisClient();
		await client.del(keys);
	},

	async incr(key: string): Promise<number> {
		const client = await getRedisClient();
		return client.incr(key);
	},

	async expire(key: string, seconds: number): Promise<void> {
		const client = await getRedisClient();
		await client.expire(key, seconds);
	},

	async ttl(key: string): Promise<number> {
		const client = await getRedisClient();
		return client.ttl(key);
	},

	async keys(pattern: string): Promise<string[]> {
		const client = await getRedisClient();
		return client.keys(pattern);
	},

	async ping(): Promise<string> {
		const client = await getRedisClient();
		return client.ping();
	},
};

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
	try {
		const result = await redisClient.ping();
		return result === "PONG";
	} catch (error) {
		console.error("Redis health check failed:", error);
		return false;
	}
}
