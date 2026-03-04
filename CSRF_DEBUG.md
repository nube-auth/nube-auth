# CSRF Token Invalid Error - Debugging Guide

## Problem Description
Getting `{error: "CSRF token invalid"}` on almost all APIs (POST/PUT/PATCH/DELETE requests).

## What We've Added
Enhanced debug logging to help identify the root cause:

1. **CSRF Module Logging** (`apps/dashboard/admin/src/lib/csrf.ts` and user equivalent):
   - Warns if CSRF token cookie is missing
   - Logs token preview when sending requests
   - Shows token length for validation

2. **API Layer Logging** (`apps/dashboard/admin/src/hooks/api.ts`):
   - Logs all request headers before sending
   - Logs response status and error details
   - Only active in development mode (`import.meta.env.DEV`)

## Debugging Steps

### 1. Check Browser Console (DevTools → Console)
When making a POST/PUT/PATCH/DELETE request, you should see:

```
[CSRF] Using token: abc123def456... (length: 64)
[API] POST /v1/admin/... CSRF headers: {X-Proofa-CSRF-Token: "abc123..."} All headers: {...}
```

**If you see `[CSRF] No CSRF token - headers will be empty`:**
- The `proofa_csrf_token` cookie is not set
- Check the login response to verify the cookie is being set
- Check browser cookie settings (DevTools → Application → Cookies)

### 2. Check Browser Cookies  (DevTools → Application → Cookies)
Look for `proofa_csrf_token` cookie:
- Should contain a long alphanumeric value (typically 64 characters)
- Domain should match your origin (localhost or proofa.sh)
- Path should be `/`
- HttpOnly should be **false** (so JavaScript can read it)
- SameSite should be `Lax` or `None`
- Secure should be true (if HTTPS) or false (if HTTP/localhost)

### 3. Check Network Tab (DevTools → Network)
Look at POST/PUT/PATCH/DELETE request headers:

**Request Headers should include:**
```
X-Proofa-CSRF-Token: <token-value>
Cookie: proofa_csrf_token=<same-token-value>; ...
```

**If missing:**
- Headers weren't merged properly
- Credentials weren't sent
- Browser isn't sending cookies with request

### 4. Check Server Logs (Gateway service)
The gateway CSRF middleware logs validation failures:
```
[WARN] CSRF token missing from header
[WARN] CSRF token cookie not found
[WARN] CSRF token mismatch (headerPreview: ..., cookiePreview: ...)
```

Compare with the browser console logs to isolate the issue.

## Common Causes

| Symptom | Cause | Solution |
|---------|-------|----------|
| Token not in cookies | Login response didn't set cookie | Check login endpoint, verify setCookie is working |
| Headers empty but token exists | CSRF function not called | Verify csrfHeaders() is invoked for POST/PATCH/DELETE |
| Headers sent but missing in request | pingpong not forwarding headers | Check pingpong wrapper forwards RequestOptions.headers |
| Token mismatch | Different values in header vs cookie | Cookie might have been updated since request was made |
| CSRF validation passes but still fails | Session not found or CSRF in session doesn't match | Check session storage and CSRF token in session metadata |

## Recent Changes (This Session)
- Changed user dashboard pingpong import from `@proofa/client` to `@proofa/auth`
- Both now use the same pingpong wrapper which forwards custom headers properly
- Verified pingpong-js library supports headers in RequestOptions

## Next Steps
1. Check browser console for CSRF debug logs during a failing API call
2. Share the console logs and network tab headers
3. Check server CSRF middleware logs
4. If token is missing: debug login flow
5. If token is empty/malformed: check CSRF token generation on server
