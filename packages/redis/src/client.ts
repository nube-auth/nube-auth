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
    throw new Error(
      'Redis configuration missing. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'
    );
  }

  redisInstance = new Redis({
    url,
    token,
  });

  return redisInstance;
}

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

  /**
   * Execute Redis command
   */
  async execute<T = unknown>(command: string, ...args: unknown[]): Promise<T> {
    return this.client.eval(command, args) as Promise<T>;
  }
}

/**
 * Create and export singleton instance
 */
export const redisClient = new RedisClient();
