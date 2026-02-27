# TODO: Authentication Flows — Security Fixes

**Priority**: 🔴 Critical (blocks v1 release)  
**Effort**: ~3.5 days  
**Owner**: @devendra

---

## Overview

The OAuth authentication flow works end-to-end but has critical security gaps identified in the audit. These must be fixed before v1 release.

---

## Tasks

### 1. Apply `s2sMiddleware` to ALL Core Service Routes
**Severity**: 🔴 Critical  
**File**: `apps/services/core/src/index.ts`  
**Status**: ⬜ Not Started

**Problem**: The `s2sMiddleware` exists (`core/src/middleware/s2s.ts`) with timing-safe comparison, but **is never applied** to any route. Anyone who can reach the Core service network can call any endpoint — grant licenses, manage projects, create users, etc.

**Current Code** (`core/src/index.ts:44-49`):
```typescript
// No middleware applied — all routes are publicly accessible
app.route("/v1/auth", authRoutes);
app.route("/v1/billing", billingRoutes);
app.route("/v1/email", emailRoutes);
app.route("/v1/license", licenseRoutes);
app.route("/v1/admin", adminRoutes);
```

**Fix**:
```typescript
import { s2sMiddleware } from "./middleware/s2s";

// Apply S2S middleware to all routes that the Gateway calls
app.use("/v1/auth/*", s2sMiddleware);
app.use("/v1/billing/*", s2sMiddleware);
app.use("/v1/email/*", s2sMiddleware);
app.use("/v1/license/*", s2sMiddleware);
app.use("/v1/admin/*", s2sMiddleware);

app.route("/v1/auth", authRoutes);
app.route("/v1/billing", billingRoutes);
app.route("/v1/email", emailRoutes);
app.route("/v1/license", licenseRoutes);
app.route("/v1/admin", adminRoutes);
```

**Exception**: The `/v1/auth/start` and `/v1/auth/callback/:provider` routes are user-facing (browser redirects). These need to be exempted from S2S middleware while still protecting `/v1/auth/exchange`.

**Refined Fix**: Apply S2S selectively:
- `/v1/auth/exchange` — ✅ S2S (Gateway-only)
- `/v1/auth/start` — ❌ No S2S (user browser redirects here)
- `/v1/auth/callback/:provider` — ❌ No S2S (OAuth provider redirects here)
- `/v1/email/*` — ✅ S2S (Gateway-only)
- `/v1/billing/*` — ✅ S2S (Gateway-only)
- `/v1/license/*` — ✅ S2S (Gateway-only)
- `/v1/admin/*` — ✅ S2S (Gateway-only)

**Effort**: 2 hours

---

### 2. Fix OTP Generation — Use Cryptographic Random
**Severity**: 🔴 Critical  
**File**: `apps/packages/auth/src/crypto.ts:8`  
**Status**: ⬜ Not Started

**Problem**: `Math.random()` is predictable. An attacker who determines the PRNG state can predict future OTPs.

**Current Code**:
```typescript
export function generateOTP(): string {
    return Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(OTP_LENGTH, "0");
}
```

**Fix**:
```typescript
import * as crypto from "node:crypto";

export function generateOTP(): string {
    return crypto.randomInt(0, 1000000)
        .toString()
        .padStart(OTP_LENGTH, "0");
}
```

**Effort**: 15 minutes

---

### 3. Fix OTP Hashing — Use Per-User Random Salt
**Severity**: 🔴 Critical  
**File**: `apps/packages/auth/src/crypto.ts:19`  
**Status**: ⬜ Not Started

**Problem**: Static salt `"proofa-otp-salt"` for ALL users. With only 1M possible OTPs, an attacker can precompute a full rainbow table in seconds.

**Current Code**:
```typescript
export function hashOTP(otp: string): string {
    return crypto.pbkdf2Sync(otp, "proofa-otp-salt", 100000, 64, "sha256").toString("hex");
}

export function verifyOTP(otp: string, hash: string): boolean {
    const otpHash = hashOTP(otp);
    return otpHash === hash;
}
```

**Fix**: Return salt alongside hash; verify by extracting salt.
```typescript
export function hashOTP(otp: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(otp, salt, 100000, 64, "sha256").toString("hex");
    return `${salt}:${hash}`;
}

export function verifyOTP(otp: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const otpHash = crypto.pbkdf2Sync(otp, salt, 100000, 64, "sha256").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(otpHash), Buffer.from(hash));
}
```

**Effort**: 30 minutes

---

### 4. Fix Timing-Unsafe Comparisons
**Severity**: 🟡 High  
**Files**: Multiple  
**Status**: ⬜ Not Started

**Problem**: All secret comparisons use `===` instead of `crypto.timingSafeEqual`, enabling timing side-channel attacks.

**Locations**:
| File | Line | Context |
|------|------|---------|
| `packages/auth/src/crypto.ts` | 35 | OTP hash comparison |
| `packages/auth/src/crypto.ts` | 48 | S2S token comparison |
| `packages/auth/src/session.ts` | 70 | Session HMAC verification |
| `gateway/src/middleware/auth.ts` | 171 | Token comparison |
| `gateway/src/middleware/s2s.ts` | 13 | S2S token validation |

**Note**: The Core's `s2s.ts` already uses `timingSafeEqual` ✅. Fix the others.

**Fix for `session.ts` (verifySessionId)**:
```typescript
export function verifySessionId(signed: string): string {
    const [sessionId, hmac] = signed.split(".");
    if (!sessionId || !hmac) throw new Error("Invalid session format");

    const secret = getSessionSecret();
    const expectedHmac = crypto.createHmac("sha256", secret).update(sessionId).digest("hex");

    // Constant-time comparison
    if (expectedHmac.length !== hmac.length) throw new Error("Session signature invalid");
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
        throw new Error("Session signature invalid");
    }

    return sessionId;
}
```

**Fix for `crypto.ts` (validateS2SToken)**:
```typescript
export function validateS2SToken(token: string, expectedToken: string): boolean {
    if (token.length !== expectedToken.length) return false;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}
```

**Fix for `gateway/src/middleware/auth.ts` (s2sAuthMiddleware)**:
```typescript
// Replace: if (!token || !expectedToken || token !== expectedToken)
// With:
if (!token || !expectedToken || token.length !== expectedToken.length ||
    !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
    return c.json({ error: "Unauthorized" }, 401);
}
```

**Effort**: 1 hour

---

### 5. Validate `redirect_uri` Against App Allowlist
**Severity**: 🔴 Critical  
**File**: `apps/services/core/src/routes/v1/auth/index.ts` — `/start` route  
**Status**: ⬜ Not Started

**Problem**: No validation of redirect_uri. An attacker can set `redirect_uri=https://evil.com/steal` to capture the auth code after the user authenticates.

**Current Code**: The `redirect_uri` is accepted without validation and stored in Redis state.

**Fix**: Query the app's allowed redirect URIs and validate against them.
```typescript
// In the /start route, after validating provider:
if (appId) {
    const db = getDb();
    const app = await appQueries.findByPublicId(db, appId);
    if (!app) {
        return c.json({ error: "Invalid app_id" }, 400);
    }
    
    const allowedUris = (app.security_settings as any)?.redirectUris || [];
    if (allowedUris.length > 0 && !allowedUris.includes(redirectUri)) {
        return c.json({ error: "Invalid redirect_uri" }, 400);
    }
}
```

**Effort**: 2 hours

---

### 6. Validate `audience` Parameter Server-Side
**Severity**: 🟡 High  
**File**: `apps/services/gateway/src/routes/auth.ts:53-82`  
**Status**: ✅ Resolved

**Problem**: User can pass `?audience=admin` to get admin session cookie without verification.

**Resolution**: Replaced `is_admin` flag with session entitlements. Admin sessions now carry project-scoped entitlements built from `project_members` table. Getting an admin session cookie without project memberships results in empty entitlements, so no resources are accessible.

**Effort**: Completed as part of entitlements implementation.

---

### 7. Add Google JWT Signature Verification
**Severity**: 🟡 High  
**File**: `apps/packages/auth/src/adapters/google.ts:9-30`  
**Status**: ⬜ Not Started

**Problem**: `decodeJWT()` decodes the JWT payload WITHOUT verifying the signature. Comment says "In production, you should verify the JWT signature."

**Current Code**:
```typescript
function decodeJWT(token: string): Record<string, any> {
    const parts = token.split('.');
    const payload = parts[1];
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
}
```

**Fix**: Install `jose` library and verify JWT signature + audience:
```bash
cd apps/packages/auth && pnpm add jose
```
```typescript
import * as jose from 'jose';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let googleJwks: jose.JSONWebKeySet | null = null;

async function verifyGoogleIdToken(
    idToken: string,
    clientId: string
): Promise<Record<string, unknown>> {
    const jwks = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
    const { payload } = await jose.jwtVerify(idToken, jwks, {
        audience: clientId,
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
    });
    return payload as Record<string, unknown>;
}
```

Then use in `fetchUserProfile()`:
```typescript
if (idTokenOrAccessToken.includes('.')) {
    const decoded = await verifyGoogleIdToken(idTokenOrAccessToken, this.clientId);
    // ... extract sub, email, name, picture
}
```

**Effort**: 3 hours

---

### 8. Fix `email_verified` Not Checked for Google OAuth
**Severity**: 🟡 Medium  
**File**: `apps/packages/auth/src/adapters/google.ts`  
**Status**: ⬜ Not Started

**Problem**: Google returns `email_verified` in the JWT payload but the code doesn't check it. Could allow unverified emails.

**Fix**: After verifying JWT, check `email_verified`:
```typescript
const decoded = await verifyGoogleIdToken(idTokenOrAccessToken, this.clientId);
if (decoded['email_verified'] !== true) {
    throw new Error('Google email not verified');
}
```

**Effort**: 15 minutes (piggyback on task 7)

---

## Implementation Order

```
Day 1 (Quick Wins):
  1. ✅ Fix OTP generation (crypto.randomInt) — 15 min
  2. ✅ Fix OTP hashing (per-user salt) — 30 min
  3. ✅ Fix timing-unsafe comparisons (5 locations) — 1 hour
  4. ✅ Apply s2sMiddleware to Core routes — 2 hours

Day 2 (Auth Security):
  5. ✅ Validate redirect_uri — 2 hours
  6. ✅ Validate audience param — 2 hours
  7. ✅ Google JWT verification (jose) — 3 hours
  8. ✅ Check email_verified — 15 min
```

---

## Definition of Done

- [ ] All OTPs generated with `crypto.randomInt()`
- [ ] OTP hashes use per-user random salt
- [ ] All secret comparisons use `crypto.timingSafeEqual()`
- [ ] Core routes require S2S authentication (except browser-facing auth routes)
- [ ] redirect_uri validated against app allowlist
- [ ] audience param validated against user's actual admin status
- [ ] Google id_token JWT signature verified with `jose`
- [ ] Google email_verified checked before accepting email
- [ ] All changes pass TypeScript compilation
- [ ] Manual test: OAuth flow still works end-to-end
