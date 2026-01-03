# Atomic JSONB Updates Implementation Guide

## Overview

This guide explains how to implement Option 3 (PostgreSQL JSONB operators for atomic updates) in your Proofa Core application. This approach eliminates race conditions when updating JSONB columns by performing all operations at the database level.

## The Problem: Read-Modify-Write Race Conditions

### ❌ UNSAFE Approach (Traditional)
```typescript
// Current implementation - has race condition
const app = await db.select().from(apps).where(eq(apps.id, appId));
const settings = app.security_settings;
settings.sessionTtlDays = 60;
settings.maxSessions = 10;
await db.update(apps).set({ security_settings: settings });
```

**Problem**: Between read and write, another request could modify `security_settings`, causing a lost update:
1. Request A reads: `{ sessionTtlDays: 30, maxSessions: 5 }`
2. Request B reads: `{ sessionTtlDays: 30, maxSessions: 5 }`
3. Request A writes: `{ sessionTtlDays: 60, maxSessions: 5 }`
4. Request B writes: `{ sessionTtlDays: 30, maxSessions: 10 }`
5. Result: Request A's change is lost!

### ✅ SAFE Approach (Atomic)
```typescript
// Atomic database operation - no lost updates
await db.update(apps)
  .set({
    security_settings: buildJsonbMergeClause(apps.security_settings, {
      sessionTtlDays: 60,
      maxSessions: 10,
    }),
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId))
  .returning();
```

**Solution**: Entire update happens in database, atomically. No race condition possible.

## PostgreSQL JSONB Operators

### The `||` (Merge) Operator
```sql
-- Shallow merge at top level
UPDATE apps 
SET security_settings = security_settings || '{"sessionTtlDays": 60}'::jsonb
WHERE id = 1;
```
- **Best for**: Top-level field updates
- **Semantics**: Merges new fields, preserves existing fields not in the new object
- **Type**: Shallow (only updates top-level keys)

### The `jsonb_set()` Function
```sql
-- Deep update using path array
UPDATE apps
SET security_settings = jsonb_set(
  security_settings,
  '{oauth, github, clientId}',
  '"gh-client-123"'::jsonb
)
WHERE id = 1;
```
- **Best for**: Deep nested path updates
- **Semantics**: Creates intermediate objects if path doesn't exist
- **Type**: Deep (works with nested paths)

## Implementation Details

### 1. JSONB Utility Functions (Already Implemented)

Located in: `packages/db/src/utils/jsonb.ts`

#### `buildJsonbMergeClause(column, updates)`
Generates PostgreSQL merge operation:
```typescript
import { buildJsonbMergeClause } from "@proofa/db";

// Generates: security_settings || '{"sessionTtlDays": 60}'::jsonb
const updateExpr = buildJsonbMergeClause(apps.security_settings, {
  sessionTtlDays: 60,
});

await db.update(apps)
  .set({ security_settings: updateExpr })
  .where(eq(apps.id, appId));
```

#### `buildJsonbSetClause(column, { path, value })`
Generates PostgreSQL jsonb_set operation:
```typescript
import { buildJsonbSetClause } from "@proofa/db";

// Generates: jsonb_set(security_settings, '{oauth,github,clientId}', '"value"'::jsonb)
const updateExpr = buildJsonbSetClause(apps.security_settings, {
  path: "oauth.github.clientId",
  value: "gh-client-123",
});

await db.update(apps)
  .set({ security_settings: updateExpr })
  .where(eq(apps.id, appId));
```

#### `createJsonbUpdateChain(column)`
Chains multiple updates into single operation:
```typescript
import { createJsonbUpdateChain } from "@proofa/db";

const updateChain = createJsonbUpdateChain(apps.security_settings)
  .set("redirectUris", ["https://example.com/callback"])
  .set("oauth.github.enabled", true)
  .set("maxSessions", 5)
  .build();

await db.update(apps)
  .set({ security_settings: updateChain })
  .where(eq(apps.id, appId));
```

#### `jsonbField(column, path)`
Extracts nested values in SELECT queries:
```typescript
import { jsonbField } from "@proofa/db";

const results = await db
  .select({
    id: apps.id,
    sessionTtl: jsonbField(apps.security_settings, "sessionTtlDays"),
    githubEnabled: jsonbField(apps.security_settings, "oauth.github.enabled"),
  })
  .from(apps);
```

### 2. Query Helpers (Located in `packages/db/src/queries.ts`)

Pre-built helpers for common operations:

```typescript
import { appQueries, getDb } from "@proofa/db";

const db = getDb();

// Simple merge update
await appQueries.updateSecuritySettings(db, appId, {
  sessionTtlDays: 60,
  maxSessions: 10,
});

// Update app tokens (for key rotation)
await appQueries.updateAppTokens(db, appId, {
  currentKey: { value: newKey, rotatedAt: new Date() },
});

// Update plan settings
await appQueries.updatePlanSettings(db, appId, {
  maxApiCalls: 10000,
  rateLimitPerMinute: 100,
});

// Update specific nested field
await appQueries.updateJsonbField(
  db,
  appId,
  "security_settings",
  "oauth.github.clientId",
  "gh-client-123"
);

// Batch update multiple fields at once
await appQueries.batchUpdateJsonbFields(db, appId, [
  {
    fieldName: "security_settings",
    path: "sessionTtlDays",
    value: 60,
  },
  {
    fieldName: "plan_settings",
    path: "maxApiCalls",
    value: 10000,
  },
]);
```

## Real-World Examples

### Example 1: OAuth Configuration Update

**Scenario**: Admin updates GitHub OAuth settings
**Old (unsafe)**:
```typescript
// Problem: Other concurrent requests could lose their updates
const app = await db.select().from(apps).where(eq(apps.id, appId));
const settings = app.security_settings;
settings.oauth.github.clientId = newClientId;
await db.update(apps).set({ security_settings: settings });
```

**New (safe)**:
```typescript
// Atomic - no lost updates possible
await appQueries.updateJsonbField(
  db,
  appId,
  "security_settings",
  "oauth.github.clientId",
  newClientId
);
```

### Example 2: API Key Rotation

**Scenario**: User rotates their API key
**Old (unsafe)**:
```typescript
const app = await db.select().from(apps).where(eq(apps.id, appId));
const tokens = app.app_tokens;
tokens.previousKey = tokens.currentKey;
tokens.currentKey = { value: newKey, rotatedAt: new Date() };
await db.update(apps).set({ app_tokens: tokens });
```

**New (safe)**:
```typescript
// Atomic - prevents duplicate key issues
const updateChain = createJsonbUpdateChain(apps.app_tokens)
  .set("previousKey", tokens.currentKey)
  .set("currentKey", { value: newKey, rotatedAt: new Date() })
  .build();

await db.update(apps)
  .set({ app_tokens: updateChain })
  .where(eq(apps.id, appId));
```

### Example 3: Payment Provider Metadata Update

**Scenario**: Store webhook configuration atomically
```typescript
// Update payment provider metadata
await db.update(payment_providers)
  .set({
    metadata: buildJsonbMergeClause(payment_providers.metadata, {
      webhookUrl: "https://api.example.com/webhooks/stripe",
      retryPolicy: { maxRetries: 3, backoff: 2 },
    }),
    updated_at: new Date(),
  })
  .where(eq(payment_providers.id, providerId));
```

## Updating Route Handlers

### Payment Provider Routes (`apps/core/src/routes/v1/admin/providers.ts`)

**Before (potential race condition)**:
```typescript
export async function updatePaymentProvider(c: Context) {
  const db = getDb();
  const providerId = parseInt(c.req.param("providerId"), 10);
  const data = await c.req.json();

  // This could have race conditions if metadata is being updated
  const provider = await db.select().from(payment_providers)
    .where(eq(payment_providers.id, providerId));
  
  // Lost update possible here!
  provider.metadata = { ...provider.metadata, ...data.metadata };
  
  await db.update(payment_providers)
    .set({ metadata: provider.metadata })
    .where(eq(payment_providers.id, providerId));
}
```

**After (safe)**:
```typescript
export async function updatePaymentProvider(c: Context) {
  const db = getDb();
  const providerId = parseInt(c.req.param("providerId"), 10);
  const { metadata, credentials, webhookSecret } = await c.req.json();

  // Atomic metadata update
  if (metadata) {
    await db.update(payment_providers)
      .set({
        metadata: buildJsonbMergeClause(payment_providers.metadata, metadata),
        updated_at: new Date(),
      })
      .where(eq(payment_providers.id, providerId));
  }

  // Atomic credentials update
  if (credentials) {
    const encrypted = encryptPaymentCredentials(credentials);
    await db.update(payment_providers)
      .set({
        credentials: encrypted,
        webhook_secret: webhookSecret,
        updated_at: new Date(),
      })
      .where(eq(payment_providers.id, providerId));
  }

  return c.json({ success: true });
}
```

## Type Safety

### Ensuring Type-Safe Paths

The utility functions use TypeScript's type system to ensure paths are valid:

```typescript
// ✅ Type-safe - path is validated against security_settings structure
await appQueries.updateJsonbField(
  db,
  appId,
  "security_settings",
  "oauth.github.clientId", // Type checker validates this path
  "gh-123"
);

// ❌ Type error - path doesn't exist in structure
await appQueries.updateJsonbField(
  db,
  appId,
  "security_settings",
  "invalidPath", // ERROR: not in schema
  "value"
);
```

## Performance Considerations

### Advantages Over Read-Modify-Write

| Aspect | Read-Modify-Write | Atomic JSONB |
|--------|-------------------|-------------|
| Race Conditions | ✅ Possible | ❌ None |
| Database Round-trips | 2 (read + write) | 1 (write only) |
| Transaction Support | Requires explicit transaction | Built-in |
| Complexity | High (manual merging) | Low (DB handles it) |
| Consistency | Eventual | Immediate |
| Scalability | Poor with high concurrency | Excellent |

### When to Use Each Approach

**Use Atomic JSONB Updates**:
- ✅ Updating any JSONB field in a production environment
- ✅ High-concurrency scenarios (multiple concurrent requests)
- ✅ Mission-critical data (payments, security settings)
- ✅ Complex nested structures

**Rarely use Read-Modify-Write**:
- Only when you need to fetch entire JSONB document for client response
- Even then, update should be atomic

## Migration Strategy

### Step 1: Update Query Helpers
All query helpers in `packages/db/src/queries.ts` already use atomic JSONB updates.

### Step 2: Update Route Handlers
Update all route handlers to use atomic queries:

```typescript
// Before
const app = await appQueries.findById(db, appId);
const settings = app.security_settings;
settings.newField = value;
await db.update(apps).set({ security_settings: settings });

// After
await appQueries.updateSecuritySettings(db, appId, {
  newField: value,
});
```

### Step 3: Database Verification
Verify PostgreSQL version supports JSONB operators:
- `||` operator: Available in PostgreSQL 9.5+
- `jsonb_set()`: Available in PostgreSQL 9.5+

```sql
-- Verify in PostgreSQL
SELECT version();
-- Should be 9.5 or later
```

## Testing

### Unit Test Example
```typescript
import { createJsonbUpdateChain } from "@proofa/db";

describe("Atomic JSONB Updates", () => {
  it("should build correct SQL for chain updates", async () => {
    const chain = createJsonbUpdateChain(apps.security_settings)
      .set("sessionTtlDays", 60)
      .set("oauth.github.enabled", true)
      .build();

    // Verify SQL is generated correctly
    expect(chain.toString()).toContain("jsonb_set");
  });

  it("should prevent race conditions with concurrent updates", async () => {
    const appId = 1;
    
    // Simulate concurrent updates
    const [result1, result2] = await Promise.all([
      appQueries.updateSecuritySettings(db, appId, { sessionTtlDays: 60 }),
      appQueries.updateSecuritySettings(db, appId, { maxSessions: 10 }),
    ]);

    // Both updates should be present
    expect(result1.security_settings.sessionTtlDays).toBe(60);
    expect(result1.security_settings.maxSessions).toBe(10);
  });
});
```

### Integration Test Example
```typescript
it("should atomically merge JSONB updates without lost updates", async () => {
  const appId = 1;
  
  // Insert test app
  const app = await db.insert(apps).values({
    // ...
    security_settings: {
      sessionTtlDays: 30,
      maxSessions: 5,
    },
  }).returning();

  // Atomic merge update
  const updated = await appQueries.updateSecuritySettings(db, appId, {
    sessionTtlDays: 60,
  });

  // Verify old fields are preserved
  expect(updated.security_settings.maxSessions).toBe(5);
  expect(updated.security_settings.sessionTtlDays).toBe(60);
});
```

## Summary

### Key Takeaways
1. **Always use atomic JSONB operations** for production code
2. **Use `buildJsonbMergeClause`** for top-level updates
3. **Use `buildJsonbSetClause`** for deep nested updates
4. **Use `createJsonbUpdateChain`** for multiple updates
5. **No read-modify-write pattern** - database handles it
6. **Fully type-safe** with TypeScript validation

### Implementation Checklist
- [ ] Review all JSONB update queries in route handlers
- [ ] Replace read-modify-write patterns with atomic operations
- [ ] Update unit tests to verify atomicity
- [ ] Verify PostgreSQL version supports JSONB (9.5+)
- [ ] Deploy and monitor concurrent update scenarios
- [ ] Remove old read-fetch-modify pattern from codebase

### Files to Update
- `apps/core/src/routes/v1/admin/providers.ts` - Payment provider routes
- `apps/core/src/routes/v1/**/*.ts` - All route handlers with JSONB updates
- `packages/db/src/queries.ts` - Already done, verify all helpers are used
- `packages/db/src/providers.ts` - Review for any unsafe patterns

### Support and Resources
- PostgreSQL JSONB docs: https://www.postgresql.org/docs/current/datatype-json.html
- Drizzle ORM JSONB: https://orm.drizzle.team/docs/schema-reference/other-types#json
- JSONB operators: https://www.postgresql.org/docs/current/functions-json.html
