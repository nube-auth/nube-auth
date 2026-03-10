# Deployment Guide

Backend services deploy to **Railway**. Frontend apps deploy to **Vercel**.

---

## Architecture

| Service | Platform | URL | Dockerfile |
|---------|----------|-----|------------|
| Gateway | Railway | `api.proofa.sh` | `deployment/Dockerfile.gateway` |
| Core | Railway | `auth.proofa.sh` | `deployment/Dockerfile.core` |
| Workers | Railway | — (no public endpoint) | `deployment/Dockerfile.workers` |
| Admin Dashboard | Vercel | `manage.proofa.sh` | `apps/dashboard/admin/vercel.json` |
| User Dashboard | Vercel | `user.proofa.sh` | `apps/dashboard/user/vercel.json` |
| Marketing Site | Vercel | `proofa.sh` | `apps/dashboard/home/vercel.json` |
| Docs | Vercel | `docs.proofa.sh` | `apps/dashboard/docs/vercel.json` |

---

## Railway (Backend Services)

### Prerequisites
- Railway account and project created at [railway.app](https://railway.app)
- PostgreSQL and Redis provisioned as Railway services in the same project

### Adding a Service

For each backend service (gateway, core, workers):

1. In Railway project → **New Service** → **GitHub Repo**
2. Select `proofa-core` repo
3. In service **Settings**:
   - **Root Directory**: `/` (repo root — required for monorepo builds)
   - **Dockerfile Path**: `deployment/Dockerfile.gateway` (or `deployment/Dockerfile.core` / `deployment/Dockerfile.workers`)
   - **Build Command**: *(leave empty — Dockerfile handles it)*
   - **Start Command**: *(leave empty — CMD in Dockerfile handles it)*

### Required Environment Variables

Set these in each Railway service's **Variables** tab. Shared vars (same value across services) are marked `[shared]`.

#### Gateway Service
```
NODE_ENV=production
DATABASE_URL=[shared] postgresql://...
REDIS_URL=[shared] redis://...
SESSION_SECRET=[shared] <128-char hex>
ENCRYPTION_KEY=[shared] <64-char hex>
S2S_SECRET=[shared] <32+ char secret>
X_PROOFA_SERVICE_TOKEN=[shared] <generated token>
RESEND_API_KEY=re_...
CORE_URL=https://auth.proofa.sh
GATEWAY_PUBLIC_URL=https://api.proofa.sh
GATEWAY_PORT=8080
USER_DASHBOARD_URL=https://user.proofa.sh
ADMIN_DASHBOARD_URL=https://manage.proofa.sh
COOKIE_DOMAIN=.proofa.sh
SEND_EMAILS=true
EMAIL_FROM=noreply@proofa.sh
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Core Service
```
NODE_ENV=production
DATABASE_URL=[shared]
REDIS_URL=[shared]
SESSION_SECRET=[shared]
JWT_SECRET=<64-char hex>
S2S_SECRET=[shared]
RESEND_API_KEY=[shared]
PAYMENT_CONFIGS_KEY=<64-char hex — for encrypting stored payment credentials>
CORE_PUBLIC_URL=https://auth.proofa.sh
ADMIN_DASHBOARD_URL=https://manage.proofa.sh
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
ALLOWED_REDIRECT_ORIGINS=https://api.proofa.sh,https://user.proofa.sh,https://manage.proofa.sh
SEND_EMAILS=true
EMAIL_FROM=noreply@proofa.sh
CORE_PORT=3003
```

#### Workers Service
```
NODE_ENV=production
DATABASE_URL=[shared]
REDIS_URL=[shared]
```

### Generating Secrets
```bash
# SESSION_SECRET / JWT_SECRET (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY / PAYMENT_CONFIGS_KEY (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# S2S_SECRET / X_PROOFA_SERVICE_TOKEN (32+ chars)
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### Custom Domains
In the Railway service **Settings → Networking**:
- Gateway: `api.proofa.sh`
- Core: `auth.proofa.sh`
- Workers: *(no domain — disable public networking)*

### Health Checks
Configure in Railway service **Settings → Healthcheck**:
- Gateway: `GET /v1/health` — port 8080
- Core: `GET /v1/health` — port 3003
- Workers: *(no HTTP — leave health check disabled)*

---

## Vercel (Frontend Apps)

Each frontend app has a `vercel.json` at its directory root with the correct build command, output directory, and SPA rewrites pre-configured.

### Setup (one-time per app)

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import `proofa-core` repo
2. Set **Root Directory** to the app subdirectory (e.g. `apps/dashboard/admin`)
3. Vercel auto-detects `vercel.json` — no further config needed
4. Add the environment variables below

### Environment Variables

All Vercel apps need:

```
VITE_GATEWAY_URL=https://api.proofa.sh
VITE_CORE_URL=https://auth.proofa.sh
VITE_HOME_URL=https://proofa.sh
VITE_DOCS_URL=https://docs.proofa.sh
```

### Custom Domains
Attach custom domains in the Vercel project **Settings → Domains**:
- Admin Dashboard → `manage.proofa.sh`
- User Dashboard → `user.proofa.sh`
- Marketing Site → `proofa.sh`
- Docs → `docs.proofa.sh`

---

## Local Docker Builds (Testing)

Build and run any service locally against real infrastructure:

```bash
# Build
docker build -f deployment/Dockerfile.gateway -t proofa-gateway .
docker build -f deployment/Dockerfile.core    -t proofa-core .
docker build -f deployment/Dockerfile.workers -t proofa-workers .

# Run (supply env vars from .env.local)
docker run --env-file .env.local -p 8080:8080 proofa-gateway
docker run --env-file .env.local -p 3003:3003 proofa-core
docker run --env-file .env.local             proofa-workers
```

---

## Database Migrations

Run migrations against the production database before (or alongside) deploying a new service version:

```bash
# Ensure DATABASE_URL is set in your shell or .env
export DATABASE_URL="postgresql://..."
pnpm db:push
```

For production Railway deployments, run migrations manually via:

```bash
railway run --service core pnpm --filter @proofa/db db:push
```
