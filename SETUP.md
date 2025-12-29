# Proofa Development Setup

> **One-command setup for local development**

## 🚀 Quick Start (Automated)

```bash
# Clone the repository
git clone https://github.com/yourorg/proofa-core.git
cd proofa-core

# Run the automated setup script
pnpm run setup

# Start all development servers
pnpm dev
```

**That's it!** The setup script will:
- ✅ Check prerequisites (Node.js, pnpm, Docker)
- ✅ Create `.env.local` with sensible defaults
- ✅ Generate secure secrets automatically
- ✅ Start PostgreSQL and Redis containers
- ✅ Run database migrations
- ✅ Build all packages
- ✅ Show you what to do next

---

## 🔧 Manual Setup (Step by Step)

If you prefer to set things up manually:

### 1. Prerequisites

- **Node.js** 22+ ([Download](https://nodejs.org))
- **pnpm** 8+ (Install: `npm install -g pnpm`)
- **Docker** & **Docker Compose** ([Download](https://docker.com))

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Environment

```bash
# Copy environment template
cp .env.local.example .env.local

# Generate secrets
pnpm run setup:secrets
```

Copy the generated secrets and paste them into `.env.local`:
- `ENCRYPTION_KEY`
- `SESSION_SECRET`
- `GATEWAY_S2S_TOKEN`
- `CORE_S2S_TOKEN`

### 4. Start Infrastructure

```bash
# Start PostgreSQL and Redis
pnpm run docker:up

# Verify services are running
docker compose ps
```

### 5. Setup Database

```bash
# Run migrations
pnpm run db:migrate
```

### 6. Build Packages

```bash
# Build all shared packages
pnpm run build:packages
```

### 7. Start Development Servers

```bash
# Start all services
pnpm dev

# Or start individually
pnpm dev:gateway    # API Gateway (port 3004)
pnpm dev:core       # Core Service (port 3003)
pnpm dev:admin      # Admin Dashboard (port 5174)
pnpm dev:user       # User Dashboard (port 5173)
```

---

## 📋 Available Commands

### Development

```bash
pnpm dev              # Start all services
pnpm dev:gateway      # Start API Gateway only
pnpm dev:core         # Start Core Service only
pnpm dev:admin        # Start Admin Dashboard only
pnpm dev:user         # Start User Dashboard only
pnpm dev:home         # Start Marketing Site only
pnpm dev:docs         # Start Documentation only
```

### Building

```bash
pnpm build            # Build all packages and apps
pnpm build:packages   # Build shared packages only
```

### Database

```bash
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Drizzle Studio
pnpm db:generate      # Generate migration files
```

### Docker

```bash
pnpm docker:up        # Start PostgreSQL and Redis
pnpm docker:down      # Stop all containers
pnpm docker:logs      # View container logs
pnpm docker:clean     # Stop and remove all data
```

### Utilities

```bash
pnpm setup            # Run automated setup script
pnpm setup:secrets    # Generate secure secrets
pnpm lint             # Lint all packages
pnpm format           # Format code
pnpm typecheck        # Type check all packages
pnpm clean            # Clean build artifacts
```

---

## 🌐 Service URLs

After running `pnpm dev`, access the services at:

| Service | URL | Description |
|---------|-----|-------------|
| **Gateway API** | http://localhost:3004 | REST API Gateway |
| **Core Service** | http://localhost:3003 | Core Authentication Service |
| **Admin Dashboard** | http://localhost:5174 | Admin Management UI |
| **User Dashboard** | http://localhost:5173 | User Portal |
| **Marketing Site** | http://localhost:4321 | Homepage (Astro) |
| **Documentation** | http://localhost:4322 | Docs Site (Starlight) |

### Database Tools

| Tool | Command | Description |
|------|---------|-------------|
| **Drizzle Studio** | `pnpm db:studio` | Visual database browser |
| **PostgreSQL CLI** | `docker compose exec postgres psql -U proofa -d proofa` | Direct database access |
| **Redis CLI** | `docker compose exec redis redis-cli` | Redis command line |

### Optional Tools

```bash
# Start email testing (Mailpit)
docker compose --profile email up -d mailpit
# Access at: http://localhost:8025

# Start Redis Commander
docker compose --profile debug up -d redis-commander
# Access at: http://localhost:8081
```

---

## ⚙️ Configuration

### Required Environment Variables

The `.env.local` file is automatically configured with working defaults. However, you may want to customize:

#### Email (Optional for local dev)

Get a free API key from [Resend](https://resend.com):

```env
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

#### OAuth Providers (Optional)

Configure in the admin dashboard OR set platform defaults:

**Google OAuth:**
1. Visit [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Add to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

**GitHub OAuth:**
1. Visit [GitHub Developer Settings](https://github.com/settings/developers)
2. Create OAuth App
3. Add to `.env.local`:
   ```env
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```

---

## 🐛 Troubleshooting

### Port Already in Use

If you see port conflict errors:

```bash
# Check what's using the port
lsof -i :3004  # Replace with the conflicting port

# Kill the process
kill -9 <PID>
```

### Docker Containers Won't Start

```bash
# Check Docker is running
docker ps

# View container logs
docker compose logs postgres
docker compose logs redis

# Restart containers
pnpm docker:down
pnpm docker:up
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose exec postgres pg_isready -U proofa

# Reset database (WARNING: deletes all data)
pnpm docker:clean
pnpm docker:up
pnpm db:migrate
```

### Build Errors

```bash
# Clean and reinstall
pnpm clean
rm -rf node_modules
pnpm install

# Rebuild packages
pnpm build:packages
```

### Environment Variables Not Loading

```bash
# Verify .env.local exists
ls -la .env.local

# Check format (no spaces around =)
cat .env.local | grep ENCRYPTION_KEY

# Regenerate secrets
pnpm setup:secrets
```

---

## 📚 Next Steps

1. **Configure OAuth Providers** (optional)
   - Login to admin dashboard: http://localhost:5174
   - Navigate to Project Settings → OAuth
   - Add Google/GitHub credentials

2. **Create Your First Project**
   - Click "Create Project" in admin dashboard
   - Add an app to your project
   - Configure app settings

3. **Test Authentication**
   - Visit user dashboard: http://localhost:5173
   - Try logging in with OAuth
   - Test magic link authentication

4. **Explore the API**
   - View API docs: http://localhost:4322
   - Test endpoints with the Gateway API
   - Use Drizzle Studio to view data

5. **Read the Documentation**
   - [Architecture Overview](./docs/ARCHITECTURE.md)
   - [Security Documentation](./docs/security/README.md)
   - [API Reference](./apps/gateway/README.md)

---

## 🆘 Getting Help

- **Documentation**: http://localhost:4322 or [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourorg/proofa-core/issues)
- **Security**: security@proofa.sh

---

## 🎉 You're Ready!

Your development environment is now fully configured. Start building amazing authentication experiences!

```bash
pnpm dev
```

**Happy coding! 🚀**
