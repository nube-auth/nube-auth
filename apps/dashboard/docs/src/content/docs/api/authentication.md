---
title: Authentication API
description: Authentication endpoints reference
---

## Start OAuth Flow

Initiate OAuth authentication with a provider.

```http
POST /v1/auth/login
```

### Request

```json
{
  "provider": "google",
  "redirectUri": "https://yourapp.com/auth/callback",
  "scopes": ["email", "profile"],
  "state": "optional-state-value"
}
```

### Response

```json
{
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "state": "state-value"
  }
}
```

---

## Handle OAuth Callback

Exchange OAuth code for tokens.

```http
POST /v1/auth/callback
```

### Request

```json
{
  "provider": "google",
  "code": "oauth-code-from-provider",
  "state": "state-value"
}
```

### Response

```json
{
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresAt": "2024-01-01T00:15:00Z"
  }
}
```

---

## Send Magic Link

Send a passwordless login link via email.

```http
POST /v1/auth/magic-link
```

### Request

```json
{
  "email": "user@example.com",
  "redirectUri": "https://yourapp.com/auth/verify"
}
```

### Response

```json
{
  "data": {
    "sent": true,
    "expiresAt": "2024-01-01T00:10:00Z"
  }
}
```

---

## Verify Magic Link

Verify a magic link token.

```http
POST /v1/auth/verify
```

### Request

```json
{
  "token": "magic-link-token"
}
```

### Response

```json
{
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresAt": "2024-01-01T00:15:00Z"
  }
}
```

---

## Refresh Token

Get a new access token using a refresh token.

```http
POST /v1/auth/refresh
```

### Request

```json
{
  "refreshToken": "eyJ..."
}
```

### Response

```json
{
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresAt": "2024-01-01T00:15:00Z"
  }
}
```

---

## Logout

Revoke the current session.

```http
POST /v1/auth/logout
```

### Headers

```
Authorization: Bearer ACCESS_TOKEN
```

### Response

```json
{
  "data": {
    "success": true
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_PROVIDER` | Unknown OAuth provider |
| `INVALID_CODE` | OAuth code invalid or expired |
| `INVALID_STATE` | State mismatch (CSRF) |
| `MAGIC_LINK_EXPIRED` | Magic link has expired |
| `MAGIC_LINK_USED` | Magic link already used |
| `REFRESH_TOKEN_EXPIRED` | Refresh token has expired |
| `REFRESH_TOKEN_REVOKED` | Session was revoked |
