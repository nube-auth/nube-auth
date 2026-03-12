# JSONB Update Patterns - Complete Guide

**Status**: FINAL  
**Last Updated**: January 2026  
**Scope**: All JSONB column updates in Nube Auth

> **Quick Start**: Jump to [Quick Reference](#quick-reference) for copy-paste patterns

---

## Table of Contents

1. [Quick Reference](#quick-reference) - Daily dev patterns
2. [Why Atomic Updates](#why-atomic-updates) - The problem we're solving
3. [Core Functions](#core-functions) - Detailed API reference
4. [Design Principles](#design-principles) - Non-negotiable rules
5. [Common Patterns](#common-patterns) - Real-world examples
6. [Implementation Checklist](#implementation-checklist) - For new JSONB columns

---

## Quick Reference

### The Four Core Functions

#### 1. `buildJsonbMergeClause(column, updates)`
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
**SQL**: `security_settings || '{"sessionTtlDays": 60, "maxSessions": 10}'::jsonb`

---

#### 2. `buildJsonbSetClause(column, { path, value })`
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
**SQL**: `jsonb_set(security_settings, '{oauth,github,clientId}', '"gh-client-123"'::jsonb)`

---

#### 3. `createJsonbUpdateChain(column)`
**Use for**: Multiple updates in a single operation
```typescript
const updateChain = createJsonbUpdateChain(apps.security_settings)
  .set("redirectUris", ["https://example.com"])
  .set("oauth.github.enabled", true)
  .set("maxSessions", 5)
  .build();

await db.update(apps)
  .set({ security_settings: updateChain, updated_at: new Date() })
  .where(eq(apps.id, appId));
```
**SQL**: Chained `jsonb_set()` operations

---

#### 4. `jsonbField(column, path)` (SELECT only)
**Use for**: Extracting values in queries
```typescript
const results = await db
  .select({
    id: apps.id,
    sessionTtl: jsonbField(apps.security_settings, "sessionTtlDays"),
  })
  .from(apps);
```
**SQL**: `security_settings ->> 'sessionTtlDays'`

---

### Decision Tree

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

### Import Statements

```typescript
// Core functions
import {
  buildJsonbMergeClause,
  buildJsonbSetClause,
  createJsonbUpdateChain,
  jsonbField,
} from "@nube-auth/db";

// Or use pre-built query helpers (recommended)
import { appQueries } from "@nube-auth/db";
await appQueries.updateSecuritySettings(db, appId, updates);
await appQueries.updateAppTokens(db, appId, updates);
```

---

## Why Atomic Updates

### The Problem: Read-Modify-Write Anti-Pattern

```typescript
// ❌ This is BANNED
const app = await db.select().from(apps).where(eq(apps.id, appId));
const settings = app.security_settings;
settings.maxSessions = 10;  // ← Race condition window
await db.update(apps).set({ security_settings: settings });
```

**Issues**:
- **Race condition**: Another request could update between read and write
- **Lost updates**: Last write wins, earlier changes are discarded
- **Non-deterministic**: Behavior depends on timing
- **Scales poorly**: More concurrency = more collisions

### The Solution: Atomic Database Operations

```typescript
// ✅ This is REQUIRED
await db.update(apps)
  .set({
    security_settings: buildJsonbMergeClause(apps.security_settings, {
      maxSessions: 10,
    }),
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId));
```

**Benefits**:
- ✅ Zero race conditions: Atomic at DB level
- ✅ Complete correctness: All concurrent updates preserved
- ✅ Deterministic: Always correct result
- ✅ Scales excellently: High concurrency friendly

---

## Core Functions

### 1. `buildJsonbMergeClause()`

**Use when**: Updating 1-3 top-level fields

```typescript
buildJsonbMergeClause(apps.security_settings, {
  sessionTtlDays: 60,
  maxSessions: 10,
})
```

**Semantics**: Shallow merge
- New fields override existing
- Missing fields preserved
- Entire operation atomic

**Generated SQL**:
```sql
security_settings || '{"sessionTtlDays": 60, "maxSessions": 10}'::jsonb
```

---

### 2. `buildJsonbSetClause()`

**Use when**: Updating a single deeply-nested value

```typescript
buildJsonbSetClause(apps.security_settings, {
  path: "oauth.github.clientId",
  value: "gh-123",
})
```

**Semantics**: Deep update
- Creates intermediate paths if needed
- Precise targeting
- Path is variable/dynamic

**Generated SQL**:
```sql
jsonb_set(security_settings, '{oauth,github,clientId}', '"gh-123"'::jsonb)
```

---

### 3. `createJsonbUpdateChain()`

**Use when**: Updating 2-8 nested paths in one transaction

```typescript
const chain = createJsonbUpdateChain(apps.security_settings)
  .set("oauth.github.enabled", true)
  .set("oauth.github.clientId", "gh-123")
  .set("redirectUris", ["https://example.com"])
  .delete("oauth.github.clientSecret")  // Remove sensitive data
  .build();
```

**Semantics**: Multiple precise updates
- Fluent API
- All updates atomic
- Can mix set/delete operations

**Generated SQL**: Chained `jsonb_set()` and `#-` operations

---

### 4. `buildJsonbDeleteClause()`

**Use when**: Removing keys from JSONB

```typescript
buildJsonbDeleteClause(apps.security_settings, "oauth.github")
```

**Semantics**: Remove entire subtree

**Generated SQL**:
```sql
security_settings #- '{oauth,github}'
```

---

### 5. `jsonbField()` (SELECT only)

**Use when**: Querying specific JSONB fields

```typescript
const results = await db
  .select({
    id: apps.id,
    sessionTtl: jsonbField(apps.security_settings, "sessionTtlDays"),
    githubEnabled: jsonbField(apps.security_settings, "oauth.github.enabled"),
  })
  .from(apps);
```

**Generated SQL**:
```sql
security_settings ->> 'sessionTtlDays'
```

---

## Design Principles

### 1. Never Hand-Construct JSONB Updates

❌ **WRONG**:
```typescript
await db.update(apps)
  .set({
    security_settings: { ...oldSettings, newField: value },
  })
  .where(eq(apps.id, appId));
```

✅ **CORRECT**:
```typescript
await db.update(apps)
  .set({
    security_settings: buildJsonbMergeClause(apps.security_settings, {
      newField: value,
    }),
  })
  .where(eq(apps.id, appId));
```

---

### 2. Always Set `updated_at`

Database triggers ensure this, but code should set it too:

```typescript
await db.update(apps)
  .set({
    security_settings: buildJsonbMergeClause(...),
    updated_at: new Date(),  // ← Always include
  })
  .where(eq(apps.id, appId));
```

---

### 3. Validate at Helper Level

❌ **WRONG** (validation scattered):
```typescript
// Route 1
const validated = Schema1.parse(await c.req.json());
await appQueries.updateSecuritySettings(db, appId, validated);

// Route 2 (different schema!)
const validated = Schema2.parse(await c.req.json());
await appQueries.updateSecuritySettings(db, appId, validated);
```

✅ **CORRECT** (single source of truth):
```typescript
// packages/db/src/queries.ts
async updateSecuritySettings(db, appId, updates: unknown) {
  const validated = SecuritySettingsPatchSchema.parse(updates);
  // ... update ...
}
```

---

### 4. No Array Element Mutations

❌ **WRONG**:
```typescript
.set("redirectUris.0", "https://new.com")  // Don't do this
```

✅ **CORRECT**:
```typescript
// Replace entire array
.set("redirectUris", ["https://new.com", "https://example.com"])
```

**Why**: Array indices are unstable. PostgreSQL jsonb_set doesn't handle arrays well.

---

### 5. Prefer Query Helpers Over Raw Functions

#### 1. Pre-built Query Helpers (99% of app code)
```typescript
✅ This is the only pattern for application code
await appQueries.updateSecuritySettings(db, appId, updates);
```

#### 2. Raw Functions (Rare - Infrastructure only)
```typescript
⚠️ Only for infrastructure-level code
const validated = SecuritySettingsPatchSchema.parse(updates);
await db.update(apps).set({
  security_settings: buildJsonbMergeClause(apps.security_settings, validated),
  updated_at: new Date(),
}).where(eq(apps.id, appId));
```

---

### 6. JSONB Indexing Required

Every JSONB column needs indexes:

```sql
-- GIN index for general JSONB operations
CREATE INDEX idx_apps_security_settings_gin
ON apps USING GIN (security_settings);

-- Expression indexes for frequently-queried fields
CREATE INDEX idx_apps_session_ttl
ON apps ((security_settings->>'sessionTtlDays')::integer);
```

---

## Common Patterns

### Pattern: Update Single Field
```typescript
await appQueries.updateSecuritySettings(db, appId, {
  sessionTtlDays: 60,
});
```

---

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

---

### Pattern: OAuth Configuration
```typescript
const updateChain = createJsonbUpdateChain(apps.security_settings)
  .set("oauth.github.enabled", true)
  .set("oauth.github.clientId", clientId)
  .set("oauth.github.clientSecret", clientSecret)
  .build();

await db.update(apps)
  .set({ security_settings: updateChain, updated_at: new Date() })
  .where(eq(apps.id, appId));
```

---

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

---

### Pattern: Remove Sensitive Data
```typescript
const updateChain = createJsonbUpdateChain(apps.security_settings)
  .delete("oauth.github.clientSecret")
  .build();

await db.update(apps)
  .set({ security_settings: updateChain, updated_at: new Date() })
  .where(eq(apps.id, appId));
```

---

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

## Implementation Checklist

### For New JSONB Columns

- [ ] Define `ColumnSchema` in `packages/db/src/schemas/jsonb.ts`
- [ ] Define `ColumnPatchSchema` (all fields optional, strict)
- [ ] Create helper function: `async update${Column}(..., validated)`
- [ ] Add validation to helper using `ColumnPatchSchema.parse()`
- [ ] Set `updated_at` in every update
- [ ] Create GIN index in migration
- [ ] Document: "Update entire arrays, never elements"
- [ ] Add tests for concurrent updates

---

### For Existing JSONB Updates

- [ ] Audit for read-modify-write patterns
- [ ] Replace with atomic helpers
- [ ] Add validation at helper level
- [ ] Ensure `updated_at` is always set
- [ ] Verify indexes exist
- [ ] Test concurrent scenarios
- [ ] Update documentation

---

### Code Review Checklist

Before merging JSONB update code:

- [ ] No read-modify-write pattern
- [ ] Uses atomic function
- [ ] `updated_at` is set
- [ ] Validation happens at helper level
- [ ] No numeric path segments (`.0`, `.1`)
- [ ] Arrays updated entirely, never elements
- [ ] Has test for concurrent updates
- [ ] Appropriate indexes exist

---

## Performance Guidance

### When Chaining is Appropriate

```
1-2 fields   → Perfect, highly readable
3-5 fields   → Good, still efficient
6-8 fields   → Acceptable, getting complex
9+ fields    → Consider replacing whole object
```

### Query Performance

**Expression indexes are critical**:

```typescript
// ❌ SLOW without index
WHERE (security_settings->>'sessionTtlDays')::integer > 3600

// ✅ FAST with expression index
CREATE INDEX idx_apps_session_ttl 
ON apps ((security_settings->>'sessionTtlDays')::integer);
```

---

## Do's and Don'ts

### ✅ DO

- Use atomic JSONB functions for all updates
- Set `updated_at: new Date()` with every update
- Use type-safe paths with TypeScript
- Validate input data before updates
- Test concurrent update scenarios
- Use query helpers in application code
- Replace entire arrays, not elements

### ❌ DON'T

- Read JSONB, modify in app, write back
- Manually merge objects in application code
- Skip validation on user input
- Forget to update `updated_at`
- Use `||` directly in queries
- Use raw functions in route handlers
- Update array elements by index

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

## PostgreSQL Requirements

- **Version**: 9.5+ (JSONB operators available)
- **Recommended**: 14+ for best performance
- **Check**: `SELECT version();`

---

## Performance Metrics

- Single atomic operation = **1 database round-trip**
- Traditional read-modify-write = **2 round-trips** + race conditions
- No transaction overhead with atomic approach
- Scales linearly with concurrent requests

---

## FAQ

**Q: Can I update part of an array?**  
A: No. Update the entire array or use a different data structure.

**Q: What if I need to update 20+ fields?**  
A: That's a sign your JSONB schema might be too broad. Consider splitting into multiple columns.

**Q: How do I handle optional/null JSONB updates?**  
A: Merge updates are "upsert" by nature. Use `.delete()` to remove a key entirely.

**Q: Is atomic JSONB slower than read-modify-write?**  
A: No. It's faster (1 round-trip vs 2) and always correct.

**Q: What PostgreSQL version do I need?**  
A: 9.5+ (basic), 14+ recommended.

---

## References

- **PostgreSQL JSONB**: https://www.postgresql.org/docs/current/datatype-json.html
- **JSONB Functions**: https://www.postgresql.org/docs/current/functions-json.html
- **Drizzle ORM JSON**: https://orm.drizzle.team/docs/schema-reference/other-types#json
- **Examples**: `packages/db/src/examples/atomic-jsonb-examples.ts`

---

## Sign-Off

This document represents a committed approach to JSONB updates across Nube Auth.

- **Approved**: Engineering Leadership
- **Implementation**: All teams
- **Enforcement**: Code review + linting
- **Review Date**: Q3 2026

All new JSONB code must follow these patterns. Existing code should be migrated incrementally.

---

**Last Updated**: January 10, 2026  
**Status**: FINAL  
**Version**: 2.0 (Consolidated)
