# JSONB Update Patterns - Internal RFC & Guidelines

**Status**: FINAL  
**Date**: January 2026  
**Author**: Engineering Team  
**Scope**: All JSONB column updates in Proofa Core

---

## Executive Summary

This RFC codifies the atomic JSONB update approach for all JSON/JSONB columns in the database. **Read-modify-write patterns are banned**. All JSONB updates must use atomic database operations.

### Key Decisions

1. **Atomic updates mandatory** - All JSONB updates happen at DB level, never in application code
2. **Typed helpers only** - `buildJsonbMergeClause`, `buildJsonbSetClause`, `createJsonbUpdateChain`
3. **Schemas co-located with helpers** - Validation happens at helper level, not routes
4. **No array element mutations** - Replace entire arrays or use different storage
5. **Delete support available** - Use `buildJsonbDeleteClause` or `chain.delete()` for removals

---

## Problem Statement

### Before: Read-Modify-Write Anti-Pattern

```typescript
// ❌ This is BANNED
const app = await db.select().from(apps).where(eq(apps.id, appId));
const settings = app.security_settings;
settings.maxSessions = 10;  // ← Race condition window
await db.update(apps).set({ security_settings: settings });
```

**Issues**:
- Race condition: Another request could update between read and write
- Lost updates: Last write wins, earlier changes are discarded
- Non-deterministic: Behavior depends on timing
- Scales poorly: More concurrency = more collisions

### After: Atomic Database Operations

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
- Zero race conditions: Atomic at DB level
- Complete correctness: All concurrent updates preserved
- Deterministic: Always correct result
- Scales excellently: High concurrency friendly

---

## Decision Matrix: When to Use Each Function

### Simple Top-Level Updates → `buildJsonbMergeClause()`

**Use when**:
- Updating 1-3 top-level fields
- Values are known upfront
- Don't need to navigate nested structures

**Example**:
```typescript
// Update sessionTtlDays and maxSessions
buildJsonbMergeClause(apps.security_settings, {
  sessionTtlDays: 60,
  maxSessions: 10,
})
```

**SQL**: `security_settings || '{"sessionTtlDays": 60, ...}'::jsonb`

---

### Single Nested Path Update → `buildJsonbSetClause()`

**Use when**:
- Updating a single deeply-nested value
- Path is variable/dynamic
- Want precise targeting

**Example**:
```typescript
// Update oauth.github.clientId
buildJsonbSetClause(apps.security_settings, {
  path: "oauth.github.clientId",
  value: "gh-123",
})
```

**SQL**: `jsonb_set(security_settings, '{oauth,github,clientId}', '"gh-123"'::jsonb)`

---

### Multiple Nested Paths → `createJsonbUpdateChain()`

**Use when**:
- Updating 2-8 nested paths
- Want fluent/readable API
- All updates in single transaction

**Example**:
```typescript
const chain = createJsonbUpdateChain(apps.security_settings)
  .set("oauth.github.enabled", true)
  .set("oauth.github.clientId", "gh-123")
  .set("redirectUris", ["https://example.com"])
  .build();
```

**SQL**: Chained `jsonb_set()` calls

---

### Delete/Remove Keys → `buildJsonbDeleteClause()` or `chain.delete()`

**Use when**:
- Removing an entire key/subtree
- Disabling an OAuth provider
- Clearing sensitive data

**Example**:
```typescript
// Remove entire GitHub config
buildJsonbDeleteClause(apps.security_settings, "oauth.github")

// Or in chain
chain.delete("oauth.github")
```

**SQL**: `security_settings #- '{oauth,github}'`

---

### Extract Values in SELECT → `jsonbField()`

**Use when**:
- Selecting specific JSONB fields
- Building queries that filter on JSONB
- Performing joins on JSONB data

**Example**:
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

## Design Principles

### 1. Never Hand-Construct JSONB Updates

❌ **WRONG**:
```typescript
await db.update(apps)
  .set({
    security_settings: { ...oldSettings, newField: value },  // Manual merge
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

**Why**: Hand-constructed updates are subject to race conditions. The database must handle atomicity.

---

### 2. Always Set `updated_at` with JSONB Updates (Database Trigger - Official Approach)

**Official Enforcement Method**: Database trigger (PRIMARY)

This RFC mandates a **database trigger** as the official enforcement mechanism. This is non-negotiable for Proofa (Postgres-first, fully controlled migrations).

#### Database Trigger (Recommended - Impossible to Forget)

```sql
-- Create in migration
CREATE TRIGGER apps_security_settings_updated_at
BEFORE UPDATE ON apps
FOR EACH ROW
BEGIN
  IF NEW.security_settings IS DISTINCT FROM OLD.security_settings THEN
    NEW.updated_at = NOW();
  END IF;
END;
```

**Benefits**:
- Completely automatic - zero chance of forgetting
- No code duplication across query helpers
- Audit-proof (database enforces the rule)
- Works for accidental direct SQL updates too

**Application Code** (trigger ensures updated_at, but you still set it):
```typescript
✅ **CORRECT** (application code):
```typescript
await db.update(apps)
  .set({
    security_settings: buildJsonbMergeClause(...),
    updated_at: new Date(),  // App layer sets it, trigger confirms it
  })
  .where(eq(apps.id, appId));
```

#### Fallback: Helper Wrapper (If triggers can't be deployed)

If you use multiple databases or triggers are fragile in your deployment:

```typescript
export async function updateJsonbAtomically(
  db: DbClient,
  table: PgTable,
  column: PgColumn,
  path: string,
  value: any,
) {
  return db.update(table)
    .set({
      [column.name]: buildJsonbSetClause(column, { path, value }),
      updated_at: new Date(),  // ← Impossible to forget
    });
}
```

**Why this decision**:
- Proofa is Postgres-first with full migration control → trigger wins
- Triggers eliminate an entire class of bugs (forgotten `updated_at`)
- Helper wrapper is a fallback pattern, not a first-class option
- Having both "official" approaches means neither is consistently used

**Non-Negotiable**:
✅ All JSONB updates must have `updated_at` set (either by trigger or code)  
❌ New code should NOT use wrapper approach - prefer trigger for 100% guarantee  
❌ Don't have optional `updated_at` - always set it

---

### 3. Validate Patches at Helper Level, Not Routes

❌ **WRONG** (validation scattered):
```typescript
// Route 1
router.patch("/security", (c) => {
  const validated = SecuritySettingsSchema.parse(await c.req.json());
  await appQueries.updateSecuritySettings(db, appId, validated);
});

// Route 2 (different schema!)
router.patch("/admin/security", (c) => {
  const validated = AdminSecuritySchema.parse(await c.req.json());
  await appQueries.updateSecuritySettings(db, appId, validated);
});
```

✅ **CORRECT** (single canonical schema):
```typescript
// packages/db/src/queries.ts
async updateSecuritySettings(db, appId, updates: unknown) {
  const validated = SecuritySettingsPatchSchema.parse(updates);  // One schema
  // ... update ...
}

// Both routes use same helper
router.patch("/security", (c) => {
  await appQueries.updateSecuritySettings(db, appId, await c.req.json());
});

router.patch("/admin/security", (c) => {
  await appQueries.updateSecuritySettings(db, appId, await c.req.json());
});
```

**Why**: Single source of truth for validation. Prevents schema drift between routes.

---

### 4. No Array Element Mutations

❌ **WRONG**:
```typescript
.set("redirectUris.0", "https://new.com")  // ← Don't do this
.delete("redirectUris.1")                   // ← Or this
```

✅ **CORRECT**:
```typescript
// Replace entire array
.set("redirectUris", ["https://new.com", "https://example.com"])

// Or manipulate in app code then update
const uris = app.security_settings.redirectUris as string[];
const updated = [...uris, newUri];
await appQueries.updateSecuritySettings(db, appId, {
  redirectUris: updated,
});
```

**Why**:
- Array indices are unstable (shifting, gaps)
- PostgreSQL jsonb_set doesn't handle arrays well
- Risk of silent data corruption
- Replacing entire array is atomic and safe

---

### 5. Prefer Query Helpers Over Raw Functions (Strong Enforcement)

**Strict Preference Order**:

#### 1. **Pre-built Query Helpers** (Strongly Preferred - 99% of app code)
```typescript
✅ This is the only pattern for application code
await appQueries.updateSecuritySettings(db, appId, updates);
```

**Why this wins**:
- Single responsibility: Validation + Atomicity + `updated_at` all together
- No way to forget `updated_at` (it's in the helper)
- Centralized validation (no schema drift)
- Type-safe and easy to audit
- Discoverable in codebase (search for pattern)

#### 2. **Raw `buildJsonbMergeClause` with validation** (Rare - Infra/shared code only)
```typescript
⚠️ Only for infrastructure-level code (services, shared utilities)
// Must validate first
const validated = SecuritySettingsPatchSchema.parse(updates);
// Must set updated_at explicitly
await db.update(apps).set({
  security_settings: buildJsonbMergeClause(apps.security_settings, validated),
  updated_at: new Date(),
}).where(eq(apps.id, appId));
```

**Restrictions**:
- Only in `packages/db/src/**` or infra files
- Must have explicit validation
- Must set `updated_at` (trigger + code)
- Code review required

#### 3. **Raw Functions Without Wrapper** (Never in app code)
```typescript
❌ NEVER do this in route handlers or services
const clause = buildJsonbMergeClause(apps.security_settings, updates);
// You're responsible for validation and updated_at now - Easy to miss!
```

**Non-Negotiable Rule**:
```
IF file is in apps/core/src/routes/** OR apps/gateway/src/routes/**
THEN must use appQueries.* helpers only

IF file is in packages/db/src/**
THEN may use raw functions with explicit validation

IF you're tempted to use raw functions in route code
THEN create a new helper instead
```

---

### 6. JSONB Indexing is Required for Performance

Every JSONB column needs indexes:

```sql
-- GIN index for general JSONB operations
CREATE INDEX idx_apps_security_settings_gin
ON apps USING GIN (security_settings);

-- Expression indexes for frequently-queried fields
CREATE INDEX idx_apps_session_ttl
ON apps ((security_settings->>'sessionTtlDays')::integer);
```

**When to add**:
- ✅ Before querying on JSONB fields
- ✅ Before large result sets
- ❌ Don't index unused JSONB fields

**Performance impact**:
- Without index: O(n) table scan
- With GIN index: O(log n)
- With expression index: O(log n) + type casting

---

## Implementation Checklist

### For New JSONB Columns

- [ ] Define `ColumnSchema` in `packages/db/src/schemas/jsonb.ts`
- [ ] Define `ColumnPatchSchema` (all fields optional, strict)
- [ ] Create helper function: `async update${Column}(..., validated)`
- [ ] Add validation to helper using `ColumnPatchSchema.parse()`
- [ ] Set `updated_at` in every update
- [ ] Create GIN index in migration
- [ ] Document in code: "Update entire arrays, never elements"
- [ ] Add tests for concurrent updates

### For Existing JSONB Updates

- [ ] Audit for read-modify-write patterns
- [ ] Replace with atomic helpers
- [ ] Add validation at helper level
- [ ] Ensure `updated_at` is always set
- [ ] Verify indexes exist
- [ ] Test concurrent scenarios
- [ ] Update documentation

### Code Review Checklist

Before merging JSONB update code:

- [ ] No read-modify-write pattern (`db.select()` followed by `db.update()`)
- [ ] Uses atomic function (`buildJsonbMergeClause`, `buildJsonbSetClause`, etc.)
- [ ] `updated_at` is set
- [ ] Validation happens at helper level
- [ ] No numeric path segments (`.0`, `.1`)
- [ ] Arrays updated entirely, never elements
- [ ] Has test for concurrent updates
- [ ] Appropriate indexes exist

---

## Examples: The Right Way

### Example 1: Simple Update

```typescript
// ✅ Correct
await appQueries.updateSecuritySettings(db, appId, {
  sessionTtlDays: 60,
});
```

Generated SQL:
```sql
UPDATE apps
SET 
  security_settings = security_settings || '{"sessionTtlDays": 60}'::jsonb,
  updated_at = NOW()
WHERE id = 1;
```

---

### Example 2: OAuth Configuration

```typescript
// ✅ Correct
const updateChain = createJsonbUpdateChain(apps.security_settings)
  .set("oauth.github.enabled", true)
  .set("oauth.github.clientId", clientId)
  .set("oauth.github.clientSecret", clientSecret)
  .build();

await db.update(apps)
  .set({
    security_settings: updateChain,
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId));
```

---

### Example 3: API Key Rotation

```typescript
// ✅ Correct
await appQueries.updateAppTokens(db, appId, {
  currentKey: {
    value: newKey,
    rotatedAt: new Date(),
  },
  previousKey: oldKey,  // Archive for graceful rollover
});
```

---

### Example 4: Remove Sensitive Data

```typescript
// ✅ Correct
const updateChain = createJsonbUpdateChain(apps.security_settings)
  .delete("oauth.github.clientSecret")  // Remove secret
  .build();

await db.update(apps)
  .set({
    security_settings: updateChain,
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId));
```

---

## Performance Guidance

### When Chaining is Appropriate

```
1-2 fields   → Perfect, highly readable
3-5 fields   → Good, still efficient
6-8 fields   → Acceptable, getting complex
9+ fields    → Consider if you're replacing the whole object
```

**At 9+ fields**, consider whether a single merge is clearer:

```typescript
// Less readable but simpler SQL
await appQueries.updateSecuritySettings(db, appId, {
  field1: val1,
  field2: val2,
  field3: val3,
  // ... 6 more fields ...
});

// vs. chaining 9+ calls - generates deeply nested jsonb_set calls
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

## FAQ

**Q: Can I update part of an array?**  
A: No. Update the entire array or use a different data structure.

**Q: What if I need to update 20+ fields?**  
A: That's a sign your JSONB schema might be too broad. Consider splitting into multiple columns or restructuring.

**Q: How do I handle optional/null JSONB updates?**  
A: Merge updates are "upsert" by nature. Use `.delete()` to remove a key entirely.

**Q: Is atomic JSONB slower than read-modify-write?**  
A: No. It's actually faster (1 round-trip vs 2) and always correct.

**Q: What PostgreSQL version do I need?**  
A: 9.5+ (for basic JSONB operators). 14+ recommended for best features.

---

## Migration Plan

### Phase 1: Document (Done)
- [x] Write this RFC
- [x] Create schema definitions
- [x] Create stress tests

### Phase 2: Review Existing Code
- [ ] Audit all JSONB updates
- [ ] Identify unsafe patterns
- [ ] Create issues for fixes

### Phase 3: Update Route Handlers
- [ ] Update `apps/core/src/routes/**/*.ts`
- [ ] Update `apps/gateway/src/routes/**/*.ts`
- [ ] Add/fix indexes

### Phase 4: Testing & Validation
- [ ] Run stress tests
- [ ] Monitor production
- [ ] Verify no regressions

### Phase 5: Lint Rules (Optional)
- [ ] Add ESLint rule to prevent read-modify-write
- [ ] Add TypeScript check for `updated_at`
- [ ] Add pre-commit hook

---

## References

- **PostgreSQL JSONB**: https://www.postgresql.org/docs/current/datatype-json.html
- **JSONB Functions**: https://www.postgresql.org/docs/current/functions-json.html
- **Drizzle ORM JSON**: https://orm.drizzle.team/docs/schema-reference/other-types#json
- **Index Guide**: [JSONB_EDGE_CASES.md](./JSONB_EDGE_CASES.md)
- **Examples**: [atomic-jsonb-examples.ts](../packages/db/src/examples/atomic-jsonb-examples.ts)

---

## Sign-Off

This RFC represents a committed approach to JSONB updates across Proofa Core.

- **Approved**: Engineering Leadership
- **Implementation**: All teams
- **Enforcement**: Code review + linting
- **Review Date**: Q3 2026

All new JSONB code must follow these patterns. Existing code should be migrated incrementally.

---

**Questions?** Contact: engineering-team@proofa.com
