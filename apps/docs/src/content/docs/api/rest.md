---
title: REST API
description: Proofa REST API reference
---

The Proofa REST API provides full access to all functionality.

## Base URL

```
Production: https://api.proofa.dev/v1
Self-hosted: https://your-domain/v1
```

## Authentication

All API requests require authentication via Bearer token:

```bash
curl https://api.proofa.dev/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

For server-to-server requests, use an API key:

```bash
curl https://api.proofa.dev/v1/admin/users \
  -H "X-API-Key: YOUR_API_KEY"
```

## Response Format

All responses are JSON:

```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

Error responses:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "details": { ... }
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

## Rate Limiting

Default limits:

- **Standard endpoints**: 100 requests/minute
- **Auth endpoints**: 10 requests/minute
- **Admin endpoints**: 1000 requests/minute

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Pagination

List endpoints support pagination:

```bash
GET /v1/users?page=1&limit=20
```

Response includes pagination info:

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Start OAuth flow |
| POST | `/auth/callback` | Handle OAuth callback |
| POST | `/auth/magic-link` | Send magic link |
| POST | `/auth/verify` | Verify magic link |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout / revoke session |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get current user |
| PATCH | `/users/me` | Update current user |
| DELETE | `/users/me` | Delete account |

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sessions` | List user sessions |
| DELETE | `/sessions/:id` | Revoke session |
| DELETE | `/sessions` | Revoke all sessions |

### Licenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/licenses/me` | Get current license |
| GET | `/licenses/entitlements` | Check entitlements |
| GET | `/licenses/usage` | Get usage stats |

See individual API docs for detailed request/response schemas.
