# Migration Summary: PostgreSQL & Standard Redis

## ✅ Completed Changes

### 1. Database Migration: Turso/LibSQL → PostgreSQL

#### Schema Changes
- **Updated Drizzle Config** (`packages/db/drizzle.config.ts`)
  - Changed from `driver: "turso"` to `dialect: "postgresql"`
  - Removed `authToken` requirement
  - Now uses standard PostgreSQL connection string

#### Package Updates
- **`packages/db/package.json`**
  - Removed: `@libsql/client`
  - Added: `pg` (^8.13.1)
  - Added: `@types/pg` (^8.11.10)
  - Updated scripts: `generate:sqlite` → `generate:pg`, etc.

#### Code Changes
- **`packages/db/src/index.ts`**
  - Changed from `drizzle-orm/libsql` to `drizzle-orm/node-postgres`
  - Replaced `createClient` with `pg.Pool`
  - Removed `authToken` handling

#### Migration Files
- **Cleaned up old migrations**
  - Deleted: `0000_initial.sql`
  - Deleted: `0001_add_oauth_fields.sql`
- **Created fresh migration**
  - New: `0000_initial_schema.sql` (complete schema with all tables)

---

### 2. Redis Migration: Upstash REST → Standard Redis

#### Package Updates
- **`packages/redis/package.json`**
  - Removed: `@upstash/redis`
  - Added: `redis` (^4.7.0)

- **`apps/gateway/package.json`**
  - Removed: `@upstash/redis` dependency

#### Code Changes

**`packages/redis/src/client.ts`** - Complete rewrite:
```typescript
// Old: Upstash REST API
import { Redis } from "@upstash/redis";
const redis = new Redis({ url, token });

// New: Standard Redis protocol
import { createClient } from "redis";
const redis = createClient({ url });
await redis.connect();
```

**Key Changes:**
- Async connection handling (`await redis.connect()`)
- Changed `setex` → `setEx` (camelCase)
- Changed `keys()` → `scan()` for production safety
- Updated all method signatures to match `redis` package

**`apps/gateway/src/redis/client.ts`** - Updated to match:
- Same migration from Upstash to standard Redis
- Async initialization
- Health check updated

**`apps/gateway/src/config/env.ts`** - Environment variables:
```typescript
// Old
UPSTASH_REDIS_REST_URL: string;
UPSTASH_REDIS_REST_TOKEN: string;

// New
REDIS_URL: string;
```

---

### 3. Environment Variables Update

#### Removed
```bash
# Turso/LibSQL
DATABASE_AUTH_TOKEN=your_token

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

#### Added
```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/proofa

# Standard Redis
REDIS_URL=redis://localhost:6379
```

---

## 📋 Database Schema

### Complete Schema (14 Tables)

1. **users** - Platform users
2. **identities** - OAuth/provider identities
3. **sessions** - Core user sessions
4. **projects** - User projects (with OAuth fields)
5. **project_members** - Project team members
6. **project_invitations** - Project team invitations
7. **apps** - Applications within projects (with OAuth inheritance)
8. **plans** - Subscription/license plans
9. **licenses** - User licenses for apps
10. **invitations** - App user invitations
11. **auth_codes** - OAuth authorization codes
12. **email_verifications** - Email OTP verifications
13. **audit_logs** - Audit trail
14. **payment_configurations** - Payment provider configs (encrypted)

### Key Features
- ✅ OAuth configuration at project & app levels
- ✅ OAuth inheritance (Proofa → Project → App)
- ✅ Payment configuration at project & app levels
- ✅ Encrypted storage for secrets (AES-256-GCM)
- ✅ Soft deletion with `is_active` flags
- ✅ Comprehensive indexing for performance
- ✅ Foreign key constraints
- ✅ Unique constraints for data integrity

---

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set Up PostgreSQL
```bash
# Using Docker
docker run --name proofa-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=proofa \
  -p 5432:5432 -d postgres:16

# Or use managed service (Neon, Supabase, etc.)
```

### 3. Set Up Redis
```bash
# Using Docker
docker run --name proofa-redis \
  -p 6379:6379 -d redis:7-alpine

# Or use managed service (Upstash, Redis Cloud, etc.)
```

### 4. Configure Environment
```bash
# Create .env file
cp ENV_SETUP.md .env

# Update with your values
DATABASE_URL=postgresql://user:password@localhost:5432/proofa
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=your_key
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### 5. Run Migrations
```bash
cd packages/db
pnpm run db:push
```

### 6. Build & Start
```bash
# Build packages
pnpm --filter @proofa/db run build
pnpm --filter @proofa/redis run build
pnpm --filter @proofa/shared run build
pnpm --filter @proofa/gateway run build

# Start development
pnpm dev
```

---

## 🚀 Production Deployment

### Database (PostgreSQL)
**Recommended Services:**
- **Neon** - Serverless PostgreSQL with autoscaling
- **Supabase** - PostgreSQL with built-in features
- **Railway** - Simple deployment
- **Render** - Managed PostgreSQL
- **AWS RDS** - Enterprise-grade
- **DigitalOcean** - Managed databases

**Configuration:**
```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

### Redis
**Recommended Services:**
- **Upstash** - Serverless Redis (now supports standard protocol!)
- **Redis Cloud** - Managed by Redis Labs
- **Railway** - Simple deployment
- **Render** - Managed Redis
- **AWS ElastiCache** - Enterprise-grade
- **DigitalOcean** - Managed Redis

**Configuration:**
```bash
# Standard connection
REDIS_URL=redis://username:password@host:6379

# With TLS
REDIS_URL=rediss://username:password@host:6379
```

---

## 📊 Performance Considerations

### PostgreSQL
- ✅ Connection pooling built-in with `pg.Pool`
- ✅ Prepared statements for security
- ✅ Indexes on all foreign keys
- ✅ Composite indexes for common queries
- ✅ JSONB support for flexible data

### Redis
- ✅ Async/await for non-blocking operations
- ✅ `SCAN` instead of `KEYS` for production safety
- ✅ Connection reuse with singleton pattern
- ✅ Error handling with fallbacks
- ✅ TTL-based expiration for sessions

---

## 🔒 Security Improvements

### Database
- ✅ No auth tokens in code (standard PostgreSQL auth)
- ✅ SSL/TLS support via connection string
- ✅ Parameterized queries (SQL injection protection)
- ✅ Row-level security ready (PostgreSQL feature)

### Redis
- ✅ Standard authentication (username/password)
- ✅ TLS support (`rediss://` protocol)
- ✅ No REST API exposure
- ✅ Network-level security

### Encryption
- ✅ AES-256-GCM for all secrets
- ✅ OAuth credentials encrypted at rest
- ✅ Payment credentials encrypted at rest
- ✅ Secrets never exposed in API responses

---

## 🧪 Testing

### Verify PostgreSQL
```bash
psql $DATABASE_URL -c "SELECT version();"
```

### Verify Redis
```bash
redis-cli -u $REDIS_URL ping
# Expected: PONG
```

### Verify Application
```bash
# Health check endpoint (if implemented)
curl http://localhost:3000/health

# Check database connection
pnpm --filter @proofa/gateway dev
# Look for: "Connecting to database: postgresql://..."
```

---

## 📝 Breaking Changes

### For Developers
1. **Environment Variables Changed**
   - Update `.env` files
   - Update CI/CD secrets
   - Update deployment configs

2. **Database Connection**
   - No more `DATABASE_AUTH_TOKEN`
   - Standard PostgreSQL connection string

3. **Redis Connection**
   - No more `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Standard Redis connection string
   - Async connection handling required

### For Deployment
1. **Update Infrastructure**
   - Provision PostgreSQL instance
   - Provision Redis instance
   - Update environment variables

2. **Run Migrations**
   - Fresh migration file created
   - Run `pnpm run db:push` in production

3. **No Data Migration Needed**
   - Redis data is ephemeral (sessions, cache)
   - PostgreSQL is a fresh start

---

## 🎯 Benefits

### PostgreSQL vs Turso/LibSQL
- ✅ Industry standard with massive ecosystem
- ✅ Better tooling and monitoring
- ✅ More hosting options
- ✅ Advanced features (JSONB, full-text search, etc.)
- ✅ Better performance for complex queries
- ✅ Mature replication and backup solutions

### Standard Redis vs Upstash REST
- ✅ Lower latency (native protocol vs HTTP)
- ✅ More features (pub/sub, streams, etc.)
- ✅ Better performance (binary protocol)
- ✅ More hosting options
- ✅ Standard tooling compatibility
- ✅ Can still use Upstash (they support standard protocol!)

---

## 📚 Additional Resources

- **ENV_SETUP.md** - Detailed environment setup guide
- **packages/db/drizzle/0000_initial_schema.sql** - Complete database schema
- **packages/db/drizzle.config.ts** - Drizzle configuration
- **packages/redis/src/client.ts** - Redis client implementation
- **packages/db/src/index.ts** - Database client implementation

---

## ✅ Migration Checklist

- [x] Clean up old migration files
- [x] Create fresh migration with complete schema
- [x] Update Drizzle config for PostgreSQL
- [x] Update database package dependencies
- [x] Update database client code
- [x] Update Redis package dependencies
- [x] Update Redis client code (packages/redis)
- [x] Update Redis client code (apps/gateway)
- [x] Update environment variable handling
- [x] Remove Upstash-specific code
- [x] Test builds (all packages)
- [x] Create documentation (ENV_SETUP.md)
- [x] Create migration summary (this file)

---

## 🚨 Important Notes

1. **This is a breaking change** - Requires infrastructure updates
2. **No automatic data migration** - Fresh start recommended
3. **Test thoroughly** before deploying to production
4. **Update all environment variables** in all environments
5. **Redis data will be lost** (sessions, cache) - this is expected and safe

---

## 🆘 Troubleshooting

### PostgreSQL Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check SSL requirement
# Add ?sslmode=require to connection string if needed
```

### Redis Connection Issues
```bash
# Test connection
redis-cli -u $REDIS_URL ping

# Check TLS requirement
# Use rediss:// instead of redis:// if TLS is required
```

### Build Errors
```bash
# Clean and rebuild
pnpm run clean
pnpm install
pnpm --filter @proofa/db run build
pnpm --filter @proofa/redis run build
pnpm --filter @proofa/shared run build
```

---

**Migration completed successfully!** 🎉

All packages are building correctly, and the application is ready for PostgreSQL and standard Redis deployment.
