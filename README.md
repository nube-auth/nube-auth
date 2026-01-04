# Proofa

> **Production-ready authentication, licensing, and session management platform**

[![Security Rating](https://img.shields.io/badge/Security-A%2B%20(94%2F100)-brightgreen)](./docs/security/README.md)
[![Build Status](https://img.shields.io/badge/Build-Passing-success)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

Proofa is a comprehensive authentication and licensing platform that provides secure user management, OAuth integration, session handling, and subscription licensing out of the box.

## ✨ Key Features

### 🔐 Authentication
- **OAuth 2.0 Integration**: Google, GitHub, and custom providers
- **Magic Link Authentication**: Passwordless email-based login
- **Session Management**: Secure, Redis-backed sessions with fingerprinting
- **Multi-tenancy**: Project and app-level isolation

### 📋 Licensing & Subscriptions
- **Flexible Plans**: Monthly, yearly, one-time, and trial periods
- **Usage Tracking**: Monitor and enforce license limits
- **Subscription Management**: Automated billing and renewals
- **Trial System**: Built-in trial period support

### 🛡️ Security
- **A+ Security Rating (94/100)**: Enterprise-grade security
- **Session Hijacking Protection**: IP and User-Agent fingerprinting
- **Rate Limiting**: Redis-based sliding window
- **CSRF Protection**: Token-based protection for state-changing operations
- **Input Validation**: Comprehensive Zod schemas
- **Audit Logging**: 40+ event types tracked

### 🎨 Admin Dashboard
- **User Management**: Invite, manage, and license users
- **Project & App Management**: Multi-level organization
- **OAuth Configuration**: Per-project and per-app provider settings
- **Payment Integration**: Stripe and other payment providers
- **Analytics & Monitoring**: Real-time session and usage tracking

### 🔌 Developer Experience
- **TypeScript SDK**: Fully typed client library
- **React Hooks**: Pre-built components and hooks
- **REST API**: Comprehensive API endpoints
- **WebHooks**: Real-time event notifications
- **Documentation**: Complete API and integration docs

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Admin        │ User         │ Marketing    │ Documentation  │
│ Dashboard    │ Dashboard    │ Website      │ Site           │
│ (React)      │ (React)      │ (Astro)      │ (Starlight)    │
└──────────────┴──────────────┴──────────────┴────────────────┘
                       │                │
                       ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                      Gateway Layer                           │
├─────────────────────────────────────────────────────────────┤
│  • Rate Limiting          • Session Management               │
│  • CSRF Protection        • Request Routing                  │
│  • Security Headers       • Audit Logging                    │
└──────────────┬──────────────┬──────────────┬────────────────┘
               │              │              │
               ▼              ▼              ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Core Service    │ │  Auth Service    │ │  License Service │
│  (User/Projects) │ │  (OAuth/Magic)   │ │  (Plans/Subs)    │
└──────────────────┘ └──────────────────┘ └──────────────────┘
         │                     │                     │
         └─────────────────────┴─────────────────────┘
                               │
                               ▼
         ┌──────────────────────────────────────────┐
         │         Data & Cache Layer                │
         ├──────────────────┬───────────────────────┤
         │   PostgreSQL     │        Redis          │
         │   (Primary DB)   │   (Cache/Sessions)    │
         └──────────────────┴───────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22+ and **pnpm** 8+
- **Docker** and **Docker Compose** (for local development)
- **PostgreSQL** 16+ (or use Docker)
- **Redis** 7+ (or use Docker)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourorg/proofa-core.git
cd proofa-core

# Install dependencies
pnpm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL and Redis with Docker
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps
```

### 3. Configure Environment

```bash
# Copy environment templates
cp .env.example .env
cp .env.local.example .env.local

# Edit .env.local with your configuration
# Required: DATABASE_URL, REDIS_URL, SESSION_SECRET
```

### 4. Setup Database

```bash
# Run migrations
pnpm db:migrate

# (Optional) Seed with sample data
pnpm db:seed
```

### 5. Start Development Servers

```bash
# Start all services
pnpm dev

# Or start individually:
pnpm --filter @proofa/gateway dev    # API Gateway (port 3004)
pnpm --filter @proofa/core dev       # Core Service (port 3003)
pnpm --filter @proofa/workers dev    # Workers Service (background jobs)
pnpm --filter @proofa/dashboard-admin dev  # Admin UI (port 5174)
pnpm --filter @proofa/dashboard-user dev   # User UI (port 5173)
```

### 6. Access Applications

- **Admin Dashboard**: http://localhost:5174
- **User Dashboard**: http://localhost:5173
- **API Gateway**: http://localhost:3004
- **Core Service**: http://localhost:3003

## 📦 Monorepo Structure

```
proofa-core/
├── apps/
│   ├── gateway/          # API Gateway (Hono)
│   ├── core/             # Core Service (Hono)
│   ├── dashboard/
│   │   ├── admin/        # Admin Dashboard (React + Vite)
│   │   ├── user/         # User Dashboard (React + Vite)
│   │   ├── home/         # Marketing Site (Astro)
│   │   └── docs/         # Documentation (Starlight)
├── packages/
│   ├── db/               # Database (Drizzle ORM + PostgreSQL)
│   ├── cache/            # Cache Layer (Redis)
│   ├── auth/             # Authentication Logic
│   ├── client/           # TypeScript SDK
│   ├── react/            # React Hooks & Components
│   └── shared/           # Shared Utilities
├── docs/
│   ├── security/         # Security Documentation
│   └── guides/           # Development Guides
└── docker-compose.yml    # Local Infrastructure
```

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev                  # Start all services
pnpm dev:gateway          # Start API Gateway only
pnpm dev:core             # Start Core Service only
pnpm dev:admin            # Start Admin Dashboard only

# Building
pnpm build                # Build all packages
pnpm build:packages       # Build shared packages only
pnpm build:apps           # Build applications only

# Database
pnpm db:migrate           # Run migrations
pnpm db:push              # Push schema changes
pnpm db:studio            # Open Drizzle Studio

# Testing
pnpm test                 # Run all tests
pnpm test:unit            # Unit tests only
pnpm test:e2e             # E2E tests only

# Linting & Formatting
pnpm lint                 # Lint all packages
pnpm lint:fix             # Fix linting issues
pnpm format               # Format code with Prettier

# Type Checking
pnpm typecheck            # Type check all packages
```

### Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite for bundling
- TanStack Query for data fetching
- React Router for routing
- Tailwind CSS for styling

**Backend**
- Hono (lightweight web framework)
- Drizzle ORM + PostgreSQL
- Redis for caching and sessions
- Zod for validation
- Pino for structured logging

**Infrastructure**
- Docker & Docker Compose
- PostgreSQL 16 (primary database)
- Redis 7 (cache and sessions)
- Vercel (deployment)

## 📚 Documentation

**Complete Documentation Index**: See [DOCS_INDEX.md](./DOCS_INDEX.md) for all documentation files.

### Getting Started
- [Quick Start Guide](./QUICKSTART.md) - Get up and running in 5 minutes
- [Development Guide](./DEVELOPMENT.md) - Complete local setup and workflows
- [Product Specification](./docs/PRODUCT_SPEC.md) - Full product specification

### Security
- [Security Overview](./docs/security/README.md) - A+ rated security documentation
- [Session Hijacking Protection](./docs/security/SESSION_HIJACKING.md) - Multi-layered protection
- [Audit Report](./docs/security/AUDIT_REPORT.md) - Security audit findings

### API & SDK
- [Gateway API](./apps/gateway/README.md) - REST API documentation
- [TypeScript Client](./packages/client/README.md) - SDK reference and examples
- [React Integration](./packages/react/README.md) - React hooks and components

### Packages
- [Database](./packages/db/README.md) - PostgreSQL + Drizzle ORM
- [Cache](./packages/cache/README.md) - Redis client
- [Shared](./packages/shared/README.md) - Common utilities

## 🔒 Security

Proofa has achieved an **A+ security rating (94/100)** through comprehensive security measures:

### Implemented Protections

✅ **Cryptographically Secure Sessions** - 256-bit tokens using crypto.randomBytes  
✅ **Session Hijacking Protection** - IP and User-Agent fingerprinting  
✅ **Admin Route Security** - Blocks Postman/curl, requires browser context  
✅ **Rate Limiting** - Redis-based sliding window (auth: 10/5min, API: 100/min)  
✅ **CSRF Protection** - Token-based for all state-changing operations  
✅ **Input Validation** - 15+ Zod schemas for all endpoints  
✅ **SQL Injection Protection** - Drizzle ORM with no raw SQL  
✅ **XSS Protection** - CSP headers and output encoding  
✅ **Security Headers** - HSTS, X-Frame-Options, CSP, etc.  
✅ **Audit Logging** - 40+ event types tracked  
✅ **Error Sanitization** - No sensitive data in production errors

### Compliance Ready

- ✅ **SOC 2 Type II** - Audit logging, access controls, encryption
- ✅ **OWASP Top 10 (2021)** - All 10 categories addressed
- ✅ **GDPR** - Consent management, encryption, audit trails
- ✅ **ISO 27001** - Security policies, monitoring, documentation

For detailed security information, see [Security Documentation](./docs/security/README.md).

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pnpm test && pnpm lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: https://docs.proofa.sh
- **Issues**: [GitHub Issues](https://github.com/yourorg/proofa-core/issues)
- **Discord**: [Join our community](https://discord.gg/proofa)
- **Email**: support@proofa.sh

## 🗺️ Roadmap

See [TODO.md](./TODO.md) for the complete roadmap and planned features.

### Q1 2025
- [ ] Multi-factor authentication (MFA/2FA)
- [ ] Passwordless authentication (WebAuthn)
- [ ] Enhanced analytics dashboard
- [ ] GraphQL API option
- [ ] Mobile SDKs (React Native)

### Q2 2025
- [ ] SAML/SSO integration
- [ ] Advanced role-based access control (RBAC)
- [ ] Automated compliance reporting
- [ ] Custom branding per project
- [ ] Advanced audit log search

## 🎯 Project Status

- ✅ **Core Features**: Complete and production-ready
- ✅ **Security**: A+ rating, enterprise-grade
- ✅ **Documentation**: Comprehensive guides available
- ✅ **API**: Stable and versioned
- ✅ **Admin Dashboard**: Full-featured UI
- ✅ **Testing**: Unit and E2E tests in place
- 🚧 **Advanced Features**: In active development

## 🙏 Acknowledgments

Built with:
- [Hono](https://hono.dev) - Lightweight web framework
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM
- [React](https://react.dev) - UI library
- [Vite](https://vitejs.dev) - Build tool
- [TanStack Query](https://tanstack.com/query) - Data fetching
- [Tailwind CSS](https://tailwindcss.com) - Styling

---

**Made with ❤️ by the Proofa team**

**Last Updated**: January 1, 2026  
**Version**: 1.0.0  
**Security Rating**: A+ (94/100)  
**Session Duration**: 365 days (configurable)
