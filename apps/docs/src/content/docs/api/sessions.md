---
title: Sessions API
description: Session management endpoints reference
---

## Get Current Session

Get details about the current session.

```http
GET /v1/sessions/current
```

### Headers

```
Authorization: Bearer ACCESS_TOKEN
```

### Response

```json
{
  "data": {
    "id": "ses_abc123",
    "userId": "usr_xyz789",
    "createdAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2024-01-08T00:00:00Z",
    "lastActiveAt": "2024-01-01T12:00:00Z",
    "metadata": {
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "device": "Chrome on macOS",
      "location": "San Francisco, US"
    }
  }
}
```

---

## List Sessions

Get all active sessions for the current user.

```http
GET /v1/sessions
```

### Headers

```
Authorization: Bearer ACCESS_TOKEN
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

### Response

```json
{
  "data": [
    {
      "id": "ses_abc123",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastActiveAt": "2024-01-01T12:00:00Z",
      "metadata": {
        "device": "Chrome on macOS",
        "location": "San Francisco, US"
      },
      "current": true
    },
    {
      "id": "ses_def456",
      "createdAt": "2023-12-25T00:00:00Z",
      "lastActiveAt": "2023-12-30T12:00:00Z",
      "metadata": {
        "device": "Safari on iPhone",
        "location": "New York, US"
      },
      "current": false
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2
  }
}
```

---

## Revoke Session

Revoke a specific session.

```http
DELETE /v1/sessions/:sessionId
```

### Headers

```
Authorization: Bearer ACCESS_TOKEN
```

### Response

```json
{
  "data": {
    "success": true,
    "sessionId": "ses_def456"
  }
}
```

---

## Revoke All Sessions

Revoke all sessions for the current user.

```http
DELETE /v1/sessions
```

### Headers

```
Authorization: Bearer ACCESS_TOKEN
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `exceptCurrent` | boolean | Keep current session (default: false) |

### Response

```json
{
  "data": {
    "success": true,
    "revokedCount": 3
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `SESSION_NOT_FOUND` | Session does not exist |
| `SESSION_ALREADY_REVOKED` | Session was already revoked |
| `CANNOT_REVOKE_CURRENT` | Cannot revoke current session (use logout) |
