# Atomic JSONB Updates - Complete Documentation Index

## Quick Start (2-3 minutes)

**New to atomic JSONB updates?** Start here:

1. **Read**: [JSONB Quick Reference](./JSONB_QUICK_REFERENCE.md) (5 min)
   - The 3 core functions
   - Decision tree
   - Common patterns

2. **See**: [Atomic JSONB Examples](../packages/db/src/examples/atomic-jsonb-examples.ts) (5 min)
   - 12 real-world examples
   - Copy-paste patterns

3. **Use**: Import the functions and start updating:
   ```typescript
   import { buildJsonbMergeClause } from "@proofa/db";
   
   await db.update(apps)
     .set({
       security_settings: buildJsonbMergeClause(apps.security_settings, {
         sessionTtlDays: 60,
       }),
     })
     .where(eq(apps.id, appId));
   ```

---

## Complete Documentation

### 1. **JSONB Quick Reference** ⚡
📄 File: `docs/JSONB_QUICK_REFERENCE.md`
- 3 core functions quick lookup
- Decision tree for choosing the right function
- Import statements
- Common patterns
- Do's and don'ts
- Testing pattern
- **Best for**: Quick lookups while coding

### 2. **Atomic JSONB Implementation** 📖
📄 File: `docs/ATOMIC_JSONB_IMPLEMENTATION.md`
- Complete problem/solution explanation
- PostgreSQL operators deep dive
- Implementation details
- Type safety explanation
- Real-world examples
- Migration strategy
- Testing guide
- Performance comparison
- **Best for**: Understanding the full picture

### 3. **JSONB SQL Reference** 🗄️
📄 File: `docs/JSONB_SQL_REFERENCE.md`
- Generated SQL examples
- How merge operator works
- How jsonb_set() works
- Chained operations
- Real-world SQL examples
- Performance characteristics
- Debugging tips
- **Best for**: Understanding what SQL is generated

### 4. **Implementation Complete Summary** ✅
📄 File: `docs/IMPLEMENTATION_COMPLETE.md`
- Overview of what was implemented
- Component breakdown
- Usage patterns
- Type safety features
- Implementation status
- Migration guide
- Files changed
- **Best for**: Project overview

### 5. **Code Examples** 💻
📄 File: `packages/db/src/examples/atomic-jsonb-examples.ts`
- 12 complete working examples
- OAuth configuration
- API key rotation
- Webhook configuration
- Conditional updates
- Race condition prevention demo
- Multi-table updates
- **Best for**: Copy-paste starting points

### 6. **Route Integration Patterns** 🚀
📄 File: `apps/core/src/routes/v1/admin/jsonb-patterns.example.ts`
- Before/after comparisons
- Payment provider examples
- Webhook configuration
- Rate limit updates
- Key rotation with metadata
- Batch updates
- **Best for**: Integrating into route handlers

---

## Core Implementation Files

### Utility Functions
📄 `packages/db/src/utils/jsonb.ts`
- **`buildJsonbMergeClause(column, updates)`** - Shallow merge
- **`buildJsonbSetClause(column, { path, value })`** - Deep nested update
- **`createJsonbUpdateChain(column)`** - Chain multiple updates
- **`jsonbField(column, path)`** - Extract values in SELECT
- **Type helpers**: `NestedKeyOf`, `AtPath`, `ExtractJsonbData`
- **Class**: `JsonbUpdateChain` - Fluent builder API

### Query Helpers
📄 `packages/db/src/queries.ts` (appQueries object)
- **`updateSecuritySettings()`** - Update app security settings
- **`updateAppTokens()`** - Update API tokens
- **`updatePlanSettings()`** - Update plan configuration
- **`updateJsonbField()`** - Update single nested path
- **`batchUpdateJsonbFields()`** - Update multiple paths
- Ready to use - no additional setup needed

---

## Usage Guide by Scenario

### Scenario 1: Update Single Field
```typescript
// Quick: Use pre-built helper
await appQueries.updateSecuritySettings(db, appId, {
  sessionTtlDays: 60,
});

// Flexible: Use utility function directly
await db.update(apps)
  .set({
    security_settings: buildJsonbMergeClause(apps.security_settings, {
      sessionTtlDays: 60,
    }),
    updated_at: new Date(),
  })
  .where(eq(apps.id, appId));
```

### Scenario 2: Update Nested Path
```typescript
await appQueries.updateJsonbField(
  db,
  appId,
  "security_settings",
  "oauth.github.clientId",
  "gh-client-123"
);
```

### Scenario 3: Update Multiple Nested Paths
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

### Scenario 4: Extract Values in SELECT
```typescript
const results = await db
  .select({
    id: apps.id,
    sessionTtl: jsonbField(apps.security_settings, "sessionTtlDays"),
    githubEnabled: jsonbField(apps.security_settings, "oauth.github.enabled"),
  })
  .from(apps);
```

### Scenario 5: API Key Rotation
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

## Learning Path

### Beginner
1. Read: **JSONB Quick Reference** (3 min)
2. See: **Example 1, 3, 8** from atomic-jsonb-examples.ts (5 min)
3. Try: Simple merge update with `buildJsonbMergeClause()`

### Intermediate
1. Read: **JSONB Implementation** guide (15 min)
2. See: **All examples** (10 min)
3. Try: Nested path update with `buildJsonbSetClause()`
4. Try: Chained updates with `createJsonbUpdateChain()`

### Advanced
1. Read: **JSONB SQL Reference** (10 min)
2. Study: Route integration patterns
3. Try: Complex nested structure updates
4. Try: Concurrent update testing

### Expert
1. Read: **Complete Implementation Summary** (5 min)
2. Review: Generated SQL performance
3. Implement: Custom JSONB update patterns
4. Optimize: Complex queries with JSONB operations

---

## Troubleshooting

### "I'm getting a SQL syntax error"
- **Check**: [JSONB SQL Reference](./JSONB_SQL_REFERENCE.md) - Syntax section
- **Review**: Path syntax must be dot-notation: "field.nested.property"
- **Verify**: Column reference is correct

### "TypeScript is showing path doesn't exist"
- **Expected**: TypeScript validates paths against schema
- **Fix**: Check path actually exists in JSONB schema
- **Use**: `NestedKeyOf<T>` type to see valid paths

### "Lost updates still happening?"
- **Check**: Are you using read-modify-write pattern?
- **Fix**: Use atomic functions instead
- **Review**: [Common Mistakes](./ATOMIC_JSONB_IMPLEMENTATION.md#do-and-dont)

### "How do I test this?"
- **See**: [Testing Guide](./ATOMIC_JSONB_IMPLEMENTATION.md#testing)
- **Pattern**: Test concurrent requests see both updates

---

## Cheat Sheet

### Import Statement
```typescript
import {
  buildJsonbMergeClause,
  buildJsonbSetClause,
  createJsonbUpdateChain,
  jsonbField,
} from "@proofa/db";
```

### The 3 Core Functions
```typescript
// Merge (top-level fields)
buildJsonbMergeClause(column, { field: value })

// Set (nested path)
buildJsonbSetClause(column, { path: "a.b.c", value })

// Chain (multiple paths)
createJsonbUpdateChain(column).set("a", v1).set("b", v2).build()
```

### Common Update Pattern
```typescript
await db.update(table)
  .set({
    jsonbColumn: buildJsonbMergeClause(table.jsonbColumn, updates),
    updated_at: new Date(),
  })
  .where(eq(table.id, id));
```

### Always Remember
- ✅ Use atomic functions
- ✅ Set `updated_at`
- ✅ Test concurrent updates
- ❌ Never read-modify-write JSONB

---

## Key Concepts

### Race Condition
Multiple concurrent requests reading, modifying, and writing the same JSONB value. Last write wins, earlier writes are lost.

**Problem**: ❌ Read-Modify-Write pattern
```typescript
const app = await db.select().from(apps); // Request A reads
                                          // Request B reads (same value)
app.settings.field = value;
                                          // Request B writes
await db.update(apps).set({ ... });      // Request A writes (overwrites B!)
```

**Solution**: ✅ Atomic database operation
```typescript
await db.update(apps)
  .set({ settings: buildJsonbMergeClause(...) })  // DB handles atomicity
```

### Merge vs Set

**Merge** (`||` operator): Shallow
```sql
{ a: 1, b: 2 } || { a: 10 } = { a: 10, b: 2 }
                    ↑ new
```

**Set** (`jsonb_set()` function): Deep
```sql
{ a: { b: 1, c: 2 } } with path 'a.b' = 10 
= { a: { b: 10, c: 2 } }
```

---

## Files at a Glance

| File | Purpose | Time |
|------|---------|------|
| [JSONB_QUICK_REFERENCE.md](./JSONB_QUICK_REFERENCE.md) | Quick lookup | 3 min |
| [ATOMIC_JSONB_IMPLEMENTATION.md](./ATOMIC_JSONB_IMPLEMENTATION.md) | Complete guide | 15 min |
| [JSONB_SQL_REFERENCE.md](./JSONB_SQL_REFERENCE.md) | SQL details | 10 min |
| [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) | Overview | 5 min |
| atomic-jsonb-examples.ts | 12 examples | 10 min |
| jsonb-patterns.example.ts | Route patterns | 5 min |
| jsonb.ts | Implementation | Reference |

---

## Next Steps

### Immediate (This Week)
1. [ ] Review JSONB Quick Reference
2. [ ] Review code examples
3. [ ] Try simple merge update
4. [ ] Update one route handler

### Short Term (This Sprint)
1. [ ] Audit all JSONB update code
2. [ ] Update all unsafe patterns
3. [ ] Write tests for concurrent updates
4. [ ] Deploy and monitor

### Long Term (Ongoing)
1. [ ] Document patterns in team wiki
2. [ ] Add linting rule to prevent read-modify-write
3. [ ] Monitor for lost updates in production
4. [ ] Optimize complex JSONB queries

---

## Questions?

Check the appropriate document:

| Question | Document |
|----------|----------|
| "How do I use this?" | JSONB Quick Reference |
| "Why is this better?" | ATOMIC_JSONB_IMPLEMENTATION.md |
| "What SQL is generated?" | JSONB_SQL_REFERENCE.md |
| "Show me examples" | atomic-jsonb-examples.ts |
| "How do I integrate this into routes?" | jsonb-patterns.example.ts |
| "What got implemented?" | IMPLEMENTATION_COMPLETE.md |

---

## Summary

This is a **production-ready implementation** of atomic JSONB updates for PostgreSQL using Drizzle ORM.

**Key benefits**:
- ✅ Zero race conditions
- ✅ Type-safe paths
- ✅ Atomic at database level
- ✅ Highly scalable
- ✅ Easy to use

**Get started**: Read JSONB Quick Reference, try an example, update your code.

**Questions**: Check the documentation index above.

Welcome to safe, atomic JSONB updates! 🚀
