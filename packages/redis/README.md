# @proofa/cache

**Redis Client & Utilities for Proofa Platform**

Type-safe Redis client with helpers for caching, rate limiting, and session storage.

---

## Features

- 🔄 **Standard Redis Protocol** - Native Redis connection
- 🎯 **Type-Safe** - Full TypeScript support
- 💾 **Caching** - Built-in cache operations
- ⏱️ **Rate Limiting** - Request rate limiting utilities
- 🔐 **Session Storage** - App session management
- 🔌 **Singleton Pattern** - Efficient connection reuse
- 🛡️ **Error Handling** - Graceful error fallbacks

---

## Installation

```bash
pnpm add @proofa/cache
```

---

## Usage

### Basic Operations

```typescript
import { cache, rateLimit, sessionStore } from "@proofa/cache";

// Cache operations
await cache.set("user:123", userData, 300); // 5 minutes TTL
const user = await cache.get<User>("user:123");
await cache.delete("user:123");
await cache.deleteMany(["user:123", "user:456"]);

// Rate limiting
const allowed = await rateLimit.checkLimit(
  "user:123",      // identifier
  "api",           // bucket
  100,             // limit
  60               // window in seconds
);

if (!allowed) {
  throw new Error("Rate limit exceeded");
}

// Session storage
await sessionStore.setAppSession(sessionId, userId, appId, 604800); // 7 days
const session = await sessionStore.getAppSession(sessionId);
await sessionStore.revokeAppSession(sessionId);
await sessionStore.revokeUserSessions(userId);
```

---

## API Reference

### Cache Operations

#### `cache.get<T>(key: string): Promise<T | null>`
Get cached value by key.

```typescript
const user = await cache.get<User>("user:123");
```

#### `cache.set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>`
Set cached value with optional TTL.

```typescript
await cache.set("user:123", user, 300); // 5 minutes
await cache.set("config", config); // No expiration
```

#### `cache.delete(key: string): Promise<void>`
Delete single key.

```typescript
await cache.delete("user:123");
```

#### `cache.deleteMany(keys: string[]): Promise<void>`
Delete multiple keys.

```typescript
await cache.deleteMany(["user:123", "user:456"]);
```

---

### Rate Limiting

#### `rateLimit.checkLimit(identifier, bucket, limit, windowSeconds): Promise<boolean>`
Check if request is within rate limit.

```typescript
const allowed = await rateLimit.checkLimit(
  "user:123",
  "api",
  100,  // 100 requests
  60    // per minute
);
```

#### `rateLimit.getCount(identifier, bucket): Promise<number>`
Get current request count.

```typescript
const count = await rateLimit.getCount("user:123", "api");
```

#### `rateLimit.reset(identifier, bucket): Promise<void>`
Reset rate limit counter.

```typescript
await rateLimit.reset("user:123", "api");
```

#### `rateLimit.getTTL(identifier, bucket): Promise<number>`
Get time until rate limit resets (in seconds).

```typescript
const ttl = await rateLimit.getTTL("user:123", "api");
```

---

### Session Storage

#### `sessionStore.setAppSession(sessionId, userId, appId, ttlSeconds): Promise<void>`
Create app session.

```typescript
await sessionStore.setAppSession(
  "sess_abc123",
  "usr_123",
  "app_456",
  604800  // 7 days
);
```

#### `sessionStore.getAppSession(sessionId): Promise<{userId, appId} | null>`
Get app session data.

```typescript
const session = await sessionStore.getAppSession("sess_abc123");
if (session) {
  console.log(session.userId, session.appId);
}
```

#### `sessionStore.revokeAppSession(sessionId): Promise<void>`
Revoke specific session.

```typescript
await sessionStore.revokeAppSession("sess_abc123");
```

#### `sessionStore.revokeUserSessions(userId): Promise<void>`
Revoke all sessions for a user.

```typescript
await sessionStore.revokeUserSessions("usr_123");
```

---

## Configuration

### Environment Variables

```bash
# Standard Redis connection
REDIS_URL=redis://localhost:6379

# With authentication
REDIS_URL=redis://:password@localhost:6379
REDIS_URL=redis://username:password@localhost:6379

# With TLS
REDIS_URL=rediss://username:password@host:6379
```

---

## Key Patterns

The package uses consistent Redis key patterns:

- **Cache**: `cache:{type}:{id}`
- **Rate Limit**: `ratelimit:{identifier}:{bucket}`
- **Sessions**: `session:app:{sessionId}`

Example:
```typescript
// User cache
cache.set("cache:user:123", user);

// Rate limiting
rateLimit.checkLimit("user:123", "api", 100, 60);
// Creates key: ratelimit:user:123:api

// Session storage
sessionStore.setAppSession("sess_abc", "usr_123", "app_456", 604800);
// Creates key: session:app:sess_abc
```

---

## Production Recommendations

### Connection Settings
```typescript
import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    connectTimeout: 10000,
  },
  // Enable offline queue
  enableOfflineQueue: true,
});
```

### Error Handling
All operations include error handling and fallbacks:

```typescript
try {
  const user = await cache.get("user:123");
} catch (error) {
  // Error logged, returns null
  // Application continues without cache
}
```

### Memory Management
```bash
# Set max memory policy in Redis config
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Monitoring

For advanced Redis operations or monitoring, the internal client is accessible only within the Redis package. Application code should use the exported utilities (`cache`, `rateLimit`, `sessionStore`).

---

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Development mode with watch
pnpm dev

# Type checking
pnpm typecheck
```

---

## Testing

```typescript
import { cache, rateLimit } from "@proofa/cache";

describe("Cache Operations", () => {
  it("sets and gets values", async () => {
    await cache.set("test:key", "value", 60);
    const result = await cache.get<string>("test:key");
    expect(result).toBe("value");
  });
  
  it("respects TTL", async () => {
    await cache.set("test:ttl", "value", 1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const result = await cache.get("test:ttl");
    expect(result).toBeNull();
  });
});

describe("Rate Limiting", () => {
  it("enforces rate limits", async () => {
    await rateLimit.reset("test:user", "api");
    
    // First request - allowed
    const allowed1 = await rateLimit.checkLimit("test:user", "api", 2, 60);
    expect(allowed1).toBe(true);
    
    // Second request - allowed
    const allowed2 = await rateLimit.checkLimit("test:user", "api", 2, 60);
    expect(allowed2).toBe(true);
    
    // Third request - denied
    const allowed3 = await rateLimit.checkLimit("test:user", "api", 2, 60);
    expect(allowed3).toBe(false);
  });
});
```

---

## Migration from Upstash

This package now uses standard Redis instead of Upstash REST API.

**Benefits:**
- ✅ Lower latency (native protocol vs HTTP)
- ✅ More features available
- ✅ Better performance
- ✅ Can still use Upstash (they support standard Redis protocol!)

**Changes:**
```typescript
// Old (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

// New (Standard Redis)
REDIS_URL=redis://localhost:6379

// Upstash with standard protocol
REDIS_URL=rediss://default:...@...upstash.io:6379
```

---

## License

MIT License - see [LICENSE](../../LICENSE)
