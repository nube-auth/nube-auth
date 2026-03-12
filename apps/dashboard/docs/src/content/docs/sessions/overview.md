---
title: Sessions Overview
description: Understanding session management in Nube Auth
---

Nube Auth handles session management automatically with secure, scalable sessions.

## How Sessions Work

When a user authenticates:

1. **Access token** created (short-lived, 15 min default)
2. **Refresh token** created (long-lived, 7 days default)
3. Tokens stored in Redis for fast validation
4. Session metadata tracked for analytics

## Session Structure

```typescript
interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  lastActiveAt: Date;
  metadata: {
    ip: string;
    userAgent: string;
    device: string;
  };
}
```

## Rolling Sessions

Sessions automatically extend on activity:

```bash
# Enable rolling sessions
SESSION_ROLLING=true

# Extension window (activity within this window extends session)
SESSION_ROLLING_TTL=86400  # 1 day

# Maximum session lifetime
SESSION_MAX_TTL=2592000  # 30 days
```

With rolling sessions:
- User active daily → session stays valid
- User inactive for 7 days → session expires
- Maximum 30 days regardless of activity

## Managing Sessions

### Get Current Session

```typescript
const session = await nube-auth.getSession();

console.log(session.expiresAt);
console.log(session.metadata.device);
```

### List All Sessions

```typescript
// Get all active sessions for the user
const sessions = await nube-auth.getSessions();

sessions.forEach(session => {
  console.log(session.metadata.device, session.lastActiveAt);
});
```

### Revoke Sessions

```typescript
// Revoke a specific session
await nube-auth.revokeSession({ sessionId: 'session-id' });

// Revoke all sessions except current
await nube-auth.revokeAllSessions({ exceptCurrent: true });

// Revoke all sessions (logout everywhere)
await nube-auth.revokeAllSessions();
```

## Session Storage

Sessions are stored in Redis for performance:

- **Fast lookups** - Sub-millisecond validation
- **Automatic expiration** - Redis TTL handles cleanup
- **Scalable** - Works across multiple server instances

## Security Features

- **Secure tokens** - Cryptographically signed JWTs
- **HTTP-only cookies** - Tokens protected from XSS
- **CSRF protection** - State validation on OAuth flows
- **Device fingerprinting** - Track session origins

## Next Steps

- [Token Refresh](/sessions/token-refresh/) - How token refresh works
- [REST API](/api/sessions/) - Session API endpoints
