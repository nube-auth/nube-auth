# JSONB Edge Cases & Critical Warnings

## ⚠️ EDGE CASE 1: Array Handling is a Footgun

### The Problem

**This will NOT work as expected**:
```typescript
// ❌ WRONG - This is unsafe
createJsonbUpdateChain(apps.security_settings)
  .set("redirectUris.0", "https://new.com")  // This path is ambiguous!
  .build()
```

Why? PostgreSQL jsonb_set treats numeric segments as object keys, not array indices. The behavior is undefined and can corrupt your data silently.

### The Solution

**Option 1: Replace entire array (recommended for small arrays)**
```typescript
// ✅ SAFE - Replace entire array atomically
await appQueries.updateSecuritySettings(db, appId, {
  redirectUris: ["https://new.com", "https://example.com"],
});
```

**Option 2: Use a dedicated helper for array operations**
```typescript
// ✅ SAFE - Dedicated array mutation helper
async function appendRedirectUri(db: DbClient, appId: number, uri: string) {
  const app = await appQueries.findById(db, appId);
  const current = app.security_settings.redirectUris as string[];
  const updated = [...current, uri]; // Safely mutation in app code
  
  return appQueries.updateSecuritySettings(db, appId, {
    redirectUris: updated,
  });
}
```

**Option 3: Array manipulation at database level (advanced)**
```typescript
// For large arrays, use PostgreSQL array functions
const updateChain = createJsonbUpdateChain(apps.security_settings)
  // First: extract array as JSONB, manipulate with PostgreSQL functions
  // This requires raw SQL knowledge - only if necessary
  .build();
```

### Why Array Mutations Are Unsafe in JSONB

1. **Index shifts**: Removing array[0] shifts all indices. jsonb_set doesn't know about this.
2. **No type guarantees**: PostgreSQL doesn't validate array element types when mutating.
3. **Silent data loss**: If you use wrong syntax, it doesn't fail—it creates weird structures.
4. **Concurrency issues**: Two concurrent requests might produce unexpected results.

### Best Practice: Document Explicitly

Add this to all security_settings schemas:

```typescript
const SecuritySettingsSchema = z.object({
  // ...other fields...
  redirectUris: z.array(z.string().url()).describe(
    "IMPORTANT: Update this entire array atomically. " +
    "Never try to update individual array elements with .set('redirectUris.0', ...). " +
    "Always replace the entire array."
  ),
});
```

### Enforce at Type Level

The `JsonbUpdateChain.delete()` method now explicitly rejects numeric segments:

```typescript
const chain = createJsonbUpdateChain(apps.security_settings);

// ✅ This works
chain.delete("oauth.github");  // Delete entire GitHub config

// ❌ This throws an error
chain.delete("redirectUris.0");  // ERROR: Cannot delete array element by index
```

---

## ⚠️ EDGE CASE 2: No Type Validation on Partial Updates

### The Problem

Multiple routes might validate the same JSONB field differently:

```typescript
// Route A: Strict validation
const route_a = z.object({
  security_settings: z.object({
    sessionTtlDays: z.number().min(1).max(86400),
    maxSessions: z.number().min(1).max(100),
  }),
});

// Route B: Different schema
const route_b = z.object({
  security_settings: z.object({
    sessionTtlDays: z.number().min(1).max(365 * 24 * 60 * 60), // ← Different!
  }),
});

// Both update the same field - which validation wins?
```

### The Solution: Co-locate Schemas with Helpers

```typescript
// 📄 packages/db/src/schemas/security-settings.ts
import { z } from "zod";

export const RedirectUriSchema = z.string().url().max(500);
export const SessionTtlSchema = z.number().min(1).max(86400).describe("TTL in seconds, max 1 day");
export const MaxSessionsSchema = z.number().min(1).max(100);

export const SecuritySettingsPatchSchema = z.object({
  redirectUris: z.array(RedirectUriSchema).optional(),
  sessionTtlDays: SessionTtlSchema.optional(),
  maxSessions: MaxSessionsSchema.optional(),
  // ... other fields
}).strict(); // Reject unknown fields

export const SecuritySettingsSchema = z.object({
  redirectUris: z.array(RedirectUriSchema).default([]),
  sessionTtlDays: SessionTtlSchema.default(3600),
  maxSessions: MaxSessionsSchema.default(10),
});

export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>;
export type SecuritySettingsPatch = z.infer<typeof SecuritySettingsPatchSchema>;
```

### Update Query Helpers to Validate

```typescript
// 📄 packages/db/src/queries.ts
import { SecuritySettingsPatchSchema } from "./schemas/security-settings";

export const appQueries = {
  // ...
  
  async updateSecuritySettings(
    db: DbClient,
    appId: number,
    updates: unknown,  // Accept any type
  ) {
    // Validate against patch schema
    const validated = SecuritySettingsPatchSchema.parse(updates);
    
    const results = await db
      .update(apps)
      .set({
        security_settings: buildJsonbMergeClause(apps.security_settings, validated),
        updated_at: new Date(),
      })
      .where(eq(apps.id, appId))
      .returning();
    
    return results[0]!;
  },
};
```

### Use in Routes with Confidence

```typescript
// 📄 apps/core/src/routes/v1/admin/settings.ts
router.patch("/apps/:appId/security", async (c) => {
  const appId = parseInt(c.req.param("appId"), 10);
  const body = await c.req.json();
  
  try {
    // This validates against the canonical schema
    const result = await appQueries.updateSecuritySettings(db, appId, body);
    return c.json({ success: true, settings: result.security_settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.flatten() }, 400);
    }
    return c.json({ error: "Failed to update" }, 500);
  }
});
```

### Schema Hierarchy

```
SecuritySettings (base schema)
    ↑
    ├─ SecuritySettingsPatch (for updates - all fields optional, strict)
    ├─ SecuritySettingsInput (for creation - all fields required)
    └─ Individual field schemas (SessionTtlSchema, etc.)
```

**Rule**: Every JSONB column gets ONE canonical schema, co-located with its helper function.

---

## ⚠️ EDGE CASE 3: `updated_at` Enforcement

### The Problem

Manual discipline doesn't scale:

```typescript
// Oops - forgot updated_at
await db.update(apps)
  .set({
    security_settings: buildJsonbMergeClause(apps.security_settings, updates),
    // ❌ No updated_at! This row now looks stale
  })
  .where(eq(apps.id, appId));
```

### Solution 1: Database Trigger (Strongest)

```sql
-- 📄 Database migration
CREATE TRIGGER apps_updated_at_jsonb
BEFORE UPDATE ON apps
FOR EACH ROW
BEGIN
  IF 
    NEW.security_settings IS DISTINCT FROM OLD.security_settings OR
    NEW.app_tokens IS DISTINCT FROM OLD.app_tokens OR
    NEW.plan_settings IS DISTINCT FROM OLD.plan_settings
  THEN
    NEW.updated_at = NOW();
  END IF;
END;
```

### Solution 2: Wrapper Helper (Practical)

```typescript
// 📄 packages/db/src/utils/jsonb-with-timestamp.ts

/**
 * Atomic JSONB update that automatically sets updated_at
 * Can't forget the timestamp with this approach
 */
export async function updateJsonbAtomically<
  T extends PgTable,
  C extends PgColumn<ColumnBaseConfig<"json", "PgJsonb">, any, any>,
>(
  db: DbClient,
  table: T,
  column: C,
  updates: Record<string, any>,
  where: (table: T) => SQL,
) {
  const updateData: Record<string, any> = {
    [column.name]: buildJsonbMergeClause(column, updates),
    updated_at: new Date(),
  };

  return db.update(table)
    .set(updateData as any)
    .where(where(table));
}
```

Usage:
```typescript
// ✅ Impossible to forget updated_at
await updateJsonbAtomically(
  db,
  apps,
  apps.security_settings,
  { sessionTtlDays: 60 },
  (t) => eq(t.id, appId)
);
```

### Solution 3: Lint Rule (Detection)

```javascript
// 📄 .eslintrc.jsonc
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.object.name='db'][callee.property.name='update'] > :not([callee.property.name='where'])",
        "message": "JSONB updates must set updated_at. Use updateJsonbAtomically helper or explicitly set updated_at."
      }
    ]
  }
}
```

---

## ⚠️ EDGE CASE 4: JSONB Indexing for Performance

### The Problem

Without indexes, JSONB queries will do table scans:

```typescript
// ❌ SLOW - No index, full table scan
const results = await db
  .select()
  .from(apps)
  .where(eq(jsonbField(apps.security_settings, "sessionTtlDays"), 60));
```

### Solution: Strategic Indexes

**Index 1: GIN Index for General JSONB Queries**
```sql
-- For fast JSONB contains and key searches
CREATE INDEX idx_apps_security_settings_gin 
ON apps USING GIN (security_settings);
```

**Index 2: Expression Index for Specific Fields**
```sql
-- For fast queries on specific nested fields
CREATE INDEX idx_apps_security_ttl_expr
ON apps ((security_settings->>'sessionTtlDays')::integer);

-- Usage: Now this is fast
SELECT * FROM apps 
WHERE (security_settings->>'sessionTtlDays')::integer > 3600;
```

**Index 3: Functional Index for Complex Queries**
```sql
-- For queries on deeply nested paths
CREATE INDEX idx_apps_oauth_github_enabled
ON apps ((security_settings->'oauth'->'github'->>'enabled')::boolean);
```

**Index 4: GIN Index with Specific Paths (PostgreSQL 14+)**
```sql
-- Only index specific paths you query on
CREATE INDEX idx_apps_security_paths
ON apps USING GIN (security_settings jsonb_path_ops)
WHERE is_active = true;  -- Only active apps
```

### Indexing Strategy

```typescript
// 📄 packages/db/drizzle/0001_jsonb_indexes.sql

-- GIN index for general JSONB operations
CREATE INDEX IF NOT EXISTS idx_apps_security_settings_gin
ON apps USING GIN (security_settings);

CREATE INDEX IF NOT EXISTS idx_apps_tokens_gin
ON apps USING GIN (app_tokens);

CREATE INDEX IF NOT EXISTS idx_payment_providers_metadata_gin
ON payment_providers USING GIN (metadata);

-- Expression indexes for frequently filtered fields
CREATE INDEX IF NOT EXISTS idx_apps_session_ttl
ON apps ((security_settings->>'sessionTtlDays')::integer);

CREATE INDEX IF NOT EXISTS idx_apps_max_sessions
ON apps ((security_settings->>'maxSessions')::integer);

-- For payment provider webhook queries
CREATE INDEX IF NOT EXISTS idx_payment_webhooks
ON payment_providers ((metadata->>'webhookUrl'));
```

### When to Index

**Create expression index if you**:
- Query on the same field frequently
- Need to filter/sort by that field
- Have thousands+ of rows

**Skip indexing if**:
- Field is rarely queried
- Dataset is small (< 10k rows)
- Write performance is critical

### Monitor Index Usage

```sql
-- Check if indexes are being used
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'apps'
ORDER BY idx_scan DESC;

-- Unused indexes (waste of space)
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY idx_blks_read DESC;
```

---

## Summary: Edge Case Handling Checklist

- [ ] Document all JSONB array fields: "Update entire array, never individual elements"
- [ ] Co-locate Zod schemas with JSONB helpers
- [ ] Validate patches at helper level, not route level
- [ ] Use wrapper helper or trigger to enforce `updated_at`
- [ ] Create GIN indexes for JSONB columns
- [ ] Create expression indexes for frequently-filtered fields
- [ ] Test concurrent updates to detect race conditions
- [ ] Never use numeric path segments in `.set()` or `.delete()`
- [ ] Use `.delete()` only for complete key removal, not array elements
- [ ] Document security implications of JSONB in your schema

---

## Real-World Example: Correct Implementation

```typescript
// ✅ Fully safe, production-ready JSONB update pattern

// 1. Define schema (co-located with helpers)
const SecuritySettingsPatchSchema = z.object({
  sessionTtlDays: z.number().min(1).max(86400).optional(),
  redirectUris: z.array(z.string().url()).optional(),  // Full array
  oauth: z.record(z.unknown()).optional(),
}).strict();

// 2. Query helper with validation
async function updateSecuritySettings(
  db: DbClient,
  appId: number,
  updates: unknown,  // Typed as unknown
) {
  const validated = SecuritySettingsPatchSchema.parse(updates);
  
  return db.update(apps)
    .set({
      security_settings: buildJsonbMergeClause(apps.security_settings, validated),
      updated_at: new Date(),  // Always set this
    })
    .where(eq(apps.id, appId))
    .returning();
}

// 3. Use in route
router.patch("/apps/:appId/security", async (c) => {
  const appId = parseInt(c.req.param("appId"), 10);
  const result = await updateSecuritySettings(db, appId, await c.req.json());
  return c.json(result);
});

// 4. Database has proper indexes
// CREATE INDEX idx_apps_security_settings_gin ON apps USING GIN (security_settings);
```

This pattern eliminates all four edge cases:
- ✅ No array element mutations
- ✅ Schema co-located with helper
- ✅ `updated_at` always set
- ✅ Performance is good (indexed)
