// Re-export client and helpers
export {
  getRedisClient,
  redisClient,
  RedisClient,
  cache,
  rateLimit,
  sessionStore,
} from './client.js';

// Re-export constants
export { KEY_PREFIXES, DEFAULT_TTLS, RATE_LIMIT_WINDOWS } from './constants.js';
