# Current Architecture Analysis

**Date:** January 10, 2026  
**Purpose:** Understanding the existing implementation before implementing missing endpoints

---

## Table of Contents
1. [Service Architecture](#service-architecture)
2. [Database Layer](#database-layer)
3. [Authentication Flow](#authentication-flow)
4. [Service Communication](#service-communication)
5. [Existing Admin Implementation](#existing-admin-implementation)
6. [Gateway Structure](#gateway-structure)
7. [Key Findings](#key-findings)

---

## 1. Service Architecture

### Services Overview
```
┌─────────────────────┐
│   User Dashboard    │  (Port 5173)
│   Admin Dashboard   │  (Port 5174)
└──────────┬──────────┘
           │ HTTP + Cookies
           ↓
┌─────────────────────┐
│   Gateway Service   │  (Port 3004)
│   - Routes          │
│   - Auth Middleware │
│   - Session Mgmt    │
└──────────┬──────────┘
           │ S2S Token
           ↓
┌─────────────────────┐
│   Core Service      │  (Port 3003)
│   - Business Logic  │
│   - DB Access       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   PostgreSQL + Redis│
└─────────────────────┘
```

### Service Responsibilities

#### Gateway Service (`apps/services/gateway/`)
- **Purpose:** Public-facing API, authentication, session management
- **Auth:** Cookie-based sessions (different cookies for user/admin)
- **Communication:** Proxies to Core service with S2S token
- **Files:**
  - `src/routes/auth.ts` - ✅ OAuth, login, logout (working)
  - `src/routes/me.ts` - ✅ User profile & sessions (working)
  - `src/routes/admin.ts` - ❌ All return 501
  - `src/routes/admin-billing.ts` - ❌ All return 501
  - `src/routes/payments.ts` - Status unknown

#### Core Service (`apps/services/core/`)
- **Purpose:** Business logic, database operations, internal APIs
- **Auth:** S2S token (`X-Proofa-Service-Token` header)
- **Database:** Direct access via Drizzle ORM
- **Files:**
  - `src/routes/v1/auth/` - ✅ OAuth exchange (working)
  - `src/routes/v1/admin/index.ts` - ⚠️  Partial (3 license routes + payment stubs)
  - `src/routes/v1/admin/providers.ts` - ⚠️  Returns 501 but with 200 status
  - `src/routes/v1/billing/` - Webhook handlers only
  - `src/routes/v1/email/` - Email verification
  - `src/routes/v1/license/` - License checks

---

## 2. Database Layer

### Package Structure
```
apps/packages/db/
├── src/
│   ├── schema.ts       # Drizzle table definitions
│   ├── queries.ts      # Query functions organized by entity
│   ├── index.ts        # Exports db client and queries
│   └── utils/jsonb.ts  # Atomic JSONB update utilities
```

### Available Query Modules

All queries are **already implemented** and exported:

```typescript
// From apps/packages/db/src/queries.ts
export const userQueries = {
  findById, findByPublicId, findByEmail,
  create, update
}

export const identityQueries = {
  findByProviderUserId, findByUserId, create
}

export const sessionQueries = {
  findById, findByPublicId, findByUserId, findActiveByUserId,
  create, updateLastSeen, updateLastSeenAndExpiry, revoke
}

export const projectQueries = {
  findById, findByPublicId, findByOwnerId, findByUserId,
  create, update, delete
}

export const projectMemberQueries = {
  findById, findByPublicId, findByProjectAndUser,
  findByProjectId, findByUserId,
  create, update, updateByPublicId,
  delete, deleteByPublicId
}

export const projectInvitationQueries = {
  findById, findByPublicId, findByProjectAndEmail,
  findActiveByEmail, findByProjectId,
  create, update, delete, accept
}

export const appQueries = {
  findById, findByPublicId, findByProjectId,
  create, update, delete,
  updateSecuritySettings,    // Atomic JSONB update
  updateAppTokens,            // Atomic JSONB update
  updatePlanSettings,         // Atomic JSONB update
  updateJsonbField,           // Atomic single field
  batchUpdateJsonbFields      // Atomic batch update
}

export const licenseQueries = {
  findById, findByPublicId, findByUserId, findByAppId,
  findByUserAndApp,
  create, upsert, update, delete, revoke
}

export const planQueries = {
  findById, findByPublicId, findByAppAndSlug,
  findActiveByAppId, findByAppId,
  create, update, delete
}

export const authCodeQueries = {
  findByCode, create, consume
}

export const emailVerificationQueries = {
  findByCode, create, verify, delete
}

export const auditLogQueries = {
  create, findByEntity
}

export const invitationQueries = {
  create, findByCode, accept, revoke,
  findPendingByEmail, findByAppId
}
```

### Database Schema

Key tables already exist:

```typescript
// Core entities
users                    // Platform users
identities              // OAuth provider links
sessions                // Core sessions (not app sessions)

// Projects & Teams
projects                // User projects
project_members         // Team members with roles
project_invitations     // Pending team invitations

// Apps & Plans
apps                    // Apps within projects (JSONB fields)
plans                   // Subscription plans
licenses                // User licenses

// Auth
auth_codes              // OAuth flow codes
email_verifications     // Email verification tokens

// Billing (may be partial)
payment_provider_configs
billing_purchases
billing_transactions
billing_webhooks
billing_refunds

// Other
invitations             // App invitations
audit_logs              // Audit trail
```

### JSONB Fields in Apps Table

The `apps` table uses JSONB for flexible configuration:

```typescript
apps = {
  // ... standard fields ...
  enabled_providers: jsonb,      // OAuth providers array
  app_tokens: jsonb,              // API keys & secrets
  security_settings: jsonb,       // Security config
  plan_settings: jsonb,           // Licensing config
  selected_payment_provider_id: integer
}
```

**Important:** The `appQueries` module has **atomic JSONB update methods** to prevent race conditions:
- `updateSecuritySettings()` - Atomic merge
- `updateAppTokens()` - Atomic merge  
- `updatePlanSettings()` - Atomic merge
- `updateJsonbField()` - Single path update
- `batchUpdateJsonbFields()` - Multiple paths

---

## 3. Authentication Flow

### Cookie-Based Sessions

Gateway uses **different cookies** for different audiences:

```typescript
// From gateway/src/routes/auth.ts
const USER_SESSION_COOKIE = "proofa_user_session";
const ADMIN_SESSION_COOKIE = "proofa_admin_session";

// Audience inference from:
// 1. ?audience=user|admin query param
// 2. Request origin/referer domain
// 3. Fallback heuristics
```

### Session Flow

1. **OAuth Start** (`GET /v1/auth/start`)
   ```
   User → Gateway → Core → OAuth Provider
   ```

2. **OAuth Callback** (`GET /v1/auth/callback`)
   ```
   OAuth Provider → Core → Gateway
   Core returns: session_id as "code"
   Gateway creates: new gateway session
   ```

3. **Session Storage**
   ```
   Core Session: PostgreSQL (sessions table)
   Gateway App Session: Redis (session:app:{id})
   ```

4. **Auth Middleware** (`gateway/src/middleware/auth.ts`)
   ```typescript
   1. Check cookie (proofa_user_session or proofa_admin_session)
   2. Parse signed cookie → gateway session ID
   3. Look up in Redis → get app session
   4. Extract Core session ID from metadata
   5. Exchange with Core → validate & get user info
   6. Store auth context in Hono context
   ```

### Auth Context Structure

```typescript
interface AuthContext {
  userId: string;        // User public ID
  email: string;
  name: string;
  sessionId: string;     // Gateway session ID
  appSessionId?: string; // Same as sessionId
  coreSessionId: string; // Core session ID (in metadata)
}

// Access in route handlers:
const auth = getAuth(c); // From context
```

---

## 4. Service Communication

### Gateway → Core Communication

#### Method 1: CoreClient (Primary)
```typescript
// gateway/src/lib/core-client.ts
class CoreClient {
  // Used by auth middleware
  async exchangeSession(sessionId: string): Promise<UserInfo | null>
  async getUserBySession(sessionId: string): Promise<User | null>
}

// Usage in auth middleware:
const coreSession = await coreClient.exchangeSession(coreSessionId);
```

#### Method 2: CoreService (Alternative)
```typescript
// gateway/src/services/coreService.ts
export const coreService = {
  async request<T>(config: CoreRequest): Promise<T>
  async exchangeToken(code, appId)
  async getLicense(appId)
  async getUser(userId)
  async updateUser(userId, data)
  async validateToken(token)
}
```

**Note:** Two similar clients exist - likely need consolidation

### S2S Authentication

All Core requests require service token:

```typescript
headers: {
  "X-Proofa-Service-Token": env.CORE_S2S_TOKEN
}
```

---

## 5. Existing Admin Implementation

### Core Service Admin Routes

Located in `apps/services/core/src/routes/v1/admin/index.ts`:

#### ✅ Working Routes (3)
```typescript
POST /v1/admin/license/grant
  - Grants license to user
  - Validates user & app exist
  - Creates/upserts license

GET /v1/admin/licenses/:userId
  - Get all licenses for a user

DELETE /v1/admin/licenses/:licenseId
  - Revoke a license (stub, returns success)
```

#### ⚠️  Stubbed Payment Routes (6)
```typescript
GET  /v1/admin/apps/:appId/payment/available
GET  /v1/admin/apps/:appId/payment/selected
POST /v1/admin/payment-providers
PATCH /v1/admin/payment-providers/:providerId
DELETE /v1/admin/payment-providers/:providerId
POST /v1/admin/apps/:appId/payment/select
```

All return success (200) but with empty data or 501 error messages.

### Gateway Admin Routes

Located in `apps/services/gateway/src/routes/admin.ts`:

#### ❌ ALL Routes Return 501

```typescript
// The entire admin routes module:
export const adminRoutes = new Hono();

adminRoutes.all("/*", (c) => {
  log.debug("Admin route (Phase 2 implementation pending)");
  return c.json({
    error: "Admin functionality pending Phase 2 implementation",
  }, 501);
});
```

**This is why the admin dashboard doesn't work!**

---

## 6. Gateway Structure

### Middleware Chain

```typescript
// gateway/src/index.ts
app.use("*", secureHeaders())
app.use("*", cors({ credentials: true, ... }))
app.use("*", httpLogger)
app.use("*", authMiddleware)  // Validates sessions
app.use("/v1/admin/*", csrfProtection)  // CSRF for state changes

// Rate limiting per route group:
app.use("/v1/auth/status", rateLimitPresets.public)
app.use("/v1/auth/*", rateLimitPresets.auth)
app.use("/v1/admin/*", rateLimitPresets.api)
app.use("/v1/me/*", rateLimitPresets.api)
```

### Route Mounting

```typescript
app.route("/v1/auth", authRoutes)       // ✅ Working
app.route("/v1/me", meRoutes)           // ✅ Working
app.route("/v1/admin", adminRoutes)     // ❌ All 501
app.route("/v1/payment", paymentsRoutes) // ? Unknown
```

---

## 7. Key Findings

### ✅ What's Working

1. **User Dashboard** - Fully functional
   - Login/logout
   - Profile management
   - Session management

2. **Database Layer** - Complete
   - All query functions exist
   - Atomic JSONB updates
   - Proper indexing

3. **Auth System** - Working
   - OAuth flow (Google, etc.)
   - Cookie-based sessions
   - Multi-audience support (user/admin)

4. **S2S Communication** - Functional
   - Core ↔ Gateway
   - Token validation
   - Session exchange

### ❌ What's Missing

1. **Gateway Admin Routes** - **COMPLETELY STUBBED**
   - All return 501
   - No proxy to Core
   - No business logic

2. **Core Admin Routes** - **MOSTLY MISSING**
   - Only 3 license routes exist
   - Payment provider routes are stubs
   - No project/app CRUD
   - No team management
   - No statistics

3. **Billing Routes** - **UNKNOWN STATUS**
   - Gateway billing routes return 501
   - Core has webhook handlers only
   - No admin billing API

### 🔍 Architecture Insights

#### 1. Two-Tier Pattern

Gateway should be a **thin proxy** that:
- Validates authentication
- Enforces rate limits
- Adds CSRF protection
- Proxies to Core

Core should contain:
- Business logic
- Database operations
- Complex queries
- Transaction management

#### 2. No Direct DB Access from Gateway

Gateway does NOT directly access the database:
```typescript
// Gateway ONLY:
// - Checks Redis for app sessions
// - Calls Core service for everything else
// - Sets cookies
// - Handles CORS
```

#### 3. Query Layer is Complete

**Don't rebuild queries!** Everything needed exists:
```typescript
import { 
  getDb,
  projectQueries,
  appQueries,
  licenseQueries,
  projectMemberQueries,
  // etc.
} from "@proofa/db";

const db = getDb();
const project = await projectQueries.findByPublicId(db, projectId);
```

#### 4. JSONB Updates Must Be Atomic

Never do read-modify-write on apps table JSONB fields:

```typescript
// ❌ WRONG - Race condition
const app = await appQueries.findById(db, appId);
app.security_settings.redirectUris.push(newUri);
await appQueries.update(db, appId, { security_settings: app.security_settings });

// ✅ CORRECT - Atomic
await appQueries.updateSecuritySettings(db, appId, {
  redirectUris: [...existingUris, newUri]
});
```

---

## Implementation Strategy

### Phase 1: Gateway Admin Routes

**Goal:** Make Gateway proxy admin requests to Core

```typescript
// gateway/src/routes/admin.ts

import { Hono } from "hono";
import { getAuth } from "../middleware/auth";
import { coreService } from "../services/coreService";

export const adminRoutes = new Hono();

// Projects
adminRoutes.get("/projects", async (c) => {
  const auth = getAuth(c);
  return coreService.request({
    method: "GET",
    path: `/v1/admin/users/${auth.userId}/projects`,
  });
});

adminRoutes.post("/projects", async (c) => {
  const auth = getAuth(c);
  const body = await c.req.json();
  return coreService.request({
    method: "POST",
    path: "/v1/admin/projects",
    body: { ...body, userId: auth.userId },
  });
});

// ... more routes
```

### Phase 2: Core Admin Implementation

**Goal:** Implement business logic in Core

```typescript
// core/src/routes/v1/admin/projects.ts

import { Hono } from "hono";
import { getDb, projectQueries, projectMemberQueries } from "@proofa/db";
import { createId } from "@proofa/shared";

export const projectRoutes = new Hono();

projectRoutes.get("/:userId/projects", async (c) => {
  const userId = c.req.param("userId");
  const db = getDb();
  
  // Get user by public ID
  const user = await userQueries.findByPublicId(db, userId);
  if (!user) return c.json({ error: "User not found" }, 404);
  
  // Get projects where user is owner or member
  const owned = await projectQueries.findByOwnerId(db, user.id);
  const member = await projectQueries.findByUserId(db, user.id);
  
  return c.json({ 
    projects: [...owned, ...member].map(p => ({
      id: p.public_id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      createdAt: p.created_at,
    }))
  });
});

// ... more routes
```

### Phase 3: Mount Routes

```typescript
// core/src/routes/v1/admin/index.ts

import { Hono } from "hono";
import { projectRoutes } from "./projects";
import { appRoutes } from "./apps";
import { memberRoutes } from "./members";
// ... etc

const router = new Hono();

router.route("/", projectRoutes);
router.route("/", appRoutes);
router.route("/", memberRoutes);
// Keep existing license routes
router.post("/license/grant", ...);

export const adminRoutes = router;
```

---

## Critical Notes for Implementation

### ✅ DO

1. **Use existing queries** from `@proofa/db`
2. **Follow two-tier pattern** (Gateway → Core)
3. **Use atomic JSONB updates** for apps table
4. **Add auth checks** in Core routes
5. **Return proper HTTP status codes**
6. **Log errors** with structured logging
7. **Validate input** with Zod schemas
8. **Use transactions** for multi-table operations

### ❌ DON'T

1. **Don't access DB from Gateway** (except Redis for sessions)
2. **Don't rewrite existing queries**
3. **Don't do read-modify-write on JSONB**
4. **Don't skip S2S auth checks**
5. **Don't mix internal IDs and public IDs**
6. **Don't forget soft delete checks**
7. **Don't return internal errors to clients**

---

## Next Steps

1. ✅ **Read this document** - Understand current state
2. **Map remaining endpoints** - What exactly needs implementation?
3. **Design Core routes** - Group by entity (projects, apps, etc.)
4. **Implement Core first** - Business logic + DB
5. **Add Gateway proxies** - Thin layer over Core
6. **Test incrementally** - One endpoint group at a time
7. **Update docs** - Keep this document current

---

## Questions to Answer Before Coding

1. Should we consolidate `CoreClient` and `CoreService`?
2. Where should authorization checks happen (Gateway vs Core)?
3. Do we need audit logging for admin actions?
4. How should we handle project permissions (owner/admin/member)?
5. Should statistics be real-time or cached?
6. Do we need pagination for list endpoints?
7. What's the status of billing routes implementation?

---

**Last Updated:** January 10, 2026  
**Status:** Ready for implementation planning
