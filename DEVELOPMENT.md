# Proofa Development Guide

This guide will help you set up and run the Proofa monorepo locally for development.

## Prerequisites

- **Node.js**: v18+ ([Download](https://nodejs.org))
- **pnpm**: v8+ (`npm install -g pnpm`)
- **Turso CLI**: For database management ([Install](https://docs.turso.io/cli/installation))
- **Git**: For version control

## 1. Initial Setup

### Clone the Repository
```bash
git clone <repository-url>
cd proofa-core
```

### Install Dependencies
```bash
pnpm install
```

This installs all dependencies for the monorepo including:
- **packages/shared**: Shared types, constants, and utilities
- **packages/db**: Database schema and query helpers
- **packages/auth**: Authentication and session management
- **packages/redis**: Redis client and caching utilities
- **apps/core**: Core authentication and identity service
- **apps/gateway**: BFF (Backend-for-Frontend) server
- **apps/user-dashboard**: User-facing React dashboard
- **apps/admin-dashboard**: Admin-facing React dashboard

### Environment Configuration

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in the required environment variables:

#### Database Setup (Turso)
```
DATABASE_URL=libsql://your-db-name-xxx.turso.io
DATABASE_AUTH_TOKEN=your-auth-token
```

1. Create a Turso database:
```bash
turso db create proofa
```

2. Get your credentials:
```bash
turso db tokens create proofa
```

#### Redis Setup (Upstash)
```
UPSTASH_REDIS_REST_URL=https://your-redis-id.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

Visit [Upstash Console](https://console.upstash.com) to create a Redis database and get credentials.

#### OAuth Setup (Google + GitHub)

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `http://localhost:3001/v1/auth/callback/google`
6. Copy Client ID and Client Secret

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**GitHub OAuth:**
1. Go to [GitHub Settings → Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3001/v1/auth/callback/github`
4. Copy Client ID and Client Secret

```
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

#### Email Setup (Resend)
```
RESEND_API_KEY=your-resend-key
EMAIL_FROM=noreply@proofa.ai
SEND_EMAILS=false  # Set to true after verification
```

Visit [Resend](https://resend.com) to create an account and get API key.

#### Session & S2S Tokens

Generate secure random tokens:
```bash
# Session secret
openssl rand -hex 32

# S2S token
openssl rand -hex 32
```

```
SESSION_SECRET=<generated-session-secret>
CORE_S2S_TOKEN=<generated-s2s-token>
```

## 2. Database Migrations

Run database migrations to create tables:

```bash
pnpm db:migrate
```

Or manually with Drizzle Kit:
```bash
pnpm --filter @proofa/db run build
npx drizzle-kit migrate --config packages/db/drizzle.config.ts
```

## 3. Running the Applications

### Development Mode (All Services)

Start all applications in development mode:
```bash
pnpm dev
```

This starts:
- **Core** (port 3001): Authentication & identity service
- **Gateway** (port 3002): BFF server
- **User Dashboard** (port 5173): User-facing UI
- **Admin Dashboard** (port 5174): Admin-facing UI

### Individual Services

Start specific services:
```bash
# Core only
pnpm --filter @proofa/core dev

# Gateway only
pnpm --filter @proofa/gateway dev

# User Dashboard only
pnpm --filter @proofa/user-dashboard dev

# Admin Dashboard only
pnpm --filter @proofa/admin-dashboard dev
```

## 4. Development Workflow

### Understanding the Architecture

```
┌─────────────────────────────────────────────────┐
│         User/Admin Dashboards (React)           │ (localhost:5173, 5174)
├─────────────────────────────────────────────────┤
│         Gateway BFF (Hono)                      │ (localhost:3002)
├─────────────────────────────────────────────────┤
│  Core (Hono) ← Session Store (Redis)            │ (localhost:3001)
├─────────────────────────────────────────────────┤
│  Database (Turso/SQLite) + Drizzle ORM          │
└─────────────────────────────────────────────────┘
```

### API Endpoints

#### Core Service (`/v1/*`)
- `GET /v1/auth/start` - Start OAuth flow
- `GET /v1/auth/callback/:provider` - OAuth callback
- `POST /v1/auth/exchange` - Exchange session
- `POST /v1/email/start` - Request OTP
- `POST /v1/email/verify` - Verify OTP & create session
- `GET /v1/license` - Get license info
- `POST /v1/admin/license/grant` - Grant license

#### Gateway Service (`/v1/*`)
- `POST /v1/auth/login` - Login (sets session cookie)
- `POST /v1/auth/logout` - Logout
- `GET /v1/me` - Get current user
- `PATCH /v1/me` - Update profile
- `GET /v1/me/sessions` - List sessions
- `DELETE /v1/me/sessions` - Logout all sessions
- `GET /v1/admin/projects` - List projects
- `POST /v1/admin/projects` - Create project
- `GET /v1/admin/apps` - List apps
- `POST /v1/admin/apps` - Create app

### Code Structure

#### packages/
- **shared**: Types, ID generators, constants
- **db**: Drizzle schema, query helpers, migrations
- **auth**: OAuth adapters, session management, crypto
- **redis**: Cache, rate limiting, session store

#### apps/
- **core**: Identity, authentication, licensing
- **gateway**: BFF, user profile, admin CRUD
- **user-dashboard**: User account management UI
- **admin-dashboard**: Project/app management UI

### Development Tips

1. **Hot Reload**: All services support hot reload. Modify files and changes will reflect immediately.

2. **Database Debugging**: 
   ```bash
   turso db shell proofa
   ```

3. **Redis Debugging**:
   ```bash
   # In Upstash Console, view keys and values
   ```

4. **OTP Testing**: In dev mode, OTP codes are logged to console:
   ```
   [DEV] OTP for user@example.com: 123456
   ```

5. **S2S Authentication**: Core endpoints requiring S2S validation check the `X-S2S-Token` header.

## 5. Building for Production

### Build All Packages
```bash
pnpm build
```

### Build Individual Packages
```bash
pnpm --filter @proofa/shared build
pnpm --filter @proofa/core build
pnpm --filter @proofa/gateway build
pnpm --filter @proofa/user-dashboard build
```

## 6. Deployment

### Deploy to Cloudflare Workers (Recommended)

```bash
# Core
pnpm --filter @proofa/core run deploy

# Gateway
pnpm --filter @proofa/gateway run deploy
```

### Deploy Dashboards to Vercel/Netlify

```bash
# User Dashboard
pnpm --filter @proofa/user-dashboard run build
# Deploy `dist/` folder

# Admin Dashboard
pnpm --filter @proofa/admin-dashboard run build
# Deploy `dist/` folder
```

## 7. Testing

Run tests for all packages:
```bash
pnpm test
```

Run tests for specific package:
```bash
pnpm --filter @proofa/core test
```

## 8. Troubleshooting

### Port Already in Use
```bash
# Kill process on port
lsof -ti :3001 | xargs kill -9
```

### Database Connection Error
1. Check DATABASE_URL and DATABASE_AUTH_TOKEN
2. Verify Turso database exists: `turso db list`
3. Test connection: `turso db shell proofa`

### OAuth Redirect Issues
- Ensure callback URLs in OAuth provider settings match `CALLBACK_URL` env var
- Check that Core and Gateway are running on expected ports

### Session Cookie Not Setting
- Verify HTTPS or localhost (sameSite=Lax requires secure context in production)
- Check that SESSION_SECRET is set
- Clear browser cookies and try again

### Redis Connection Error
- Verify UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
- Check Upstash console for active database
- Test with: `curl -H "Authorization: Bearer <token>" <url>/ping`

## 9. Additional Resources

- [Hono Documentation](https://hono.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Turso Documentation](https://docs.turso.io)
- [Upstash Documentation](https://upstash.com/docs)
- [React Documentation](https://react.dev)
- [TanStack Query Documentation](https://tanstack.com/query)

## 10. Getting Help

- Check logs in each service for error messages
- Review `.env.local` for missing/incorrect configuration
- Verify all external services (Turso, Upstash, OAuth) are accessible
- Check network tab in browser DevTools for API errors
