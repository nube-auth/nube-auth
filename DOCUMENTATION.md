# Proofa Documentation Index

> **Complete documentation for the Proofa platform**

This document provides a comprehensive index of all available documentation.

## 📚 Quick Links

- **[Main README](./README.md)** - Project overview and quick start
- **[Quick Start Guide](./QUICKSTART.md)** - Get running in 5 minutes
- **[Local Development](./LOCAL_DEVELOPMENT.md)** - Complete local setup
- **[Security Documentation](./docs/security/README.md)** - Security features and audit
- **[TODO & Roadmap](./TODO.md)** - Planned features and improvements

---

## 🚀 Getting Started

### For New Users
1. **[README.md](./README.md)** - Start here for project overview
2. **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide
3. **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)** - Detailed local setup

### For Developers
1. **[Architecture Overview](#architecture)** - System design
2. **[API Documentation](./apps/gateway/README.md)** - REST API reference
3. **[Package Documentation](#packages)** - Individual package docs
4. **[Security Guide](./docs/security/README.md)** - Security best practices

### For Administrators
1. **[Admin Dashboard Guide](#admin-dashboard)** - Using the admin UI
2. **[Security Documentation](./docs/security/README.md)** - Security features
3. **[Deployment Guide](#deployment)** - Production deployment

---

## 📖 Core Documentation

### Getting Started
| Document | Description |
|----------|-------------|
| [README.md](./README.md) | Project overview, features, quick start |
| [QUICKSTART.md](./QUICKSTART.md) | 5-minute setup guide with Docker |
| [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) | Complete local development setup |

### Architecture
| Document | Description |
|----------|-------------|
| [docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md) | Product specification and architecture |
| [docs/TECHNICAL_DEBT.md](./docs/TECHNICAL_DEBT.md) | Known technical debt and improvements |

### Security
| Document | Description |
|----------|-------------|
| [docs/security/README.md](./docs/security/README.md) | Security documentation index |
| [docs/security/SECURITY_OVERVIEW.md](./docs/security/SECURITY_OVERVIEW.md) | Complete security audit and fixes |
| [docs/security/SESSION_HIJACKING.md](./docs/security/SESSION_HIJACKING.md) | Session hijacking protection |
| [docs/security/AUDIT_REPORT.md](./docs/security/AUDIT_REPORT.md) | Security audit findings |
| [docs/security/LOGOUT_FIX.md](./docs/security/LOGOUT_FIX.md) | Logout bug fix documentation |
| [docs/security/SQL_INJECTION_PROTECTION.md](./docs/security/SQL_INJECTION_PROTECTION.md) | SQL injection protection |

---

## 📦 Package Documentation

### Core Packages
| Package | Description | Documentation |
|---------|-------------|---------------|
| `@proofa/db` | Database layer (Drizzle ORM + PostgreSQL) | [packages/db/README.md](./packages/db/README.md) |
| `@proofa/cache` | Cache layer (Redis) | [packages/cache/README.md](./packages/cache/README.md) |
| `@proofa/shared` | Shared utilities and types | [packages/shared/README.md](./packages/shared/README.md) |
| `@proofa/auth` | Authentication utilities | [packages/auth/README.md](./packages/auth/README.md) |

### Client Libraries
| Package | Description | Documentation |
|---------|-------------|---------------|
| `@proofa/client` | TypeScript SDK | [packages/client/README.md](./packages/client/README.md) |
| `@proofa/react` | React hooks and components | [packages/react/README.md](./packages/react/README.md) |

### Applications
| Application | Description | Documentation |
|-------------|-------------|---------------|
| Gateway | REST API Gateway | [apps/gateway/README.md](./apps/gateway/README.md) |
| Core | Core authentication service | [apps/core/README.md](./apps/core/README.md) |
| Admin Dashboard | Admin UI (React) | [apps/dashboard/admin/](./apps/dashboard/admin/) |
| User Dashboard | User portal (React) | [apps/dashboard/user/](./apps/dashboard/user/) |
| Marketing Site | Homepage (Astro) | [apps/dashboard/home/README.md](./apps/dashboard/home/README.md) |
| Documentation | Docs site (Starlight) | [apps/dashboard/docs/](./apps/dashboard/docs/) |

---

## 🔌 API Documentation

### Gateway API
The main REST API for all operations.

**Base URL**: `http://localhost:3004` (local) or `https://api.proofa.sh` (production)

**Documentation**: [apps/gateway/README.md](./apps/gateway/README.md)

### Endpoints

#### Authentication
- `POST /v1/auth/start` - Start OAuth flow
- `GET /v1/auth/callback` - OAuth callback
- `POST /v1/auth/login` - Manual login
- `POST /v1/auth/logout` - Logout
- `GET /v1/auth/status` - Check auth status

#### User Management
- `GET /v1/me` - Get current user
- `PATCH /v1/me` - Update profile
- `GET /v1/me/sessions` - List sessions
- `DELETE /v1/me/sessions/:id` - Delete session

#### Admin Operations
- `GET /v1/admin/projects` - List projects
- `POST /v1/admin/projects` - Create project
- `GET /v1/admin/projects/:id/apps` - List apps
- `POST /v1/admin/projects/:id/apps` - Create app
- `POST /v1/admin/projects/:id/members/invite` - Invite member
- `GET /v1/admin/users` - List users
- `POST /v1/admin/users/invite` - Invite user
- `GET /v1/admin/plans` - List plans
- `POST /v1/admin/plans` - Create plan

For complete API documentation, see [apps/gateway/README.md](./apps/gateway/README.md).

---

## 🎨 Admin Dashboard

The admin dashboard provides a web interface for managing:
- **Projects & Apps**: Create and configure applications
- **Users**: Invite and manage users
- **OAuth Providers**: Configure authentication providers
- **Payment Providers**: Set up payment integrations
- **Plans & Licensing**: Create subscription plans
- **Analytics**: View usage statistics

**URL**: `http://localhost:5174` (local) or `https://manage.proofa.sh` (production)

---

## 🔒 Security

### Security Rating: A+ (94/100)

Proofa implements enterprise-grade security features:

#### Authentication & Authorization
- ✅ Cryptographically secure session tokens (256-bit)
- ✅ Session fingerprinting (IP + User-Agent)
- ✅ Session fixation protection
- ✅ CSRF protection
- ✅ Rate limiting (Redis-based)

#### Input Validation & Sanitization
- ✅ 15+ Zod validation schemas
- ✅ SQL injection protection (Drizzle ORM)
- ✅ Error message sanitization
- ✅ Request body validation

#### Headers & Browser Security
- ✅ Content Security Policy (CSP)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Strict-Transport-Security (HSTS)
- ✅ Referrer-Policy
- ✅ Permissions-Policy

For complete security documentation, see [docs/security/README.md](./docs/security/README.md).

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Environment Variables

Required environment variables for production:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/proofa

# Redis
REDIS_URL=redis://host:6379

# Email
RESEND_API_KEY=your_api_key

# Encryption
ENCRYPTION_KEY=your_64_char_hex_string

# OAuth (optional - can be configured per project)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Session
SESSION_SECRET=your_session_secret
COOKIE_DOMAIN=.proofa.sh

# URLs
GATEWAY_URL=https://api.proofa.sh
CORE_URL=https://core.proofa.sh
ADMIN_DASHBOARD_URL=https://manage.proofa.sh
USER_DASHBOARD_URL=https://user.proofa.sh
```

---

## 🛠️ Development

### Prerequisites
- Node.js 22+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+

### Setup

```bash
# Clone repository
git clone https://github.com/yourorg/proofa-core.git
cd proofa-core

# Install dependencies
pnpm install

# Start infrastructure
docker-compose up -d postgres redis

# Setup environment
cp .env.example .env
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Run migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

### Available Commands

```bash
# Development
pnpm dev                  # Start all services
pnpm dev:gateway          # Start API Gateway only
pnpm dev:admin            # Start Admin Dashboard only

# Building
pnpm build                # Build all packages
pnpm build:packages       # Build shared packages only

# Database
pnpm db:migrate           # Run migrations
pnpm db:studio            # Open Drizzle Studio

# Testing
pnpm test                 # Run all tests
pnpm lint                 # Lint code
pnpm typecheck            # Type check
```

---

## 📋 Project Roadmap

See [TODO.md](./TODO.md) for the complete roadmap.

### Completed ✅
- Core authentication (OAuth, Magic Links)
- User management
- Project & app management
- Licensing system
- Payment integration
- Admin dashboard
- Security hardening (A+ rating)
- Session hijacking protection
- Comprehensive documentation

### In Progress 🚧
- Advanced analytics
- Webhook system
- Custom email templates

### Planned 📅
- Multi-factor authentication (MFA)
- WebAuthn support
- SAML/SSO integration
- Mobile SDKs
- GraphQL API

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: `pnpm test && pnpm lint`
5. **Commit**: `git commit -m 'Add amazing feature'`
6. **Push**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow existing code style
- Keep commits atomic and well-described

---

## 🆘 Support

### Resources
- **Documentation**: https://docs.proofa.sh
- **API Reference**: [apps/gateway/README.md](./apps/gateway/README.md)
- **Security**: [docs/security/README.md](./docs/security/README.md)

### Community
- **GitHub Issues**: [Report bugs or request features](https://github.com/yourorg/proofa-core/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/yourorg/proofa-core/discussions)
- **Discord**: Join our community (coming soon)

### Contact
- **Email**: support@proofa.sh
- **Security**: security@proofa.sh

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with amazing open-source tools:
- [Hono](https://hono.dev) - Lightweight web framework
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM
- [React](https://react.dev) - UI library
- [Vite](https://vitejs.dev) - Build tool
- [TanStack Query](https://tanstack.com/query) - Data fetching
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [PostgreSQL](https://www.postgresql.org) - Database
- [Redis](https://redis.io) - Cache and sessions

---

**Last Updated**: December 29, 2024  
**Version**: 1.0.0  
**Security Rating**: A+ (94/100)  
**Status**: Production Ready

---

**Made with ❤️ by the Proofa team**
