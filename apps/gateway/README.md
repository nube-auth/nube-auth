# Proofa Gateway

Backend-for-Frontend (BFF) gateway service that sits between the user/admin dashboards and the Core service. Handles authentication, session management, caching, and orchestrates requests to Core APIs.

## Overview

The Gateway service provides:
- **Session Management**: Redis-backed session storage with secure cookie validation
- **Authentication**: Gateway-level session validation and user authentication
- **Caching**: Distributed caching layer for licenses, user data, and project information
- **S2S Communication**: Secure service-to-service communication with Core using `X-Proofa-Service-Token`
- **Multi-tenant Support**: App resolution from hostname or query parameters
- **Request Logging**: Structured logging with request IDs for debugging

## Architecture

### Session Storage (Redis)

Sessions are stored in Redis with the following structure:
```
gateway:session:{sessionToken} → {userId, appId, expiresAt, metadata}
```

TTL: Configurable per environment (default: 24 hours)

### Caching Layer

- **User Data**: `gateway:user:{userId}` (2-minute TTL)
- **Licenses**: `gateway:license:{appId}` (2-minute TTL)
- **Projects**: `gateway:project:{projectId}` (2-minute TTL)

### Middleware Stack

1. **Request ID**: Assigns unique ID to each request for tracing
2. **Logger**: Logs incoming requests and responses
3. **CORS**: Scoped to configured allowed hosts
4. **App Resolver**: Extracts app from hostname or query param
5. **Session Validation**: Validates session tokens from cookies
6. **Error Handler**: Centralized error handling with proper HTTP responses

## Quick Start

### Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Update the following in `.env`:
- `CORE_URL`: URL of the Core service
- `X_PROOFA_SERVICE_TOKEN`: Service-to-service authentication token
- `GATEWAY_SESSION_SECRET`: Secret for signing session tokens
- `UPSTASH_REDIS_REST_URL`: Redis instance endpoint
- `UPSTASH_REDIS_REST_TOKEN`: Redis authentication token

### Running Locally

Development mode with auto-reload:
```bash
pnpm dev
```

Production build:
```bash
pnpm build
pnpm preview
```

Run tests:
```bash
pnpm test
pnpm test:ui
```

## API Endpoints

### Authentication Routes (`/auth`)
- `GET /auth/start` - Initiate OAuth flow
- `GET /auth/callback` - Handle OAuth callback

### User Routes (`/me`)
- `GET /me` - Get current user profile
- `GET /me/profile` - Get user profile details
- `PATCH /me/profile` - Update user profile
- `GET /me/sessions` - List active sessions
- `DELETE /me/sessions/:session_id` - Revoke specific session
- `POST /me/logout` - Logout (revoke current session)

### Admin Routes (`/admin`)
- `POST /admin/projects` - Create project
- `GET /admin/projects` - List projects
- `PATCH /admin/projects/:project_id` - Update project
- `DELETE /admin/projects/:project_id` - Delete project
- `POST /admin/apps` - Create app
- `GET /admin/apps` - List apps
- `PATCH /admin/apps/:app_id` - Update app
- `DELETE /admin/apps/:app_id` - Delete app
- `POST /admin/members` - Add member
- `GET /admin/members` - List members
- `DELETE /admin/members/:member_id` - Remove member
- `GET /admin/licenses` - List licenses
- `PATCH /admin/licenses/:license_id` - Update license

## Calling Core via S2S

All requests to Core are made using the `coreService`:

```typescript
import { coreService } from './services/coreService';

// Calls http://CORE_URL/v1/auth/exchange with X-Proofa-Service-Token header
const token = await coreService.exchangeToken(code);
```

The service automatically includes the `X-Proofa-Service-Token` header for authentication.

## Environment Setup

### Redis

Upstash Redis is recommended for production. Set up:
1. Create an Upstash account
2. Create a Redis database
3. Copy the REST URL and token to environment variables

### Service Token

The `X_PROOFA_SERVICE_TOKEN` should match the token configured in Core service.

### Session Secret

Generate a random 32-character string for `GATEWAY_SESSION_SECRET`:
```bash
openssl rand -hex 16
```

## Local Development

### Debugging

1. Use `Request-ID` header in responses to trace logs
2. Check `NODE_ENV=development` for verbose logging
3. Use `pnpm test` to run unit tests

### Multi-tenant Testing

```bash
# Test with app in hostname
curl http://app1.localhost:3002/me

# Test with app in query param
curl http://localhost:3002/me?app=app1
```

## Project Structure

```
src/
├── index.ts                 # Main Hono application
├── config/
│   ├── env.ts              # Environment variable validation
│   ├── constants.ts        # TTLs, limits, route definitions
│   └── appHosts.ts         # Hostname to app_id mapping
├── middleware/
│   ├── auth.ts             # Session validation
│   ├── s2s.ts              # Service-to-service auth
│   ├── error.ts            # Error handling
│   ├── logger.ts           # Request logging
│   └── appResolver.ts      # App extraction from request
├── routes/
│   ├── auth.ts             # OAuth flow endpoints
│   ├── user.ts             # User profile endpoints
│   └── admin.ts            # Admin CRUD endpoints
├── services/
│   ├── coreService.ts      # Core API calls
│   ├── sessionService.ts   # Session management
│   └── cacheService.ts     # Redis caching
├── redis/
│   ├── client.ts           # Redis client setup
│   └── constants.ts        # Redis key patterns
├── types/
│   ├── session.ts          # Session types
│   └── index.ts            # Type exports
└── utils/
    ├── cookies.ts          # Cookie handling
    └── token.ts            # Token generation
```

## Deployment

1. Build the application:
```bash
pnpm build
```

2. Deploy the `dist` directory to your hosting platform

3. Set environment variables in your hosting environment

4. Run with:
```bash
node dist/index.js
```
