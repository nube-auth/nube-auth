# Atomic JSONB Updates - Quick Reference

## The Three Core Functions

### 1. `buildJsonbMergeClause(column, updates)`
**Use for**: Top-level field updates
```typescript
await db.update(apps)
  .set({
    security_settings: buildJsonbMergeClause(apps.security_settings, {
      sessionTtlDays: 60,
      maxSessions: 10,
    }),
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId));
```

**Generates SQL**: `security_settings || '{"sessionTtlDays": 60, "maxSessions": 10}'::jsonb`

**Semantics**: Shallow merge - new fields override, missing fields preserved

---

### 2. `buildJsonbSetClause(column, { path, value })`
**Use for**: Deep nested path updates
```typescript
await db.update(apps)
  .set({
    security_settings: buildJsonbSetClause(apps.security_settings, {
      path: "oauth.github.clientId",
      value: "gh-client-123",
    }),
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId));
```

**Generates SQL**: `jsonb_set(security_settings, '{oauth,github,clientId}', '"gh-client-123"'::jsonb)`

**Semantics**: Deep update - creates intermediate paths if needed

---

### 3. `createJsonbUpdateChain(column)`
**Use for**: Multiple updates in a single operation
```typescript
const updateChain = createJsonbUpdateChain(apps.security_settings)
  .set("redirectUris", ["https://example.com"])
  .set("oauth.github.enabled", true)
  .set("maxSessions", 5)
  .build();

await db.update(apps)
  .set({
    security_settings: updateChain,
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId));
```

**Generates SQL**: Chained `jsonb_set()` operations

**Semantics**: Multiple precise updates - atomic

---

### 4. `jsonbField(column, path)` (SELECT only)
**Use for**: Extracting values in queries
```typescript
const results = await db
  .select({
    id: apps.id,
    sessionTtl: jsonbField(apps.security_settings, "sessionTtlDays"),
    githubEnabled: jsonbField(apps.security_settings, "oauth.github.enabled"),
  })
  .from(apps);
```

**Generates SQL**: `security_settings ->> 'sessionTtlDays'`

**Semantics**: Extraction at database level

---

## Decision Tree

```
Do I need to UPDATE a JSONB column?
├── YES: Is it a single top-level field?
│   ├── YES → Use buildJsonbMergeClause()
│   └── NO → Updating nested paths?
│       ├── YES (single path) → Use buildJsonbSetClause()
│       └── YES (multiple paths) → Use createJsonbUpdateChain()
└── NO (SELECT): Use jsonbField()
```

---

## Common Patterns

### Pattern: Update Single Field
```typescript
await appQueries.updateSecuritySettings(db, appId, {
  sessionTtlDays: 60,
});
```

### Pattern: Update Nested Field
```typescript
await appQueries.updateJsonbField(
  db,
  appId,
  "security_settings",
  "oauth.github.clientId",
  "gh-123"
);
```

### Pattern: API Key Rotation
```typescript
const updateChain = createJsonbUpdateChain(apps.app_tokens)
  .set("currentKey.value", newKey)
  .set("currentKey.rotatedAt", new Date())
  .set("previousKey", oldKey)
  .build();

await db.update(apps)
  .set({ app_tokens: updateChain, updated_at: new Date() })
  .where(eq(apps.id, appId));
```

### Pattern: Webhook Configuration
```typescript
await db.update(payment_providers)
  .set({
    metadata: buildJsonbMergeClause(payment_providers.metadata, {
      webhookUrl: "https://api.example.com/webhooks",
      retryPolicy: { maxRetries: 3, backoff: 2 },
    }),
    updated_at: new Date(),
  })
  .where(eq(payment_providers.id, providerId));
```

---

## Import Statement
```typescript
import {
  buildJsonbMergeClause,
  buildJsonbSetClause,
  createJsonbUpdateChain,
  jsonbField,
} from "@proofa/db";
```

Or use pre-built query helpers:
```typescript
import { appQueries } from "@proofa/db";

await appQueries.updateSecuritySettings(db, appId, updates);
await appQueries.updateAppTokens(db, appId, updates);
await appQueries.updatePlanSettings(db, appId, updates);
await appQueries.updateJsonbField(db, appId, fieldName, path, value);
await appQueries.batchUpdateJsonbFields(db, appId, updates);
```

---

## Do's and Don'ts

✅ **DO**:
- Use atomic JSONB functions for all updates
- Set `updated_at: new Date()` with every update
- Use type-safe paths with TypeScript
- Validate input data before updates
- Test concurrent update scenarios

❌ **DON'T**:
- Read JSONB, modify in app, write back
- Manually merge objects in application code
- Skip validation on user input
- Forget to update `updated_at`
- Use `||` directly in queries (use functions instead)

---

## PostgreSQL Requirements
- Version: 9.5+ (JSONB operators available)
- Check: `SELECT version();`

---

## Performance
- Single atomic operation = 1 database round-trip
- Traditional read-modify-write = 2 round-trips
- No transaction overhead with atomic approach
- Scales better with concurrent requests

---

## Troubleshooting

### "Cannot find property in path"
- Check path syntax: use dot notation "field.nested.property"
- Verify field exists in JSONB schema

### "SQL syntax error"
- Ensure column reference is correct
- Check JSON value is properly serialized

### "Lost updates still happening"
- Verify not using read-modify-write pattern
- Use atomic functions exclusively
- Check all routes for manual JSONB merging

---

## Testing Pattern
```typescript
it("should prevent concurrent JSONB updates from losing data", async () => {
  const appId = 1;
  
  const [result1, result2] = await Promise.all([
    appQueries.updateSecuritySettings(db, appId, { sessionTtlDays: 60 }),
    appQueries.updateSecuritySettings(db, appId, { maxSessions: 10 }),
  ]);

  // Both updates should be present
  expect(result1.security_settings.sessionTtlDays).toBe(60);
  expect(result1.security_settings.maxSessions).toBe(10);
});
```

---

## Additional Resources
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Drizzle ORM JSON](https://orm.drizzle.team/docs/schema-reference/other-types#json)
- [JSON Operators & Functions](https://www.postgresql.org/docs/current/functions-json.html)
- Full Implementation Guide: `docs/ATOMIC_JSONB_IMPLEMENTATION.md`
- Examples: `packages/db/src/examples/atomic-jsonb-examples.ts`
