// Re-export client and helpers
export {
	cache,
	getRedisClient,
	RedisClient,
	rateLimit,
	redisClient,
	sessionStore,
} from './client.js';

// Re-export constants
export { DEFAULT_TTLS, KEY_PREFIXES, RATE_LIMIT_WINDOWS } from './constants.js';
