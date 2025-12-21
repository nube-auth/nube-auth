import { Redis } from '@upstash/redis';

/**
 * Redis singleton instance
 * Lazily initialized on first use
 */
let redisInstance: Redis | null = null;

/**
 * Get or create Redis client instance
 */
export function getRedisClient(): Redis {
	if (redisInstance) {
		return redisInstance;
	}

	const url = process.env.UPSTASH_REDIS_REST_URL;
	const token = process.env.UPSTASH_REDIS_REST_TOKEN;

	if (!url || !token) {
		throw new Error('Redis configuration missing. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
	}

	redisInstance = new Redis({
		url,
		token,
	});

	return redisInstance;
}

/**
 * Cache operations
 */
export const cache = {
	async get<T>(key: string): Promise<T | null> {
		try {
			const client = getRedisClient();
			const value = await client.get<T>(key);
			return value ?? null;
		} catch (error) {
			console.error(`Cache get error for key ${key}:`, error);
			return null;
		}
	},

	async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
		try {
			const client = getRedisClient();
			if (ttlSeconds) {
				await client.setex(key, ttlSeconds, JSON.stringify(value));
			} else {
				await client.set(key, JSON.stringify(value));
			}
		} catch (error) {
			console.error(`Cache set error for key ${key}:`, error);
		}
	},

	async delete(key: string): Promise<void> {
		try {
			const client = getRedisClient();
			await client.del(key);
		} catch (error) {
			console.error(`Cache delete error for key ${key}:`, error);
		}
	},

	async deleteMany(keys: string[]): Promise<void> {
		try {
			if (keys.length === 0) return;
			const client = getRedisClient();
			await client.del(...keys);
		} catch (error) {
			console.error(`Cache deleteMany error:`, error);
		}
	},
};

/**
 * Rate limiting operations
 */
export const rateLimit = {
	getBucketKey(identifier: string, bucket: string): string {
		return `ratelimit:${identifier}:${bucket}`;
	},

	async checkLimit(identifier: string, bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
		try {
			const client = getRedisClient();
			const key = this.getBucketKey(identifier, bucket);
			const count = await client.incr(key);

			if (count === 1) {
				await client.expire(key, windowSeconds);
			}

			return count <= limit;
		} catch (error) {
			console.error(`Rate limit check error:`, error);
			return true; // Allow on error to prevent breaking auth
		}
	},

	async getCount(identifier: string, bucket: string): Promise<number> {
		try {
			const client = getRedisClient();
			const key = this.getBucketKey(identifier, bucket);
			const count = await client.get<number>(key);
			return count ?? 0;
		} catch (error) {
			console.error(`Rate limit getCount error:`, error);
			return 0;
		}
	},

	async reset(identifier: string, bucket: string): Promise<void> {
		try {
			const client = getRedisClient();
			const key = this.getBucketKey(identifier, bucket);
			await client.del(key);
		} catch (error) {
			console.error(`Rate limit reset error:`, error);
		}
	},

	async getTTL(identifier: string, bucket: string): Promise<number> {
		try {
			const client = getRedisClient();
			const key = this.getBucketKey(identifier, bucket);
			return await client.ttl(key);
		} catch (error) {
			console.error(`Rate limit getTTL error:`, error);
			return -1;
		}
	},
};

/**
 * Session store operations for app sessions (Gateway)
 */
export const sessionStore = {
	async setAppSession(sessionId: string, userId: string, appId: string, ttlSeconds: number): Promise<void> {
		try {
			const client = getRedisClient();
			const key = `session:app:${sessionId}`;
			await client.setex(key, ttlSeconds, JSON.stringify({ userId, appId }));
		} catch (error) {
			console.error(`Session store setAppSession error:`, error);
		}
	},

	async getAppSession(sessionId: string): Promise<{ userId: string; appId: string } | null> {
		try {
			const client = getRedisClient();
			const key = `session:app:${sessionId}`;
			const session = await client.get<{ userId: string; appId: string }>(key);
			return session ?? null;
		} catch (error) {
			console.error(`Session store getAppSession error:`, error);
			return null;
		}
	},

	async revokeAppSession(sessionId: string): Promise<void> {
		try {
			const client = getRedisClient();
			const key = `session:app:${sessionId}`;
			await client.del(key);
		} catch (error) {
			console.error(`Session store revokeAppSession error:`, error);
		}
	},

	async revokeUserSessions(userId: string): Promise<void> {
		try {
			const client = getRedisClient();
			const keys = await client.keys(`session:app:*`);

			for (const key of keys) {
				const session = await client.get<{ userId: string; appId: string }>(key);
				if (session?.userId === userId) {
					await client.del(key);
				}
			}
		} catch (error) {
			console.error(`Session store revokeUserSessions error:`, error);
		}
	},
};

/**
 * Type-safe Redis client wrapper
 */
export class RedisClient {
	private client: Redis;

	constructor() {
		this.client = getRedisClient();
	}

	/**
	 * Get raw client instance
	 */
	getRawClient(): Redis {
		return this.client;
	}
}

/**
 * Create and export singleton instance
 */
export const redisClient = new RedisClient();
