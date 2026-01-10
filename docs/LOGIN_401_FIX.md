# 401 After Admin Login - Diagnosis & Fix

## Problem
After successful OAuth login to admin dashboard, subsequent API calls to `/v1/admin/projects` and other admin endpoints return **401 Unauthorized**.

## Root Cause
The admin session cookie (`proofa_admin_session`) was not being properly set or sent across requests due to localhost cookie domain configuration.

## Changes Made

### 1. **Fixed Localhost Cookie Handling** 
**File**: `apps/services/gateway/src/routes/auth.ts`

When `COOKIE_DOMAIN=localhost` (development), the cookie should NOT include a domain attribute, allowing the browser to use the request domain automatically.

```typescript
// Before: Always set domain attribute
const { value, attributes } = createSessionCookie(
    gatewaySessionId,
    cookieDomain ? { domain: cookieDomain, secure: secureCookies } : { secure: secureCookies },
);

// After: Skip domain for localhost
const cookieOptions = cookieDomain && cookieDomain !== "localhost" 
    ? { domain: cookieDomain, secure: secureCookies }
    : { secure: secureCookies };

const { value, attributes } = createSessionCookie(
    gatewaySessionId,
    cookieOptions,
);
```

### 2. **Added Debug Endpoints**
**File**: `apps/services/gateway/src/routes/debug.ts` (NEW)

Added two debug endpoints to diagnose auth issues:

- `GET /v1/debug/cookies` - Shows all cookies and headers received by Gateway
- `GET /v1/debug/auth-status` - Shows current authenticated user info

### 3. **Enhanced Auth Logging**
**File**: `apps/services/gateway/src/middleware/auth.ts`

When no session cookie is found, now logs:
- Which cookie name was expected (admin vs user)
- Raw cookie header value
- Whether it's an admin route

### 4. **Added VITE_GATEWAY_URL to Admin Dashboard**
**File**: `apps/dashboard/admin/.env.development`

Explicitly set `VITE_GATEWAY_URL=http://localhost:3004` for development.

## How to Test

### Step 1: Start Development Environment
```bash
cd /Users/devendrapratapsingh/personal/proofa-core
docker-compose up -d  # Start PostgreSQL and Redis
pnpm dev             # Start all services
```

### Step 2: Check Cookie Configuration
```bash
curl -s http://localhost:3004/v1/debug/cookies -H "Cookie: test=value"
```

You should see cookies being parsed correctly.

### Step 3: Test OAuth Login Flow
1. Navigate to admin dashboard: http://localhost:5174/login
2. Click "Login with Google"
3. Complete OAuth flow
4. Should be redirected back to admin dashboard

### Step 4: Check Session Cookie Was Set
After successful login, run:
```bash
curl -s http://localhost:3004/v1/debug/cookies --cookie-jar - -L http://localhost:5174
```

You should see `proofa_admin_session` cookie value.

### Step 5: Test Authenticated Request
```bash
# Get the session cookie value from browser DevTools -> Application -> Cookies
COOKIE="proofa_admin_session=<value_from_browser>"

curl -s http://localhost:3004/v1/debug/auth-status \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" | jq
```

This should return 200 with user info, not 401.

### Step 6: Test Admin Projects Endpoint
If debug endpoints work, try the actual projects endpoint:
```bash
curl -s http://localhost:3004/v1/admin/projects \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf_from_cookie>" | jq
```

Should return 200 with projects list, not 401.

## Expected Behavior After Fix

1. ✅ OAuth login succeeds
2. ✅ Session cookie is set with `Set-Cookie: proofa_admin_session=...`
3. ✅ Browser sends cookie with subsequent requests
4. ✅ Gateway middleware validates cookie
5. ✅ Gateway proxies request to Core with `X-User-Id` header
6. ✅ Core service authenticates and returns data
7. ✅ No 401 errors

## Troubleshooting

If still getting 401 after these changes:

### Check 1: Are cookies being sent?
Open browser DevTools → Network tab → Click on any `/v1/admin/*` request → Headers → Scroll to Cookies section. Should see `proofa_admin_session`.

### Check 2: Is the cookie value correct?
The cookie value should be `<session_id>.<hmac_signature>` (two parts separated by a dot).

### Check 3: Check Gateway logs
```bash
# Start with DEBUG logging
LOG_LEVEL=debug pnpm dev
```

Look for "Auth middleware" logs showing:
- Cookie found
- Session exchanged with Core
- Auth context set

### Check 4: Check browser CORS errors
In DevTools → Console, look for CORS errors. Should see none with the current configuration.

### Check 5: Verify environment variables
Ensure `.env.local` in workspace root has:
```
NODE_ENV=development
COOKIE_DOMAIN=localhost
GATEWAY_PUBLIC_URL=http://localhost:3004
ADMIN_DASHBOARD_URL=http://localhost:5174
CORE_URL=http://localhost:3003
```

## Architecture Reminder

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Dashboard (http://localhost:5174)                      │
│ Makes: fetch(/v1/admin/projects, { credentials: 'include' }) │
└──────────────────┬──────────────────────────────────────────┘
                   │ Sends Cookie: proofa_admin_session=...
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Gateway (http://localhost:3004) - authMiddleware             │
│ 1. Reads proofa_admin_session cookie                          │
│ 2. Exchanges with Core /v1/auth/exchange                      │
│ 3. Gets user info back                                        │
│ 4. Sets auth context                                          │
│ 5. Proxies to Core with X-User-Id header                      │
└──────────────────┬──────────────────────────────────────────┘
                   │ Sends X-User-Id: USER0...
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Core Service (http://localhost:3003) - /v1/admin/projects    │
│ 1. Receives X-User-Id header                                 │
│ 2. Looks up user from database                               │
│ 3. Returns projects for user                                 │
└─────────────────────────────────────────────────────────────┘
```

## Files Modified

1. `apps/services/gateway/src/routes/auth.ts` - Fixed localhost cookie domain handling
2. `apps/services/gateway/src/routes/debug.ts` - Added debug endpoints (NEW)
3. `apps/services/gateway/src/middleware/auth.ts` - Enhanced logging
4. `apps/services/gateway/src/index.ts` - Registered debug routes
5. `apps/dashboard/admin/.env.development` - Added VITE_GATEWAY_URL

## Next Steps

1. Rebuild: `pnpm build`
2. Start dev: `pnpm dev`
3. Test login flow
4. Verify no 401 errors when accessing admin projects
5. If issues persist, run debug endpoints to capture actual error details

