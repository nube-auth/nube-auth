# Proofa Documentation Index

Complete guide to all documentation in the Proofa repository.

---

## 📚 Getting Started

### Essential Guides
- **[README.md](./README.md)** - Project overview, features, and quick start
- **[QUICKSTART.md](./QUICKSTART.md)** - Step-by-step setup guide
- **[ENV_SETUP.md](./ENV_SETUP.md)** - Environment configuration guide
- **[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)** - PostgreSQL & Redis migration notes

### Development
- **[TODO.md](./TODO.md)** - Roadmap, planned features, and known issues
- **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - This file

---

## 🏗️ Architecture & Design

### Core Documentation
- **[docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md)** - Product specification & architecture
- **[docs/TECHNICAL_DEBT.md](./docs/TECHNICAL_DEBT.md)** - Technical debt tracking

### Archive (Historical)
- **[docs/archive/](./docs/archive/)** - Archived design documents
  - `AUTH_FLOWS_CLARIFIED.md` - Authentication flow documentation
  - `SESSION_SUMMARY.md` - Session management details
  - `IMPLEMENTATION_REVIEW.md` - Implementation review notes
  - `INITIAL_SPEC_V0.md` - Original specification v0
  - `INITIAL_SPEC_V1.md` - Original specification v1

---

## 📦 Package Documentation

### Backend Packages
- **[apps/gateway/README.md](./apps/gateway/README.md)** - API Gateway documentation
- **[packages/db/README.md](./packages/db/README.md)** - Database package & schema
- **[packages/redis/README.md](./packages/redis/README.md)** - Redis client & utilities
- **[packages/shared/README.md](./packages/shared/README.md)** - Shared utilities & types
- **[packages/auth/README.md](./packages/auth/README.md)** - Authentication logic

### Client Libraries
- **[packages/client/README.md](./packages/client/README.md)** - JavaScript/TypeScript SDK
  - [INTEGRATION.md](./packages/client/INTEGRATION.md) - Integration guide
  - [CHANGELOG.md](./packages/client/CHANGELOG.md) - Version history
- **[packages/react/README.md](./packages/react/README.md)** - React hooks & components

### Dashboard Applications
- **[apps/dashboard/admin/](./apps/dashboard/admin/)** - Admin Dashboard (React)
- **[apps/dashboard/user/](./apps/dashboard/user/)** - User Portal (React)
- **[apps/dashboard/home/README.md](./apps/dashboard/home/README.md)** - Marketing Site (Astro)
- **[apps/dashboard/docs/](./apps/dashboard/docs/)** - Documentation Site (Starlight)

### Legacy (Being Phased Out)
- **[apps/core/README.md](./apps/core/README.md)** - Legacy core application

---

## 📖 User Documentation

### API Documentation
Location: `apps/dashboard/docs/src/content/docs/`

#### Getting Started
- **[getting-started/introduction.md](./apps/dashboard/docs/src/content/docs/getting-started/introduction.md)** - Platform introduction
- **[getting-started/installation.md](./apps/dashboard/docs/src/content/docs/getting-started/installation.md)** - Installation guide
- **[getting-started/quickstart.md](./apps/dashboard/docs/src/content/docs/getting-started/quickstart.md)** - Quick start tutorial
- **[getting-started/configuration.md](./apps/dashboard/docs/src/content/docs/getting-started/configuration.md)** - Configuration reference

#### Authentication
- **[authentication/overview.md](./apps/dashboard/docs/src/content/docs/authentication/overview.md)** - Authentication overview
- **[authentication/oauth-providers.md](./apps/dashboard/docs/src/content/docs/authentication/oauth-providers.md)** - OAuth providers guide
- **[authentication/magic-links.md](./apps/dashboard/docs/src/content/docs/authentication/magic-links.md)** - Magic link authentication

#### Sessions
- **[sessions/overview.md](./apps/dashboard/docs/src/content/docs/sessions/overview.md)** - Session management
- **[sessions/token-refresh.md](./apps/dashboard/docs/src/content/docs/sessions/token-refresh.md)** - Token refresh flow

#### Licensing
- **[licensing/overview.md](./apps/dashboard/docs/src/content/docs/licensing/overview.md)** - Licensing system overview
- **[licensing/plans.md](./apps/dashboard/docs/src/content/docs/licensing/plans.md)** - Plans & subscriptions

#### API Reference
- **[api/authentication.md](./apps/dashboard/docs/src/content/docs/api/authentication.md)** - Authentication API
- **[api/sessions.md](./apps/dashboard/docs/src/content/docs/api/sessions.md)** - Sessions API
- **[api/rest.md](./apps/dashboard/docs/src/content/docs/api/rest.md)** - REST API reference

#### Self-Hosting
- **[self-hosting/environment.md](./apps/dashboard/docs/src/content/docs/self-hosting/environment.md)** - Environment setup
- **[self-hosting/docker.md](./apps/dashboard/docs/src/content/docs/self-hosting/docker.md)** - Docker deployment

---

## 🔧 Technical Documentation

### Database
- **Schema**: See `packages/db/src/schema.ts`
- **Queries**: See `packages/db/src/queries.ts`
- **Migrations**: See `packages/db/drizzle/`
- **README**: [packages/db/README.md](./packages/db/README.md)

### API Endpoints
- **Admin API**: See `apps/gateway/src/routes/admin.ts`
- **Auth API**: See `apps/gateway/src/routes/auth.ts`
- **User API**: See `apps/gateway/src/routes/user.ts`
- **README**: [apps/gateway/README.md](./apps/gateway/README.md)

### Frontend
- **Admin Dashboard**: `apps/dashboard/admin/src/`
- **User Portal**: `apps/dashboard/user/src/`
- **Components**: Check respective `src/components/` folders
- **Hooks**: Check respective `src/hooks/` folders

---

## 🚀 Deployment

### Docker
- **Dockerfile**: `apps/gateway/Dockerfile`
- **Docker Compose**: `docker-compose.yml`
- **Scripts**: `scripts/docker-local.sh`

### Fly.io
- **Gateway Config**: `apps/gateway/fly.toml`
- **Core Config**: `apps/core/fly.toml`
- **Deployment Script**: `scripts/deploy-fly.sh`

### Environment
- **Setup Guide**: [ENV_SETUP.md](./ENV_SETUP.md)
- **Example**: Use ENV_SETUP.md as template for `.env`

---

## 🧪 Testing

### Scripts
- **Database Scripts**: `packages/db/scripts/`
- **Verification**: `scripts/verify-build.sh`

---

## 📝 Development Guides

### Setup & Configuration
1. Read [QUICKSTART.md](./QUICKSTART.md) for initial setup
2. Configure environment using [ENV_SETUP.md](./ENV_SETUP.md)
3. Review [TODO.md](./TODO.md) for development priorities

### Working with Database
1. Read [packages/db/README.md](./packages/db/README.md)
2. Check schema in `packages/db/src/schema.ts`
3. Use Drizzle Studio for visual editing: `pnpm run db:studio`

### Working with API
1. Read [apps/gateway/README.md](./apps/gateway/README.md)
2. Check route files in `apps/gateway/src/routes/`
3. Test endpoints using provided examples

### Working with Frontend
1. Check respective app README
2. Review component structure
3. Use React Query hooks for API calls

---

## 🔍 Finding Information

### By Topic

**Authentication**
- Overview: `docs/PRODUCT_SPEC.md` (Auth section)
- Implementation: `apps/gateway/src/routes/auth.ts`
- User Docs: `apps/dashboard/docs/src/content/docs/authentication/`

**Database**
- Overview: `packages/db/README.md`
- Schema: `packages/db/src/schema.ts`
- Queries: `packages/db/src/queries.ts`
- Migration: `MIGRATION_SUMMARY.md`

**API**
- Gateway: `apps/gateway/README.md`
- Admin Routes: `apps/gateway/src/routes/admin.ts`
- Auth Routes: `apps/gateway/src/routes/auth.ts`
- User Routes: `apps/gateway/src/routes/user.ts`

**Frontend**
- Admin Dashboard: `apps/dashboard/admin/src/`
- User Portal: `apps/dashboard/user/src/`
- Components: Check `src/components/` in respective apps

**Deployment**
- Environment: `ENV_SETUP.md`
- Docker: `docker-compose.yml`
- Fly.io: `*.fly.toml` files

**Development**
- Getting Started: `QUICKSTART.md`
- Roadmap: `TODO.md`
- Architecture: `docs/PRODUCT_SPEC.md`

---

## 📞 Getting Help

### Documentation Issues
- Check this index for relevant documentation
- Look in `docs/archive/` for historical context
- Review TODO.md for known issues

### Code Questions
- Check package README files
- Review source code comments
- Look at example files (e.g., `packages/client/example.ts`)

### Setup Problems
- Refer to `QUICKSTART.md`
- Check `ENV_SETUP.md`
- Review `MIGRATION_SUMMARY.md` for migration issues

---

## 🔄 Keeping Documentation Updated

When adding new features:
1. Update relevant README files
2. Add entries to TODO.md
3. Update PRODUCT_SPEC.md if architecture changes
4. Update user documentation in `apps/dashboard/docs/`
5. Update this index if new documentation files are created

---

**Last Updated**: December 29, 2024

**Version**: 1.0.0
