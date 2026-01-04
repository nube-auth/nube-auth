# Proofa Billing - Implementation Guide

**Version**: 1.0  
**Status**: Current Implementation  
**Last Updated**: January 4, 2026

> This document describes the **actual implementation** in the codebase, including service architecture, API routes, schema details, and worker service responsibilities.

---

## Table of Contents

1. [Service Architecture](#1-service-architecture)
2. [Public ID System](#2-public-id-system)
3. [Database Schema](#3-database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Worker Service](#5-worker-service-planned)
6. [Integration Guide](#6-integration-guide)

---

## 1. Service Architecture

### 1.1 Service Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Admin        │ User         │ Marketing    │ Documentation  │
│ Dashboard    │ Dashboard    │ Website      │ Site           │
│ (React)      │ (React)      │ (Astro)      │ (Starlight)    │
│ :5174        │ :5173        │              │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
                       │                │
                       ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Gateway Service                          │
│                      :3004                                  │
├─────────────────────────────────────────────────────────────┤
│  • Public-facing API (all external requests)                │
│  • Authentication middleware (session validation)           │
│  • Rate limiting (Redis sliding window)                     │
│  • Security headers (CORS, CSP, CSRF)                       │
│  • Business logic (checkout, webhooks, license checks)      │
│  • Payment provider integration                             │
│                                                             │
│  Routes: /v1/auth, /v1/me, /v1/payment, /v1/admin           │
│  Tech: Hono + Drizzle ORM + Redis                           │
└──────────────┬──────────────┬──────────────┬────────────────┘
               │              │              │
               ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Core Service                              │
│                      :3003                                   │
├──────────────────────────────────────────────────────────────┤
│  • Internal-only service (not publicly accessible)           │
│  • User/project/app CRUD                                     │
│  • Session creation & validation                             │
│  • Email verification & magic links                          │
│  • OAuth state management                                    │
│  • Admin operations (manual licensing)                       │
│                                                              │
│  Routes: /v1/auth, /v1/email, /v1/license, /v1/admin         │
│  Tech: Hono + Drizzle ORM + Redis                            │
│  Security: X-Proofa-Service-Token required                   │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    Worker Service                            │
│                    (Planned Phase 1)                         │
├──────────────────────────────────────────────────────────────┤
│  • Background job processing (BullMQ/Inngest)                │
│  • Webhook retry logic (exponential backoff)                 │
│  • License expiration checks (daily cron)                    │
│  • Email queue (transactional emails)                        │
│  • Subscription renewal reminders                            │
│  • Analytics aggregation                                     │
│  • Cache warming (license preloading)                        │
│  • Cleanup tasks (expired sessions, old logs)                │
│                                                              │
│  Tech: Node.js + BullMQ + Redis Queues                       │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
         ┌──────────────────────────────────────────┐
         │         Data & Cache Layer               │
         ├──────────────────┬───────────────────────┤
         │   PostgreSQL 16  │        Redis 7        │
         │   (Drizzle ORM)  │   (Sessions/Cache/    │
         │                  │    Queues)            │
         └──────────────────┴───────────────────────┘
```

### 1.2 Service Responsibilities

#### **Gateway Service** (`apps/gateway/`)

**Purpose**: Public-facing API gateway with authentication and business logic

**Port**: 3004  
**Framework**: Hono  
**Database**: PostgreSQL (via Drizzle ORM)  
**Cache**: Redis  

**Responsibilities**:
- ✅ **Authentication**: Session validation via `proofa_user_session` cookie
- ✅ **Rate Limiting**: Redis-based sliding window
  - Auth endpoints: 10 requests / 5 minutes
  - API endpoints: 100 requests / minute
  - Public endpoints: 1000 requests / minute
- ✅ **Security**:
  - CORS configuration
  - CSP headers
  - CSRF protection (admin routes)
  - Security headers middleware
- ✅ **Payment Flows**:
  - Checkout creation (Stripe/LS/Dodo)
  - Webhook processing
  - License status checks
  - Plan catalog
- ✅ **User Management**: Profile, sessions, preferences

**Routes**:
```
# Commerce APIs (app-facing)
GET  /v1/payment/plans/:appId          # Catalog
POST /v1/payment/checkout              # Create checkout
GET  /v1/payment/license/:appId        # License status

# Webhooks (provider-specific, signature verification required)
POST /v1/webhooks/stripe               # Stripe webhook
POST /v1/webhooks/lemonsqueezy         # Lemonsqueezy webhook
POST /v1/webhooks/dodo                 # Dodo webhook

# User APIs
GET  /v1/me                            # User profile
GET  /v1/me/sessions                   # User sessions
DELETE /v1/me/sessions/:id             # Delete session

# Auth APIs
POST /v1/auth/logout                   # Logout
GET  /v1/auth/status                   # Auth status

# Admin APIs
GET  /v1/admin/*                       # Admin operations
POST /v1/admin/*                       # Admin write ops
```

**Implementation Files**:
- `apps/gateway/src/routes/payments.ts` - Payment routes
- `apps/gateway/src/routes/auth.ts` - Auth routes
- `apps/gateway/src/routes/me.ts` - User routes
- `apps/gateway/src/routes/admin.ts` - Admin routes
- `apps/gateway/src/middleware/auth.ts` - Auth middleware
- `apps/gateway/src/middleware/rateLimit.ts` - Rate limiting
- `apps/gateway/src/middleware/csrf.ts` - CSRF protection

---

#### **Core Service** (`apps/core/`)

**Purpose**: Internal service for core operations (not publicly accessible)

**Port**: 3003  
**Framework**: Hono  
**Database**: PostgreSQL (via Drizzle ORM)  
**Cache**: Redis  

**Responsibilities**:
- ✅ **User Management**: CRUD operations
- ✅ **Session Management**:
  - Session creation
  - Session validation
  - Rolling TTL updates
  - Session revocation
- ✅ **OAuth Flows**:
  - Provider configuration
  - State management
  - Token exchange
- ✅ **Email Operations**:
  - Verification codes (OTP)
  - Magic links
  - Transactional emails
- ✅ **Admin Operations**:
  - Manual license assignment
  - User invitations
  - Project/app management

**Routes** (Internal Only - Requires `X-Proofa-Service-Token`):
```
POST /v1/auth/session/exchange         # Validate session
POST /v1/auth/session/rolling-update   # Update session TTL
POST /v1/auth/session/revoke           # Revoke session

GET  /v1/license/:userId               # Get user licenses
POST /v1/admin/licenses                # Create manual license

POST /v1/email/verify                  # Send verification email
POST /v1/email/magic-link              # Send magic link
```

**Implementation Files**:
- `apps/core/src/routes/v1/auth/` - Auth routes
- `apps/core/src/routes/v1/email/` - Email routes
- `apps/core/src/routes/v1/license/` - License routes
- `apps/core/src/routes/v1/admin/` - Admin routes

**Security**:
- Not publicly accessible (internal network only)
- Requires `X-Proofa-Service-Token` header for all requests
- Gateway → Core communication only

---

#### **Worker Service** (`apps/worker/` - Planned)

**Purpose**: Background job processing and scheduled tasks

**Status**: 🚧 **Planned for Phase 1 - Not Yet Implemented**

**Tech Stack**:
- Node.js runtime
- BullMQ or Inngest for job queue
- Redis for queue storage
- Drizzle ORM for database access

**Responsibilities**:

1. **Webhook Retry Logic** 🔴 **Critical**
   - Monitor `webhook_logs` for `status = 'failed'`
   - Exponential backoff: 1min, 5min, 15min, 1hr, 6hr
   - Max 5 retries
   - Alert admin after final failure

2. **License Expiration Checks** 🔴 **Critical**
   - Daily cron (3 AM UTC)
   - Find licenses with `valid_until < NOW()`
   - Update `status = 'expired'`
   - Send renewal reminders (7 days before expiration)

3. **Email Queue** 🟡 **Important**
   - Process transactional emails async
   - Retry failed sends
   - Track delivery status

4. **Subscription Renewal Reminders** 🟡 **Important**
   - Send reminders 7 days before renewal
   - Send "payment failed" alerts
   - Send "subscription cancelled" confirmations

5. **Analytics Aggregation** 🟢 **Nice-to-have**
   - Daily active users (DAU)
   - Monthly active users (MAU)
   - Revenue metrics (MRR, ARR)
   - License distribution by plan

6. **Cache Warming** 🟢 **Performance**
   - Preload frequently accessed licenses
   - Warm up session data
   - Pre-generate reports

7. **Cleanup Tasks** 🟢 **Maintenance**
   - Delete expired sessions (older than 365 days + 7 days grace)
   - Archive old webhook logs (older than 90 days)
   - Prune old audit logs (older than 2 years)

**Job Definitions** (Example using BullMQ):
```typescript
// apps/worker/src/jobs/webhook-retry.ts
export const webhookRetryJob = {
  name: 'webhook-retry',
  schedule: '*/5 * * * *', // Every 5 minutes
  
  async handler() {
    const failedWebhooks = await db
      .select()
      .from(webhook_logs)
      .where(and(
        eq(webhook_logs.status, 'failed'),
        lt(webhook_logs.retry_count, 5),
        // Last retry was > exponential backoff time
        or(
          isNull(webhook_logs.last_retry_at),
          sql`NOW() - last_retry_at > INTERVAL '${getBackoffMinutes(webhook_logs.retry_count)} minutes'`
        )
      ));
    
    for (const webhook of failedWebhooks) {
      await retryWebhook(webhook);
    }
  }
};

// apps/worker/src/jobs/license-expiration.ts
export const licenseExpirationJob = {
  name: 'license-expiration',
  schedule: '0 3 * * *', // Daily at 3 AM UTC
  
  async handler() {
    // Find expired licenses
    const expiredLicenses = await db
      .update(licenses)
      .set({ status: 'expired', updated_at: new Date() })
      .where(and(
        lt(licenses.valid_until, new Date()),
        eq(licenses.status, 'active')
      ))
      .returning();
    
    // Send notifications
    for (const license of expiredLicenses) {
      await emailQueue.add('license-expired', { licenseId: license.id });
    }
  }
};
```

**Implementation Plan**:
1. Create `apps/worker/` directory
2. Install BullMQ: `pnpm add bullmq`
3. Create job definitions in `apps/worker/src/jobs/`
4. Create queue processors in `apps/worker/src/processors/`
5. Add monitoring (Bull Board or custom UI)
6. Deploy as separate service (Docker container)

---

## 2. Public ID System

### 2.1 Format

All entities use **prefixed nanoid** for public-facing IDs.

**Format**: `[3-letter prefix][0][nanoid]`

**Sizes**:
- **Standard**: 13 characters (prefix + 0 + 9 random)
- **Sessions**: 19 characters (prefix + 0 + 15 random) - Higher security

**Alphabet**: `0123456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ`  
(Excludes: `i`, `I`, `l`, `L`, `o`, `O` for clarity)

### 2.2 Examples

```
USR0xY7mK9pQz           # User (13 chars)
SES0abc123xyz456789     # Session (19 chars - high security)
PRJ0mNp4Kd8Hz           # Project (13 chars)
APP0qR5tV9wXy           # App (13 chars)
PLN0zAb7cD2eF           # Plan (13 chars)
LIC0gH8jK3mNo           # License (13 chars)
TXN0pQ9rS4tUv           # Transaction (13 chars)
PRO0wX5yZ8aBC           # Promotion (13 chars)
PRC0dE7fG2hIj           # Promotion Code (13 chars)
WHL0kL9mN4pQr           # Webhook Log (13 chars)
CFG0sT8uV3wXy           # Payment Config (13 chars)
PPP0kMn9pQrSt           # Plan Provider Price (13 chars - Phase 2)
PUR0tUv4wXy2zA          # Purchase (13 chars - Phase 2)
```

### 2.3 Implementation

**Location**: `packages/shared/src/id.ts`

```typescript
import { customAlphabet } from "nanoid";

// Custom alphabet excluding confusing characters
const ALPHABET = "0123456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ";

// Generators
const nano9 = customAlphabet(ALPHABET, 9);   // Standard
const nano15 = customAlphabet(ALPHABET, 15); // Sessions

export const id = {
  user: () => `USR0${nano9()}`,
  session: () => `SES0${nano15()}`,
  project: () => `PRJ0${nano9()}`,
  app: () => `APP0${nano9()}`,
  plan: () => `PLN0${nano9()}`,
  license: () => `LIC0${nano9()}`,
  transaction: () => `TXN0${nano9()}`,
  promotion: () => `PRO0${nano9()}`,
  promotionCode: () => `PRC0${nano9()}`,
  webhookLog: () => `WHL0${nano9()}`,
  paymentConfig: () => `CFG0${nano9()}`,
  // ... more types
} as const;

// Usage in code
const newLicense = await db.insert(licenses).values({
  public_id: id.license(),  // LIC0gH8jK3mNo
  user_id: userId,
  app_id: appId,
  plan_id: planId,
  // ...
});
```

### 2.4 Validation

```typescript
export const idPatterns = {
  user: /^USR0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  session: /^SES0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{15}$/,
  // ... more patterns
};

export function validateId(type: keyof typeof idPatterns, idValue: string): boolean {
  return idPatterns[type].test(idValue);
}
```

---

## 3. Database Schema

### 3.1 Plans Table (Entitlements Only)

**Location**: `packages/db/src/schema.ts`

**Key Change**: Plans table defines **entitlements only** (features, limits, trial settings). Pricing is stored separately in `plan_provider_prices` table.

```typescript
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  app_id: integer("app_id").notNull().references(() => apps.id),
  
  slug: varchar("slug", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Entitlements (JSONB) - NOT pricing
  features: jsonb("features").notNull(),
  // Example: { features: ["api_access"], limits: { max_api_calls: 10000 } }
  
  // Settings (not pricing-dependent)
  duration_days: integer("duration_days"),       // null = recurring
  trial_enabled: boolean("trial_enabled").notNull().default(false),
  trial_days: integer("trial_days"),
  display_order: integer("display_order").notNull().default(0),
  
  is_active: boolean("is_active").notNull().default(true),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique("plans_app_slug_unique").on(table.app_id, table.slug),
  index("plans_app_id_idx").on(table.app_id),
  index("plans_slug_idx").on(table.slug),
]);
```

**Why This Design**:
- ✅ Plans are provider-agnostic (entitlements work with any provider)
- ✅ One plan can have prices across multiple providers/countries
- ✅ No Phase 2 rework: pricing logic isolated from entitlements
- ✅ Prevents misleading columns (old inline prices becoming unused)

---

### 3.1b Plan Provider Prices Table (NEW)

**Location**: `packages/db/src/schema.ts`

```typescript
export const plan_provider_prices = pgTable(
  "plan_provider_prices",
  {
    id: serial("id").primaryKey(),
    public_id: varchar("public_id", { length: 255 }).notNull().unique(),
    
    plan_id: integer("plan_id")
      .notNull()
      .references(() => plans.id),
    
    provider_config_id: integer("provider_config_id")
      .notNull()
      .references(() => payment_provider_configs.id),
    
    // Billing structure
    billing_type: varchar("billing_type", { length: 20 }).notNull(),
    // 'recurring' | 'one_time'
    
    interval: varchar("interval", { length: 20 }),
    // 'month' | 'year' | null (for one_time)
    
    // Price details
    amount_cents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    
    // Provider reference (populated when provider creates coupon/price)
    provider_price_id: varchar("provider_price_id", { length: 255 }),
    // Stripe: price_123
    // Lemonsqueezy: variant_456
    // Dodo: price_789
    
    is_active: boolean("is_active").notNull().default(true),
    
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("plan_provider_prices_unique").on(
      table.plan_id,
      table.provider_config_id,
      table.billing_type,
      table.interval
    ),
    index("plan_provider_prices_plan_id_idx").on(table.plan_id),
    index("plan_provider_prices_config_id_idx").on(table.provider_config_id),
    index("plan_provider_prices_billing_type_idx").on(table.billing_type),
  ]
);
```

**Why Now (Not Phase 2)**:
- Even though Phase 1 has only 1 provider, structuring pricing separately prevents rework
- Catalog API queries become: `SELECT * FROM plan_provider_prices WHERE plan_id = ? AND payment_provider_id = ?`
- Phase 2 just adds more rows; no schema migration needed
- Zero cost to implement now; huge cost to refactor later

---

### 3.2 Payment Provider Configs Table (Renamed)

**Naming Note**: This table stores **provider configurations** (credentials, webhook secrets), not a provider registry. We use `payment_provider_configs` to distinguish from a future `providers` registry table that would just list supported payment methods.

```typescript
export const payment_provider_configs = pgTable("payment_provider_configs", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  name: varchar("name", { length: 255 }),
  slug: varchar("slug", { length: 255 }),
  
  // Multi-tenancy
  entity_type: varchar("entity_type", { length: 20 }).notNull(),
  // 'platform', 'project', 'app'
  entity_id: integer("entity_id"),  // null for platform, project_id or app_id
  
  // Provider details
  provider: varchar("provider", { length: 50 }).notNull(),
  // 'stripe', 'lemonsqueezy', 'dodo'
  environment: varchar("environment", { length: 20 }).notNull(),
  // 'test', 'production'
  
  // Credentials (encrypted at app layer)
  credentials: text("credentials").notNull(),
  previous_credentials: text("previous_credentials"),
  credentials_rotated_at: timestamp("credentials_rotated_at"),
  webhook_secret: text("webhook_secret"),
  
  is_active: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"),
  
  // Audit
  created_by_user_id: integer("created_by_user_id").references(() => users.id),
  updated_by_user_id: integer("updated_by_user_id").references(() => users.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
}, (table) => [
  index("payment_provider_configs_entity_idx").on(table.entity_type, table.entity_id),
  index("payment_provider_configs_provider_idx").on(table.provider),
  unique("payment_provider_configs_entity_provider_env_unique").on(
    table.entity_type, table.entity_id, table.provider, table.environment
  ),
]);
```

**Apps Link**:
```typescript
export const apps = pgTable("apps", {
  // ... other fields
  selected_provider_config_id: integer("selected_provider_config_id"),
  // Phase 1: Points to default provider config
});
```

---

### 3.3 Licenses Table (Current State Only)

**Purpose**: Authoritative current access state. Fast reads, simple queries.

```typescript
export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  app_id: integer("app_id").notNull().references(() => apps.id),
  
  // Subject (Phase 1: user only, Phase 2: org)
  subject_type: varchar("subject_type", { length: 20 }).notNull().default("user"),
  // 'user' | 'org'
  subject_id: integer("subject_id").notNull(),
  // user_id or org_id depending on subject_type
  
  plan_id: integer("plan_id").notNull().references(() => plans.id),
  
  status: varchar("status", { length: 20 }).notNull().default("active"),
  // 'active', 'past_due', 'grace', 'cancelled', 'expired'
  
  // Billing state
  valid_until: timestamp("valid_until"),  // null = lifetime
  provider_config_id: integer("provider_config_id").references(() => payment_provider_configs.id),
  provider_subscription_id: varchar("provider_subscription_id", { length: 255 }),
  // Stripe: sub_123, LS: sub_456, etc.
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  // CRITICAL: Exactly one license per subject per app
  unique("licenses_app_subject_unique").on(table.app_id, table.subject_type, table.subject_id),
  index("licenses_app_id_idx").on(table.app_id),
  index("licenses_subject_idx").on(table.subject_type, table.subject_id),
  index("licenses_status_idx").on(table.status),
]);
```

**Why Split into Two Tables?**
- `licenses` = fast reads ("does user have access?")
- `license_history` = audit trail ("what changed?")
- No partial indexes needed
- Simple queries: `SELECT * FROM licenses WHERE app_id = ? AND subject_type = 'user' AND subject_id = ?`

---

### 3.3b License History Table (Append-Only Audit Trail)

**Purpose**: Record every meaningful license transition. Never updated, only inserted.

```typescript
export const license_history = pgTable("license_history", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  license_id: integer("license_id").notNull().references(() => licenses.id),
  app_id: integer("app_id").notNull().references(() => apps.id),
  
  subject_type: varchar("subject_type", { length: 20 }).notNull(),
  subject_id: integer("subject_id").notNull(),
  
  // Transition
  from_plan_id: integer("from_plan_id").references(() => plans.id),  // null for purchase
  to_plan_id: integer("to_plan_id").notNull().references(() => plans.id),
  
  from_status: varchar("from_status", { length: 20 }),  // null for purchase
  to_status: varchar("to_status", { length: 20 }).notNull(),
  
  // Why
  reason: varchar("reason", { length: 50 }).notNull(),
  // 'purchase' | 'renewal' | 'upgrade' | 'downgrade' | 'cancel' | 'refund' | 'expiry' | 'admin_manual'
  
  // Context
  provider_config_id: integer("provider_config_id").references(() => payment_provider_configs.id),
  provider_event_id: varchar("provider_event_id", { length: 255 }),
  // Stripe: evt_xyz, LS: evt_abc, etc.
  
  payment_transaction_id: integer("payment_transaction_id").references(() => payment_transactions.id),
  promotion_id: integer("promotion_id").references(() => promotions.id),  // Phase 2
  
  // Timestamps
  effective_at: timestamp("effective_at").notNull(),  // When change became active
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  // For fast history lookup
  index("license_history_license_id_idx").on(table.license_id),
  index("license_history_app_id_idx").on(table.app_id),
  index("license_history_subject_idx").on(table.subject_type, table.subject_id),
  index("license_history_reason_idx").on(table.reason),
  index("license_history_effective_at_idx").on(table.effective_at),
  index("license_history_provider_event_idx").on(table.provider_event_id),
]);
```

**Public ID Format**: `LHI0` + 9 random chars (e.g., `LHI0aB1cD2eF`)  
**Append-only**: Never updated. One row per meaningful change.

---

### 3.3c Important: Keep Webhook Events Separate

Do NOT use `license_history` for webhook idempotency. Keep them separate:

- `webhook_logs` = "Did we process this event?" (dedupe by provider_event_id)
- `license_history` = "What happened as a result?" (business timeline only)

Webhook can fail but not create history. History row only inserted on successful processing.
- Phase 1: `UNIQUE(user_id, app_id)` prevents duplicate active licenses
- Phase 2: Change to `UNIQUE(app_id, subject_type, subject_id)` for org support

---

### 3.4 Purchases Table (Checkout Sessions → Transactions)

**Purpose**: Link checkout request to its outcome. Binds plan, price, promo, and provider into a single record.

```typescript
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  app_id: integer("app_id").notNull().references(() => apps.id),
  
  // Subject (Phase 1: user only, Phase 2: org)
  subject_type: varchar("subject_type", { length: 20 }).notNull().default("user"),
  subject_id: integer("subject_id").notNull(),
  
  // What was ordered
  plan_provider_price_id: integer("plan_provider_price_id").notNull().references(() => plan_provider_prices.id),
  
  // Provider routing
  provider_config_id: integer("provider_config_id").notNull().references(() => payment_provider_configs.id),
  
  // Optional promo
  promotion_code_id: integer("promotion_code_id").references(() => promotion_codes.id),
  
  // Checkout session tracking
  provider_session_id: varchar("provider_session_id", { length: 255 }),
  // Stripe: cs_123, Lemonsqueezy: sess_abc, Dodo: checkout_xyz
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  // 'pending' (checkout created) | 'completed' (payment succeeded) | 'expired' | 'abandoned' | 'failed'
  
  // Link to result
  payment_transaction_id: integer("payment_transaction_id").references(() => payment_transactions.id),
  // Set when status = 'completed'
  
  // Audit
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("purchases_app_id_idx").on(table.app_id),
  index("purchases_subject_idx").on(table.subject_type, table.subject_id),
  index("purchases_status_idx").on(table.status),
  index("purchases_provider_session_id_idx").on(table.provider_session_id),
  index("purchases_payment_transaction_id_idx").on(table.payment_transaction_id),
]);
```

**Public ID Format**: `PUR0` + 9 random chars (e.g., `PUR0xY7mK9pQz`)

**Design Rationale**:
- One record per checkout attempt
- Captures everything needed for Phase 2 routing (provider_config_id, price_id, promo_id)
- Atomic binding: if any field changes, it's a new purchase
- Easy reconciliation: provider_session_id → payment_transaction_id → license update

**Phase 1 Checkout Flow**:
1. Client: `POST /v1/payment/checkout` with `planProviderPriceId`, `promoCode` (optional)
2. Gateway: Create purchase row → Get checkout URL from provider
3. Client: Redirects to provider checkout
4. Provider: User completes payment
5. Provider: Webhook fired with `provider_session_id`
6. Gateway/Worker: Webhook handler finds purchase by `provider_session_id` → creates payment_transaction → updates licenses

---

### 3.5 Payment Transactions Table

```typescript
export const payment_transactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  // Link to purchase & license
  purchase_id: integer("purchase_id").notNull().references(() => purchases.id),
  license_id: integer("license_id").notNull().references(() => licenses.id),
  
  provider_config_id: integer("provider_config_id").notNull().references(() => payment_provider_configs.id),
  provider: varchar("provider", { length: 50 }).notNull(),
  // Denormalized convenience: Stripe | Lemonsqueezy | Dodo
  provider_transaction_id: varchar("provider_transaction_id", { length: 255 }).notNull(),
  provider_customer_id: varchar("provider_customer_id", { length: 255 }),
  
  type: varchar("type", { length: 50 }).notNull(),
  // 'purchase', 'renewal', 'refund', 'chargeback', 'manual_adjustment'
  status: varchar("status", { length: 20 }).notNull(),
  // 'success', 'failed', 'pending', 'disputed'
  
  amount_cents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  
  // Discount tracking
  discount_applied_cents: integer("discount_applied_cents").notNull().default(0),
  // How much discount provider actually applied (0 if promo didn't pass provider validation)
  discount_applied: boolean("discount_applied").notNull().default(false),
  // Explicit flag: did provider successfully apply discount?
  
  // Promotions
  promotion_id: integer("promotion_id").references(() => promotions.id),
  promotion_code_id: integer("promotion_code_id").references(() => promotion_codes.id),
  provider_discount_id: varchar("provider_discount_id", { length: 255 }),
  
  metadata: jsonb("metadata"),
  description: text("description"),
  
  transaction_date: timestamp("transaction_date").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  
  // Disputes
  dispute_reason: varchar("dispute_reason", { length: 255 }),
  resolved_at: timestamp("resolved_at"),
  
  // Admin audit
  created_by_user_id: integer("created_by_user_id").references(() => users.id),
  notes: text("notes"),
}, (table) => [
  index("payment_transactions_license_id_idx").on(table.license_id),
  index("payment_transactions_purchase_id_idx").on(table.purchase_id),
  index("payment_transactions_provider_transaction_idx").on(table.provider_transaction_id),
  index("payment_transactions_provider_config_id_idx").on(table.provider_config_id),
  index("payment_transactions_type_idx").on(table.type),
  index("payment_transactions_status_idx").on(table.status),
  index("payment_transactions_transaction_date_idx").on(table.transaction_date),
  index("payment_transactions_promotion_id_idx").on(table.promotion_id),
  unique("payment_transactions_provider_id_unique").on(
    table.provider_config_id, table.provider_transaction_id
  ),
]);
```

**Why `provider_config_id` + `provider_transaction_id` is the unique key?**
- Provider IDs (transaction_id) are only unique within that provider
- Same transaction_id could theoretically exist across different providers/configs
- `provider_config_id` ensures we can route to the right secrets/API

**Why keep `provider` string?**
- Denormalized convenience (avoid FK lookup in queries)
- Must trust `provider_config_id` for secrets/routing
- String is for analytics/logging only

**Discount Tracking**:
- `discount_applied_cents`: How much discount provider actually applied (0 if failed)
- `discount_applied`: Boolean flag (did provider successfully apply discount?)
- Why two fields? Some analytics tools need cent amount; some need boolean truth. Both are useful.

---

### 3.6 Webhook Logs Table

```typescript
export const webhook_logs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  provider: varchar("provider", { length: 50 }).notNull(),
  event_type: varchar("event_type", { length: 100 }).notNull(),
  event_id: varchar("event_id", { length: 255 }),
  
  request_body: jsonb("request_body").notNull(),
  request_headers: jsonb("request_headers"),
  signature: text("signature"),
  ip_address: varchar("ip_address", { length: 50 }),
  
  status: varchar("status", { length: 20 }).notNull().default("not_started"),
  // 'not_started', 'processing', 'completed', 'failed', 'signature_failed', 'skipped'
  
  received_at: timestamp("received_at").notNull().defaultNow(),
  processing_started_at: timestamp("processing_started_at"),
  processing_completed_at: timestamp("processing_completed_at"),
  processing_duration_ms: integer("processing_duration_ms"),
  
  payment_transaction_id: integer("payment_transaction_id").references(() => payment_transactions.id),
  license_id: integer("license_id").references(() => licenses.id),
  
  error_message: text("error_message"),
  error_stack: text("error_stack"),
  retry_count: integer("retry_count").notNull().default(0),
  last_retry_at: timestamp("last_retry_at"),
  
  response_status: integer("response_status"),
  response_body: jsonb("response_body"),
  
  metadata: jsonb("metadata"),
  notes: text("notes"),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("webhook_logs_provider_idx").on(table.provider),
  index("webhook_logs_event_type_idx").on(table.event_type),
  index("webhook_logs_event_id_idx").on(table.event_id),
  index("webhook_logs_status_idx").on(table.status),
  index("webhook_logs_received_at_idx").on(table.received_at),
  index("webhook_logs_payment_transaction_id_idx").on(table.payment_transaction_id),
  index("webhook_logs_license_id_idx").on(table.license_id),
  unique("webhook_logs_provider_event_unique").on(table.provider, table.event_id),
]);
```

**Worker Integration**: Worker service monitors `status = 'failed'` for retry logic.

---

## 4. API Endpoints

### 4.1 Catalog API (Gateway)

**Endpoint**: `GET /v1/payment/plans/:appId`  
**Auth**: None (public)  
**Implementation**: `apps/gateway/src/routes/payments.ts`

```typescript
// Request
GET /v1/payment/plans/APP0qR5tV9wXy

// Response
{
  selectedProviderConfigId: "CFG0sT8uV3wXy",
  supportsPromoCodes: true,
  plans: [
    {
      publicId: "PLN0zAb7cD2eF",
      name: "Pro Plan",
      slug: "pro",
      description: "Perfect for professionals",
      
      // Entitlements (NOT pricing)
      features: {
        features: ["api_access", "analytics"],
        limits: { max_api_calls: 10000 }
      },
      
      // Pricing via purchaseOptions (sourced from plan_provider_prices)
      purchaseOptions: [
        {
          publicId: "PPP0kMn9pQrSt",
          billingType: "recurring",
          interval: "month",
          amountCents: 2000,
          currency: "usd"
        },
        {
          publicId: "PPP0aBc3dEfGh",
          billingType: "recurring",
          interval: "year",
          amountCents: 20000,
          currency: "usd"
        }
      ]
    }
  ]
}
```

---

### 4.2 Checkout API (Gateway)

**Endpoint**: `POST /v1/payment/checkout`  
**Auth**: Required (session cookie)  
**Implementation**: `apps/gateway/src/routes/payments.ts`

```typescript
// Request
POST /v1/payment/checkout
Cookie: proofa_user_session=SES0abc123xyz456789
Content-Type: application/json

{
  "appId": "APP0qR5tV9wXy",
  "planProviderPriceId": "PPP0kMn9pQrSt",  // From purchaseOptions
  "interval": "month",
  "promoCode": "LAUNCH50"     // Optional
}

// Response
{
  "purchaseId": "PUR0xY7mK9pQz",
  "checkoutUrl": "https://checkout.stripe.com/pay/xyz",
  "sessionId": "cs_xyz123"
}
```

**Flow**:
1. Validate session (Gateway → Core)
2. Fetch plan & app
3. Get payment provider (via `selected_payment_provider_id`)
4. Create Stripe/LS/Dodo checkout session
5. Store metadata (userId, appId, planId, interval)
6. Return checkout URL

---

### 4.3 Webhook Handler (Gateway)

**Endpoints** (Provider-specific):
```
POST /v1/webhooks/stripe        # Stripe webhook
POST /v1/webhooks/lemonsqueezy  # Lemonsqueezy webhook
POST /v1/webhooks/dodo          # Dodo webhook
```

**Why Provider-Specific Routes**:
- ✅ Signature verification is provider-specific (Stripe uses HMAC-SHA256, LS uses different algo, etc.)
- ✅ Security-critical: Each provider has unique webhook secret
- ✅ Cleaner error handling (provider-specific validation failures)
- ✅ Easier to monitor/log by provider

**Implementation**: `apps/gateway/src/routes/webhooks/`

```typescript
// apps/gateway/src/routes/webhooks/stripe.ts
POST /v1/webhooks/stripe
Stripe-Signature: t=1234567890,v1=abc...
Content-Type: application/json

{ "id": "evt_xyz", "type": "checkout.session.completed", "data": {...} }

Response (200 OK):
{ "received": true, "job_id": "webhook_abc123" }
```

**Processing (Synchronous - Fast Path)**:

1. **Verify signature** (provider-specific)
   - Stripe: HMAC-SHA256 verification
   - Lemonsqueezy: Custom signature header
   - Dodo: Different algorithm
   - If invalid → return 400 (don't process)

2. **Deduplicate**
   - Check: `SELECT * FROM webhook_logs WHERE provider = 'stripe' AND event_id = 'evt_xyz'`
   - If exists → return 200 (already processed)
   - If not → continue

3. **Insert webhook_logs** (mark as `not_started`)
   ```typescript
   const webhookLog = await db.insert(webhook_logs).values({
     provider: 'stripe',
     event_type: 'checkout.session.completed',
     event_id: 'evt_xyz',
     request_body: body,
     request_headers: headers,
     signature: signature,
     ip_address: req.ip,
     status: 'not_started',
     received_at: new Date(),
   }).returning();
   ```

4. **Enqueue worker job** (fire-and-forget)
   ```typescript
   await webhookQueue.add('process-webhook', {
     webhook_log_id: webhookLog.id,
     provider: 'stripe',
     event_id: 'evt_xyz',
   });
   ```

5. **Return 200 immediately** (webhook provider waits ~5 seconds)
   ```typescript
   return res.json({ received: true, job_id: jobId });
   ```

**Why Async?**
- Webhook providers timeout after 5-30 seconds
- Processing (license creation, cache invalidation) can take longer
- Heavy DB writes/cache ops can spike latency
- Reliably retry failed processing via worker queue

---

### 4.3b Webhook Processing (Worker)

**Queue**: BullMQ `webhookQueue`  
**Concurrency**: 5 (adjust based on load)  
**Implementation**: `apps/worker/src/processors/webhook.ts`

**Processing (Asynchronous - Heavy Lifting)**:

Once worker picks up the job:

1. **Mark webhook as processing**
   ```typescript
   await db
     .update(webhook_logs)
     .set({ 
       status: 'processing',
       processing_started_at: new Date()
     })
     .where(eq(webhook_logs.id, webhook_log_id));
   ```

2. **Normalize event** (extract provider-specific data)
   ```typescript
   const normalizedEvent = normalizeStripeEvent({
     event_type: 'checkout.session.completed',
     data: body.data
   });
   // → { userId, appId, planId, interval, amount, ... }
   ```

3. **Upsert license**
   ```typescript
   const license = await upsertLicense({
     user_id: normalizedEvent.userId,
     app_id: normalizedEvent.appId,
     plan_id: normalizedEvent.planId,
     status: 'active',
     valid_until: calculateValidUntil(normalizedEvent.interval)
   });
   ```

4. **Insert payment_transaction**
   ```typescript
   const transaction = await db.insert(payment_transactions).values({
     license_id: license.id,
     provider: 'stripe',
     provider_transaction_id: normalizedEvent.stripeSessionId,
     type: 'purchase',
     status: 'success',
     amount_cents: normalizedEvent.amount,
     currency: normalizedEvent.currency,
   }).returning();
   ```

5. **Invalidate cache**
   ```typescript
   const cacheKey = `license:${license.app_id}:${license.user_id}`;
   await redis.del(cacheKey);
   ```

6. **Mark webhook as completed**
   ```typescript
   await db
     .update(webhook_logs)
     .set({
       status: 'completed',
       processing_completed_at: new Date(),
       processing_duration_ms: Date.now() - startTime,
       payment_transaction_id: transaction.id,
       license_id: license.id,
     })
     .where(eq(webhook_logs.id, webhook_log_id));
   ```

**Retry Strategy**:
- Failed job: BullMQ retries with exponential backoff (1s, 5s, 30s, 2m, 15m)
- After 5 failed attempts: Mark webhook as `failed`, alert admin
- Admin can manually reprocess via `/v1/admin/webhooks/{id}/reprocess`

---

### 4.4 License Status API (Gateway)

**Endpoint**: `GET /v1/payment/license/:appId`  
**Auth**: Required  
**Implementation**: `apps/gateway/src/routes/payments.ts`

```typescript
// Request
GET /v1/payment/license/APP0qR5tV9wXy
Cookie: proofa_user_session=SES0abc123xyz456789

// Response (Has License)
{
  "hasLicense": true,
  "license": {
    "publicId": "LIC0gH8jK3mNo",
    "status": "active",
    "validUntil": "2027-01-04T12:00:00Z",
    "isValid": true
  }
}

// Response (No License)
{
  "hasLicense": false,
  "error": "No active license"
}
```

**Caching**:
```typescript
const cacheKey = `license:${app.id}:${user.userId}`;
const cached = await redis.get(cacheKey);

if (!cached) {
  const license = await db.query(...);
  await redis.setex(cacheKey, 300, JSON.stringify(license)); // 5 min TTL
}
```

---

### 4.5 Internal APIs (Core)

**Not publicly accessible** - Gateway → Core only

**Session Exchange**:
```typescript
POST /v1/auth/session/exchange
X-Proofa-Service-Token: [internal_token]

{ "sessionId": "SES0abc123xyz456789" }

→ Returns { userId, email, ... } if valid
```

**Session Rolling Update**:
```typescript
POST /v1/auth/session/rolling-update
X-Proofa-Service-Token: [internal_token]

{ "sessionId": "SES0abc123xyz456789" }

→ Updates last_seen_at and expires_at
```

---

## 5. Promotions (Semantics Locked)

### 5.1 Promotion Application Rules

**Definition**: A promotion is valid only if the provider confirms it.

**Rules**:

1. **Proofa Always Validates + Records**
   - Check promotion eligibility at checkout creation
   - Verify redemption limit (once per user/org)
   - Check eligibility rules (new customer only, min amount, date window)
   - Record in `promotion_redemptions`

2. **Provider Must Support Discount**
   - **If provider supports coupons/discounts** (Stripe, Lemonsqueezy, Dodo):
     - Pass provider coupon/discount ID in checkout
     - Provider applies discount
     - Proofa records usage
   
   - **If provider doesn't support coupons**:
     - Block the promo (return error)
     - Don't pretend it applied
   
   - **If manual workaround needed** (Phase 2):
     - Use `promotion_provider_refs` to map Proofa promotion → provider discount
     - Handle provider-specific coupon creation

3. **Promotion Codes Map to Promotions**
   - One promotion can have multiple codes
   - Codes enable tracking/attribution (e.g., LAUNCH50 vs EARLYBIRD50)
   - All codes for same promotion share eligibility rules

### 5.2 Example Flow

```
User enters code: LAUNCH50
  ↓
Gateway API: POST /v1/payment/checkout
  ↓
Validate promo in Proofa:
  ✓ Code exists and is active
  ✓ Promotion is within date window
  ✓ User hasn't redeemed before (unique constraint)
  ✓ User qualifies (new customer, min amount, etc.)
  ↓
Check provider support:
  ✓ Stripe has coupon mapped (promotion_provider_refs)
  ↓
Create Stripe checkout with coupon:
  stripe.checkout.sessions.create({
    line_items: [...],
    discounts: [{ coupon: 'co_stripe_abc' }]  ← Provider coupon ID
  })
  ↓
Record in promotion_redemptions:
  { app_id, promotion_id, promotion_code_id, subject_type: 'user', subject_id, status: 'pending' }
  ↓
User completes checkout
  ↓
Webhook: checkout.session.completed
  ↓
Worker updates promotion_redemptions:
  { status: 'completed', redeemed_at: now }
```

### 5.3 Schema (Phase 1)

**Promotions** - Campaign definition
```typescript
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  app_id: integer("app_id").notNull().references(() => apps.id),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Discount terms
  discount_type: varchar("discount_type", { length: 20 }).notNull(),
  // 'percent' | 'amount' (in cents)
  discount_value: integer("discount_value").notNull(),
  
  // Duration
  duration_type: varchar("duration_type", { length: 20 }).notNull(),
  // 'once' | 'cycles' (number of billing cycles)
  duration_cycles: integer("duration_cycles"),
  
  // Eligibility rules
  is_new_customers_only: boolean("is_new_customers_only"),
  min_amount_cents: integer("min_amount_cents"),
  allowed_intervals: jsonb("allowed_intervals"),  // ['month', 'year']
  
  // Validity window
  starts_at: timestamp("starts_at"),
  ends_at: timestamp("ends_at"),
  
  is_active: boolean("is_active").notNull().default(true),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("promotions_app_id_idx").on(table.app_id),
  index("promotions_is_active_idx").on(table.is_active),
]);
```

**Promotion Codes** - User-facing codes
```typescript
export const promotion_codes = pgTable("promotion_codes", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  promotion_id: integer("promotion_id").notNull().references(() => promotions.id),
  code: varchar("code", { length: 100 }).notNull().unique(),
  // LAUNCH50, EARLYBIRD50, FRIEND50 (same promotion, different tracking)
  
  usage_limit: integer("usage_limit"),  // null = unlimited
  used_count: integer("used_count").notNull().default(0),
  
  is_active: boolean("is_active").notNull().default(true),
  
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("promotion_codes_promotion_id_idx").on(table.promotion_id),
  index("promotion_codes_code_idx").on(table.code),
  index("promotion_codes_is_active_idx").on(table.is_active),
]);
```

**Promotion Redemptions** - Usage tracking
```typescript
export const promotion_redemptions = pgTable("promotion_redemptions", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  promotion_id: integer("promotion_id").references(() => promotions.id),
  promotion_code_id: integer("promotion_code_id").references(() => promotion_codes.id),
  
  app_id: integer("app_id").notNull().references(() => apps.id),
  
  // Subject (Phase 1: user only, Phase 2: org)
  subject_type: varchar("subject_type", { length: 20 }).notNull().default("user"),
  // 'user' | 'org'
  subject_id: integer("subject_id").notNull(),
  // user_id or org_id depending on subject_type
  
  status: varchar("status", { length: 20 }).notNull(),
  // 'pending' (at checkout) | 'completed' (after payment)
  
  applied_at: timestamp("applied_at"),  // Checkout time
  redeemed_at: timestamp("redeemed_at"),  // Payment confirmed
  
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("promotion_redemptions_promotion_id_idx").on(table.promotion_id),
  index("promotion_redemptions_app_id_idx").on(table.app_id),
  index("promotion_redemptions_subject_idx").on(table.subject_type, table.subject_id),
  index("promotion_redemptions_status_idx").on(table.status),
]);
```

**Phase 1 Note**: `subject_type = 'user'` and `subject_id = user_id`. In Phase 2, add `subject_type = 'org'` support without schema migration.

**Promotion Provider Refs** (Phase 2)
```typescript
export const promotion_provider_refs = pgTable(
  "promotion_provider_refs",
  {
    promotion_id: integer("promotion_id").references(() => promotions.id),
    provider_config_id: integer("provider_config_id").references(() => payment_provider_configs.id),
    
    provider_object_id: varchar("provider_object_id", { length: 255 }),
    // Stripe: coupon_abc, discount_xyz
    // Lemonsqueezy: modifier_123
    // Dodo: discount_456
    
    provider_object_type: varchar("provider_object_type", { length: 50 }),
    // 'coupon' | 'discount' | 'modifier' | 'subscription_discount'
    // ...
  }
);
```

---

## 6. Worker Service (Planned)

### 6.1 Job Definitions

#### Webhook Retry Job

**Schedule**: Every 5 minutes (via BullMQ repeating job)  
**Priority**: 🔴 Critical  
**Trigger**: Worker polls failed webhooks from queue

```typescript
// apps/worker/src/processors/webhook-retry.ts
// This is DIFFERENT from the sync webhook processing above
// This handles retries of already-failed webhooks

export const webhookRetryProcessor = async (job: Job) => {
  const failedWebhooks = await db
    .select()
    .from(webhook_logs)
    .where(and(
      eq(webhook_logs.status, 'failed'),
      lt(webhook_logs.retry_count, 5),
      canRetryNow(webhook_logs.last_retry_at, webhook_logs.retry_count)
    ))
    .limit(100);
  
  for (const webhook of failedWebhooks) {
    // Attempt to reprocess
    try {
      await processWebhook(webhook);
      webhook.status = 'completed';
      webhook.retry_count += 1;
    } catch (error) {
      webhook.status = 'failed';
      webhook.retry_count += 1;
      webhook.error_message = error.message;
      
      if (webhook.retry_count >= 5) {
        // Alert admin
        await notifyAdmin('Webhook failed after 5 retries', webhook);
      }
    }
    
    await db.update(webhook_logs).set(webhook);
  }
};

// Exponential backoff: 1min, 5min, 15min, 1hr, 6hr
function getBackoffMinutes(retryCount: number): number {
  const backoffs = [1, 5, 15, 60, 360];
  return backoffs[Math.min(retryCount, backoffs.length - 1)];
}
```

---

#### License Expiration Job

**Schedule**: Daily at 3 AM UTC  
**Priority**: 🔴 Critical

```typescript
// apps/worker/src/jobs/license-expiration.ts
export const licenseExpirationJob = {
  name: 'license-expiration',
  schedule: '0 3 * * *',
  
  async handler() {
    // Mark expired licenses
    const expired = await db
      .update(licenses)
      .set({ status: 'expired', updated_at: new Date() })
      .where(and(
        lt(licenses.valid_until, new Date()),
        inArray(licenses.status, ['active', 'past_due'])
      ))
      .returning();
    
    // Queue expiration emails
    for (const license of expired) {
      await emailQueue.add('license-expired', { licenseId: license.id });
    }
    
    // Invalidate caches
    for (const license of expired) {
      await redis.del(`license:${license.app_id}:${license.user_id}`);
    }
  }
};
```

---

#### Renewal Reminder Job

**Schedule**: Daily at 9 AM UTC  
**Priority**: 🟡 Important

```typescript
// apps/worker/src/jobs/renewal-reminder.ts
export const renewalReminderJob = {
  name: 'renewal-reminder',
  schedule: '0 9 * * *',
  
  async handler() {
    // Find licenses expiring in 7 days
    const expiringIn7Days = await db
      .select()
      .from(licenses)
      .leftJoin(users, eq(licenses.user_id, users.id))
      .leftJoin(apps, eq(licenses.app_id, apps.id))
      .leftJoin(plans, eq(licenses.plan_id, plans.id))
      .where(and(
        eq(licenses.status, 'active'),
        between(
          licenses.valid_until,
          new Date(),
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        )
      ));
    
    // Queue reminder emails
    for (const { license, user, app, plan } of expiringIn7Days) {
      await emailQueue.add('renewal-reminder', {
        email: user.primary_email,
        userName: user.name,
        appName: app.name,
        planName: plan.name,
        expiresAt: license.valid_until
      });
    }
  }
};
```

---

#### Analytics Aggregation Job

**Schedule**: Daily at 4 AM UTC  
**Priority**: 🟢 Nice-to-have

```typescript
// apps/worker/src/jobs/analytics-aggregation.ts
export const analyticsAggregationJob = {
  name: 'analytics-aggregation',
  schedule: '0 4 * * *',
  
  async handler() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Daily Active Users (DAU)
    const dau = await db
      .select({ count: sql`COUNT(DISTINCT user_id)` })
      .from(sessions)
      .where(gte(sessions.last_seen_at, yesterday));
    
    // Monthly Recurring Revenue (MRR)
    const mrr = await db
      .select({ total: sql`SUM(monthly_price)` })
      .from(licenses)
      .leftJoin(plans, eq(licenses.plan_id, plans.id))
      .where(eq(licenses.status, 'active'));
    
    // License distribution by plan
    const distribution = await db
      .select({
        plan_slug: plans.slug,
        count: sql`COUNT(*)`,
      })
      .from(licenses)
      .leftJoin(plans, eq(licenses.plan_id, plans.id))
      .where(eq(licenses.status, 'active'))
      .groupBy(plans.slug);
    
    // Store in analytics table
    await db.insert(daily_analytics).values({
      date: yesterday,
      dau: dau[0].count,
      mrr: mrr[0].total,
      license_distribution: distribution,
    });
  }
};
```

---

#### Cleanup Job

**Schedule**: Weekly (Sunday 2 AM UTC)  
**Priority**: 🟢 Maintenance

```typescript
// apps/worker/src/jobs/cleanup.ts
export const cleanupJob = {
  name: 'cleanup',
  schedule: '0 2 * * 0', // Weekly on Sunday
  
  async handler() {
    const now = new Date();
    
    // Delete expired sessions (older than 365 + 7 days)
    const sessionCutoff = new Date(now);
    sessionCutoff.setDate(sessionCutoff.getDate() - 372);
    
    await db
      .delete(sessions)
      .where(lt(sessions.expires_at, sessionCutoff));
    
    // Archive old webhook logs (older than 90 days)
    const webhookCutoff = new Date(now);
    webhookCutoff.setDate(webhookCutoff.getDate() - 90);
    
    await db
      .delete(webhook_logs)
      .where(and(
        lt(webhook_logs.received_at, webhookCutoff),
        eq(webhook_logs.status, 'completed')
      ));
    
    // Prune old audit logs (older than 2 years)
    const auditCutoff = new Date(now);
    auditCutoff.setFullYear(auditCutoff.getFullYear() - 2);
    
    await db
      .delete(audit_logs)
      .where(lt(audit_logs.created_at, auditCutoff));
  }
};
```

---

### 5.2 Implementation Checklist

- [ ] Create `apps/worker/` directory structure
- [ ] Install dependencies (BullMQ, @bull-board/api)
- [ ] Set up Redis queue connection
- [ ] Implement job definitions
  - [ ] Webhook retry job
  - [ ] License expiration job
  - [ ] Renewal reminder job
  - [ ] Analytics aggregation job
  - [ ] Cleanup job
- [ ] Create monitoring dashboard (Bull Board)
- [ ] Add logging and error tracking
- [ ] Write tests for each job
- [ ] Deploy as Docker container
- [ ] Set up monitoring alerts

---

## 6. Integration Guide

### 6.1 Frontend Integration

**Fetch Plans**:
```typescript
// apps/dashboard/user/src/pages/Checkout.tsx
const { data: plans } = useQuery({
  queryKey: ['plans', appId],
  queryFn: () => 
    fetch(`/v1/payment/plans/${appId}`).then(r => r.json())
});
```

**Create Checkout**:
```typescript
const checkout = useMutation({
  mutationFn: async ({ planId, interval }) => {
    const res = await fetch('/v1/payment/checkout', {
      method: 'POST',
      credentials: 'include', // Send session cookie
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, planId, interval })
    });
    return res.json();
  },
  onSuccess: (data) => {
    // Redirect to checkout
    window.location.href = data.checkoutUrl;
  }
});
```

**Check License**:
```typescript
const { data: license } = useQuery({
  queryKey: ['license', appId],
  queryFn: () =>
    fetch(`/v1/payment/license/${appId}`, {
      credentials: 'include'
    }).then(r => r.json())
});

// Conditional rendering
{license?.hasLicense ? (
  <Dashboard features={license.license.plan.features} />
) : (
  <UpgradePrompt plans={plans} />
)}
```

---

### 6.2 Provider Setup

**Stripe**:
```typescript
// apps/gateway/src/config/env.ts
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

// Create checkout
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${FRONTEND_URL}/success`,
  cancel_url: `${FRONTEND_URL}/cancel`,
  metadata: { userId, appId, planId }
});
```

**Lemonsqueezy**:
```typescript
// apps/gateway/src/config/env.ts
LEMONSQUEEZY_API_KEY=eyJ...
LEMONSQUEEZY_WEBHOOK_SECRET=whsec_...

// Create checkout
const checkout = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${LS_API_KEY}` },
  body: JSON.stringify({
    data: {
      type: 'checkouts',
      attributes: {
        store_id: storeId,
        variant_id: variantId,
        custom_price: promoPrice || null
      }
    }
  })
});
```

---

### 6.3 Testing

**Local Setup**:
```bash
# Start services
pnpm dev

# Webhook testing with Stripe CLI
stripe listen --forward-to localhost:3004/v1/payment/webhook
stripe trigger checkout.session.completed
```

**Test Flow**:
1. Visit `http://localhost:5173/checkout`
2. Select a plan
3. Click "Subscribe"
4. Complete test checkout (Stripe test card: `4242 4242 4242 4242`)
5. Verify webhook received
6. Check license created in DB
7. Verify license API returns active status

---

**End of Implementation Guide**

For the full MVP specification, see [BILLING_MVP_SPEC.md](./BILLING_MVP_SPEC.md).
