# 🚀 Proofa Core - Quick Start Guide

Get Proofa Core running in 5 minutes!

## Prerequisites
- **Node.js** 18+
- **pnpm** 8+
- **Docker** (for local services)
- OAuth apps (Google + GitHub)

## 1. Setup (2 minutes)

```bash
# Clone and install
git clone <repo>
cd proofa-core
pnpm install

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your OAuth credentials
# See DEVELOPMENT.md for detailed setup
```

## 1.5. Start Local Services (Docker)

```bash
# Start Redis and LibSQL (database)
pnpm docker:up

# Or start with debug tools (Redis Commander, Mailpit)
pnpm docker:up:all

# Check status
pnpm docker:status
```

**Services started:**
- 📦 Redis: `redis://localhost:6379`
- � Redis REST: `http://localhost:8079` (Upstash-compatible)
- �🗄️ LibSQL: `http://localhost:8080`
- 🔍 Redis Commander (debug): `http://localhost:8081`
- 📧 Mailpit (debug): `http://localhost:8025`

## 2. Configure Secrets (1 minute)

Minimum required in `.env.local`:

```bash
# Database (Local Docker - already configured in .env.local.example)
DATABASE_URL=http://localhost:8080
DATABASE_AUTH_TOKEN=

# Redis (Local Docker - already configured)
REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=local-dev-token

# OAuth (Google) - Required
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# OAuth (GitHub) - Optional
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Session Secret (generate these)
SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
S2S_SECRET=$(openssl rand -hex 32)
```

## 3. Database Setup (1 minute)

```bash
# Run migrations
pnpm db:migrate
```

## 4. Start Development (1 minute)

Open 4 terminals:

```bash
# Terminal 1: Core (port 3001)
pnpm --filter @proofa/core dev

# Terminal 2: Gateway (port 3002)
pnpm --filter @proofa/gateway dev

# Terminal 3: User Dashboard (port 5173)
pnpm --filter @proofa/user-dashboard dev

# Terminal 4: Admin Dashboard (port 5174)
pnpm --filter @proofa/admin-dashboard dev
```

## 5. Test the System

1. **User Dashboard**: http://localhost:5173
   - Click "Login with Google" or "Login with GitHub"
   - View profile and sessions
   - Update name

2. **Admin Dashboard**: http://localhost:5174
   - Create projects
   - Add apps to projects
   - Manage licenses

3. **Email/OTP** (if configured):
   - Click "Login with Email"
   - Enter email to receive OTP
   - Verify with 6-digit code

## API Endpoints

### Core (port 3001)
```
GET  /v1/auth/start?provider=google
GET  /v1/auth/callback/:provider
POST /v1/auth/exchange
POST /v1/email/start
POST /v1/email/verify
```

### Gateway (port 3002)
```
POST /v1/auth/login
POST /v1/auth/logout
GET  /v1/me
PATCH /v1/me
GET  /v1/me/sessions
DELETE /v1/me/sessions
GET  /v1/admin/projects
POST /v1/admin/projects
```

## Troubleshooting

### Port already in use?
```bash
lsof -ti :3001 | xargs kill -9
```

### Docker services not running?
```bash
# Check status
pnpm docker:status

# View logs
pnpm docker:logs

# Restart services
pnpm docker:down && pnpm docker:up
```

### Database connection error?
```bash
# Test Turso connection
turso db shell proofa

# Check credentials in .env.local
```

### OAuth not working?
- Verify callback URLs match `CALLBACK_URL` env var
- Check OAuth client ID/secret
- Clear browser cookies and retry

### Session not saving?
- Verify Redis token and URL
- Check CORE_S2S_TOKEN is set
- Clear cache: Upstash console

## Next Steps

1. **Development**: See [DEVELOPMENT.md](DEVELOPMENT.md)
2. **Architecture**: See [README.md](README.md)
3. **Status**: See [PROJECT_COMPLETE.md](PROJECT_COMPLETE.md)
4. **API Docs**: See README.md API section

## Features Checklist

- ✅ OAuth (Google, GitHub)
- ✅ Email/OTP with lockout
- ✅ Session management
- ✅ User profile CRUD
- ✅ Project management
- ✅ App configuration
- ✅ License management
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Admin dashboard
- ✅ User dashboard

## File Structure

```
proofa-core/
├── packages/
│   ├── shared/    # Types, constants, ID generator
│   ├── db/        # Database schema and queries
│   ├── auth/      # OAuth, session, crypto
│   └── redis/     # Cache and rate limiting
├── apps/
│   ├── core/      # Auth service (port 3001)
│   ├── gateway/   # BFF (port 3002)
│   ├── user-dashboard/    # User UI (port 5173)
│   └── admin-dashboard/   # Admin UI (port 5174)
└── docs/
    ├── README.md           # Full documentation
    ├── DEVELOPMENT.md      # Setup guide
    └── PROJECT_COMPLETE.md # Implementation status
```

## Getting Help

1. Check logs in terminal windows
2. Review `.env.local` configuration
3. See [DEVELOPMENT.md](DEVELOPMENT.md) troubleshooting section
4. Verify OAuth provider settings
5. Test database connection

---

**Ready?** Start with step 1 above! 🎉
