# @proofa/gateway

**REST API Gateway for Proofa Platform**

The Proofa Gateway is a high-performance API server built with Hono.js that handles all backend operations for the Proofa platform.

---

## Features

- 🚀 **High Performance** - Built on Hono.js for maximum speed
- 🔐 **Complete Authentication** - OAuth 2.0, Magic Links, Session Management
- 👥 **User Management** - Projects, teams, roles, invitations
- 📦 **Licensing** - Plans, licenses, entitlements
- 💳 **Payment Integration** - Multi-provider support (Lemon Squeezy, Dodo, Stripe)
- 🔒 **Security** - Rate limiting, CORS, encryption, audit logging
- 📊 **Analytics** - Statistics and metrics endpoints
- 🎯 **Type-Safe** - Full TypeScript support

---

## Architecture

### Tech Stack
- **Framework**: Hono.js
- **Runtime**: Node.js 20+
- **Database**: PostgreSQL 16 (via Drizzle ORM)
- **Cache**: Redis 7
- **Email**: Resend
- **Encryption**: AES-256-GCM

### Structure
```
src/
├── index.ts              # Main entry point
├── config/
│   └── env.ts           # Environment configuration
├── middleware/
│   ├── auth.ts          # Authentication middleware
│   ├── cors.ts          # CORS configuration
│   └── errorHandler.ts  # Error handling
├── routes/
│   ├── admin.ts         # Admin API endpoints
│   ├── auth.ts          # Authentication endpoints
│   └── user.ts          # User API endpoints
├── services/
│   ├── cacheService.ts  # Redis caching
│   ├── oauth.ts         # OAuth resolver
│   └── sessionService.ts# Session management
└── redis/
    ├── client.ts        # Redis client
    └── constants.ts     # Redis key patterns
```

---

## API Endpoints

### Authentication
- `POST /v1/auth/oauth/google` - Google OAuth initiation
- `POST /v1/auth/oauth/github` - GitHub OAuth initiation
- `GET /v1/auth/oauth/callback` - OAuth callback handler
- `POST /v1/auth/magic-link` - Send magic link
- `POST /v1/auth/magic-link/verify` - Verify magic link
- `POST /v1/auth/exchange` - Exchange auth code for tokens
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout user

### Admin API
#### Projects
- `GET /v1/admin/projects` - List all projects
- `POST /v1/admin/projects` - Create new project
- `GET /v1/admin/projects/:projectId` - Get project details
- `PATCH /v1/admin/projects/:projectId` - Update project
- `DELETE /v1/admin/projects/:projectId` - Delete project (soft delete)

#### OAuth Configuration
- `GET /v1/admin/projects/:projectId/oauth` - Get project OAuth config
- `PATCH /v1/admin/projects/:projectId/oauth` - Update project OAuth config

#### Apps
- `GET /v1/admin/projects/:projectId/apps` - List apps
- `POST /v1/admin/projects/:projectId/apps` - Create app
- `GET /v1/admin/projects/:projectId/apps/:appId` - Get app details
- `PATCH /v1/admin/projects/:projectId/apps/:appId` - Update app
- `DELETE /v1/admin/projects/:projectId/apps/:appId` - Delete app (soft delete)

#### Payment Configuration
- `GET /v1/admin/projects/:projectId/payment-config` - Get project payment config
- `POST /v1/admin/projects/:projectId/payment-config` - Set project payment config
- `GET /v1/admin/projects/:projectId/apps/:appId/payment-config` - Get app payment config
- `POST /v1/admin/projects/:projectId/apps/:appId/payment-config` - Set app payment config
- `DELETE /v1/admin/projects/:projectId/apps/:appId/payment-config` - Remove app override

#### Team Management
- `GET /v1/admin/projects/:projectId/members` - List team members
- `POST /v1/admin/projects/:projectId/members/invite` - Invite team member
- `PATCH /v1/admin/projects/:projectId/members/:memberId` - Update member role
- `DELETE /v1/admin/projects/:projectId/members/:memberId` - Remove member

#### Users & Licenses
- `GET /v1/admin/projects/:projectId/apps/:appId/users` - List app users
- `POST /v1/admin/projects/:projectId/apps/:appId/users/invite` - Invite user
- `GET /v1/admin/projects/:projectId/apps/:appId/users/:userId` - Get user details
- `PATCH /v1/admin/projects/:projectId/apps/:appId/users/:userId` - Update user
- `DELETE /v1/admin/projects/:projectId/apps/:appId/users/:userId` - Revoke access
- `POST /v1/admin/projects/:projectId/apps/:appId/users/:userId/renew` - Renew license

#### Plans
- `GET /v1/admin/projects/:projectId/apps/:appId/plans` - List plans
- `POST /v1/admin/projects/:projectId/apps/:appId/plans` - Create plan
- `PATCH /v1/admin/projects/:projectId/apps/:appId/plans/:planId` - Update plan
- `DELETE /v1/admin/projects/:projectId/apps/:appId/plans/:planId` - Delete plan

#### Statistics
- `GET /v1/admin/projects/:projectId/stats` - Project statistics
- `GET /v1/admin/projects/:projectId/apps/:appId/stats` - App statistics

### User API
- `GET /v1/user/profile` - Get user profile
- `PATCH /v1/user/profile` - Update user profile
- `GET /v1/user/sessions` - List active sessions
- `DELETE /v1/user/sessions/:sessionId` - Revoke session

---

## Environment Variables

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

# Application URLs
GATEWAY_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:5173

# Service-to-Service (Core <-> Gateway)
# Must match Core's X_PROOFA_SERVICE_TOKEN
X_PROOFA_SERVICE_TOKEN=your-service-token-here

# Session Configuration (all values in seconds)
# Core sessions: 31536000 = 365 days (users), 7200 = 2 hours (admins)
# Gateway sessions: 2592000 = 30 days default
CORE_SESSION_TTL_SECONDS=31536000
CORE_ADMIN_SESSION_TTL_SECONDS=7200
CORE_ADMIN_INACTIVITY_TIMEOUT_SECONDS=900
GATEWAY_SESSION_DEFAULT_TTL_SECONDS=2592000
```

---

## Development

```bash
# Install dependencies
pnpm install

# Development mode with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

---

## Security

### Rate Limiting
- **Development Mode**: Disabled for better developer experience (`NODE_ENV=development`)
- **Production Mode**:
  - **Authentication endpoints**: 10 requests per 5 minutes per IP
  - **API endpoints**: 100 requests per minute per user (configurable per-app)
  - **Admin endpoints**: 60 requests per minute per user

### Encryption
- OAuth credentials encrypted with AES-256-GCM
- Payment credentials encrypted with AES-256-GCM
- Secrets never exposed in API responses

### Session Security
- **Core Sessions**:
  - **Users**: 365 days rolling (30-day refresh threshold)
  - **Admins**: 2 hours + 15-minute inactivity timeout
- **Gateway Sessions**: Per-app configurable (1-365 days, default 30 days)
- HTTP-only cookies
- Secure flag in production
- SameSite=Lax
- Redis-backed storage
- IP and User-Agent fingerprinting

### CORS
- Configurable allowed origins
- Credentials support
- Preflight caching

---

## Deployment

### Docker
```bash
# Build image
docker build -t proofa-gateway .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e REDIS_URL="..." \
  proofa-gateway
```

### Fly.io
```bash
fly deploy --config fly.toml
```

### Environment Setup
See [ENV_SETUP.md](../../ENV_SETUP.md) for detailed configuration.

---

## Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Redis Health
```bash
curl http://localhost:3000/health/redis
```

### Database Health
```bash
curl http://localhost:3000/health/database
```

---

## Contributing

See the main [README.md](../../README.md) for contributing guidelines.

---

## License

MIT License - see [LICENSE](../../LICENSE)
