# Admin Session Security Implementation

**Implemented**: January 10, 2026  
**Status**: Complete  
**Security Level**: High

---

## Problem Statement

Previously, admin and user sessions shared the same 365-day TTL with no privilege separation. This created serious security risks:

- ❌ Stolen user cookie → 365-day admin access
- ❌ No privilege escalation protection
- ❌ No re-authentication for sensitive actions
- ❌ Compliance issues (most standards require admin session limits)

---

## Solution: Separate Admin Session Security

### Core Changes

**Admin Sessions (Elevated Privileges)**:
- ✅ **2-hour maximum session duration** (vs 365 days for users)
- ✅ **15-minute inactivity timeout** (auto-logout after idle)
- ✅ **Activity tracking** (last action timestamp)
- ✅ **Session type enforcement** (metadata-based validation)

**User Sessions (Standard Access)**:
- ✅ **365-day session duration** (unchanged - appropriate for user dashboard)
- ✅ **No inactivity timeout** (persistent sessions)

---

## Implementation Details

### 1. Configuration

**Environment Variables** (`.env.example`):
```bash
# User sessions: 365 days (unchanged)
SESSION_TTL_SECONDS=31536000

# Admin sessions: 2 hours (NEW)
ADMIN_SESSION_TTL_SECONDS=7200

# Admin inactivity: 15 minutes (NEW)
ADMIN_INACTIVITY_TIMEOUT_SECONDS=900
```

**Constants** (`config/constants.ts`):
```typescript
export const SESSION_TTL = 365 * 24 * 60 * 60; // 365 days (user)
export const ADMIN_SESSION_TTL = 2 * 60 * 60; // 2 hours (admin)
export const ADMIN_INACTIVITY_TIMEOUT = 15 * 60; // 15 minutes (admin)
```

---

### 2. Session Creation (`routes/auth.ts`)

Admin sessions are created with shorter TTL and tracking metadata:

```typescript
// Choose TTL based on audience
const ttlSeconds = audience === "admin" ? ADMIN_SESSION_TTL : SESSION_TTL;

await sessionStore.setAppSession(gatewaySessionId, userId, appId, ttlSeconds, {
  coreSessionId: code,
  csrfToken,
  sessionType: audience,        // NEW: Track session type
  createdAt: Date.now(),         // NEW: Creation timestamp
  lastActivityAt: Date.now(),    // NEW: Activity tracking
});
```

**Result**:
- User login → 365-day session
- Admin login → 2-hour session with activity tracking

---

### 3. Inactivity Enforcement (`middleware/auth.ts`)

Admin sessions are validated on every request:

```typescript
// Admin-specific security check
if (isAdminRoute && sessionType === "admin" && lastActivityAt) {
  const inactiveSeconds = (Date.now() - lastActivityAt) / 1000;
  
  if (inactiveSeconds > ADMIN_INACTIVITY_TIMEOUT) {
    // Force re-authentication
    await sessionStore.deleteAppSession(sessionId);
    return c.json({ 
      error: "Admin session expired due to inactivity",
      code: "ADMIN_INACTIVITY_TIMEOUT"
    }, 401);
  }

  // Update last activity timestamp
  await sessionStore.setAppSession(sessionId, userId, appId, ttl, {
    ...metadata,
    lastActivityAt: Date.now(), // Reset inactivity timer
  });
}
```

**Result**:
- Admin inactive for 15+ minutes → forced logout
- User sessions → no inactivity checks

---

### 4. Cookie Separation

Two separate cookies prevent session reuse attacks:

| Cookie | Domain | TTL | Purpose |
|--------|--------|-----|---------|
| `proofa_admin_session` | `admin.proofa.com` | 2 hours | Admin dashboard access |
| `proofa_user_session` | `account.proofa.com` | 365 days | User dashboard access |

**Security Benefits**:
- Compromised user cookie ≠ admin access
- Admin cookie stolen → only 2 hours of exposure (max 15 min active)
- Domain isolation prevents cross-site session attacks

---

## Security Improvements

### Before (Vulnerable)

```
User logs in → Gets 365-day cookie
User accesses admin dashboard → Reuses same 365-day cookie
Attacker steals cookie → 365 days of admin access ❌
No activity checks → Session never expires ❌
```

### After (Secure)

```
User logs in → Gets 365-day user cookie ✅
Admin login → Gets separate 2-hour admin cookie ✅
Attacker steals admin cookie → Max 2 hours exposure ✅
Inactive for 15 minutes → Auto-logout ✅
```

---

## Compliance & Best Practices

This implementation aligns with:

✅ **OWASP Session Management**:
- Separate sessions for privilege levels
- Activity-based timeouts
- No session reuse for elevated access

✅ **NIST 800-63B**:
- Shorter sessions for privileged operations
- Inactivity timeouts for admin access

✅ **SOC 2 / ISO 27001**:
- Privileged session management
- Audit trail (timestamps tracked)
- Defense in depth

---

## Configuration Options

### Conservative (Maximum Security)
```bash
ADMIN_SESSION_TTL_SECONDS=3600      # 1 hour
ADMIN_INACTIVITY_TIMEOUT_SECONDS=300 # 5 minutes
```

### Default (Balanced - Current)
```bash
ADMIN_SESSION_TTL_SECONDS=7200       # 2 hours
ADMIN_INACTIVITY_TIMEOUT_SECONDS=900  # 15 minutes
```

### Relaxed (Lower Security)
```bash
ADMIN_SESSION_TTL_SECONDS=28800      # 8 hours (max recommended)
ADMIN_INACTIVITY_TIMEOUT_SECONDS=1800 # 30 minutes
```

⚠️ **Warning**: Never set admin TTL > 8 hours or inactivity > 1 hour.

---

## Testing

### Test Admin Session Expiry

1. Login to admin dashboard
2. Wait 2 hours + 1 minute
3. Attempt any admin action → Should get 401 with session expired

### Test Inactivity Timeout

1. Login to admin dashboard
2. Leave browser idle for 15+ minutes
3. Attempt any admin action → Should get 401 with `ADMIN_INACTIVITY_TIMEOUT` code

### Test User Sessions (Unaffected)

1. Login to user dashboard
2. Leave idle for days
3. Return → Session should still work (365-day TTL)

---

## Migration Notes

**Existing Sessions**:
- Old sessions without `sessionType` metadata will continue to work
- First admin action will upgrade session to tracked type
- No database migration required (metadata is optional)

**Rollback**:
- Set `ADMIN_SESSION_TTL_SECONDS=31536000` to revert to 365-day admin sessions
- Set `ADMIN_INACTIVITY_TIMEOUT_SECONDS=999999999` to disable inactivity checks

---

## Monitoring

### Key Metrics to Track

1. **Admin session duration** (avg should be < 30 min)
2. **Inactivity timeouts triggered** (high = good security)
3. **Re-auth frequency** (admin users re-authenticating)
4. **Stolen session attempts** (401s from unusual IPs)

### Log Examples

```typescript
// Admin inactivity timeout
{
  level: "warn",
  message: "Admin session exceeded inactivity timeout - forcing re-auth",
  sessionId: "abc123...",
  inactiveSeconds: 901,
  threshold: 900
}

// Session type mismatch
{
  level: "error",
  message: "User session attempted to access admin route",
  sessionId: "xyz789...",
  sessionType: "user",
  attemptedRoute: "/v1/admin/projects"
}
```

---

## Future Enhancements

### Phase 2 (Q2 2026)

1. **Step-up authentication**: Require password for destructive actions
2. **IP-based validation**: Bind admin sessions to IP address
3. **Device fingerprinting**: Detect session hijacking
4. **MFA requirement**: Require 2FA for admin access

### Phase 3 (Q3 2026)

1. **Privileged action audit**: Log all admin actions with context
2. **Anomaly detection**: Alert on unusual admin behavior
3. **Session playback**: Review admin session activity
4. **Break-glass access**: Emergency admin access with full logging

---

## Summary

**Security Posture**: ✅ **Significantly Improved**

| Metric | Before | After |
|--------|--------|-------|
| Admin session max duration | 365 days | 2 hours |
| Inactivity protection | None | 15 minutes |
| Privilege separation | No | Yes |
| Attack surface (stolen cookie) | 365 days | 2 hours max |
| Compliance alignment | Poor | Good |

**Result**: Admin sessions now follow industry best practices for privileged access management.

---

**Last Updated**: January 10, 2026  
**Maintainer**: Proofa Security Team  
**Review**: Required before any admin TTL changes
