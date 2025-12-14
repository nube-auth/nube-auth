# 🔐 Proofa Core - Complete SaaS Authentication System

> Enterprise-grade end-to-end authentication and multi-tenant admin system built with TypeScript, Node.js, React, and Hono.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Security](#security)
- [Development](#development)
- [Deployment](#deployment)

## ✨ Features

### Authentication
- ✅ OAuth 2.0 (Google, GitHub)
- ✅ Email/OTP with 3-attempt lockout
- ✅ Compact ID format (11-14 chars)
- ✅ Session management with per-app TTL (1-365 days)
- ✅ S2S authentication for service-to-service calls

### Core Service
- ✅ Identity provider management
- ✅ User creation/management
- ✅ Session lifecycle management
- ✅ Rate limiting (5 OTP/hour, 5 verify/5min)
- ✅ 30-minute account lockout after 3 OTP failures

### Gateway BFF
- ✅ Session bridge between Core and Apps
- ✅ User profile CRUD
- ✅ Session management (list, logout)
- ✅ Admin CRUD (projects, apps, licenses, members)
- ✅ Access control with project member validation

### Dashboards
- ✅ User Dashboard (profile, session management)
- ✅ Admin Dashboard (projects, apps, members, licenses)
- ✅ Protected routes with auth checks
- ✅ Real-time data fetching with TanStack Query

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Client (Browser)                                          │
├──────────────────┬──────────────────┬──────────────────┤
│ User Dashboard   │ Admin Dashboard  │ Client Apps      │
│ (Port 3000)      │ (Port 3003)      │                  │
└──────────────────┼──────────────────┴──────────────────┘
                   │ HTTPS
        ┌──────────┴──────────┐
        │ Gateway BFF         │
        │ (Port 3002)         │ ← Session management
        │                     │ ← Profile CRUD
        │                     │ ← Admin routes
        └──────────┬──────────┘
                   │ HTTP (S2S)
        ┌──────────┴──────────┐
        │ Core Service        │
        │ (Port 3001)         │ ← OAuth flows
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

## 🛠 Tech Stack

### Backend
- **Node.js** 18+ with TypeScript 5.x
- **Hono** - Lightweight web framework
- **Turso** - SQLite via libSQL
- **Drizzle ORM** - Type-safe database queries
- **Upstash Redis** - Serverless caching & rate limiting
- **Resend** - Email service

### Frontend
- **React** 18
- **Vite** - Build tool
- **React Router** v6 - Navigation
- **TanStack Query** 5 - Server state management
- **TypeScript** - Type safety

### Infrastructure
- **pnpm** - Package manager
- **Turbo** - Monorepo build system

## 🚀 Quick Start

### Prerequisites

```bash
# Required environment variables
TURSO_CONNECTION_URL=...
TURSO_AUTH_TOKEN=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_SECRET=...
REDIS_URL=...
RESEND_API_KEY=...
CORE_S2S_TOKEN=your-secret-token
GATEWAY_S2S_TOKEN=your-secret-token
```

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

Open 4 terminals and run:

```bash
# Terminal 1: Core Service (OAuth, OTP)
pnpm -F @proofa/core dev

# Terminal 2: Gateway BFF (Session, Admin)
pnpm -F @proofa/gateway dev

# Terminal 3: User Dashboard
pnpm -F @proofa/user-dashboard dev

# Terminal 4: Admin Dashboard
pnpm -F @proofa/admin-dashboard dev
```

Access:
- User Dashboard: http://localhost:3000
- Gateway: http://localhost:3002
- Core: http://localhost:3001
- Admin Dashboard: http://localhost:3003

## 📁 Project Structure

```
proofa-core/
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── id.ts              # ID generators (11-14 char format)
│   │   │   ├── types/             # Entity interfaces
│   │   │   ├── constants/         # TTLs, OTP settings
│   │   │   └── utils/
│   │   └── package.json
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema.ts          # 10 Drizzle tables
│   │   │   ├── queries.ts         # 100+ CRUD helpers
│   │   │   ├── index.ts           # getDb() singleton
│   │   │   └── migrations.ts
│   │   └── package.json
│   ├── auth/
│   │   ├── src/
│   │   │   ├── oauth.ts           # OAuth adapters
│   │   │   ├── crypto.ts          # OTP hashing, tokens
│   │   │   ├── session.ts         # Cookie signing
│   │   │   └── index.ts
│   │   └── package.json
│   └── redis/
│       ├── src/
│       │   ├── client.ts          # Cache, rate limit, sessions
│       │   └── index.ts
│       └── package.json
├── apps/
│   ├── core/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts        # OAuth flows
│   │   │   │   └── email.ts       # Email/OTP
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   └── package.json
│   ├── gateway/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts        # Login, logout, status
│   │   │   │   ├── me.ts          # Profile, sessions
│   │   │   │   └── admin.ts       # CRUD operations
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts        # Session validation
│   │   │   ├── lib/
│   │   │   │   └── core-client.ts # S2S Core API
│   │   │   └── index.ts
│   │   └── package.json
│   ├── user-dashboard/
│   │   ├── src/
│   │   │   ├── hooks/
│   │   │   │   └── api.ts         # TanStack Query hooks
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Profile.tsx
│   │   │   │   └── Sessions.tsx
│   │   │   ├── App.tsx            # Routing
│   │   │   ├── main.tsx           # Entry point
│   │   │   └── index.css
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── admin-dashboard/
│       ├── src/
│       │   ├── hooks/
│       │   │   └── api.ts         # CRUD hooks
│       │   ├── pages/
│       │   │   ├── Login.tsx
│       │   │   ├── Projects.tsx
│       │   │   ├── ProjectDetail.tsx
│       │   │   └── Licenses.tsx
│       │   ├── App.tsx            # Routing
│       │   ├── main.tsx           # Entry point
│       │   └── index.css
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
└── package.json (monorepo)
```

## 📡 API Documentation

### Core Service (Port 3001)

#### OAuth
```http
GET /v1/auth/start?provider=google
  → Returns OAuth authorization URL

GET /v1/auth/callback/:provider?code=...
  → Exchanges code for session, creates user if new
  → Sets core_session cookie (7-day TTL)

POST /v1/auth/exchange
  Body: { session: string }
  → Returns: { id, email, name, picture }
```

#### Email/OTP
```http
POST /v1/email/start
  Body: { email: string }
  → Sends 6-digit OTP via email
  → Rate limit: 5 per hour per email
  → Returns: { success: true }

POST /v1/email/verify
  Body: { email: string, code: string }
  → Verifies OTP code
  → Creates user if new
  → Rate limit: 5 per 5 minutes
  → Lockout: 3 failures = 30-min ban
  → Returns: { session: string }
```

### Gateway (Port 3002)

#### Authentication
```http
POST /v1/auth/login
  → Sets app_session cookie (per-app TTL)
  → Returns: { success: true }

POST /v1/auth/logout
  → Clears session cookie
  → Returns: { success: true }

GET /v1/auth/status
  → Returns: { loggedIn: boolean }
```

#### User Profile
```http
GET /v1/me
  → Returns: { id, email, name, picture }

PATCH /v1/me
  Body: { name?: string, picture?: string }
  → Returns: { id, email, name, picture }

GET /v1/me/sessions
  → Returns: Array of { id, created_at, expires_at, current: boolean }

DELETE /v1/me/sessions
  → Logs out all sessions
  → Returns: { success: true }
```

#### Admin - Projects
```http
GET /v1/admin/projects
  → Returns: Array of { id, name, description, public_id }

POST /v1/admin/projects
  Body: { name: string, description?: string }
  → Creates new project (user is owner)
  → Returns: { id, name, description, public_id }

GET /v1/admin/projects/:projectId
  → Returns: { id, name, description, public_id }
```

#### Admin - Apps
```http
GET /v1/admin/projects/:projectId/apps
  → Returns: Array of { id, name, public_id, app_session_ttl_days }

POST /v1/admin/projects/:projectId/apps
  Body: { name: string }
  → Creates new app with default config (28d TTL, 100 req/min)
  → Returns: { id, name, public_id, app_session_ttl_days, ... }
```

#### Admin - Members
```http
GET /v1/admin/projects/:projectId/members
  → Returns: Array of { id, user_id, role, created_at }
```

#### Admin - Licenses
```http
GET /v1/admin/licenses
  → Returns: Array of { id, app_id, max_requests_per_day, active, expires_at }
```

## 🗄 Database Schema

### Users
```sql
id           TEXT PRIMARY KEY
email        TEXT UNIQUE NOT NULL
name         TEXT
picture      TEXT
created_at   INTEGER DEFAULT NOW
updated_at   INTEGER
```

### Identities
```sql
id                    TEXT PRIMARY KEY
user_id              TEXT NOT NULL (FK)
provider             TEXT NOT NULL (google|github|email)
provider_user_id     TEXT NOT NULL
provider_email       TEXT
created_at           INTEGER DEFAULT NOW
UNIQUE(provider, provider_user_id)
```

### Sessions
```sql
id              TEXT PRIMARY KEY
user_id         TEXT NOT NULL (FK)
expires_at      INTEGER NOT NULL
data            TEXT
created_at      INTEGER DEFAULT NOW
updated_at      INTEGER
```

### Projects
```sql
id          TEXT PRIMARY KEY
owner_id    TEXT NOT NULL (FK)
name        TEXT NOT NULL
description TEXT
created_at  INTEGER DEFAULT NOW
updated_at  INTEGER
```

### ProjectMembers
```sql
id           TEXT PRIMARY KEY
project_id   TEXT NOT NULL (FK)
user_id      TEXT NOT NULL (FK)
role         TEXT NOT NULL (owner|member)
created_at   INTEGER DEFAULT NOW
UNIQUE(project_id, user_id)
```

### Apps
```sql
id                        TEXT PRIMARY KEY
project_id                TEXT NOT NULL (FK)
name                      TEXT NOT NULL
secret                    TEXT NOT NULL
app_session_ttl_days      INTEGER DEFAULT 28
account_lockout_minutes   INTEGER DEFAULT 30
cache_ttl_minutes         INTEGER DEFAULT 60
cors_allowed_origins      TEXT
rate_limit_requests_pm    INTEGER DEFAULT 100
created_at                INTEGER DEFAULT NOW
updated_at                INTEGER
```

### Licenses
```sql
id                    TEXT PRIMARY KEY
user_id               TEXT NOT NULL (FK)
app_id                TEXT NOT NULL (FK)
max_requests_per_day  INTEGER NOT NULL
active                BOOLEAN DEFAULT true
expires_at            INTEGER NOT NULL
created_at            INTEGER DEFAULT NOW
updated_at            INTEGER
```

### EmailVerifications
```sql
id          TEXT PRIMARY KEY
email       TEXT NOT NULL UNIQUE
code_hash   TEXT NOT NULL
attempts    INTEGER DEFAULT 0
locked_until INTEGER
created_at  INTEGER DEFAULT NOW
updated_at  INTEGER
```

### AuthCodes
```sql
id           TEXT PRIMARY KEY
user_id      TEXT NOT NULL (FK)
code         TEXT NOT NULL UNIQUE
provider     TEXT NOT NULL
consumed     BOOLEAN DEFAULT false
created_at   INTEGER DEFAULT NOW
```

### AuditLogs
```sql
id           TEXT PRIMARY KEY
project_id   TEXT NOT NULL (FK)
action       TEXT NOT NULL
user_id      TEXT
changes      TEXT
created_at   INTEGER DEFAULT NOW
```

## 🔐 Security

### Password/Secret Handling
- ✅ OTP hashing: PBKDF2-SHA256 (100k iterations)
- ✅ Cookie signing: HMAC-SHA256
- ✅ Session tokens: 32+ bytes random
- ✅ S2S tokens: Environment variables, header-based validation

### Rate Limiting
- ✅ OTP request: 5 per hour per email
- ✅ OTP verification: 5 per 5 minutes per email
- ✅ Account lockout: 3 failures = 30-minute ban

### Database Integrity
- ✅ Foreign key constraints
- ✅ Unique constraints (email, provider identity)
- ✅ Indexes on frequently queried columns
- ✅ Timestamps on all tables

### Session Management
- ✅ Secure cookies (HttpOnly, SameSite=Lax)
- ✅ HMAC signature verification
- ✅ Redis session store with per-app tracking
- ✅ Independent Core/App session TTLs

### Access Control
- ✅ Project member validation
- ✅ Auth context middleware
- ✅ Protected routes with redirect to login
- ✅ S2S authentication for service calls

## 💻 Development

### Code Generation
All code follows strict TypeScript patterns:
- ✅ 100% type coverage (strict mode)
- ✅ Error handling with try-catch
- ✅ Database queries parameterized
- ✅ API validation with Zod/built-in checks
- ✅ TanStack Query for client state

### Testing
```bash
# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Run linting
pnpm lint
```

### Git Workflow
```bash
# Feature branch
git checkout -b feature/new-feature

# Commit
git commit -m "feat: description"

# Push
git push origin feature/new-feature

# Create PR
```

## 📦 Deployment

### Build
```bash
pnpm build
# Output: dist/apps/{core,gateway}
#         dist/apps/{user,admin}-dashboard/dist
```

### Environment Setup
Set these in your deployment environment:
```
TURSO_CONNECTION_URL
TURSO_AUTH_TOKEN
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GITHUB_OAUTH_CLIENT_ID
GITHUB_OAUTH_CLIENT_SECRET
REDIS_URL
RESEND_API_KEY
CORE_S2S_TOKEN
GATEWAY_S2S_TOKEN
```

### Service Deployment

**Core** (Hono app)
```bash
NODE_ENV=production node dist/apps/core/src/index.js
```

**Gateway** (Hono app)
```bash
NODE_ENV=production node dist/apps/gateway/src/index.js
```

**User Dashboard** (Static SPA)
```
Serve dist/apps/user-dashboard/dist/ via HTTP server
```

**Admin Dashboard** (Static SPA)
```
Serve dist/apps/admin-dashboard/dist/ via HTTP server
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm install --prod
RUN pnpm build
CMD ["node", "dist/apps/core/src/index.js"]
```

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| Total Lines of Code | ~3,500 |
| Type Coverage | 100% |
| Database Queries | 100+ |
| API Endpoints | 20+ |
| Database Tables | 10 |
| React Components | 8 pages |
| Supported Auth Providers | 2 (Google, GitHub) |
| Additional Auth Methods | 1 (Email/OTP) |

## 🤝 Support

For issues or questions:
1. Check PROJECT_COMPLETE.md for status
2. Review API documentation above
3. Check database schema for data structure
4. Review security checklist

## 📄 License

This project is proprietary and confidential.

---

Built with ❤️ using TypeScript, React, and Hono
