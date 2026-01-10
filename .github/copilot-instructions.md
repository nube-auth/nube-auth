# GitHub Copilot Instructions for Proofa Core

## Critical Security Patterns

### Internal vs Public IDs
**NEVER expose internal database IDs outside service boundaries.**

- ✅ API responses: Use `public_id` (string like "USER0...", "PRJ0...")
- ✅ Service-to-service headers: Use public IDs (X-User-Id: USER0...)
- ✅ Route parameters: Use public IDs (`:projectId` expects "PRJ0...")
- ❌ API responses: Never include `id` field (internal database ID)
- ❌ Service headers: Never send internal numeric IDs
- ❌ Route params: Never expect internal IDs

**Implementation pattern:**
```typescript
// ❌ WRONG - Exposes internal ID
return { id: user.id, name: user.name }

// ✅ CORRECT - Uses public ID
return { userId: user.public_id, name: user.name }

// ✅ CORRECT - Accept public ID, look up internally
const user = await userQueries.findByPublicId(userPublicId);
// Use user.id internally for DB operations
```

### Type System
Use branded types from `@proofa/shared`:
```typescript
import { InternalId, PublicId, publicId, internalId } from '@proofa/shared';

// Database operations
function getUserById(id: InternalId): Promise<User>

// API responses
function getUserPublicData(userId: PublicId): Promise<UserData>
```

## Configuration Management

### Environment Variables
**NEVER access `process.env` directly in application code.**

- ✅ Always use `config/env.ts` with typed interfaces
- ✅ Validate required variables on startup
- ✅ Provide sensible defaults for optional variables
- ❌ Never use `process.env.VARIABLE_NAME` in business logic
- ❌ Never pass raw env vars to functions

**Implementation:**
```typescript
// ❌ WRONG
const apiKey = process.env.API_KEY;

// ✅ CORRECT
import { env } from '@/config/env';
const apiKey = env.API_KEY;
```

## Database and Cache Access

### Database Connections
**NEVER import or use database clients directly in routes or business logic.**

- ✅ Use `@proofa/db` package with connection wrapper
- ✅ Access via `getDb()` or similar connection getter
- ✅ Use query helpers from `@proofa/db/queries`
- ❌ Never import `drizzle`, `pg`, or raw clients in application code
- ❌ Never create new database connections in routes

**Implementation:**
```typescript
// ❌ WRONG - Direct database import
import { drizzle } from 'drizzle-orm/node-postgres';
const db = drizzle(connection);

// ✅ CORRECT - Use wrapper
import { getDb } from '@proofa/db';
import { userQueries } from '@proofa/db/queries';

const db = getDb();
const user = await userQueries.findByPublicId(db, userId);
```

### Cache/Redis Access
**NEVER access Redis clients directly in application code.**

- ✅ Use `@proofa/cache` package with connection wrapper
- ✅ Access via `getCache()` or similar getter
- ✅ Use typed cache helpers for common operations
- ❌ Never import `redis` or `ioredis` directly
- ❌ Never create new Redis connections in routes

**Implementation:**
```typescript
// ❌ WRONG - Direct Redis import
import Redis from 'ioredis';
const redis = new Redis(url);

// ✅ CORRECT - Use wrapper
import { getCache } from '@proofa/cache';

const cache = getCache();
await cache.set('key', value, ttl);
```

## JSONB Updates (Atomic Operations)

### Never Use Read-Modify-Write Pattern
**ALWAYS use atomic JSONB operations to prevent race conditions and lost updates.**

- ✅ Use `buildJsonbMergeClause()` for top-level field updates
- ✅ Use `buildJsonbSetClause()` for nested path updates
- ✅ Use `createJsonbUpdateChain()` for multiple updates
- ✅ Use query helpers like `appQueries.updateSecuritySettings()`
- ✅ Always set `updated_at` with JSONB updates
- ❌ Never read JSONB, modify in app code, then write back
- ❌ Never use manual object spreading for JSONB updates

**Why**: Read-modify-write creates race conditions where concurrent requests lose updates. Atomic operations guarantee correctness.

**Implementation:**
```typescript
// ❌ WRONG - Race condition
const app = await db.select().from(apps).where(eq(apps.id, appId));
const settings = app.security_settings;
settings.sessionTtlDays = 60;  // Lost update possible!
await db.update(apps).set({ security_settings: settings });

// ✅ CORRECT - Atomic operation
await db.update(apps)
  .set({
    security_settings: buildJsonbMergeClause(apps.security_settings, {
      sessionTtlDays: 60,
    }),
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId));

// ✅ BEST - Use query helper
await appQueries.updateSecuritySettings(db, appId, {
  sessionTtlDays: 60,
});
```

**Deep nested updates:**
```typescript
// ✅ Single nested field
await db.update(apps)
  .set({
    security_settings: buildJsonbSetClause(apps.security_settings, {
      path: "oauth.github.clientId",
      value: "gh-123",
    }),
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId));

// ✅ Multiple nested fields
const chain = createJsonbUpdateChain(apps.security_settings)
  .set("oauth.github.enabled", true)
  .set("oauth.github.clientId", "gh-123")
  .set("redirectUris", ["https://example.com"])
  .build();

await db.update(apps)
  .set({ security_settings: chain, updated_at: new Date() })
  .where(eq(apps.id, appId));
```

**Array updates:**
```typescript
// ❌ WRONG - Never update array elements by index
.set("redirectUris.0", "https://new.com")

// ✅ CORRECT - Replace entire array
.set("redirectUris", ["https://new.com", "https://example.com"])
```

**References:**
- [docs/JSONB_RFC.md](../docs/JSONB_RFC.md) - Complete RFC with rationale
- [docs/JSONB_QUICK_REFERENCE.md](../docs/JSONB_QUICK_REFERENCE.md) - Quick patterns
- [docs/ATOMIC_JSONB_IMPLEMENTATION.md](../docs/ATOMIC_JSONB_IMPLEMENTATION.md) - Implementation guide

## Development Experience

### Rate Limiting
Rate limiting is disabled in development mode (`NODE_ENV=development`):

```typescript
if (env.IS_DEVELOPMENT) {
  await next();
  return; // Skip rate limiting
}
```

## UI/Dashboard Standards

### Dropdown Components
**NEVER use browser default `<select>` elements.**

- ✅ Use custom dropdown components from the component library
- ✅ Maintain consistent styling and behavior across dashboards
- ❌ Never use native `<select>`, `<option>` elements
- ❌ Never rely on browser default styling

**Implementation:**
```typescript
// ❌ WRONG - Native select
<select>
  <option value="stripe">Stripe</option>
  <option value="lemonsqueezy">LemonSqueezy</option>
</select>

// ✅ CORRECT - Custom dropdown component
<Dropdown
  options={[
    { value: 'stripe', label: 'Stripe' },
    { value: 'lemonsqueezy', label: 'LemonSqueezy' },
  ]}
  value={selectedProvider}
  onChange={setSelectedProvider}
/>
```

## HTTP Client

### Fetch Library
**NEVER use native `fetch()` API.**

- ✅ Use `pingpong` from `@proofa/auth` for all HTTP requests
- ✅ Works in both frontend (dashboards) and backend (services)
- ✅ Auto-parsed JSON responses via `response.data` (v1.4.0+)
- ✅ Convenience methods: `.ok()`, `.isError()`, `.redirected()`
- ❌ Never use native `fetch()`, `axios`, or other HTTP clients
- ❌ Never use `.json()` to parse - use `response.data` directly

**Implementation:**
```typescript
// ❌ WRONG - Native fetch with manual parsing
const response = await fetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data),
});
const json = await response.json();

// ✅ CORRECT - pingpong with auto-parsed response.data
import { pingpong } from '@proofa/auth';

const response = await pingpong('/api/endpoint', {
  method: 'POST',
  body: data, // No need to stringify
});

// response.data is already parsed JSON!
console.log(response.data.userId);

// Check status with methods
if (response.ok()) {
  // Success (2xx)
} else if (response.isError()) {
  // Error (4xx/5xx)
}
```

**Key Features (v1.4.0+):**
- ✅ `response.data` - Auto-parsed JSON, no `.json()` needed
- ✅ `response.ok()` - Check if 2xx status (method, not property)
- ✅ `response.isError()` - Check if 4xx/5xx
- ✅ `response.status` - HTTP status code
- ✅ `response.body` - Raw response body string
- ✅ Event listeners: `onRequest`, `onResponse`, `onError`
- ✅ Built-in plugins: authentication, logging, validation

## Service Communication

### Authentication Flow
1. Gateway validates user session
2. Gateway sends public user ID in `X-User-Id` header
3. Core services receive public ID and look up internal ID when needed
4. Internal IDs used only for database operations within service

### Service-to-Service Headers
```typescript
headers: {
  'X-User-Id': user.public_id,  // Always public ID
  'X-S2S-Token': s2sToken,      // Service authentication
}
```

## Credential Security

### Encryption
- ✅ Encrypt credentials at rest using AES-256-GCM
- ✅ Use `env.PAYMENT_CONFIGS_KEY` for encryption key
- ✅ Never log credentials or sensitive data
- ✅ Use `encryptCredentials()` and `decryptCredentials()` helpers

### Logging Standards
**NEVER use `console.log`, `console.error`, or `console.warn`.**

- ✅ Use structured logger from `@proofa/shared` (`createLogger()`)
- ✅ Include context objects with error details
- ✅ Use appropriate log levels (debug, info, warn, error)
- ✅ Use `serializeError()` for Error objects
- ❌ Never use `console.*` methods
- ❌ Never log entire error objects (may contain sensitive data)
- ❌ Never log credentials, passwords, or secrets

**Implementation:**
```typescript
// ❌ WRONG
console.error("Failed to process payment:", error);
console.log('Provider config:', config);

// ✅ CORRECT
import { createLogger, serializeError } from '@proofa/shared';
const log = createLogger('payment-service');

log.error({ 
  userId: user.public_id,
  amount,
  err: serializeError(error) 
}, "Failed to process payment");

log.info({ 
  id: config.public_id, 
  provider: config.provider,
  credentials: '[REDACTED]'
}, "Provider config loaded");
```

### Error Handling Patterns
**Always use typed error handling with proper context.**

- ✅ Catch specific error types when possible
- ✅ Use `serializeError()` for logging Error objects
- ✅ Never expose internal error details to clients
- ✅ Log with structured context
- ❌ Never `catch (e)` - use `catch (error)` or typed catches
- ❌ Never return error objects directly to API responses

**Implementation:**
```typescript
// ❌ WRONG
try {
  await operation();
} catch (e) {
  console.log(e);
  return c.json({ error: e }, 500);
}

// ✅ CORRECT
try {
  await operation();
} catch (error) {
  log.error({ 
    err: serializeError(error as Error),
    context: 'operation-name' 
  }, "Operation failed");
  return c.json({ error: "Operation failed" }, 500);
}
```

### TODO Comments
**Always include context and owner for TODOs.**

- ✅ Format: `// TODO(@owner): Description [ISSUE-123]`
- ✅ Link to tracking issue when available
- ✅ Include security context for auth/crypto TODOs
- ❌ Never leave security-critical TODOs without tracking
- ❌ Never commit "TODO: implement" without details

**Example:**
```typescript
// ❌ WRONG
// TODO: implement session validation

// ✅ CORRECT
// TODO(@devendra): Implement JWT validation with RS256
// Tracking: https://github.com/0xdps/proofa-core/issues/42
// Security: Must verify signature and check expiry
```

## Code Quality

### Before Submitting PRs
Check the PR template checklist:
- [ ] No internal database IDs in API responses
- [ ] Service headers use public IDs, not internal IDs  
- [ ] Route parameters expect public IDs
- [ ] No `process.env` direct access (use config files)
- [ ] No credentials or secrets in logs
- [ ] Rate limiting respects development mode

### Architecture Reference
See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for detailed guidelines on:
- ID management patterns
- Service communication
- Error logging
- Configuration management

## Common Pitfalls to Avoid

1. **Exposing internal IDs**: Always use public_id in responses
2. **Direct process.env access**: Always use config/env.ts
3. **Direct database/Redis access**: Use @proofa/db and @proofa/cache wrappers
4. **Read-modify-write JSONB**: Use atomic operations (buildJsonbMergeClause, etc.)
5. **Logging credentials**: Always redact sensitive data
6. **Forgetting dev mode**: Rate limits should be disabled in development
7. **Type confusion**: Use InternalId and PublicId branded types
8. **Array element mutations**: Replace entire arrays, never update by index
9. **Native select elements**: Use custom dropdown components
10. **Native fetch**: Use pingpong-fetch library instead

## Quick Reference

### Valid ID Patterns
- User ID: `USER0abc...` (public) vs `123` (internal)
- Project ID: `PRJ0xyz...` (public) vs `456` (internal)
- App ID: `APP0def...` (public) vs `789` (internal)

### Service Ports (Development)
- Gateway: `3001`
- Core: `3003`
- Admin Dashboard: `3004`
- User Dashboard: `3005`

### Database Schema
- All main tables have `id` (internal, autoincrement) and `public_id` (external, unique string)
- Foreign keys use internal IDs
- API responses use public IDs
