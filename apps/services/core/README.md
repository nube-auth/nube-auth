# @nube-auth/core

The authoritative identity, session, and licensing service for Nube Auth.

## Overview

This is the core authentication and authorization service built with [Hono](https://hono.dev/), a modern, fast web framework. It handles:

- OAuth authentication (Google, GitHub)
- Email-based authentication
- Session management (365 days for users, 2 hours + 15-min inactivity for admins)
- License management
- Atomic JSONB operations (race-condition-free database updates)
- Server-to-server (S2S) authentication for gateway communication

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (workspace package manager)
- PostgreSQL database
- Redis for session caching

### Installation

```bash
pnpm install
```

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```env
DATABASE_URL=your-database-url
GOOGLE_CLIENT_ID=your-google-oauth-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
JWT_SECRET=your-jwt-secret-min-32-chars
SESSION_SECRET=your-session-secret-min-32-chars
S2S_SECRET=your-s2s-secret-min-32-chars
REDIS_URL=redis://localhost:6379

# Session Configuration (all values in seconds)
CORE_SESSION_TTL_SECONDS=31536000        # 365 days (users)
CORE_ADMIN_SESSION_TTL_SECONDS=7200      # 2 hours (admins)
CORE_ADMIN_INACTIVITY_TIMEOUT_SECONDS=900  # 15 minutes
```

### Running the Application

#### Development Mode
```bash
pnpm dev
```
This starts the server with hot reload on `http://localhost:3000`.

#### Production Build
```bash
pnpm build
```
Compiles TypeScript to JavaScript in the `dist/` directory.

#### Testing
```bash
pnpm test
```
Runs the Vitest test suite.

### Database Management

#### Run Migrations
```bash
pnpm db:migrate
```

#### Seed Database
```bash
pnpm db:seed
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Authentication (v1)
- `GET /v1/auth/start` - Initiate OAuth flow
- `GET /v1/auth/callback/:provider` - OAuth callback handler

### Email (v1)
- `POST /v1/email/start` - Start email verification
- `POST /v1/email/verify` - Verify email with OTP

### Licensing (v1)
- `GET /v1/license` - Get current license information

### Admin (v1)
- `POST /v1/admin/license/grant` - Grant license to user (admin only)

## Architecture

```
src/
├── index.ts              # Main Hono application
├── middleware/           # Global and route middleware
│   ├── auth.ts          # Session validation
│   ├── s2s.ts           # Server-to-server auth
│   ├── error.ts         # Error handling
│   └── logger.ts        # Request logging
├── routes/
│   └── v1/              # API v1 routes
│       ├── auth/        # OAuth and session routes
│       ├── email/       # Email verification routes
│       ├── license/     # License routes
│       └── admin/       # Admin routes
├── config/              # Configuration
│   ├── env.ts           # Environment variables
│   └── constants.ts     # Application constants
├── types/               # TypeScript types
│   ├── auth.ts          # Auth-related types
│   └── index.ts         # Type exports
└── utils/               # Utility functions
    ├── crypto.ts        # Token generation, hashing
    └── date.ts          # Date and timestamp utilities
```

## Local Development

### Starting Services

1. **PostgreSQL** (using Docker):
```bash
docker run -d \
  --name nube-auth-db \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=nube-auth_core \
  -p 5432:5432 \
  postgres:15
```

2. **Redis** (using Docker):
```bash
docker run -d \
  --name nube-auth-redis \
  -p 6379:6379 \
  redis:7
```

3. **Core Service**:
```bash
pnpm dev
```

## Testing

Run the test suite:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test -- --watch
```

## Deployment

### Building for Production
```bash
pnpm build
```

### Environment Variables for Production
Ensure all required environment variables are set in your production environment:
- `DATABASE_URL` - Production database connection string
- OAuth credentials (Google, GitHub)
- Secure secret keys (JWT, SESSION, S2S)
- `REDIS_URL` - Production Redis instance
- `NODE_ENV=production`

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Submit a pull request

## License

Proprietary - Nube Auth
