# Architecture Guidelines

## ID Management and Security

### Internal vs Public IDs

**Rule: NEVER expose internal database IDs outside the service that owns the data.**

#### Internal IDs (`InternalId`)
- Auto-increment integers from PostgreSQL
- Used ONLY for:
  - Database queries within a service
  - Foreign key relationships
  - Internal business logic
- **NEVER**:
  - Returned in API responses
  - Sent in HTTP headers between services
  - Stored in external systems (Redis cache keys, etc.)
  - Logged in external logs

#### Public IDs (`PublicId`)
- Prefixed strings: `USER0abc123`, `PRJ0xyz789`, `APP0def456`
- Used for:
  - All API responses
  - Service-to-service communication headers
  - External system references
  - Cache keys
  - Client-side storage

### Implementation Pattern

```typescript
// ❌ WRONG - Exposing internal ID
app.get('/users/:id', async (c) => {
  const user = await db.users.findById(parseInt(c.req.param('id'))); // Internal ID in URL!
  return c.json({ id: user.id }); // Exposing internal ID!
});

// ✅ CORRECT - Using public ID
app.get('/users/:userId', async (c) => {
  const userId = c.req.param('userId'); // Public ID
  const user = await userQueries.findByPublicId(db, userId);
  return c.json({ 
    id: user.public_id, // Only expose public ID
    email: user.email 
  });
});
```

### Service Communication Pattern

```typescript
// Gateway -> Core communication
const headers = {
  'X-User-Id': auth.userId, // ✅ Public ID (USER0...)
  'X-S2S-Token': s2sToken,
};

// Core receives and validates
const userPublicId = c.req.header('X-User-Id'); // ✅ Public ID
const user = await userQueries.findByPublicId(db, userPublicId); // Lookup internally
const internalId = user.id; // Use internal ID only for DB operations
```

### Type Safety

Use branded types to prevent accidental mixing:

```typescript
import { type InternalId, type PublicId } from '@proofa/shared';

interface User {
  id: InternalId;        // Database ID - internal only
  public_id: PublicId;   // API ID - safe to expose
  email: string;
}

// TypeScript will prevent:
function sendToClient(userId: PublicId) { /* ... */ }
const user = await getUser();
sendToClient(user.id); // ❌ Type error: InternalId not assignable to PublicId
sendToClient(user.public_id); // ✅ Correct
```

### Code Review Checklist

When reviewing PRs, check:

- [ ] No `user.id`, `project.id`, `app.id` in API responses (use `public_id`)
- [ ] No internal IDs in HTTP headers between services
- [ ] No internal IDs in route parameters (`:projectId` should expect public ID)
- [ ] No internal IDs in cache keys
- [ ] Service boundaries only exchange public IDs
- [ ] Database queries use internal IDs, API responses use public IDs

### Migration Strategy

When refactoring existing code:

1. Identify all API endpoints
2. Check if they expose `user.id`, `project.id`, etc.
3. Update to use `public_id` instead
4. Update service communication headers
5. Add type safety with `InternalId` and `PublicId` types

## Rate Limiting

Rate limiting is disabled in development mode (`NODE_ENV=development`) for easier testing.

Production mode enforces rate limits on:
- Authentication endpoints (10 req/5min)
- OTP requests (5 req/hour per email)
- OTP verification (5 attempts/5min per email)
- API endpoints (100 req/min)
- Webhooks (100 req/min)

## Environment Configuration

All environment variables must be accessed through `apps/services/*/src/config/env.ts`:

```typescript
// ❌ WRONG
const apiKey = process.env.STRIPE_API_KEY;

// ✅ CORRECT
import { env } from './config/env';
const apiKey = env.STRIPE_API_KEY;
```

Benefits:
- Type safety
- Validation on startup
- Single source of truth
- Default values
- Required vs optional clear

## Error Logging

**Never log credentials or sensitive data:**

```typescript
// ❌ WRONG
log.error({ error, body: req.body }, 'Failed to save credentials');

// ✅ CORRECT
log.error({ provider, projectId }, 'Failed to save credentials');
```

Rules:
- Never log full error objects (may contain request data)
- Never log request bodies containing credentials
- Never log encrypted credentials
- Sanitize before logging
