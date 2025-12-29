# Proofa Quick Start Guide

Get Proofa up and running in under 10 minutes!

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

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL=postgresql://proofa:proofa@localhost:5432/proofa

# Redis
REDIS_URL=redis://localhost:6379

# Email Service (Get free API key from https://resend.com)
RESEND_API_KEY=re_your_api_key_here

# Encryption Key (Generate using command below)
ENCRYPTION_KEY=your_64_character_hex_string_here

# OAuth Providers (Optional - Platform defaults)
# Get credentials from Google Cloud Console & GitHub OAuth Apps
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Application URLs (defaults for development)
GATEWAY_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:5173
```

### Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as `ENCRYPTION_KEY` in your `.env` file.

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
pnpm --filter @proofa/redis run build
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

## Step 7: Create Your First Project

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
