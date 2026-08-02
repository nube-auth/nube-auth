import { createLogger, serializeError } from "@nube-auth/shared";
import { createClient, type RedisClientType } from "redis";

const log = createLogger("cache");

/**
 * Session entitlements stored in Redis.
 * Canonical definition lives in @nube-auth/shared — this is a structural match.
 */
type SessionEntitlements = Record<string, { role: string; resources?: string[]; metadata?: Record<string, unknown> }>;

/**
 * Redis singleton instance
 * Lazily initialized on first use
 */
let redisInstance: RedisClientType | null = null;
let configuredRedisUrl: string | null = null;

/**
 * Initialize the cache package with a Redis URL.
 * Must be called at service startup before any cache operations.
 * Accepts the validated URL from the service's env.ts.
 */
export function initCache(redisUrl: string): void {
	configuredRedisUrl = redisUrl;
}

/**
 * Get or create Redis client instance (internal use only)
 * Application code should use cache/rateLimit/sessionStore utilities
 */
async function getRedisClient(): Promise<RedisClientType> {
	if (redisInstance?.isOpen) {
		return redisInstance;
	}

	const url = configuredRedisUrl;
	if (!url) {
		throw new Error(
			"Cache not initialized: call initCache(redisUrl) at service startup before using @nube-auth/cache",
		);
	}

	redisInstance = createClient({
		url,
		socket: {
			// Auto-reconnect with exponential backoff (100ms → 5s cap)
			reconnectStrategy: (retries: number) => Math.min(retries * 100, 5000),
			// TCP keepalive to prevent Railway's network proxy from dropping idle connections
			keepAlive: 10000,
			// Timeout for each individual connection attempt
			connectTimeout: 10000,
		},
	});

	redisInstance.on("error", (err) => {
		// Suppressed during auto-reconnect cycles — node-redis will retry per reconnectStrategy
		if ((err as NodeJS.ErrnoException).code !== "ECONNREFUSED" && err.name !== "SocketClosedUnexpectedlyError") {
			log.error({ err: serializeError(err) }, "Redis Client Error");
		}
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
			log.error({ key, err: serializeError(error as Error) }, "Cache get error");
			return null;
		}
	},

	async getMany<T>(keys: string[]): Promise<(T | null)[]> {
		try {
			if (keys.length === 0) return [];
			const client = await getRedisClient();
			const values = await client.mGet(keys);
			return values.map((v) => (v ? (JSON.parse(v) as T) : null));
		} catch (error) {
			log.error({ err: serializeError(error as Error) }, "Cache getMany error");
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
			log.error({ key, err: serializeError(error as Error) }, "Cache set error");
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
			log.error({ key, err: serializeError(error as Error) }, "Cache setNX error");
			return false;
		}
	},

	async delete(key: string): Promise<void> {
		try {
			const client = await getRedisClient();
			await client.del(key);
		} catch (error) {
			log.error({ key, err: serializeError(error as Error) }, "Cache delete error");
		}
	},

	/**
	 * Atomically GET and DELETE a key in one Redis round-trip (GETDEL).
	 * Preferred over a separate get() + delete() pair when the value should
	 * be consumed exactly once — e.g. single-use exchange codes.
	 * Returns the parsed value, or null if the key did not exist.
	 */
	async getAndDelete<T>(key: string): Promise<T | null> {
		try {
			const client = await getRedisClient();
			const value = await client.getDel(key);
			if (value === null || value === undefined) return null;
			return JSON.parse(value) as T;
		} catch (error) {
			log.error({ key, err: serializeError(error as Error) }, "Cache getAndDelete error");
			return null;
		}
	},

	async deleteMany(keys: string[]): Promise<void> {
		try {
			if (keys.length === 0) return;
			const client = await getRedisClient();
			await client.del(keys);
		} catch (error) {
			log.error({ err: serializeError(error as Error) }, "Cache deleteMany error");
		}
	},

	async exists(key: string): Promise<boolean> {
		try {
			const client = await getRedisClient();
			const result = await client.exists(key);
			return result === 1;
		} catch (error) {
			log.error({ key, err: serializeError(error as Error) }, "Cache exists error");
			return false;
		}
	},

	async increment(key: string, by: number = 1): Promise<number> {
		try {
			const client = await getRedisClient();
			return await client.incrBy(key, by);
		} catch (error) {
			log.error({ key, err: serializeError(error as Error) }, "Cache increment error");
			return 0;
		}
	},

	async decrement(key: string, by: number = 1): Promise<number> {
		try {
			const client = await getRedisClient();
			return await client.decrBy(key, by);
		} catch (error) {
			log.error({ key, err: serializeError(error as Error) }, "Cache decrement error");
			return 0;
		}
	},

	async expire(key: string, seconds: number): Promise<boolean> {
		try {
			const client = await getRedisClient();
			const result = await client.expire(key, seconds);
			return result;
		} catch (error) {
			log.error({ key, err: serializeError(error as Error) }, "Cache expire error");
			return false;
		}
	},

	async setTTL(key: string, seconds: number): Promise<boolean> {
		try {
			const client = await getRedisClient();
			const result = await client.expire(key, seconds);
			return result;
		} catch (error) {
			log.error({ key, err: serializeError(error as Error) }, "Cache setTTL error");
			return false;
		}
	},

	async ttl(key: string): Promise<number> {
		try {
			const client = await getRedisClient();
			return await client.ttl(key);
		} catch (error) {
			log.error({ key, err: serializeError(error as Error) }, "Cache ttl error");
			return -1;
		}
	},

	async keys(pattern: string): Promise<string[]> {
		try {
			const client = await getRedisClient();
			return await client.keys(pattern);
		} catch (error) {
			log.error({ pattern, err: serializeError(error as Error) }, "Cache keys error");
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
			log.error({ err: serializeError(error as Error) }, "Cache scan error");
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
			log.error({ err: serializeError(error as Error) }, "Cache clear error");
		}
	},

	/**
	 * Atomically increment a key and set expiry if it's the first increment.
	 * Uses MULTI/EXEC to ensure INCR and EXPIRE are applied together.
	 * Returns { current, ttl }.
	 */
	async incrementWithExpire(key: string, ttlSeconds: number): Promise<{ current: number; ttl: number }> {
		const client = await getRedisClient();
		const multi = client.multi();
		multi.incr(key);
		multi.ttl(key);
		const results = await multi.exec();

		const current = results[0] as number;
		const ttl = results[1] as number;

		// If TTL is -1, the key has no expiry (first increment) — set it now
		if (ttl === -1) {
			await client.expire(key, ttlSeconds);
			return { current, ttl: ttlSeconds };
		}

		return { current, ttl };
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
			log.error({ err: serializeError(error as Error) }, "Rate limit check error");
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
			log.error({ err: serializeError(error as Error) }, "Rate limit getCount error");
			return 0;
		}
	},

	async reset(identifier: string, bucket: string): Promise<void> {
		try {
			const client = await getRedisClient();
			const key = this.getBucketKey(identifier, bucket);
			await client.del(key);
		} catch (error) {
			log.error({ err: serializeError(error as Error) }, "Rate limit reset error");
		}
	},

	async getTTL(identifier: string, bucket: string): Promise<number> {
		try {
			const client = await getRedisClient();
			const key = this.getBucketKey(identifier, bucket);
			return await client.ttl(key);
		} catch (error) {
			log.error({ err: serializeError(error as Error) }, "Rate limit getTTL error");
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
		entitlements?: SessionEntitlements,
	): Promise<void> {
		try {
			const client = await getRedisClient();
			const key = `session:app:${sessionId}`;
			const sessionData = { userId, appId, metadata, entitlements };
			await client.setEx(key, ttlSeconds, JSON.stringify(sessionData));
		} catch (error) {
			log.error({ sessionId, err: serializeError(error as Error) }, "Session store setAppSession error");
		}
	},

	async getAppSession(sessionId: string): Promise<{
		userId: string;
		appId: string;
		metadata?: Record<string, unknown>;
		entitlements?: SessionEntitlements;
	} | null> {
		try {
			const client = await getRedisClient();
			const key = `session:app:${sessionId}`;
			const session = await client.get(key);
			return session ? JSON.parse(session) : null;
		} catch (error) {
			log.error({ sessionId, err: serializeError(error as Error) }, "Session store getAppSession error");
			return null;
		}
	},

	async revokeAppSession(sessionId: string): Promise<void> {
		try {
			const client = await getRedisClient();
			const key = `session:app:${sessionId}`;
			await client.del(key);
		} catch (error) {
			log.error({ sessionId, err: serializeError(error as Error) }, "Session store revokeAppSession error");
		}
	},

	async revokeUserSessions(userId: string): Promise<{ deletedCount: number; cursor: number }> {
		try {
			const client = await getRedisClient();
			const pattern = `session:app:*`;
			let deletedCount = 0;
			let cursor = 0;

			// Use SCAN instead of KEYS for production
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
							deletedCount++;
						}
					}
				}
			} while (cursor !== 0);

			return { deletedCount, cursor: 0 };
		} catch (error) {
			log.error({ userId, err: serializeError(error as Error) }, "Session store revokeUserSessions error");
			return { deletedCount: 0, cursor: 0 };
		}
	},

	async getUserSessions(userId: string): Promise<Array<{ id: string; sessionData: any }>> {
		try {
			const client = await getRedisClient();
			const pattern = `session:app:*`;
			const sessions = [];
			let cursor = 0;

			// Use SCAN instead of KEYS for production
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
							const sessionId = key.replace("session:app:", "");
							sessions.push({ id: sessionId, sessionData: parsed });
						}
					}
				}
			} while (cursor !== 0);

			return sessions;
		} catch (error) {
			log.error({ userId, err: serializeError(error as Error) }, "Session store getUserSessions error");
			return [];
		}
	},
};

/**
 * Ping Redis — returns true if reachable, false otherwise.
 * Connects lazily on first call (same as all other cache operations).
 */
export async function pingCache(): Promise<boolean> {
	try {
		const client = await getRedisClient();
		const result = await client.ping();
		return result === "PONG";
	} catch {
		return false;
	}
}
