# Proofa Core

**Open-source Authentication, Licensing & User Management Platform**

Proofa is a complete SaaS infrastructure platform that handles authentication, user management, licensing, and payments so you can focus on building your product.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)

---

## ✨ Features

### Authentication
- 🔐 **OAuth 2.0** - Google & GitHub (extensible to more providers)
- 📧 **Magic Links** - Passwordless email authentication
- 🔑 **Multi-level OAuth Configuration** - Configure at platform, project, or app level
- 🎫 **Session Management** - Secure session handling with Redis
- 🔄 **Token Refresh** - Automatic token rotation

### User Management
- 👥 **Team Management** - Projects, members, roles (owner, admin, member)
- 📨 **Smart Invitations** - Email invitations with automatic user provisioning
- 👤 **User Profiles** - Comprehensive user data management
- 📋 **Audit Logs** - Complete activity tracking

### Licensing & Plans
- 📦 **Flexible Plans** - Monthly, yearly, one-time, or trial subscriptions
- 🎟️ **License Management** - Grant, revoke, renew licenses
- ⏰ **Expiration Handling** - Automatic license status management
- 🎁 **Trial Support** - Built-in trial period functionality

### Payments
- 💳 **Multi-Provider Support** - Lemon Squeezy, Dodo Payments, Stripe
- 🔧 **Flexible Configuration** - Project-level defaults, app-level overrides
- 🧪 **Test Mode** - Separate test/production configurations
- 🔐 **Encrypted Storage** - AES-256-GCM encryption for credentials

### Developer Experience
- 🚀 **REST API** - Complete REST API for all operations
- 📚 **Type-Safe** - Full TypeScript support
- 🔌 **SDK Support** - Official client libraries
- 📖 **Documentation** - Comprehensive API documentation
- 🎨 **Admin Dashboard** - Beautiful React admin interface

---

## 🏗️ Architecture

### Monorepo Structure
```
proofa-core/
├── apps/
│   ├── gateway/          # API Gateway (Hono.js)
│   ├── dashboard/
│   │   ├── admin/        # Admin Dashboard (React)
│   │   ├── user/         # User Portal (React)
│   │   ├── home/         # Marketing Site (Astro)
│   │   └── docs/         # Documentation (Starlight)
│   └── core/             # Legacy (being phased out)
├── packages/
│   ├── db/               # Database (Drizzle ORM + PostgreSQL)
│   ├── redis/            # Redis client & utilities
│   ├── shared/           # Shared utilities & types
│   ├── auth/             # Authentication logic
│   ├── client/           # JavaScript SDK
│   └── react/            # React SDK
└── docs/                 # Additional documentation
```

### Tech Stack
- **Backend**: Hono.js, Node.js
- **Database**: PostgreSQL 16 (Drizzle ORM)
- **Cache**: Redis 7
- **Frontend**: React 18, React Router, TanStack Query
- **Styling**: Tailwind CSS
- **Build**: Turborepo, TypeScript, tsup, Vite
- **Email**: Resend
- **Deployment**: Docker, Fly.io ready

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- pnpm 9+

### Installation

#### Option 1: Automated Setup (Recommended)
```bash
# Clone the repository
git clone https://github.com/yourusername/proofa-core.git
cd proofa-core

# Run setup script
./scripts/dev-setup.sh

# Edit .env with your values (ENCRYPTION_KEY, RESEND_API_KEY)
# Then start development
pnpm dev
```

#### Option 2: Manual Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/proofa-core.git
cd proofa-core

# Install dependencies
pnpm install

# Set up environment files
cp .env.example .env
cp .env.local.example .env.local
# Generate encryption key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Edit .env with your configuration

# Start PostgreSQL and Redis (using Docker)
docker compose up -d

# Run database migrations
cd packages/db
pnpm run db:push

# Build packages
cd ../..
pnpm --filter @proofa/db run build
pnpm --filter @proofa/redis run build
pnpm --filter @proofa/shared run build

# Start development
pnpm dev
```

The services will be available at:
- **Gateway API**: http://localhost:3000
- **Admin Dashboard**: http://localhost:5173
- **User Portal**: http://localhost:5174
- **Documentation**: http://localhost:4321

For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md) or [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md).

---

## 📚 Documentation

- **[Quick Start Guide](./QUICKSTART.md)** - Get up and running in 10 minutes
- **[Local Development](./LOCAL_DEVELOPMENT.md)** - Complete local setup guide with Docker
- **[Environment Setup](./ENV_SETUP.md)** - Detailed environment configuration
- **[Migration Guide](./MIGRATION_SUMMARY.md)** - PostgreSQL & Redis migration notes
- **[API Documentation](./apps/dashboard/docs/)** - Complete API reference
- **[Architecture](./docs/PRODUCT_SPEC.md)** - System architecture & design

---

## 🔑 Core Concepts

### Projects & Apps
- **Projects** are top-level containers for your applications
- **Apps** are individual applications within a project
- Each app has its own OAuth configuration, licensing, and users

### OAuth Inheritance
```
Proofa (Platform Defaults)
  └── Project (Project-level OAuth)
       └── App (App-specific OAuth override)
```
OAuth credentials cascade down with the option to override at each level.

### Payment Configuration
```
Project (Default payment provider)
  └── App (Optional override)
```
Set default payment provider at project level, override per app if needed.

### User Licenses
- Users get licenses to access apps
- Licenses are tied to plans (free, paid, trial)
- Automatic expiration and renewal support

---

## 🔧 Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/proofa

# Redis
REDIS_URL=redis://localhost:6379

# Email
RESEND_API_KEY=your_resend_api_key

# Encryption (32-byte hex string)
ENCRYPTION_KEY=your_64_character_hex_string

# OAuth Providers (Platform defaults)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🛠️ Development

### Project Commands
```bash
# Install dependencies
pnpm install

# Development (all services)
pnpm dev

# Build all packages
pnpm build

# Lint & format
pnpm lint
pnpm format

# Type check
pnpm typecheck

# Clean build artifacts
pnpm clean
```

### Database Commands
```bash
cd packages/db

# Generate migrations
pnpm run db:generate

# Apply migrations
pnpm run db:push

# Open Drizzle Studio
pnpm run db:studio
```

### Package-specific Commands
```bash
# Build specific package
pnpm --filter @proofa/db run build

# Develop specific app
pnpm --filter @proofa/gateway dev

# Test specific package
pnpm --filter @proofa/client test
```

---

## 📦 Packages

### Core Packages
- **`@proofa/db`** - Database schema & queries (Drizzle ORM)
- **`@proofa/redis`** - Redis client & caching utilities
- **`@proofa/shared`** - Shared types, utilities, & encryption
- **`@proofa/auth`** - Authentication logic & helpers

### Client Libraries
- **`@proofa/client`** - JavaScript/TypeScript SDK
- **`@proofa/react`** - React hooks & components

### Applications
- **`@proofa/gateway`** - REST API Gateway
- **`@proofa/dashboard-admin`** - Admin Dashboard
- **`@proofa/dashboard-user`** - User Portal

---

## 🚢 Deployment

### Docker
```bash
# Build Docker images
docker-compose build

# Run services
docker-compose up -d
```

### Fly.io
```bash
# Deploy gateway
fly deploy --config apps/gateway/fly.toml

# Deploy admin dashboard
fly deploy --config apps/dashboard/admin/fly.toml
```

### Environment Variables
Make sure to set all required environment variables in your deployment platform:
- PostgreSQL connection string
- Redis connection string
- Resend API key
- Encryption key
- OAuth credentials (optional, can be configured per project)

---

## 🔒 Security

- **AES-256-GCM** encryption for all secrets
- **OAuth 2.0** standard authentication
- **CORS** protection
- **Rate limiting** on authentication endpoints
- **SQL injection** protection (parameterized queries)
- **XSS** protection
- **Session security** with HTTP-only cookies

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines (coming soon).

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🆘 Support

- **Documentation**: [docs/](./apps/dashboard/docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/proofa-core/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/proofa-core/discussions)

---

## 🗺️ Roadmap

- [ ] Additional OAuth providers (Microsoft, Apple, etc.)
- [ ] Webhook system for events
- [ ] Advanced analytics dashboard
- [ ] Multi-tenancy support
- [ ] API rate limiting per app
- [ ] Custom email templates
- [ ] Two-factor authentication
- [ ] SSO (SAML, OIDC)
- [ ] Mobile SDKs (React Native, Flutter)

---

## 🙏 Acknowledgments

Built with amazing open-source tools:
- [Hono](https://hono.dev/) - Ultra-fast web framework
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [React](https://react.dev/) - UI library
- [TanStack Query](https://tanstack.com/query) - Data synchronization
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

---

**Made with ❤️ by the Proofa team**
