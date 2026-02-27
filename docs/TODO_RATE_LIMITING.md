# TODO: Rate Limiting — Security Fixes

**Priority**: 🟡 High (blocks v1 release)  
**Effort**: ~1 day  
**Owner**: @devendra

---

## Overview

Rate limiting middleware exists and uses Redis sliding window, but has security issues that allow bypass in failure scenarios.

---

## Tasks

### 1. Fix: Rate Limiter Fails Open on Redis Errors
**Severity**: 🟡 High  
**File**: `apps/services/gateway/src/middleware/rateLimit.ts:94`  
**Status**: ⬜ Not Started

**Problem**: The `catch` block allows all requests when Redis is down. This means Redis failure = unlimited brute force on auth endpoints.

**Current Code**:
```typescript
} catch (error) {
    // Don't block requests if rate limiting fails
    log.error({ err: error }, "Rate limiting error, allowing request");
    await next();
    return;
}
```

**Fix**: Fail closed on sensitive auth endpoints, fail open on others:
```typescript
} catch (error) {
    const path = c.req.path;
    const isSensitive = path.startsWith("/v1/auth") || 
                        path.startsWith("/v1/email") ||
                        path.includes("/login");
    
    if (isSensitive) {
        log.error({ err: error, path }, "Rate limit Redis failure on auth endpoint — blocking request");
        return c.json({ error: "Service temporarily unavailable" }, 503);
    }
    
    log.error({ err: error, path }, "Rate limit Redis failure — allowing request");
    await next();
    return;
}
```

**Effort**: 30 minutes

---

### 2. Fix: INCR + EXPIRE Not Atomic
**Severity**: 🟡 High  
**File**: `apps/services/gateway/src/middleware/rateLimit.ts:47-49`  
**Status**: ⬜ Not Started

**Problem**: Two separate Redis commands. If server crashes between INCR and EXPIRE, the key persists forever without a TTL, permanently blocking the user.

**Current Code**:
```typescript
const current = await cache.increment(key, 1);
if (current === 1) {
    await cache.setTTL(key, windowSeconds);
}
```

**Fix**: Use a Lua script executed atomically on Redis:
```typescript
// Add to @proofa/cache — new atomic method
const RATE_LIMIT_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  local ttl = redis.call('TTL', KEYS[1])
  return {current, ttl}
`;

// In rate limit middleware:
const [current, ttl] = await cache.evalScript(RATE_LIMIT_SCRIPT, [key], [windowSeconds]);
```

**Alternative** (simpler, if Lua not supported): Use `SET NX EX` pattern with a second key.

**Effort**: 2 hours (includes adding `evalScript` to cache package if needed)

---

### 3. Fix: IP Spoofing via Trusted Headers
**Severity**: 🟡 Medium  
**File**: `apps/services/gateway/src/middleware/rateLimit.ts:107`  
**Status**: ⬜ Not Started

**Problem**: Unconditionally trusts `cf-connecting-ip` and `x-forwarded-for`. Behind a non-trusted proxy, attackers can spoof any IP.

**Current Code**:
```typescript
function getClientIp(c: Context): string | null {
    const cfConnectingIp = c.req.header("cf-connecting-ip");
    if (cfConnectingIp) return cfConnectingIp;
    const xForwardedFor = c.req.header("x-forwarded-for");
    if (xForwardedFor) {
        const firstIp = xForwardedFor.split(",")[0];
        return firstIp ? firstIp.trim() : null;
    }
    // ...
}
```

**Fix**: Add `TRUST_PROXY` config and only trust proxy headers when configured:
```typescript
function getClientIp(c: Context): string | null {
    // Only trust proxy headers if explicitly configured
    if (env.TRUST_PROXY) {
        const cfConnectingIp = c.req.header("cf-connecting-ip");
        if (cfConnectingIp) return cfConnectingIp;
        
        const xForwardedFor = c.req.header("x-forwarded-for");
        if (xForwardedFor) {
            const firstIp = xForwardedFor.split(",")[0];
            return firstIp ? firstIp.trim() : null;
        }
    }
    
    // Direct connection IP (Node.js)
    // Hono doesn't expose raw socket, use x-real-ip as fallback
    const xRealIp = c.req.header("x-real-ip");
    if (xRealIp) return xRealIp;
    
    return null;
}
```

**Config**: Add `TRUST_PROXY=true` to `.env.example` with comment explaining when to use it.

**Effort**: 30 minutes

---

### 4. Apply Rate Limits to Appropriate Routes
**Severity**: 🟡 High  
**File**: `apps/services/gateway/src/index.ts`  
**Status**: ⬜ Not Started

**Problem**: Rate limiting middleware exists but may not be applied to all critical routes.

**Recommended Limits**:
```typescript
// Auth endpoints — strict
app.use('/v1/auth/login', rateLimitMiddleware({ maxRequests: 10, windowSeconds: 300 }));
app.use('/v1/auth/start', rateLimitMiddleware({ maxRequests: 30, windowSeconds: 300 }));

// Email/OTP — very strict
app.use('/v1/email/*', rateLimitMiddleware({ maxRequests: 5, windowSeconds: 60 }));

// Admin endpoints — moderate
app.use('/v1/admin/*', rateLimitMiddleware({ maxRequests: 100, windowSeconds: 300 }));

// User endpoints — moderate
app.use('/me/*', rateLimitMiddleware({ maxRequests: 100, windowSeconds: 300 }));
```

**Effort**: 1 hour

---

### 5. Dev Mode: Use Higher Thresholds Instead of Disabling
**Severity**: 🟢 Low  
**File**: `apps/services/gateway/src/middleware/rateLimit.ts:34-36`  
**Status**: ⬜ Not Started

**Problem**: Completely disables rate limiting in dev. Makes it impossible to test rate limiting locally.

**Current Code**:
```typescript
if (env.IS_DEVELOPMENT) {
    await next();
    return;
}
```

**Fix**: Use high thresholds in dev instead of bypassing entirely:
```typescript
if (env.IS_DEVELOPMENT) {
    // Use generous limits in development for testing
    const devLimits = { maxRequests: maxRequests * 100, windowSeconds };
    // ... proceed with dev limits instead of skipping
}
```

*Note: Per copilot-instructions.md, rate limiting is disabled in dev for DX. This is the lowest priority item — consider keeping current behavior but documenting it.*

**Effort**: 30 minutes

---

## Implementation Order

```
Day 1:
  1. Fix fail-open behavior — 30 min
  2. Fix atomic INCR+EXPIRE — 2 hours
  3. Fix IP spoofing — 30 min
  4. Apply rate limits to routes — 1 hour
  5. (Optional) Dev mode thresholds — 30 min
```

---

## Definition of Done

- [ ] Rate limiter fails closed on auth/email endpoints when Redis is down
- [ ] INCR + EXPIRE is atomic (Lua script or equivalent)
- [ ] Proxy headers only trusted when `TRUST_PROXY=true`
- [ ] Rate limits applied to all critical routes
- [ ] All changes pass TypeScript compilation
- [ ] Manual test: rate limiting works as expected
