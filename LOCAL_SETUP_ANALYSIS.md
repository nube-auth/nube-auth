# Local Setup Analysis - Production APIs Being Called Instead of Local

## Problem Summary
The application is configured to call **production APIs** (`https://api.proofa.sh`, `https://auth.proofa.sh`) by default instead of the local development servers (`localhost:3003`, `localhost:3004`) even though all local ports are defined in docker-compose.yml and DEVELOPMENT.md.

---

## Local Services vs Default Configuration

### Available Local Services (docker-compose.yml)
| Service | Port | Status |
|---------|------|--------|
| LibSQL Database | 8080 | ✅ Defined |
| Redis Cache | 6379 | ✅ Defined |
| Redis REST API | 8079 | ✅ Defined |
| Redis Commander | 8081 | ✅ Defined (debug profile) |
| Mailpit Web UI | 8025 | ✅ Defined (email profile) |
| Mailpit SMTP | 1025 | ✅ Defined (email profile) |

### Available Local App Services (DEVELOPMENT.md)
| Service | Port | Status |
|---------|------|--------|
| User Dashboard | 3001 | ✅ Defined |
| Admin Dashboard | 3002 | ✅ Defined |
| Core API | 3003 | ✅ Defined |
| Gateway API | 3004 | ✅ Defined |
| Home Page | 4321 | ✅ Defined |
| Documentation | 4322 | ✅ Defined |

---

## Current Configuration Issues

### 1. **Admin Dashboard** (`apps/dashboard/admin/`)

#### Problem in `config.ts`
```typescript
export const config = {
	homeUrl: import.meta.env.VITE_HOME_URL || "https://proofa.sh",
	docsUrl: import.meta.env.VITE_DOCS_URL || "https://docs.proofa.com",
	coreUrl: import.meta.env.VITE_CORE_URL || "https://api.proofa.sh",  // ❌ PRODUCTION
};
```

#### Problem in `vite.config.ts`
```typescript
define: {
	"import.meta.env.VITE_GATEWAY_URL": JSON.stringify(
		process.env.VITE_GATEWAY_URL || "https://api.proofa.sh"  // ❌ PRODUCTION
	),
	"import.meta.env.VITE_CORE_URL": JSON.stringify(
		process.env.VITE_CORE_URL || "https://auth.proofa.sh"  // ❌ PRODUCTION
	),
	// ...
},
```

#### Problem in `hooks/api.ts`
```typescript
const client = new ProofaClient({
	gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004",  // ✅ Correct fallback
});

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004";  // ✅ Correct fallback
```

**Issue:** The `vite.config.ts` define block runs at build time and **overrides** the fallbacks in `hooks/api.ts` because Vite replaces `import.meta.env.VITE_*` with the hardcoded string at build time.

---

### 2. **User Dashboard** (`apps/dashboard/user/`)

#### Problem in `config.ts`
```typescript
export const config = {
	homeUrl: import.meta.env.VITE_HOME_URL || "https://proofa.sh",
	docsUrl: import.meta.env.VITE_DOCS_URL || "https://docs.proofa.sh",
	gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "https://api.proofa.sh",  // ❌ PRODUCTION
};
```

#### Problem in `vite.config.ts`
```typescript
define: {
	"import.meta.env.VITE_GATEWAY_URL": JSON.stringify(
		process.env.VITE_GATEWAY_URL || "https://api.proofa.sh"  // ❌ PRODUCTION
	),
	// ...
},
```

**Same issue as Admin Dashboard:** Vite's define block hardcodes production URLs.

---

### 3. **React Package** (`packages/react/`)

The `ProofaProvider` expects the `gatewayUrl` to be passed in config. It correctly defaults to localhost in the User Dashboard's App.tsx, but the Vite define block overrides this.

---

## Why This Happens

### Vite's Build-Time Replacement
Vite's `define` configuration in `vite.config.ts` replaces `import.meta.env.*` values at **build time**, not runtime. This means:

1. **Build step:** Vite sees `process.env.VITE_GATEWAY_URL || "https://api.proofa.sh"`
2. **Replacement:** Every occurrence of `import.meta.env.VITE_GATEWAY_URL` becomes `"https://api.proofa.sh"` (a string literal)
3. **Runtime:** The fallback in your code is never reached because the string is already replaced

This creates a **priority hierarchy:**
1. Environment variable at build time → **WINS**
2. Vite define fallback → Used if env var not set
3. Code-level fallback (in hooks/config) → Never reached

---

## Solution: Fix Local Development Setup

### Option 1: Set Environment Variables (Recommended for Local Dev)

Create or update `.env.local` with:
```bash
VITE_GATEWAY_URL=http://localhost:3004
VITE_CORE_URL=http://localhost:3003
VITE_HOME_URL=http://localhost:4321
VITE_DOCS_URL=http://localhost:4322
```

Then rebuild:
```bash
pnpm install
pnpm build  # or just run pnpm dev
```

### Option 2: Fix Vite Config Default Values (Recommended for Team)

Update `apps/dashboard/admin/vite.config.ts`:
```typescript
define: {
	"import.meta.env.VITE_GATEWAY_URL": JSON.stringify(
		process.env.VITE_GATEWAY_URL || "http://localhost:3004"  // ✅ LOCAL
	),
	"import.meta.env.VITE_CORE_URL": JSON.stringify(
		process.env.VITE_CORE_URL || "http://localhost:3003"  // ✅ LOCAL
	),
	"import.meta.env.VITE_HOME_URL": JSON.stringify(
		process.env.VITE_HOME_URL || "http://localhost:4321"  // ✅ LOCAL
	),
	"import.meta.env.VITE_DOCS_URL": JSON.stringify(
		process.env.VITE_DOCS_URL || "http://localhost:4322"  // ✅ LOCAL
	),
},
```

Update `apps/dashboard/user/vite.config.ts` similarly.

Update `apps/dashboard/admin/config.ts`:
```typescript
export const config = {
	homeUrl: import.meta.env.VITE_HOME_URL || "http://localhost:4321",
	docsUrl: import.meta.env.VITE_DOCS_URL || "http://localhost:4322",
	coreUrl: import.meta.env.VITE_CORE_URL || "http://localhost:3003",
};
```

Update `apps/dashboard/user/config.ts`:
```typescript
export const config = {
	homeUrl: import.meta.env.VITE_HOME_URL || "http://localhost:4321",
	docsUrl: import.meta.env.VITE_DOCS_URL || "http://localhost:4322",
	gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004",
};
```

### Option 3: Add .env.example with Local Defaults

Create `.env.example` (git-tracked):
```bash
# Local Development Configuration
VITE_GATEWAY_URL=http://localhost:3004
VITE_CORE_URL=http://localhost:3003
VITE_HOME_URL=http://localhost:4321
VITE_DOCS_URL=http://localhost:4322
```

Document in DEVELOPMENT.md:
```bash
# Copy environment file
cp .env.example .env.local
```

---

## Verification Checklist

After applying the fix, verify:

- [ ] Start all services: `pnpm dev`
- [ ] Admin Dashboard at `http://localhost:3002`
- [ ] User Dashboard at `http://localhost:3001`
- [ ] Check browser Network tab - should see requests to `localhost:3004` (Gateway)
- [ ] Check Core logs - should see requests from Gateway
- [ ] Login should work with local OAuth
- [ ] Projects CRUD should work locally

---

## Current Workaround (If Not Fixed)

Users must manually set env vars before running:
```bash
export VITE_GATEWAY_URL=http://localhost:3004
export VITE_CORE_URL=http://localhost:3003
export VITE_HOME_URL=http://localhost:4321
export VITE_DOCS_URL=http://localhost:4322

pnpm dev  # Now uses localhost
```

---

## Recommended Next Steps

1. **Immediate:** Apply Option 2 (Fix Vite config defaults)
2. **Communication:** Update DEVELOPMENT.md with this explanation
3. **Automation:** Add `.env.example` to repository
4. **CI/CD:** Ensure build process sets correct URLs for production
5. **Documentation:** Add troubleshooting section about "API calls hitting production"
