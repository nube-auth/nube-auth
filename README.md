# 🔐 Proofa Core

> Enterprise-grade multi-tenant authentication and licensing system built with TypeScript, Hono, and React.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Security](#-security)
- [Development](#-development)
- [Deployment](#-deployment)

## ✨ Features

### Authentication
- ✅ OAuth 2.0 (Google, GitHub)
- ✅ Email/OTP with 3-attempt lockout
- ✅ Compact ID format (11-14 chars)
- ✅ Session management with per-app TTL (1-365 days)
- ✅ S2S authentication for service-to-service calls
- ✅ Auth-code exchange flow (secure token exchange)

### Core Service
- ✅ Identity provider management
- ✅ User creation/management
- ✅ Session lifecycle management
- ✅ Rate limiting (5 OTP/hour, 5 verify/5min)
- ✅ 30-minute account lockout after 3 OTP failures
- ✅ License auto-provisioning

### Gateway BFF
- ✅ Session bridge between Core and Apps
- ✅ User profile CRUD
- ✅ Session management (list, logout)
- ✅ Admin CRUD (projects, apps, licenses, members)
- ✅ Access control with project member validation

### Dashboards
- ✅ User Dashboard (profile, session management)
- ✅ Admin Dashboard (projects, apps, members, licenses)
- ✅ Home Page (Astro landing page)
- ✅ Protected routes with auth checks
- ✅ Real-time data fetching with TanStack Query

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ User Dashboard│Admin Dashboard│  Home Page  │ Client Apps   │
│  (Port 3001) │  (Port 3002)  │ (Port 4321) │               │
└──────────────┴───────┬───────┴──────────────┴───────────────┘
                       │ HTTPS
            ┌──────────┴──────────┐
            │    Gateway BFF      │
            │    (Port 3004)      │ ← Session management
            │                     │ ← Profile CRUD
            │                     │ ← Admin routes
            └──────────┬──────────┘
                       │ HTTP (S2S)
            ┌──────────┴──────────┐
            │   Core Service      │
            │    (Port 3003)      │ ← OAuth flows
            │                     │ ← Email/OTP
            │                     │ ← Session lifecycle
            └──────────┬──────────┘
                       │
            ┌──────────┴──────────┐
            │ Database (Turso)    │
            │ Redis (Upstash)     │
            │ Email (Resend)      │
            └─────────────────────┘
```

### Port Summary

| Service | Port | Description |
|---------|------|-------------|
| User Dashboard | 3001 | User profile & session management UI |
| Admin Dashboard | 3002 | Project/app/license admin UI |
| Core | 3003 | Authentication & identity service |
| Gateway | 3004 | BFF for apps & dashboards |
| Home | 4321 | Astro landing page |

## 🛠 Tech Stack

### Backend
- **Node.js** 22+ with TypeScript 5.x
- **Hono** - Lightweight web framework
- **Turso** - SQLite via libSQL
- **Drizzle ORM** - Type-safe database queries
- **Upstash Redis** - Serverless caching & rate limiting
- **Resend** - Email service
- **Pino** - Structured logging

### Frontend
- **React** 18
- **Vite** - Build tool
- **Astro** - Home page (static site)
- **React Router** v6 - Navigation
- **TanStack Query** 5 - Server state management
- **TypeScript** - Type safety

### Infrastructure
- **pnpm** - Package manager
- **Turbo** 2.7 - Monorepo build system
- **Biome** 2.3 - Linting & formatting
- **Docker Compose** - Local development services

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm 8+
- Docker (for local Redis & LibSQL)
- OAuth apps (Google + GitHub)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Local Services

```bash
# Start Redis and LibSQL
pnpm docker:up

# Or with debug tools (Redis Commander, Mailpit)
pnpm docker:up:all
```

### 3. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your OAuth credentials
```

### 4. Run Migrations

```bash
pnpm db:migrate
```

### 5. Start Development

```bash
# Start all services
pnpm dev

# Or start individually:
pnpm --filter @proofa/core dev        # Port 3003
pnpm --filter @proofa/gateway dev     # Port 3004
pnpm --filter @proofa/dashboard-user dev   # Port 3001
pnpm --filter @proofa/dashboard-admin dev  # Port 3002
pnpm --filter @proofa/dashboard-home dev   # Port 4321
```

### Access Points

- **User Dashboard**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3002
- **Core API**: http://localhost:3003
- **Gateway API**: http://localhost:3004
- **Home Page**: http://localhost:4321

## 📁 Project Structure

```
proofa-core/
├── apps/
│   ├── core/                  # Auth service (OAuth, OTP, sessions)
│   ├── gateway/               # BFF (profile, admin, session bridge)
│   └── dashboard/
│       ├── user/              # User profile UI
│       ├── admin/             # Admin CRUD UI
│       └── home/              # Astro landing page
├── packages/
│   ├── shared/                # Types, constants, ID generators
│   ├── db/                    # Drizzle schema + queries
│   ├── auth/                  # OAuth adapters, crypto, sessions
│   └── redis/                 # Cache, rate limiting, session store
├── docs/                      # Documentation
│   ├── PRODUCT_SPEC_FINAL.md  # Source of truth specification
│   ├── QUICKSTART.md          # Quick start guide
│   └── TECHNICAL_DEBT.md      # Technical debt tracker
├── docker-compose.yml         # Local development services
├── turbo.json                 # Turbo build configuration
└── biome.json                 # Linting configuration
```

## 📡 API Reference

### Core Service (Port 3003)

#### OAuth Flow
```http
GET /v1/auth/start?provider=google&app_id=xxx&redirect_uri=...
  → Returns OAuth authorization URL

GET /v1/auth/callback/:provider?code=...
  → Exchanges OAuth code, creates auth_code
  → Redirects to Gateway with auth_code

POST /v1/auth/exchange (S2S only)
  Body: { code, app_id, redirect_uri }
  → Returns: { user, license }
```

#### Email/OTP
```http
POST /v1/email/start
  Body: { email }
  → Sends 6-digit OTP via email
  → Rate limit: 5 per hour per email

POST /v1/email/verify
  Body: { email, code }
  → Verifies OTP code
  → Rate limit: 5 per 5 minutes
  → Lockout: 3 failures = 30-min ban
```

### Gateway (Port 3004)

#### Authentication
```http
GET  /auth/start         → Redirect to Core OAuth
GET  /auth/callback      → Exchange code, create session
POST /v1/auth/logout     → Clear session
GET  /v1/auth/status     → Check login status
```

#### User Profile
```http
GET   /v1/me             → User profile + license
PATCH /v1/me             → Update name/picture
GET   /v1/me/sessions    → List active sessions
DELETE /v1/me/sessions   → Logout all sessions
```

#### Admin Routes
```http
GET/POST /v1/admin/projects
GET      /v1/admin/projects/:id
GET/POST /v1/admin/projects/:id/apps
GET      /v1/admin/projects/:id/members
GET      /v1/admin/licenses
```

## 🗄 Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, name, avatar) |
| `identities` | OAuth identities (provider, provider_user_id) |
| `sessions` | Core sessions (7-day rolling TTL) |
| `projects` | Multi-tenant projects |
| `project_members` | Project membership & roles |
| `apps` | Application configuration |
| `licenses` | Per-user, per-app licenses |
| `auth_codes` | Short-lived auth codes (120s TTL) |
| `email_verifications` | OTP tracking with lockout |
| `audit_logs` | Admin action audit trail |

### ID Format

All public IDs use a compact format: `[Letter][Digit][nanoid]`

| Entity | Example | Length |
|--------|---------|--------|
| User | `U0sFFDmgde` | 11 chars |
| Session | `S0mK9pQxCa` | 13 chars |
| Project | `P0kMn7pQx2` | 11 chars |
| App | `A0xKmP9n5d` | 11 chars |
| Auth Code | `C0pN7mKqXc9A` | 14 chars |

## 🔐 Security

### Authentication
- ✅ OAuth-only signup (no passwords)
- ✅ OTP for email verification (6-digit, 10-min TTL)
- ✅ PBKDF2-SHA256 for OTP hashing (100k iterations)
- ✅ HMAC-SHA256 for cookie signing
- ✅ Auth-code exchange (120s single-use tokens)
- ✅ S2S token validation (X-Proofa-Service-Token)

### Rate Limiting
- ✅ OTP request: 5 per hour per email
- ✅ OTP verification: 5 per 5 minutes per email
- ✅ Account lockout: 3 failures = 30-minute ban

### Session Management
- ✅ Core session: 7 days rolling TTL
- ✅ App session: 1-365 days (configurable per app)
- ✅ HttpOnly + Secure cookies
- ✅ SameSite=Lax (CSRF protection)

### Access Control
- ✅ Project member validation
- ✅ Role-based access (owner/admin/member)
- ✅ Protected routes with auth middleware

## 💻 Development

### Commands

```bash
# Install dependencies
pnpm install

# Start Docker services
pnpm docker:up

# Start development
pnpm dev

# Build all packages
pnpm build

# Type checking
pnpm typecheck

# Linting & formatting
pnpm lint
pnpm format

# Run migrations
pnpm db:migrate
```

### Environment Variables

**Required:**
```env
# Database
DATABASE_URL=http://localhost:8080
DATABASE_AUTH_TOKEN=

# Redis
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=local-dev-token

# OAuth (at least one required)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Secrets (generate with: openssl rand -hex 32)
JWT_SECRET=...
SESSION_SECRET=...
S2S_SECRET=...
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup instructions.

## 📦 Deployment

### Build

```bash
pnpm build
```

### Services

| Service | Command | Output |
|---------|---------|--------|
| Core | `node dist/apps/core/src/index.js` | Hono server |
| Gateway | `node dist/apps/gateway/src/index.js` | Hono server |
| Dashboards | Static files | `dist/apps/dashboard/*/dist/` |

### Environment

Set these in your deployment environment:
```
DATABASE_URL
DATABASE_AUTH_TOKEN
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
JWT_SECRET
SESSION_SECRET
S2S_SECRET
```

## 📚 Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) - Detailed development setup
- [docs/PRODUCT_SPEC_FINAL.md](docs/PRODUCT_SPEC_FINAL.md) - Full specification
- [docs/QUICKSTART.md](docs/QUICKSTART.md) - Quick start guide
- [docs/TECHNICAL_DEBT.md](docs/TECHNICAL_DEBT.md) - Technical debt tracker

## 📄 License

This project is proprietary and confidential.

---

Built with ❤️ using TypeScript, Hono, and React
