# Local Development Setup

Complete guide for setting up Proofa for local development with Docker.

---

## Prerequisites

- **Node.js** 20+ and **pnpm** 9+
- **Docker** and **Docker Compose**
- **Git**

---

## Quick Start

```bash
# 1. Clone and install
git clone <repository-url>
cd proofa-core
pnpm install

# 2. Setup environment files
cp .env.example .env
cp .env.local.example .env.local

# 3. Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to ENCRYPTION_KEY in .env

# 4. Start Docker services
docker compose up -d

# 5. Run database migrations
cd packages/db
pnpm run db:push
cd ../..

# 6. Build packages
pnpm --filter @proofa/db run build
pnpm --filter @proofa/redis run build
pnpm --filter @proofa/shared run build

# 7. Start development
pnpm dev
```

---

## Environment Configuration

### Environment Files Structure

Proofa uses a two-tier environment configuration:

1. **`.env`** - Base configuration (committed as `.env.example`)
2. **`.env.local`** - Local overrides (gitignored, personal settings)

The system loads `.env` first, then `.env.local`. Values in `.env.local` override `.env`.

### Setting Up Environment

#### 1. Create Base Configuration
```bash
cp .env.example .env
```

Edit `.env` with your base configuration:
```bash
# Required
DATABASE_URL=postgresql://proofa:proofa@localhost:5432/proofa
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=re_your_api_key
ENCRYPTION_KEY=<generate_using_command_below>

# Optional (platform defaults)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

#### 2. Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to `ENCRYPTION_KEY` in your `.env` file.

#### 3. Create Local Overrides (Optional)
```bash
cp .env.local.example .env.local
```

Use `.env.local` for personal settings that differ from the team defaults in `.env`:
```bash
# Example: Use local Mailpit for email testing
RESEND_API_KEY=re_test_key

# Example: Use different OAuth credentials
GOOGLE_CLIENT_ID=my_personal_client_id
GOOGLE_CLIENT_SECRET=my_personal_secret

# Example: Debug mode
LOG_LEVEL=debug
DEBUG=true
```

---

## Docker Services

### Available Services

The `docker-compose.yml` file provides the following services:

1. **PostgreSQL** - Main database (port 5432)
2. **Redis** - Cache and sessions (port 6379)
3. **Redis Commander** - Redis web UI (port 8081, debug profile)
4. **Mailpit** - Email testing (port 8025, email profile)

### Starting Services

#### Start Core Services (PostgreSQL + Redis)
```bash
docker compose up -d
```

#### Start with Redis Commander (for debugging)
```bash
docker compose --profile debug up -d
```

#### Start with Mailpit (for email testing)
```bash
docker compose --profile email up -d
```

#### Start Everything
```bash
docker compose --profile debug --profile email up -d
```

### Managing Services

```bash
# View running services
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f postgres
docker compose logs -f redis

# Stop services
docker compose down

# Stop and remove volumes (clears database data)
docker compose down -v

# Restart a service
docker compose restart postgres
```

### Accessing Services

| Service | URL/Connection | Credentials |
|---------|---------------|-------------|
| **PostgreSQL** | `localhost:5432` | user: `proofa`, pass: `proofa`, db: `proofa` |
| **Redis** | `localhost:6379` | No authentication |
| **Redis Commander** | http://localhost:8081 | No authentication |
| **Mailpit Web UI** | http://localhost:8025 | No authentication |
| **Mailpit SMTP** | `localhost:1025` | No authentication |

---

## Database Setup

### Initial Setup

```bash
# Navigate to database package
cd packages/db

# Apply migrations (creates all tables)
pnpm run db:push

# Verify with Drizzle Studio
pnpm run db:studio
# Opens at http://localhost:4983
```

### Database Operations

```bash
# Generate migration from schema changes
pnpm run db:generate

# Apply migrations
pnpm run db:push

# Open Drizzle Studio (visual database browser)
pnpm run db:studio
```

### Connecting to PostgreSQL

```bash
# Using psql
psql postgresql://proofa:proofa@localhost:5432/proofa

# Using Docker
docker exec -it proofa-postgres psql -U proofa -d proofa

# Common queries
\dt              # List tables
\d users         # Describe users table
SELECT * FROM users LIMIT 10;
```

### Reset Database

```bash
# Stop and remove database volume
docker compose down
docker volume rm proofa-core_postgres_data

# Start fresh
docker compose up -d postgres

# Re-run migrations
cd packages/db
pnpm run db:push
```

---

## Redis Setup

### Connecting to Redis

```bash
# Using redis-cli
redis-cli -h localhost -p 6379

# Using Docker
docker exec -it proofa-redis redis-cli

# Common commands
PING              # Test connection
KEYS *            # List all keys
GET cache:user:123
FLUSHALL          # Clear all data (use with caution)
```

### Redis Commander (Web UI)

Start with debug profile:
```bash
docker compose --profile debug up -d redis-commander
```

Access at: http://localhost:8081

Features:
- Browse keys
- View/edit values
- Monitor commands
- Execute commands

---

## Email Testing with Mailpit

Mailpit catches all outgoing emails for local testing.

### Setup

1. Start Mailpit:
```bash
docker compose --profile email up -d mailpit
```

2. Configure `.env.local`:
```bash
# Use test API key (emails will be caught by Mailpit)
RESEND_API_KEY=re_test_key
SMTP_HOST=localhost
SMTP_PORT=1025
```

3. Access Mailpit Web UI:
```
http://localhost:8025
```

### Features
- View all sent emails
- Check HTML/text versions
- Preview in browser
- Download attachments
- Search emails
- REST API access

---

## Development Workflow

### Building Packages

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @proofa/db run build
pnpm --filter @proofa/shared run build
pnpm --filter @proofa/redis run build

# Watch mode for development
pnpm --filter @proofa/shared dev
```

### Running Applications

```bash
# Start all applications in dev mode
pnpm dev

# Start specific application
pnpm --filter @proofa/gateway dev
pnpm --filter @proofa/dashboard-admin dev

# Production build and start
pnpm build
pnpm start
```

### Available Services

| Service | Port | URL |
|---------|------|-----|
| **Gateway API** | 3000 | http://localhost:3000 |
| **Admin Dashboard** | 5173 | http://localhost:5173 |
| **User Portal** | 5174 | http://localhost:5174 |
| **Documentation** | 4321 | http://localhost:4321 |
| **Marketing Site** | 4322 | http://localhost:4322 |

---

## Testing Your Setup

### 1. Check Docker Services
```bash
# All services should be running
docker compose ps

# Expected output:
# proofa-postgres    running
# proofa-redis       running
```

### 2. Test Database Connection
```bash
psql postgresql://proofa:proofa@localhost:5432/proofa -c "SELECT version();"
```

### 3. Test Redis Connection
```bash
redis-cli -h localhost -p 6379 ping
# Expected: PONG
```

### 4. Test API Gateway
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### 5. Access Admin Dashboard
Open http://localhost:5173 in your browser.

---

## Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -ti:5432  # PostgreSQL
lsof -ti:6379  # Redis
lsof -ti:3000  # Gateway

# Kill process
lsof -ti:3000 | xargs kill -9

# Or change port in docker-compose.yml
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# View logs
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres

# Check connection
psql postgresql://proofa:proofa@localhost:5432/proofa -c "SELECT 1;"
```

### Redis Connection Failed

```bash
# Check if Redis is running
docker compose ps redis

# View logs
docker compose logs redis

# Restart Redis
docker compose restart redis

# Test connection
redis-cli -h localhost -p 6379 ping
```

### Environment Variables Not Loading

```bash
# Check if .env exists
ls -la .env .env.local

# Verify environment loading
cd apps/gateway
node -e "require('./dist/config/env.js')"
```

### Build Errors

```bash
# Clean everything
pnpm clean
rm -rf node_modules
rm -rf **/node_modules

# Reinstall
pnpm install

# Rebuild
pnpm build
```

### Migration Errors

```bash
# Check database connection
psql postgresql://proofa:proofa@localhost:5432/proofa -c "\dt"

# Reset database (WARNING: Deletes all data)
docker compose down -v
docker compose up -d
cd packages/db
pnpm run db:push
```

---

## Development Tips

### Hot Reload

All applications support hot reload in development mode:
```bash
pnpm dev
```

Changes to source files will automatically trigger rebuilds.

### Debugging

#### VS Code Launch Configuration
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Gateway",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/apps/gateway/src/index.ts",
      "runtimeArgs": ["-r", "tsx/register"],
      "outFiles": ["${workspaceFolder}/apps/gateway/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

#### Environment Variables
```bash
# Enable debug logging in .env.local
LOG_LEVEL=debug
DEBUG=true
```

### Database Inspection

Use Drizzle Studio for visual database inspection:
```bash
cd packages/db
pnpm run db:studio
```

Opens at http://localhost:4983

### Redis Inspection

Use Redis Commander:
```bash
docker compose --profile debug up -d redis-commander
```

Opens at http://localhost:8081

---

## Team Workflow

### Recommended Setup

1. **Commit `.env.example`** - Team defaults
2. **Each developer creates `.env`** - Copy from `.env.example`
3. **Each developer creates `.env.local`** - Personal overrides (gitignored)

### Sharing Configuration

```bash
# Add new required variable to .env.example
echo "NEW_API_KEY=placeholder" >> .env.example

# Commit .env.example
git add .env.example
git commit -m "Add NEW_API_KEY to environment"

# Team members update their local .env
# No need to share actual secrets
```

### Best Practices

1. ✅ **DO** add new variables to `.env.example`
2. ✅ **DO** use `.env.local` for personal settings
3. ✅ **DO** document new variables in `.env.example`
4. ❌ **DON'T** commit `.env` or `.env.local`
5. ❌ **DON'T** commit real secrets or API keys
6. ❌ **DON'T** share your `.env.local` file

---

## Cleanup

### Stop Everything
```bash
docker compose down
```

### Remove Volumes (Clears Data)
```bash
docker compose down -v
```

### Complete Cleanup
```bash
# Stop and remove containers, networks, volumes
docker compose down -v

# Remove node_modules
rm -rf node_modules **/node_modules

# Remove build artifacts
pnpm clean
```

---

## Next Steps

Once your local environment is running:

1. **Create your first project** in the Admin Dashboard
2. **Configure OAuth** providers
3. **Create plans** for licensing
4. **Invite users** to test the system
5. **Read the API docs** at http://localhost:4321

---

## Support

- **Quick Start**: [QUICKSTART.md](./QUICKSTART.md)
- **Environment Setup**: [.env.example](./.env.example)
- **API Documentation**: http://localhost:4321 (when running)
- **Database Schema**: [packages/db/README.md](./packages/db/README.md)

---

**Happy Coding! 🚀**
