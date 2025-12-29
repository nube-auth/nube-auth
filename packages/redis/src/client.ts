import { createClient, type RedisClientType } from "redis";

/**
 * Redis singleton instance
 * Lazily initialized on first use
 */
let redisInstance: RedisClientType | null = null;

/**
 * Get or create Redis client instance (internal use only)
 * Application code should use cache/rateLimit/sessionStore utilities
 */
async function getRedisClient(): Promise<RedisClientType> {
	if (redisInstance && redisInstance.isOpen) {
		return redisInstance;
	}

	const url = process.env.REDIS_URL || "redis://localhost:6379";

	redisInstance = createClient({
		url,
	});

	redisInstance.on("error", (err) => {
		console.error("Redis Client Error:", err);
	});

	await redisInstance.connect();

	return redisInstance;
}

/**
 * Cache operations
 */
export const cache = {
	async get<T>(key: string): Promise<T | null> {
		try {
			const client = await getRedisClient();
			const value = await client.get(key);
			if (!value) return null;
			return JSON.parse(value) as T;
		} catch (error) {
			console.error(`Cache get error for key ${key}:`, error);
			return null;
		}
	},

	async getMany<T>(keys: string[]): Promise<(T | null)[]> {
		try {
			if (keys.length === 0) return [];
			const client = await getRedisClient();
			const values = await client.mGet(keys);
			return values.map((v) => (v ? JSON.parse(v) as T : null));
		} catch (error) {
			console.error(`Cache getMany error:`, error);
			return keys.map(() => null);
		}
	},

	async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
		try {
			const client = await getRedisClient();
			const serialized = JSON.stringify(value);
			if (ttlSeconds) {
				await client.setEx(key, ttlSeconds, serialized);
			} else {
				await client.set(key, serialized);
			}
		} catch (error) {
			console.error(`Cache set error for key ${key}:`, error);
		}
	},

	async setNX<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
		try {
			const client = await getRedisClient();
			const serialized = JSON.stringify(value);
			const result = await client.set(key, serialized, {
				NX: true,
				...(ttlSeconds ? { EX: ttlSeconds } : {}),
			});
			return result === "OK";
		} catch (error) {
			console.error(`Cache setNX error for key ${key}:`, error);
			return false;
		}
	},

	async delete(key: string): Promise<void> {
		try {
			const client = await getRedisClient();
			await client.del(key);
		} catch (error) {
			console.error(`Cache delete error for key ${key}:`, error);
		}
	},

	async deleteMany(keys: string[]): Promise<void> {
		try {
			if (keys.length === 0) return;
			const client = await getRedisClient();
			await client.del(keys);
		} catch (error) {
			console.error(`Cache deleteMany error:`, error);
		}
	},

	async exists(key: string): Promise<boolean> {
		try {
			const client = await getRedisClient();
			const result = await client.exists(key);
			return result === 1;
		} catch (error) {
			console.error(`Cache exists error for key ${key}:`, error);
			return false;
		}
	},

	async increment(key: string, by: number = 1): Promise<number> {
		try {
			const client = await getRedisClient();
			return await client.incrBy(key, by);
		} catch (error) {
			console.error(`Cache increment error for key ${key}:`, error);
			return 0;
		}
	},

	async decrement(key: string, by: number = 1): Promise<number> {
		try {
			const client = await getRedisClient();
			return await client.decrBy(key, by);
		} catch (error) {
			console.error(`Cache decrement error for key ${key}:`, error);
			return 0;
		}
	},

	async expire(key: string, seconds: number): Promise<boolean> {
		try {
			const client = await getRedisClient();
			const result = await client.expire(key, seconds);
			return result;
		} catch (error) {
			console.error(`Cache expire error for key ${key}:`, error);
			return false;
		}
	},

	async setTTL(key: string, seconds: number): Promise<boolean> {
		try {
			const client = await getRedisClient();
			const result = await client.expire(key, seconds);
			return result;
		} catch (error) {
			console.error(`Cache setTTL error for key ${key}:`, error);
			return false;
		}
	},

	async ttl(key: string): Promise<number> {
		try {
			const client = await getRedisClient();
			return await client.ttl(key);
		} catch (error) {
			console.error(`Cache ttl error for key ${key}:`, error);
			return -1;
		}
	},

	async keys(pattern: string): Promise<string[]> {
		try {
			const client = await getRedisClient();
			return await client.keys(pattern);
		} catch (error) {
			console.error(`Cache keys error for pattern ${pattern}:`, error);
			return [];
		}
	},

	async scan(cursor: number, pattern: string, count: number = 100): Promise<{ cursor: number; keys: string[] }> {
		try {
			const client = await getRedisClient();
			const result = await client.scan(cursor, {
				MATCH: pattern,
				COUNT: count,
			});
			return { cursor: result.cursor, keys: result.keys };
		} catch (error) {
			console.error(`Cache scan error:`, error);
			return { cursor: 0, keys: [] };
		}
	},

	async clear(pattern?: string): Promise<void> {
		try {
			const client = await getRedisClient();
			if (!pattern) {
				await client.flushDb();
				return;
			}

			// Use SCAN instead of KEYS for production safety
			let cursor = 0;
			do {
				const result = await client.scan(cursor, {
					MATCH: pattern,
					COUNT: 100,
				});
				cursor = result.cursor;
				if (result.keys.length > 0) {
					await client.del(result.keys);
				}
			} while (cursor !== 0);
		} catch (error) {
			console.error(`Cache clear error:`, error);
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
			const client = await getRedisClient();
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
			const client = await getRedisClient();
			const key = this.getBucketKey(identifier, bucket);
			const count = await client.get(key);
			return count ? Number.parseInt(count, 10) : 0;
		} catch (error) {
			console.error(`Rate limit getCount error:`, error);
			return 0;
		}
	},

	async reset(identifier: string, bucket: string): Promise<void> {
		try {
			const client = await getRedisClient();
			const key = this.getBucketKey(identifier, bucket);
			await client.del(key);
		} catch (error) {
			console.error(`Rate limit reset error:`, error);
		}
	},

	async getTTL(identifier: string, bucket: string): Promise<number> {
		try {
			const client = await getRedisClient();
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
	async setAppSession(
		sessionId: string,
		userId: string,
		appId: string,
		ttlSeconds: number,
		metadata?: Record<string, unknown>,
	): Promise<void> {
		try {
			const client = await getRedisClient();
			const key = `session:app:${sessionId}`;
			const sessionData = { userId, appId, metadata };
			await client.setEx(key, ttlSeconds, JSON.stringify(sessionData));
		} catch (error) {
			console.error(`Session store setAppSession error:`, error);
		}
	},

	async getAppSession(sessionId: string): Promise<{ userId: string; appId: string; metadata?: Record<string, unknown> } | null> {
		try {
			const client = await getRedisClient();
			const key = `session:app:${sessionId}`;
			const session = await client.get(key);
			return session ? JSON.parse(session) : null;
		} catch (error) {
			console.error(`Session store getAppSession error:`, error);
			return null;
		}
	},

	async revokeAppSession(sessionId: string): Promise<void> {
		try {
			const client = await getRedisClient();
			const key = `session:app:${sessionId}`;
			await client.del(key);
		} catch (error) {
			console.error(`Session store revokeAppSession error:`, error);
		}
	},

	async revokeUserSessions(userId: string): Promise<void> {
		try {
			const client = await getRedisClient();
			const pattern = `session:app:*`;
			
			// Use SCAN instead of KEYS for production
			let cursor = 0;
			do {
				const result = await client.scan(cursor, {
					MATCH: pattern,
					COUNT: 100,
				});
				cursor = result.cursor;
				
				for (const key of result.keys) {
					const session = await client.get(key);
					if (session) {
						const parsed = JSON.parse(session);
						if (parsed.userId === userId) {
							await client.del(key);
						}
					}
				}
			} while (cursor !== 0);
		} catch (error) {
			console.error(`Session store revokeUserSessions error:`, error);
		}
	},
};
