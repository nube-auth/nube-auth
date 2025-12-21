# Technical Debt Tracker

**Last Updated:** December 21, 2025

This document tracks known technical debt, shortcuts taken during development, and planned improvements.

---

## Summary

| Category | Items | Priority |
|----------|-------|----------|
| Security | 0 | - |
| Code Quality | 3 | P2-P3 |
| Infrastructure | 2 | P3-P4 |
| Testing | 1 | P2 |

---

## Active Technical Debt

### 1. Missing Test Coverage

**Priority:** P2  
**Effort:** High  
**Status:** Not Started

**Issue:**
No automated tests exist for the codebase. Critical auth flows should have integration tests.

**Recommended Fix:**
1. Add Vitest for unit tests
2. Add integration tests for OAuth flow
3. Add integration tests for OTP flow
4. Target 80% coverage on critical paths

**Files Affected:**
- All `apps/` and `packages/`

---

### 2. Hardcoded Development Secrets in Examples

**Priority:** P3  
**Effort:** Low  
**Status:** Documented

**Issue:**
`.env.example` and `.env.local.example` contain placeholder secrets that could accidentally be used in production.

**Current State:**
```env
JWT_SECRET=dev-jwt-secret-for-local-development-only-32-chars
SESSION_SECRET=dev-session-secret-for-local-development-only-32-chars
```

**Recommended Fix:**
Add startup validation that rejects known development secrets in production:
```typescript
if (process.env.NODE_ENV === 'production' && 
    process.env.JWT_SECRET?.includes('dev-')) {
  throw new Error('Development secrets cannot be used in production');
}
```

**Files Affected:**
- `apps/core/src/index.ts`
- `apps/gateway/src/index.ts`

---

### 3. Manual Process Management in Development

**Priority:** P4  
**Effort:** Medium  
**Status:** Accepted

**Issue:**
No process manager for development. Services must be started manually in separate terminals.

**Current State:**
Developers run `pnpm dev` or start each service individually.

**Potential Improvements:**
1. Add PM2 for process management
2. Create unified dev script with concurrently
3. Consider adding Node.js apps to Docker Compose

**Decision:**
Accepted for now. Turbo handles multi-service orchestration adequately for development.

---

### 4. Logging Strategy Incomplete

**Priority:** P3  
**Effort:** Medium  
**Status:** Partially Done

**Issue:**
Pino logger is set up but not consistently used across all services. Some routes still use `console.log`.

**Recommended Fix:**
1. Audit all `console.log` usages
2. Replace with structured `logger.info/error/debug`
3. Add request correlation IDs
4. Configure log levels per environment

**Files Affected:**
- Various route files in `apps/core/` and `apps/gateway/`

---

### 5. No OpenAPI/Swagger Documentation

**Priority:** P3  
**Effort:** Medium  
**Status:** Not Started

**Issue:**
API endpoints are documented manually in markdown. No machine-readable API spec.

**Recommended Fix:**
1. Add `@hono/zod-openapi` package
2. Generate OpenAPI spec from Zod schemas
3. Add Swagger UI endpoint for interactive docs

**Files Affected:**
- `apps/core/src/routes/`
- `apps/gateway/src/routes/`

---

## Resolved Technical Debt

### ✅ OAuth Type Assertions Fixed (Dec 21, 2025)

**Was:** OAuth adapters used `as any` type assertions for API responses.  
**Fix:** Added Zod schemas for OAuth response validation.  
**Files:** `packages/auth/src/schemas/oauth.ts`

### ✅ OAuth State Validation Added (Dec 21, 2025)

**Was:** No CSRF protection on OAuth state parameter.  
**Fix:** Created state management with auto-expiring, single-use tokens.  
**Files:** `packages/auth/src/state.ts`

### ✅ Port Configuration Centralized (Dec 21, 2025)

**Was:** Ports hardcoded across multiple files.  
**Fix:** Centralized in `packages/shared/src/constants/ports.ts`  
**Ports:** User=3001, Admin=3002, Core=3003, Gateway=3004, Home=4321

### ✅ ESM Module Resolution Fixed (Dec 21, 2025)

**Was:** Import errors due to missing `.js` extensions in ESM.  
**Fix:** Added `.js` extensions and `"type": "module"` to all packages.

### ✅ Environment Loading Fixed (Dec 21, 2025)

**Was:** Apps not loading `.env` files.  
**Fix:** Added `dotenv-cli` to dev scripts.

### ✅ S2S Token Validation Fixed (Dec 21, 2025)

**Was:** S2S middleware was a stub, not validating tokens.  
**Fix:** Implemented proper token validation against environment variable.

---

## Adding New Technical Debt

When documenting new technical debt, include:

1. **Priority:** P1 (Critical) to P4 (Nice-to-have)
2. **Effort:** Low / Medium / High
3. **Status:** Not Started / In Progress / Accepted / Resolved
4. **Issue:** Clear description of the problem
5. **Recommended Fix:** Specific steps to resolve
6. **Files Affected:** List of files to modify

---

## Review Schedule

Technical debt should be reviewed:
- Weekly during active development
- Before each major release
- When onboarding new developers
