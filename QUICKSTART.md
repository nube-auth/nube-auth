# Quick Start Guide

Get Proofa running in 5 minutes.

---

## Prerequisites

- **Node.js** 22+
- **pnpm** 8+
- **Docker** with Docker Compose

---

## 5-Minute Setup

```bash
# 1. Clone and install
git clone https://github.com/yourorg/proofa-core.git
cd proofa-core
pnpm install

# 2. Start infrastructure
docker-compose up -d

# 3. Setup database
cd packages/db && pnpm db:push && cd ../..

# 4. Build packages
pnpm build:packages

# 5. Start development
pnpm dev
```

---

## Access Applications

- **Admin Dashboard**: http://localhost:5174
- **User Dashboard**: http://localhost:5173
- **API Gateway**: http://localhost:3004
- **Core Service**: http://localhost:3003
- **Marketing Site**: http://localhost:4321
- **Documentation**: http://localhost:4322

---

## What's Running?

| Service | Port | Description |
|---------|------|-------------|
| Gateway | 3004 | API Gateway & Auth |
| Core | 3003 | Core Service |
| Admin UI | 5174 | Admin Dashboard |
| User UI | 5173 | User Dashboard |
| Marketing | 4321 | Marketing Site |
| Docs | 4322 | Documentation |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & Sessions |

---

## Configuration (Optional)

For custom configuration, create `.env.local`:

```bash
# Copy template
cp .env.example .env.local

# Generate secrets
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Add OAuth credentials (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

---

## First Steps

1. **Open Admin Dashboard**: http://localhost:5174
2. **Sign in** with OAuth (Google/GitHub) or Magic Link
3. **Create a Project** - Your first tenant
4. **Create an App** - Add an app to your project
5. **Configure OAuth** - Set up authentication providers
6. **Invite Users** - Use the invitation system

---

## Troubleshooting

### Ports Already in Use
```bash
# Kill process on port
lsof -ti:3004 | xargs kill -9
```

### Database Issues
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Build Errors
```bash
# Clean and rebuild
rm -rf node_modules packages/*/node_modules apps/*/node_modules
pnpm install
pnpm build:packages
```

---

## Need More Details?

- **Full Setup Guide**: [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Environment Config**: See `.env.example`
- **Security Docs**: [docs/security/](./docs/security/)
- **API Docs**: [apps/gateway/README.md](./apps/gateway/README.md)

---

## Next Steps

After setup, explore:

1. ✅ [Product Specification](./docs/PRODUCT_SPEC.md)
2. ✅ [Development Guide](./DEVELOPMENT.md)
3. ✅ [Security Overview](./docs/security/README.md)
4. ✅ [Executive Summary](./SPEC_ANALYSIS_EXECUTIVE_SUMMARY.md)

---

**Last Updated**: January 1, 2026

---

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** 20.x or later
- **pnpm** 9.x or later
- **Docker** (for PostgreSQL & Redis)
- **Git**

---

## Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/proofa-core.git
cd proofa-core

# Install dependencies (this might take a few minutes)
pnpm install
```

---

## Step 2: Start PostgreSQL & Redis

### Using Docker (Recommended)

```bash
# Start PostgreSQL
docker run --name proofa-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=proofa \
  -p 5432:5432 \
  -d postgres:16

# Start Redis
docker run --name proofa-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

### Using Docker Compose (Alternative)

Create `docker-compose.yml` (or use the one in the repo):
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

Then run:
```bash
docker-compose up -d
```

---

## Step 3: Configure Environment

### Quick Setup (Recommended)

```bash
# Copy environment templates
cp .env.example .env
cp .env.local.example .env.local

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output
```

Edit `.env` and set these required values:
```bash
ENCRYPTION_KEY=<paste_generated_key_here>
RESEND_API_KEY=re_your_api_key_here  # Get from https://resend.com
```

The `.env` file contains base configuration (team defaults).  
The `.env.local` file is for your personal overrides (gitignored).

### Environment Files

- **`.env`** - Base configuration (loaded first)
- **`.env.local`** - Local overrides (loaded second, takes precedence)

Values in `.env.local` override values in `.env`. Use `.env.local` for personal settings like:
- Different database/Redis connections
- Personal OAuth credentials for testing
- Debug settings

See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for detailed environment configuration.

---

## Step 4: Setup Database

```bash
# Navigate to database package
cd packages/db

# Run migrations (creates all tables)
pnpm run db:push

# Verify database
pnpm run db:studio
# Opens Drizzle Studio at http://localhost:4983
```

---

## Step 5: Build Core Packages

```bash
# Navigate back to root
cd ../..

# Build core packages
pnpm --filter @proofa/db run build
pnpm --filter @proofa/cache run build
pnpm --filter @proofa/shared run build
```

---

## Step 6: Start Development

```bash
# Start all services in development mode
pnpm dev
```

This will start:
- **Gateway API**: http://localhost:3000
- **Admin Dashboard**: http://localhost:5173
- **User Portal**: http://localhost:5174
- **Documentation**: http://localhost:4321
- **Marketing Site**: http://localhost:4322

---

## Step 7: Automated Setup (Alternative)

Want to automate steps 2-6? Run our setup script:

```bash
./scripts/dev-setup.sh
```

This script will:
- Check prerequisites
- Install dependencies
- Create environment files
- Start Docker services
- Run database migrations
- Build core packages

---

## Step 8: Create Your First Project

1. Open the Admin Dashboard: http://localhost:5173
2. Sign in with OAuth (or magic link)
3. Complete onboarding
4. Create your first project
5. Create your first app
6. Configure OAuth providers
7. Invite users!

---

## Verification

### Test API Health
```bash
curl http://localhost:3000/health
```

### Test Database Connection
```bash
psql postgresql://proofa:proofa@localhost:5432/proofa -c "SELECT version();"
```

### Test Redis Connection
```bash
redis-cli -u redis://localhost:6379 ping
# Expected: PONG
```

---

## Common Issues & Solutions

### Port Already in Use
If ports 3000, 5173, 5432, or 6379 are already in use:

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change ports in respective config files
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs proofa-postgres

# Restart PostgreSQL
docker restart proofa-postgres
```

### Redis Connection Failed
```bash
# Check if Redis is running
docker ps | grep redis

# Check logs
docker logs proofa-redis

# Restart Redis
docker restart proofa-redis
```

### Build Errors
```bash
# Clean and rebuild
pnpm clean
rm -rf node_modules
pnpm install
pnpm build
```

---

## Next Steps

Once you're up and running:

1. **Explore the Admin Dashboard** - Create projects, apps, and manage users
2. **Configure OAuth** - Set up Google/GitHub authentication
3. **Create Plans** - Define licensing plans for your apps
4. **Invite Users** - Use the smart invitation system
5. **Test API** - Try out the REST API endpoints
6. **Read Documentation** - Check out http://localhost:4321

---

## Development Workflow

### Working on the Gateway
```bash
pnpm --filter @proofa/gateway dev
```

### Working on Admin Dashboard
```bash
pnpm --filter @proofa/dashboard-admin dev
```

### Database Changes
```bash
cd packages/db

# Make changes to src/schema.ts
# Generate migration
pnpm run db:generate

# Apply migration
pnpm run db:push

# Open Studio to verify
pnpm run db:studio
```

---

## Production Deployment

For production deployment, see:
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment configuration
- [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) - Database & Redis setup

**Recommended Services:**
- **PostgreSQL**: Neon, Supabase, Railway, Render
- **Redis**: Upstash, Redis Cloud, Railway
- **Hosting**: Fly.io, Railway, Render, Vercel

---

## Need Help?

- **Documentation**: http://localhost:4321 (when running)
- **GitHub Issues**: https://github.com/yourusername/proofa-core/issues
- **Email**: support@proofa.com

---

**Happy Building! 🚀**
