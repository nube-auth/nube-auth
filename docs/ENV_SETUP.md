# Environment Setup Guide

## Database Configuration

### PostgreSQL
The application now uses PostgreSQL instead of Turso/LibSQL.

```bash
# Connection string format
DATABASE_URL=postgresql://user:password@localhost:5432/proofa
```

**Local Development:**
```bash
# Using Docker
docker run --name proofa-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=proofa -p 5432:5432 -d postgres:16

# Or install PostgreSQL locally
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16
sudo systemctl start postgresql
```

**Production:**
- Use managed PostgreSQL services like:
  - Neon (https://neon.tech)
  - Supabase (https://supabase.com)
  - AWS RDS
  - DigitalOcean Managed Databases
  - Railway
  - Render

---

## Redis Configuration

### Standard Redis
The application now uses standard Redis instead of Upstash Redis REST API.

```bash
# Connection string format
REDIS_URL=redis://localhost:6379

# With password
REDIS_URL=redis://:password@localhost:6379

# With username and password
REDIS_URL=redis://username:password@localhost:6379
```

**Local Development:**
```bash
# Using Docker
docker run --name proofa-redis -p 6379:6379 -d redis:7-alpine

# Or install Redis locally
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server
```

**Production:**
- Use managed Redis services like:
  - Upstash (https://upstash.com) - now supports standard Redis protocol
  - Redis Cloud (https://redis.com/cloud)
  - AWS ElastiCache
  - DigitalOcean Managed Redis
  - Railway
  - Render

---

## Complete Environment Variables

Create a `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/proofa

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key

# Encryption
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_64_character_hex_string_here

# OAuth Providers (Optional - Proofa defaults)
# These are used as fallback when not configured at project/app level
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Application URLs
GATEWAY_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:5173
```

---

## Migration from Turso/LibSQL to PostgreSQL

### 1. Export Data from Turso (if applicable)
```bash
# Export your existing data
turso db shell your-db-name ".dump" > dump.sql
```

### 2. Set up PostgreSQL
```bash
# Create database
createdb proofa

# Or using psql
psql -U postgres -c "CREATE DATABASE proofa;"
```

### 3. Update Environment Variables
```bash
# Old (Turso)
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your_token

# New (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/proofa
```

### 4. Run Migrations
```bash
cd packages/db
pnpm run db:push
```

---

## Migration from Upstash Redis to Standard Redis

### 1. Update Environment Variables
```bash
# Old (Upstash REST API)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# New (Standard Redis)
REDIS_URL=redis://localhost:6379
```

### 2. No Data Migration Needed
Redis is used for:
- Session storage (ephemeral)
- Rate limiting (ephemeral)
- Caching (ephemeral)

All data is temporary and will be recreated automatically.

---

## Quick Start (Local Development)

### Using Docker Compose
Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: proofa
      POSTGRES_USER: proofa
      POSTGRES_PASSWORD: proofa
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Then:
```bash
# Start services
docker-compose up -d

# Set environment variables
export DATABASE_URL=postgresql://proofa:proofa@localhost:5432/proofa
export REDIS_URL=redis://localhost:6379

# Run migrations
cd packages/db
pnpm run db:push

# Start development
pnpm dev
```

---

## Verifying Setup

### Test PostgreSQL Connection
```bash
psql $DATABASE_URL -c "SELECT version();"
```

### Test Redis Connection
```bash
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

### Test Application
```bash
# Build packages
pnpm install
pnpm --filter @proofa/db run build
pnpm --filter @proofa/cache run build
pnpm --filter @proofa/shared run build

# Start gateway
pnpm --filter @proofa/gateway dev
```

---

## Production Recommendations

### PostgreSQL
- Use connection pooling (PgBouncer)
- Enable SSL/TLS
- Set up regular backups
- Monitor query performance
- Use read replicas for scaling

### Redis
- Enable persistence (AOF or RDB)
- Set up replication for high availability
- Configure maxmemory policy
- Monitor memory usage
- Use Redis Sentinel or Cluster for production

### Security
- Never commit `.env` files
- Use secrets management (AWS Secrets Manager, Vault, etc.)
- Rotate credentials regularly
- Use strong passwords
- Enable network encryption (SSL/TLS)
