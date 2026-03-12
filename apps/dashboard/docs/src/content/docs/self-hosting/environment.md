---
title: Environment Variables
description: Complete environment configuration reference
---

All environment variables for Nube Auth services.

## Core Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment (`development`, `production`) |
| `PORT` | No | `3001` | Server port |
| `LOG_LEVEL` | No | `info` | Log level (`debug`, `info`, `warn`, `error`) |

## Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | Database connection URL |
| `DATABASE_AUTH_TOKEN` | Yes* | - | Auth token (required for Turso) |

### Turso Example

```bash
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-token
```

### PostgreSQL Example

```bash
DATABASE_URL=postgresql://user:pass@host:5432/nube-auth
```

## Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | Yes | - | Redis connection URL |
| `REDIS_TOKEN` | No | - | Auth token (for Upstash) |

### Local Redis

```bash
REDIS_URL=redis://localhost:6379
```

### Upstash

```bash
REDIS_URL=redis://default:token@host.upstash.io:6379
REDIS_TOKEN=your-token
```

## Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | JWT signing secret (32+ bytes) |
| `SESSION_SECRET` | Yes | - | Session encryption secret |

### OAuth Providers

```bash
# Google
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# GitHub
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
```

## Sessions

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ACCESS_TOKEN_TTL` | No | `900` | Access token lifetime (seconds) |
| `REFRESH_TOKEN_TTL` | No | `604800` | Refresh token lifetime (seconds) |
| `SESSION_ROLLING` | No | `true` | Enable rolling sessions |
| `SESSION_ROLLING_TTL` | No | `86400` | Rolling window (seconds) |
| `SESSION_MAX_TTL` | No | `2592000` | Max session lifetime (seconds) |

## Email

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_PROVIDER` | No | - | Email provider (`resend`, `sendgrid`) |
| `EMAIL_FROM` | No | - | From address for emails |
| `RESEND_API_KEY` | No | - | Resend API key |
| `SENDGRID_API_KEY` | No | - | SendGrid API key |

## Licensing

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEFAULT_PLAN` | No | `free` | Default plan for new users |
| `ENABLE_TRIAL` | No | `false` | Enable trial periods |
| `TRIAL_DAYS` | No | `14` | Trial duration in days |
| `TRIAL_PLAN` | No | `pro` | Plan during trial |

## CORS & Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGINS` | No | `*` | Allowed origins (comma-separated) |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per minute |

## Service-to-Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `X_NUBE_AUTH_SERVICE_TOKEN` | Yes* | - | Shared token for Core ↔ Gateway S2S calls (must match on both services) |

## Example .env

```bash
# Core
NODE_ENV=production
PORT=3001

# Database (Turso)
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-token

# Redis (Upstash)
REDIS_URL=redis://default:token@host.upstash.io:6379

# Auth
JWT_SECRET=your-32-byte-secret-here-minimum
SESSION_SECRET=another-32-byte-secret-here

# OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Sessions
ACCESS_TOKEN_TTL=900
REFRESH_TOKEN_TTL=604800
SESSION_ROLLING=true

# Email
EMAIL_PROVIDER=resend
EMAIL_FROM=auth@yourdomain.com
RESEND_API_KEY=re_xxx

# Security
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Service-to-Service
X_NUBE_AUTH_SERVICE_TOKEN=your-32-plus-char-token
```
