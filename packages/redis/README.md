# @proofa/redis

Redis client wrapper and helpers for Proofa.

## Contents

- **Client**: Singleton Redis client initialization
- **Helpers**: Type-safe operations (caching, rate limiting, sessions)
- **Constants**: Key patterns and TTL values

## Installation

```bash
pnpm install @proofa/redis
```

## Configuration

Set the following environment variables:

```env
UPSTASH_REDIS_REST_URL=<your-upstash-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>
```

## Usage

### Rate Limiting

```typescript
import { rateLimit } from '@proofa/redis';

// Check if action is rate limited (10 requests per 60 seconds)
const limited = await rateLimit('user:123:login', 10, 60);
if (limited) {
  // Handle rate limit
}
```

### Caching

```typescript
import { cacheGet, cacheSet } from '@proofa/redis';

// Get from cache
const cached = await cacheGet('key');

// Set to cache with TTL
await cacheSet('key', JSON.stringify(data), 3600); // 1 hour
```

### Sessions

```typescript
import { sessionGet, sessionSet } from '@proofa/redis';

// Get session
const session = await sessionGet('session-id');

// Set session with TTL
await sessionSet('session-id', session, 86400); // 24 hours
```

## Key Patterns

Keys are prefixed with the following patterns:

- `cache:*` - General cache entries
- `session:*` - Session data
- `ratelimit:*` - Rate limit counters
- `temp:*` - Temporary data
