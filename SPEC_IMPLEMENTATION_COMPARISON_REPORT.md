# Proofa: Spec vs Implementation Comprehensive Comparison Report

**Generated:** January 1, 2026  
**Spec Version:** 1.0.0 (December 14, 2025)  
**Analysis Scope:** Complete comparison between PRODUCT_SPEC.md and actual implementation

---

## Executive Summary

This report provides a comprehensive analysis comparing the Proofa product specification (docs/PRODUCT_SPEC.md) with the actual implementation. It identifies:

1. **Missing features** (specified but not implemented)
2. **Extra implementations** (built but not in spec)
3. **Implementation differences** (same feature, different approach)
4. **Improvement opportunities** (areas for enhancement)

### Quick Stats

| Category | Count |
|----------|-------|
| Missing Core Features | 15+ |
| Extra Features Built | 12+ |
| Implementation Differences | 20+ |
| Critical Gaps | 8 |

---

## 1. Missing from Implementation (Specified but Not Built)

### 1.1 Critical Missing Features

#### A. Email Verification System (OTP)
**Spec Location:** §6 Authentication Flows, §7.1 Core API  
**Status:** ❌ NOT IMPLEMENTED

The spec defines a complete OTP-based email verification system for "Core/Proofa login only":
- `POST /v1/email/start` - Send 6-digit OTP
- `POST /v1/email/verify` - Verify OTP with lockout protection
- Email verification records in database
- 3 failed attempts → 30-minute lockout
- 10-minute OTP expiry

**Evidence:**
```typescript
// Files exist but incomplete:
// apps/core/src/routes/v1/email/index.ts - Partial implementation
// apps/core/src/routes/email.ts - Duplicate partial implementation
```

**Impact:** Users cannot log in via email/OTP, only OAuth providers work.

---

#### B. Identity Collision Policy
**Spec Location:** §6.2 Identity Collision Policy  
**Status:** ❌ PARTIALLY IMPLEMENTED

The spec defines 4 detailed collision rules:
1. **Rule 1:** Provider identity match always wins
2. **Rule 2:** Email collision (new account, existing email) → OTP verification required
3. **Rule 3:** Auto-link (logged-in user, new provider) → no OTP
4. **Rule 4:** No collision (new email) → create user

**Current Implementation:**
- Basic provider matching exists
- Email collision detection is MISSING
- No OTP step-up for linking identities
- No "pending link" Redis storage

**Gap:** Users can't safely link multiple OAuth providers or handle email conflicts.

---

#### C. Auth Code System (Proper Implementation)
**Spec Location:** §4 Data Model - `auth_codes` table, §7.1 Core API  
**Status:** ❌ IMPROPERLY IMPLEMENTED

**Spec Requirements:**
- Auth codes stored in `auth_codes` table
- 120-second TTL
- Single-use (consumed_at tracking)
- Bindings: user_id, app_id, redirect_uri
- Validation on exchange

**Current Implementation:**
```typescript
// apps/core/src/routes/auth.ts:211
authRoutes.post("/exchange", async (c: Context) => {
  const { code, sessionId } = body;
  const sessionIdToUse = code || sessionId;
  // PROBLEM: Uses session ID directly as "code"
  // No auth_codes table usage
  // No TTL enforcement
  // No consumed_at tracking
});
```

**Impact:** Security vulnerability - session IDs exposed as auth codes, no proper expiry.

---

#### D. Multi-Tenant Project Structure
**Spec Location:** §8 Multi-Tenant Project Structure  
**Status:** ⚠️ PARTIALLY IMPLEMENTED

**Missing Features:**
- ❌ Project invitations workflow (email invites)
- ❌ Project invitation consumption flow
- ⚠️ Project member role enforcement (owner/admin/member)
- ❌ Project-level audit logs
- ❌ Project statistics aggregation

**What's Working:**
- ✅ Projects table exists
- ✅ Project members table exists
- ✅ Basic CRUD for projects

**Gap:** Cannot properly invite team members to projects via email.

---

#### E. Licensing System (Auto-License Creation)
**Spec Location:** §10 Licensing System  
**Status:** ❌ NOT IMPLEMENTED

**Spec Requirements:**
On first successful login for an app:
1. Check if license exists for (user, app)
2. If not:
   - If `licensing_required = false`: Return synthetic license
   - Else: Create license with `default_license_plan` and `trial_days`

**Current Implementation:**
```typescript
// No auto-license creation on first login
// Licenses must be manually granted via admin
```

**Impact:** Every user needs manual license granting, no free/trial auto-activation.

---

#### F. Session Management (Rolling TTL)
**Spec Location:** §9.1 Core Session  
**Status:** ❌ NOT IMPLEMENTED

**Spec Requirements:**
- 7-day rolling expiry (extends on activity)
- Refresh throttling: only extend if `last_seen_at < now() - 1 hour`
- Updates `last_seen_at` on each API call

**Current Implementation:**
```typescript
// sessions table has last_seen_at field
// BUT: No automatic rolling extension logic
// No throttled refresh mechanism
```

**Impact:** Sessions expire exactly 7 days from creation, not from last activity.

---

#### G. Rate Limiting (Global API)
**Spec Location:** §13 Security Policies - Rate Limiting  
**Status:** ❌ NOT IMPLEMENTED

**Spec Requirements:**
- Global rate limit: `apps.rate_limit_requests_per_minute` (default 100/min)
- Per-app, per-IP enforcement
- Redis sliding window implementation
- Separate buckets:
  - OTP send: 3 per email per hour
  - Auth start: 10 per IP per 5 minutes
  - Email verify: 5 attempts per OTP per 10 minutes

**Current Implementation:**
```typescript
// apps table has rate_limit column
// BUT: No middleware/enforcement implemented
// No Redis rate limiting
```

**Impact:** API vulnerable to DDoS and brute-force attacks.

---

#### H. Account Lockout
**Spec Location:** §13 Security Policies  
**Status:** ❌ NOT IMPLEMENTED

**Spec Requirements:**
- After N failed login attempts: temporary lockout
- Duration: `apps.account_lockout_minutes` (default 15 minutes)
- Tracked per email + app
- Logged to audit trail

**Current Implementation:**
```typescript
// apps table has account_lockout_minutes column
// email_verifications table has locked_until column
// BUT: No lockout enforcement in auth flow
```

**Impact:** No brute-force protection for login attempts.

---

#### I. Audit Logging System
**Spec Location:** §4 Data Model - `audit_logs` table, §13 Security Policies  
**Status:** ⚠️ PARTIALLY IMPLEMENTED

**Spec Requirements:**
- Log all state-changing actions
- Include: who, what, when, where (IP), changes (before/after)
- Exclude: passwords, OTPs, OAuth tokens
- Query via `/admin/projects/:project_id/activity`

**Current Implementation:**
```typescript
// audit_logs table exists in schema
// Some audit logging in Gateway admin routes (auditLogger.logCreate)
// BUT: Inconsistent usage, many actions not logged
// No Core audit logging
// No activity query endpoint
```

**Gap:** Incomplete audit trail, compliance issues.

---

#### J. CORS Configuration
**Spec Location:** §13 Security Policies - CORS  
**Status:** ⚠️ PARTIALLY IMPLEMENTED

**Spec Requirements:**
- Per-app `cors_allowed_origins` (JSON array)
- Middleware checks origin on each request
- Return `Access-Control-Allow-Origin` if whitelisted

**Current Implementation:**
```typescript
// apps table has cors_origins column (jsonb)
// BUT: No CORS middleware enforcement
// Default hardcoded in app creation: ["http://localhost:3001"]
```

**Gap:** CORS not properly configured, security risk.

---

#### K. S2S Token Management
**Spec Location:** §13 Security Policies - Secret Management  
**Status:** ⚠️ HARDCODED

**Spec Requirements:**
- Generate via script: `/scripts/generate-s2s-token.ts`
- Store as env var `X_PROOFA_SERVICE_TOKEN`
- Manual rotation process

**Current Implementation:**
```typescript
// Used in code: env.CORE_S2S_TOKEN
// BUT: No generation script
// No rotation strategy
// Just env var dependency
```

**Gap:** No formal S2S token lifecycle management.

---

#### L. Validation & Error Handling (Zod)
**Spec Location:** §13 Security Policies - Input Validation  
**Status:** ⚠️ INCONSISTENT

**Spec Requirements:**
- Zod schemas for ALL endpoints
- Standard error format: `{ ok: false, error: { code, message, details } }`
- ID validation via patterns

**Current Implementation:**
```typescript
// Some routes use Zod (admin routes, gateway)
// Many Core routes have NO validation
// Error responses inconsistent:
//   - Sometimes: { error: "message" }
//   - Sometimes: { ok: true, userExists: false }
//   - Rarely: { ok: false, error: { code, message } }
```

**Gap:** Inconsistent validation and error responses.

---

#### M. Database Transactions
**Spec Location:** §13 Security Policies - Database Transactions  
**Status:** ❌ NOT IMPLEMENTED

**Spec Requirements:**
- Use transactions for multi-write operations:
  - User creation + identity creation
  - License grant + audit log
  - Project creation + member assignment
- ACID guarantees, rollback on failure

**Current Implementation:**
```typescript
// No transaction usage in code
// All operations are individual queries
// Example: User creation and identity creation are separate
```

**Impact:** Risk of partial writes, inconsistent data state.

---

### 1.2 Secondary Missing Features

#### N. Provider-Specific Features
- ❌ OAuth state storage in Redis (currently in-memory Map)
- ❌ Provider credential rotation (OAuth)
- ❌ Provider usage logs tracking
- ❌ Multiple OAuth provider configurations per entity

#### O. User Dashboard Features (account.proofa.com)
- ❌ View licenses across projects/apps
- ❌ Linked identities management
- ❌ Session management UI

#### P. Admin Dashboard Features (admin.proofa.com)
- ❌ Project statistics visualization
- ❌ License expiry notifications
- ❌ Activity logs visualization

#### Q. Payment Integration
- ⚠️ Payment providers table exists
- ❌ Stripe/LemonSqueezy integration
- ❌ Webhook handling
- ❌ Subscription management

---

## 2. Extra Features Built (Not in Spec)

### 2.1 OAuth Provider Management System

**Location:** `packages/db/src/schema.ts` - `oauth_providers`, `payment_providers`, `app_oauth_selections`

**Features:**
- Multi-level OAuth provider configurations (platform/project/app)
- Dynamic provider selection per app
- Credential encryption and rotation support
- Provider usage logs for monitoring

**Benefit:** More flexible OAuth setup than spec envisioned.

**Consideration:** Adds complexity, may be over-engineered for MVP.

---

### 2.2 Payment Provider System

**Location:** `packages/db/src/schema.ts` - `payment_providers`, `payment_configurations`

**Features:**
- Payment provider abstraction (Stripe, LemonSqueezy, Dodo)
- Environment-specific configs (test/production)
- Credential rotation support
- Webhook secret management

**Status:** Schema exists, minimal implementation.

**Consideration:** Spec says "Phase 2", but foundation is built.

---

### 2.3 Plans System (Detailed)

**Location:** `packages/db/src/schema.ts` - `plans` table

**Features:**
```typescript
plans: {
  monthly_price: integer
  yearly_price: integer
  one_time_price: integer
  trial_enabled: boolean
  trial_days: integer
  features: jsonb
  display_order: integer
}
```

**Spec Version:**
```
Licenses have:
  - plan: enum (free, trial, pro, team, enterprise)
  - valid_until: date
```

**Benefit:** More flexible pricing model.

**Consideration:** Spec uses simple enum, implementation uses full plan table.

---

### 2.4 Invitation System (Dual Implementation)

**Location:** `packages/db/src/schema.ts`

**Tables:**
- `invitations` (app user invitations)
- `project_invitations` (project team invitations)

**Features:**
- Invitation codes
- Expiry tracking
- Consumption tracking
- Custom messages
- Email notifications

**Spec Version:** Basic mentions of invitations, not detailed.

**Benefit:** Complete invitation workflow.

---

### 2.5 Advanced Session Tracking

**Location:** `packages/db/src/schema.ts` - `sessions` table

**Extra Fields:**
```typescript
sessions: {
  app_id: integer  // NOT in spec (spec has global core sessions only)
  revoked_at: timestamp  // In spec
}
```

**Consideration:** Spec separates Core sessions (global) from Gateway app sessions (Redis).  
Implementation adds `app_id` to core sessions, which is a deviation.

---

### 2.6 Project-Level OAuth Credentials

**Location:** `packages/db/src/schema.ts` - `projects` table

**Extra Fields:**
```typescript
projects: {
  google_client_id: text
  google_client_secret: text
  github_client_id: text
  github_client_secret: text
}
```

**Spec Version:** OAuth credentials managed at platform level or app level.

**Benefit:** Project-level sharing of OAuth credentials across apps.

---

### 2.7 App OAuth Inherit Source

**Location:** `packages/db/src/schema.ts` - `apps` table

**Extra Fields:**
```typescript
apps: {
  oauth_inherit_source: text  // 'proofa' | 'project' | 'app'
}
```

**Benefit:** Flexible OAuth credential inheritance model.

**Consideration:** More complex than spec's platform-level OAuth.

---

### 2.8 Admin/User Dashboard Separation

**Location:** Gateway routes

**Implementation:**
- Separate cookies: `proofa_user_session` and `proofa_admin_session`
- Audience inference from origin
- Dual login flows

**Spec Version:** Single user dashboard, separate admin dashboard.

**Benefit:** Clear separation of concerns.

**Consideration:** Adds complexity to session management.

---

### 2.9 Client SDK Features

**Location:** `packages/client/`, `packages/react/`

**Features:**
- Client SDK for app integration
- React hooks for authentication
- Type-safe API clients

**Spec Version:** Not mentioned (implementation detail).

**Benefit:** Developer experience improvement.

---

### 2.10 Provider Usage Logs

**Location:** `packages/db/src/schema.ts` - `provider_usage_logs` table

**Features:**
- Track OAuth and payment provider usage
- Operation logging (login, token refresh, payment, etc.)
- Status tracking (success/failure)
- Error message capture
- IP address logging

**Benefit:** Debugging and monitoring.

**Consideration:** Not in spec, but useful operational feature.

---

### 2.11 Encryption System

**Location:** `packages/shared/src/encryption.ts` (inferred)

**Features:**
- Encrypt/decrypt OAuth credentials
- Encrypt payment provider credentials
- Detect if already encrypted (avoid double-encryption)
- Masking for display

**Implementation Detail:** Used throughout admin routes.

**Consideration:** Spec mentions "encrypted" but doesn't specify how.

---

### 2.12 Smart Invite Flow

**Location:** `apps/gateway/src/routes/admin.ts` - `/projects/:projectId/apps/:appId/users/invite`

**Features:**
- **Case 1:** User exists with license → Update license
- **Case 2:** User exists, no app usage → Send invitation
- **Case 3:** User doesn't exist → Send invitation

**Benefit:** Intelligent handling of invitation scenarios.

**Consideration:** More sophisticated than spec describes.

---

## 3. Implementation Differences (Same Thing, Different Approach)

### 3.1 ID Generation System

**Spec:**
```typescript
// Format: [Letter][Digit][nanoid(9-12 chars)]
// Examples:
U0sFFDmgde   // User (11 chars)
S0mK9pQxCa   // Session (13 chars)
C0pN7mKqXc9A // Auth Code (14 chars)
```

**Implementation:**
```typescript
// Format: [3-Letter Prefix][0][nanoid(9 or 15 chars)]
// Examples:
USR0xY7mK9pQz       // User (13 chars)
SES0abc123xyz456789 // Session (19 chars)
AUT0xY7mK9pQz       // Auth Code (13 chars)
```

**Differences:**
- Prefix: 3 letters vs 1 letter + 1 digit
- Length: 13/19 chars vs 11-14 chars
- Sessions: 19 chars vs 13 chars (spec)
- Auth codes: 13 chars vs 14 chars (spec)

**Impact:**
- Implementation IDs are longer (3 chars prefix vs 2)
- Sessions have higher entropy (15 vs 11 random chars)
- Spec's pattern is more compact

**Recommendation:** Align with spec for consistency.

---

### 3.2 Database Schema Differences

#### A. Table Name Conventions

**Spec:**
- `users`, `sessions`, `projects`, `apps`, `licenses`

**Implementation:**
- Same, but added underscores: `project_members`, `project_invitations`

**Minor difference.**

---

#### B. Timestamp Storage

**Spec:**
- SQLite integers (seconds since epoch)
- Example: `created_at: INTEGER`

**Implementation:**
- PostgreSQL/Drizzle timestamps
- Example: `created_at: timestamp("created_at").notNull().defaultNow()`

**Reason:** Using PostgreSQL (Turso) instead of raw SQLite integers.

**Impact:** Drizzle handles conversion, but storage differs from spec.

---

#### C. Apps Table Schema Differences

**Spec:**
```typescript
apps: {
  required_providers: TEXT  // JSON array: ["google", "github"]
  licensing_required: BOOLEAN
  default_license_plan: TEXT  // enum: free, trial
  trial_days: INTEGER
  // ... other fields per spec
}
```

**Implementation:**
```typescript
apps: {
  // MISSING: required_providers
  // MISSING: licensing_required
  // MISSING: default_license_plan
  // MISSING: trial_days
  
  // ADDED: oauth_inherit_source
  // ADDED: google_client_id/secret (should be at project level)
  // ADDED: github_client_id/secret
  // ADDED: selected_payment_provider_id
}
```

**Impact:** Core licensing features are MISSING from apps table.

---

#### D. Licenses Table Schema Differences

**Spec:**
```typescript
licenses: {
  plan: TEXT  // enum: free, trial, pro, team, enterprise
  status: TEXT  // enum: active, expired, canceled, suspended
  source: TEXT  // enum: manual, promo, stripe, lemonsqueezy, internal
  valid_from: INTEGER (epoch seconds)
  valid_until: INTEGER (epoch seconds, nullable)
  entitlements: TEXT (JSON)
  provider: TEXT (nullable)
  provider_ref_id: TEXT (nullable)
  metadata: TEXT (JSON)
}
```

**Implementation:**
```typescript
licenses: {
  plan_id: INTEGER (FK to plans.id)  // NOT an enum!
  status: TEXT
  valid_until: timestamp (nullable)
  // MISSING: source
  // MISSING: valid_from
  // MISSING: entitlements
  // MISSING: provider
  // MISSING: provider_ref_id
  // MISSING: metadata
}
```

**Impact:**
- Plan is a foreign key, not an enum (extra tables required)
- Missing critical tracking fields (source, provider, metadata)
- No entitlements support

---

#### E. Sessions Table Schema Differences

**Spec:**
```typescript
sessions: {
  user_id: INTEGER
  // NO app_id field (global sessions)
  created_at, last_seen_at, expires_at, revoked_at
}
```

**Implementation:**
```typescript
sessions: {
  user_id: INTEGER
  app_id: INTEGER  // ADDED (not in spec)
  created_at, last_seen_at, expires_at, revoked_at
}
```

**Impact:** Mixes Core session concept (global) with app sessions (should be Redis-only per spec).

---

### 3.3 Auth Code Exchange Flow

**Spec Flow:**
```
Core creates auth_code (120s TTL, stored in auth_codes table)
→ Core redirects to Gateway callback with code
→ Gateway calls POST /v1/auth/exchange (S2S)
→ Core validates & consumes code, returns user + license
→ Gateway creates app session in Redis
```

**Implementation Flow:**
```
Core creates session
→ Core redirects to Gateway with session.public_id as "code"
→ Gateway calls POST /v1/auth/exchange with sessionId
→ Core validates session, returns user
→ Gateway creates app session in Redis
```

**Difference:** No auth_codes table usage, session ID is exposed as code.

**Impact:** Security issue - session IDs are long-lived, not single-use codes.

---

### 3.4 Gateway Session Management

**Spec:**
- Gateway stores app sessions in Redis
- Cookie: `pp_app_session`
- No database storage for app sessions

**Implementation:**
- Gateway stores app sessions in Redis ✅
- Cookie: `proofa_user_session` or `proofa_admin_session` ❌
- Uses `sessionStore` (Redis) ✅

**Difference:** Cookie names differ from spec.

---

### 3.5 Error Response Format

**Spec:**
```json
{
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

**Implementation Examples:**
```json
// Variant 1:
{ "error": "Invalid provider" }

// Variant 2:
{ "error": "Project not found", "details": {...} }

// Variant 3:
{ "ok": true, "userExists": false }
```

**Impact:** Inconsistent error responses, hard to parse client-side.

---

### 3.6 Email Service

**Spec:**
- Resend API (abstracted, swappable with Postmark)

**Implementation:**
- Using Resend ✅
- Email templates implemented (invitation, license granted, etc.) ✅
- Functions: `sendEmail()`, `generateAppUserInvitationEmail()`, etc.

**Difference:** More sophisticated than spec describes (good).

---

### 3.7 License Plan Management

**Spec:**
- Simple enum: `free`, `trial`, `pro`, `team`, `enterprise`
- Hardcoded in code

**Implementation:**
- Full `plans` table with:
  - Prices (monthly, yearly, one-time)
  - Trial configuration
  - Features (jsonb)
  - Display order
- Foreign key: `licenses.plan_id → plans.id`

**Impact:**
- More flexible (can create custom plans)
- More complex (requires plan management UI)
- Spec simplicity lost

---

### 3.8 OAuth Provider Configuration

**Spec:**
- Platform-level OAuth credentials (env vars)
- Simple: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Implementation:**
- Multi-level: platform → project → app
- `oauth_providers` table with encryption
- `oauth_inherit_source` field on apps
- Dynamic provider selection

**Impact:**
- More powerful (per-project customization)
- More complex (harder to set up)
- Deviation from MVP simplicity

---

### 3.9 Core vs Gateway Route Organization

**Spec:**
```
Core:
  /v1/auth/start
  /v1/auth/callback/:provider
  /v1/auth/exchange (S2S)
  /v1/email/start
  /v1/email/verify
  /v1/license
  /v1/admin/license/grant

Gateway:
  /auth/start
  /auth/callback
  /me
  /profile
  /sessions
  /admin/* (all admin routes)
```

**Implementation:**
```
Core:
  /v1/auth/start ✅
  /v1/auth/callback/:provider ✅
  /v1/auth/exchange ✅
  /v1/email/* ⚠️ (partial)
  /v1/license ✅
  /v1/admin/license/grant ✅

Gateway:
  /v1/auth/start ✅
  /v1/auth/callback ✅
  /v1/me ✅
  /v1/admin/* ✅ (extensive)
```

**Difference:** Implementation adds `/v1` prefix to Gateway routes (not in spec).

---

### 3.10 Project Member Roles

**Spec:**
- Enum: `owner`, `admin`, `member`
- Stored as TEXT in `project_members.role`

**Implementation:**
- Same enum ✅
- Enforcement: Inconsistent (some routes check role, others don't)

**Gap:** Need comprehensive role-based access control (RBAC) enforcement.

---

## 4. Scope of Improvements

### 4.1 Critical Fixes Needed

| Priority | Area | Issue | Estimated Effort |
|----------|------|-------|------------------|
| 🔴 P0 | Security | Implement proper auth code system (not session IDs) | 2 days |
| 🔴 P0 | Security | Add rate limiting middleware (global API) | 2 days |
| 🔴 P0 | Security | Add account lockout protection | 1 day |
| 🔴 P0 | Auth | Implement identity collision policy (email conflicts) | 2 days |
| 🔴 P0 | Auth | Complete OTP email verification system | 2 days |
| 🟡 P1 | Data | Use database transactions for multi-write operations | 3 days |
| 🟡 P1 | Data | Implement auto-license creation on first login | 1 day |
| 🟡 P1 | Session | Implement rolling session expiry with throttling | 1 day |
| 🟡 P1 | Validation | Add Zod validation to all Core endpoints | 2 days |
| 🟡 P1 | Errors | Standardize error response format across all APIs | 1 day |

**Total Critical Path: ~17 days**

---

### 4.2 Schema Alignment

#### Apps Table Additions
```sql
ALTER TABLE apps ADD COLUMN required_providers JSONB;
ALTER TABLE apps ADD COLUMN licensing_required BOOLEAN DEFAULT true;
ALTER TABLE apps ADD COLUMN default_license_plan VARCHAR(20) DEFAULT 'free';
ALTER TABLE apps ADD COLUMN trial_days INTEGER;
```

#### Licenses Table Additions
```sql
ALTER TABLE licenses ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT 'internal';
ALTER TABLE licenses ADD COLUMN valid_from TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE licenses ADD COLUMN entitlements JSONB;
ALTER TABLE licenses ADD COLUMN provider VARCHAR(50);
ALTER TABLE licenses ADD COLUMN provider_ref_id VARCHAR(255);
ALTER TABLE licenses ADD COLUMN metadata JSONB;
```

#### Sessions Table Cleanup
```sql
-- Remove app_id from sessions (app sessions should be Redis-only)
ALTER TABLE sessions DROP COLUMN app_id;
```

---

### 4.3 ID System Alignment

**Option A:** Keep current implementation (3-letter prefix)
- Pros: Already deployed, higher entropy for sessions
- Cons: Longer IDs, deviates from spec

**Option B:** Migrate to spec format (letter + digit prefix)
- Pros: Matches spec exactly, more compact
- Cons: Migration effort, potential ID collisions

**Recommendation:** Keep current format, document deviation from spec.

---

### 4.4 Code Quality Improvements

#### A. Consistent Validation
```typescript
// Add Zod schemas for all Core routes
// Example:
export const AuthStartQuerySchema = z.object({
  provider: z.enum(["google", "github"]),
  redirect_uri: z.string().url(),
  state: z.string().optional(),
});
```

#### B. Standardized Error Handling
```typescript
// Create error factory
export function apiError(code: string, message: string, status: number, details?: any) {
  return {
    ok: false,
    error: { code, message, details }
  };
}
```

#### C. Transaction Wrapper
```typescript
// Add transaction helper
export async function withTransaction<T>(
  db: DbClient,
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(callback);
}
```

---

### 4.5 Missing Features Implementation Priority

#### Phase 1 (Security & Core Auth) - 2 weeks
1. Auth code system (2 days)
2. Rate limiting (2 days)
3. Account lockout (1 day)
4. Identity collision policy (2 days)
5. OTP email verification (2 days)
6. Transaction support (3 days)
7. Rolling session expiry (1 day)

#### Phase 2 (Licensing & Management) - 1 week
1. Auto-license creation (1 day)
2. License expiry cron job (1 day)
3. Project invitation workflow (2 days)
4. CORS middleware (1 day)
5. Audit logging completion (2 days)

#### Phase 3 (Polish & Standardization) - 1 week
1. Zod validation (all routes) (2 days)
2. Error format standardization (1 day)
3. Schema alignment (1 day)
4. Documentation updates (1 day)
5. Testing & QA (2 days)

**Total: 4 weeks of focused development**

---

## 5. Recommendations

### 5.1 Immediate Actions (This Week)

1. **Fix auth code vulnerability**
   - Stop using session IDs as auth codes
   - Implement proper auth_codes table usage
   - Add 120s TTL and consumed_at tracking

2. **Add rate limiting**
   - Redis sliding window for API endpoints
   - Per-IP, per-app enforcement
   - Separate buckets for OTP/auth/email

3. **Complete OTP system**
   - Implement full email verification flow
   - Add lockout protection (3 attempts → 30 min)
   - Test with Resend API

4. **Add input validation**
   - Zod schemas for all Core auth endpoints
   - Reject invalid requests early

---

### 5.2 Short-Term (Next 2 Weeks)

1. **Identity collision handling**
   - Implement 4 collision rules from spec
   - Add Redis "pending link" storage
   - Test email conflict scenarios

2. **Auto-licensing**
   - Implement first-login license creation
   - Support free/trial defaults
   - Test with multiple apps

3. **Database transactions**
   - Wrap multi-write operations
   - Add rollback on failure
   - Test atomicity

4. **Rolling sessions**
   - Implement throttled session refresh
   - Update `last_seen_at` on activity
   - Test 7-day rolling expiry

---

### 5.3 Medium-Term (Next Month)

1. **Schema alignment**
   - Add missing columns to apps/licenses tables
   - Remove app_id from sessions table
   - Migrate existing data

2. **CORS & security**
   - Implement per-app CORS middleware
   - Add S2S token rotation script
   - Audit secret storage

3. **Audit logging**
   - Complete audit trail for all actions
   - Add activity query endpoints
   - Test compliance scenarios

4. **Project invitations**
   - Implement email invitation flow
   - Add invitation consumption
   - Test team collaboration

---

### 5.4 Long-Term (Phase 2)

1. **Payment integration**
   - Stripe/LemonSqueezy webhooks
   - Subscription management
   - Billing dashboard

2. **Advanced features**
   - MFA (TOTP, WebAuthn)
   - OAuth step-up flows
   - License expiry automation

3. **Developer experience**
   - SDK improvements
   - API documentation
   - Integration guides

---

## 6. Risk Assessment

### 6.1 High-Risk Issues

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Session ID exposure (auth codes) | 🔴 Critical | High | Fix immediately (2 days) |
| No rate limiting (DDoS) | 🔴 Critical | High | Implement (2 days) |
| No account lockout (brute force) | 🔴 Critical | Medium | Implement (1 day) |
| No auto-licensing (user friction) | 🟡 High | High | Implement (1 day) |
| Inconsistent validation | 🟡 High | Medium | Standardize (2 days) |

### 6.2 Medium-Risk Issues

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| No database transactions | 🟡 Medium | Medium | Add transaction wrapper (3 days) |
| Schema misalignment | 🟡 Medium | Low | Migrate schema (1 day) |
| CORS not enforced | 🟡 Medium | Medium | Add middleware (1 day) |
| Incomplete audit logs | 🟡 Medium | Low | Complete logging (2 days) |

---

## 7. Conclusion

### What's Working Well ✅
- Basic OAuth authentication flow
- Project and app CRUD operations
- Admin dashboard functionality
- Email invitation system (extra feature)
- Client SDKs (React, TypeScript)
- Database schema foundation

### What Needs Immediate Attention 🔴
- **Security vulnerabilities:** Auth codes, rate limiting, lockout
- **Missing core features:** OTP verification, identity collisions
- **Data integrity:** Database transactions
- **User experience:** Auto-licensing, rolling sessions

### What's Over-Built for MVP 🤔
- Complex OAuth provider management (multi-level)
- Full plans system (vs simple enum)
- Payment provider infrastructure (Phase 2 feature)

### Overall Assessment

**Implementation Status: ~60% Complete**

The foundation is solid, but critical security and authentication features are missing or incomplete. The implementation has deviated from the spec in some areas (sometimes for the better, sometimes adding unnecessary complexity).

**Key Takeaway:** Prioritize security fixes and spec alignment over new features. The current implementation is not production-ready until auth code, rate limiting, and account lockout issues are resolved.

---

## 8. Appendix: Quick Reference

### A. Spec vs Implementation Matrix

| Feature | Spec | Implementation | Status |
|---------|------|----------------|--------|
| OAuth authentication | ✅ | ✅ | Working |
| Email OTP verification | ✅ | ⚠️ | Partial |
| Auth code system | ✅ | ❌ | Missing/Wrong |
| Identity collision policy | ✅ | ❌ | Missing |
| Auto-licensing | ✅ | ❌ | Missing |
| Rolling sessions | ✅ | ❌ | Missing |
| Rate limiting | ✅ | ❌ | Missing |
| Account lockout | ✅ | ❌ | Missing |
| CORS enforcement | ✅ | ❌ | Missing |
| Database transactions | ✅ | ❌ | Missing |
| Audit logging | ✅ | ⚠️ | Partial |
| Project CRUD | ✅ | ✅ | Working |
| App CRUD | ✅ | ✅ | Working |
| License management | ✅ | ⚠️ | Partial |
| User dashboard | ✅ | ⚠️ | Partial |
| Admin dashboard | ✅ | ✅ | Working |

**Legend:**
- ✅ Complete and working
- ⚠️ Partially implemented
- ❌ Missing or broken

---

### B. Implementation Effort Summary

| Phase | Duration | Focus | Risk Reduction |
|-------|----------|-------|----------------|
| Phase 1 | 2 weeks | Security & Auth | 🔴 → 🟢 |
| Phase 2 | 1 week | Licensing & Management | 🟡 → 🟢 |
| Phase 3 | 1 week | Polish & Standards | 🟡 → 🟢 |
| **Total** | **4 weeks** | **MVP Completion** | **Production Ready** |

---

**Report End**

*For questions or clarifications, refer to:*
- **Spec:** `/docs/PRODUCT_SPEC.md`
- **Implementation:** `/apps/core/`, `/apps/gateway/`, `/packages/db/`
