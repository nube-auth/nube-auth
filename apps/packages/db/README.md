# @proofa/db

**Database Package for Proofa Platform**

PostgreSQL database with Drizzle ORM, providing type-safe database access and migrations.

---

## Features

- 🗄️ **PostgreSQL 16** - Modern relational database
- 🔧 **Drizzle ORM** - Type-safe ORM with zero-cost abstractions
- 📝 **Type-safe Queries** - Full TypeScript support
- 🔄 **Migrations** - Automatic schema migrations
- 🎯 **Query Builders** - Pre-built query functions
- 📊 **Drizzle Studio** - Visual database browser

---

## Schema

### Tables
1. **users** - Platform users
2. **identities** - OAuth provider identities
3. **sessions** - User sessions (365-day TTL)
4. **projects** - User projects
5. **project_members** - Project team members
6. **project_invitations** - Team invitations
7. **apps** - Applications
8. **plans** - Subscription/license plans
9. **licenses** - User licenses
10. **invitations** - User invitations
11. **auth_codes** - OAuth authorization codes
12. **email_verifications** - Email verification OTPs
13. **audit_logs** - Audit trail (40+ event types)
14. **payment_providers** - Payment provider configs

### Key Features
- **Soft Deletes**: `deleted_at` timestamps with slug uniqueness handling
- **Long Sessions**: 365-day session expiry (configurable)
- **Multi-Tenant**: Project-based isolation
- **Type-Safe**: Full TypeScript support with Drizzle
- **Encrypted Storage**: Secure credential storage
- **Comprehensive Indexing**: Optimized queries
- **Foreign Key Constraints**: Data integrity

---

## Installation

```bash
pnpm add @proofa/db
```

---

## Usage

```typescript
import { getDb, userQueries, projectQueries } from "@proofa/db";

// Get database instance
const db = getDb();

// Use query helpers
const user = await userQueries.findByPublicId(db, "usr_123");
const projects = await projectQueries.findByUserId(db, user.id);

// Direct Drizzle queries
import { users } from "@proofa/db";
import { eq } from "drizzle-orm";

const user = await db.select().from(users).where(eq(users.public_id, "usr_123"));
```

---

## Query Helpers

### User Queries
```typescript
userQueries.findById(db, id)
userQueries.findByPublicId(db, publicId)
userQueries.findByEmail(db, email)
userQueries.create(db, data)
userQueries.update(db, id, data)
```

### Project Queries
```typescript
projectQueries.findById(db, id)
projectQueries.findByPublicId(db, publicId)
projectQueries.findByOwnerId(db, ownerId)
projectQueries.findByUserId(db, userId)
projectQueries.create(db, data)
projectQueries.update(db, id, data)
```

### App Queries
```typescript
appQueries.findById(db, id)
appQueries.findByPublicId(db, publicId)
appQueries.findByProjectId(db, projectId)
appQueries.create(db, data)
appQueries.update(db, id, data)
```

### License Queries
```typescript
licenseQueries.findById(db, id)
licenseQueries.findByUserAndApp(db, userId, appId)
licenseQueries.findByAppId(db, appId)
licenseQueries.create(db, data)
licenseQueries.update(db, id, data)
licenseQueries.revoke(db, id)
```

### Payment Config Queries
```typescript
paymentConfigQueries.findByScope(db, scopeType, scopeId)
paymentConfigQueries.findByScopeAndProvider(db, scopeType, scopeId, provider)
paymentConfigQueries.create(db, data)
paymentConfigQueries.update(db, id, data)
paymentConfigQueries.delete(db, id)
```

---

## Development

### Setup
```bash
# Install dependencies
pnpm install

# Build
pnpm build
```

### Database Operations
```bash
# Generate migration from schema changes
pnpm run db:generate

# Apply migrations to database
pnpm run db:push

# Open Drizzle Studio (visual database browser)
pnpm run db:studio
```

### Environment
```bash
# Required environment variable
DATABASE_URL=postgresql://user:password@localhost:5432/proofa
```

---

## Configuration

**drizzle.config.ts**
```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

---

## Migrations

### Create Migration
```bash
# 1. Edit src/schema.ts
# 2. Generate migration
pnpm run db:generate

# 3. Review generated SQL in drizzle/ folder
# 4. Apply migration
pnpm run db:push
```

### Fresh Migration
```bash
# Clean drizzle folder
rm -rf drizzle/*

# Generate fresh migration
pnpm run db:generate
```

---

## Type Safety

All queries are fully typed:

```typescript
// ✅ Type-safe
const user = await userQueries.findById(db, 123);
user.public_id // string
user.primary_email // string | null

// ❌ TypeScript error
const user = await userQueries.findById(db, "invalid"); // Error: expected number

// ✅ Type-safe insert
await userQueries.create(db, {
  public_id: "usr_123",
  primary_email: "user@example.com",
  created_at: Math.floor(Date.now() / 1000),
  updated_at: Math.floor(Date.now() / 1000),
});

// ❌ TypeScript error - missing required fields
await userQueries.create(db, {
  public_id: "usr_123",
  // Error: missing created_at, updated_at
});
```

---

## Production Tips

### Connection Pooling
Connection pooling is built-in with `pg.Pool`:

```typescript
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Indexes
All foreign keys have indexes. Additional indexes:
- `users.primary_email`
- `projects.slug`
- `apps.project_id + slug`
- `licenses.user_id + app_id`
- `sessions.expires_at`

### Performance
- Use `select()` with specific columns instead of `select(*)`
- Use `limit()` for large result sets
- Use indexes for frequently queried columns
- Use `EXPLAIN ANALYZE` to optimize slow queries

---

## Testing

```typescript
import { createDbClient } from "@proofa/db";

// Create test database
const testDb = createDbClient();

// Run tests
describe("User Queries", () => {
  it("creates a user", async () => {
    const user = await userQueries.create(testDb, {
      public_id: "usr_test",
      primary_email: "test@example.com",
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    });
    
    expect(user.public_id).toBe("usr_test");
  });
});
```

---

## License

MIT License - see [LICENSE](../../LICENSE)
