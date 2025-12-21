# 🚀 Proofa Core - Quick Start

Get Proofa running in 5 minutes!

## Prerequisites

- **Node.js** 22+ (check `.nvmrc`)
- **pnpm** 8+
- **Docker** (for local services)
- OAuth app credentials (Google or GitHub)

## 1. Setup (2 minutes)

```bash
# Clone and install
git clone <repo>
cd proofa-core
pnpm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your OAuth credentials
```

## 2. Start Docker Services (30 seconds)

```bash
# Start Redis and LibSQL
pnpm docker:up

# Or with debug tools (Redis Commander at :8081, Mailpit at :8025)
pnpm docker:up:all
```

**Services started:**
- 📦 Redis: `localhost:6379`
- 🌐 Redis REST: `http://localhost:8079`
- 🗄️ LibSQL: `http://localhost:8080`

## 3. Configure Secrets (1 minute)

Edit `.env.local` with at minimum:

```env
# OAuth (Required - at least one)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Generate secrets with: openssl rand -hex 32
JWT_SECRET=your-32-char-secret
SESSION_SECRET=your-32-char-secret
S2S_SECRET=your-s2s-secret
```

## 4. Run Migrations (30 seconds)

```bash
pnpm db:migrate
```

## 5. Start Development (30 seconds)

```bash
pnpm dev
```

Or start services individually:

```bash
pnpm --filter @proofa/core dev          # Port 3003
pnpm --filter @proofa/gateway dev       # Port 3004
pnpm --filter @proofa/dashboard-user dev    # Port 3001
pnpm --filter @proofa/dashboard-admin dev   # Port 3002
pnpm --filter @proofa/dashboard-home dev    # Port 4321
```

## 6. Test the System

| Service | URL |
|---------|-----|
| User Dashboard | http://localhost:3001 |
| Admin Dashboard | http://localhost:3002 |
| Core API | http://localhost:3003 |
| Gateway API | http://localhost:3004 |
| Home Page | http://localhost:4321 |

### Test OAuth Flow

1. Open http://localhost:3001
2. Click "Login with Google" or "Login with GitHub"
3. Complete OAuth flow
4. View profile and sessions

### Test Email/OTP

1. Click "Login with Email"
2. Enter email address
3. Check Mailpit at http://localhost:8025 (if using debug profile)
4. Enter 6-digit OTP

## API Endpoints

### Core (Port 3003)
```
GET  /v1/auth/start?provider=google&redirect_uri=...
GET  /v1/auth/callback/:provider
POST /v1/auth/exchange
POST /v1/email/start
POST /v1/email/verify
GET  /health
```

### Gateway (Port 3004)
```
GET  /auth/start
GET  /auth/callback
POST /v1/auth/logout
GET  /v1/auth/status
GET  /v1/me
PATCH /v1/me
GET  /v1/me/sessions
DELETE /v1/me/sessions
GET/POST /v1/admin/projects
GET  /health
```

## Troubleshooting

### Port already in use?
```bash
lsof -ti :3003 | xargs kill -9
```

### Docker not running?
```bash
pnpm docker:status
pnpm docker:logs
pnpm docker:down && pnpm docker:up
```

### OAuth not working?
- Verify callback URLs: `http://localhost:3003/v1/auth/callback/google`
- Check client ID/secret in `.env.local`
- Clear browser cookies

### Database error?
```bash
curl http://localhost:8080/health
pnpm db:migrate
```

## Next Steps

1. **Development Guide**: See [../DEVELOPMENT.md](../DEVELOPMENT.md)
2. **Full Specification**: See [PRODUCT_SPEC_FINAL.md](PRODUCT_SPEC_FINAL.md)
3. **Technical Debt**: See [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)

---

**Ready to go!** 🎉
