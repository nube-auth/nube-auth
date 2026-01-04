# Proofa Billing MVP Specification (Phase 1)

**Version**: 1.0  
**Status**: Implementation Ready  
**Last Updated**: January 4, 2026

---

## 0. System Architecture

### Service Overview

Proofa uses a **multi-service architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Admin        │ User         │ Marketing    │ Documentation  │
│ Dashboard    │ Dashboard    │ Website      │ Site           │
│ (React)      │ (React)      │ (Astro)      │ (Starlight)    │
└──────────────┴──────────────┴──────────────┴────────────────┘
                       │                │
                       ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Gateway Service                          │
│                   (Port 3004)                               │
├─────────────────────────────────────────────────────────────┤
│  • Public-facing API (rate limiting, CSRF protection)       │
│  • Authentication middleware (session validation)           │
│  • Business logic (checkout, license status, webhooks)      │
│  • Payment provider integration (Stripe, LS, Dodo)          │
│  • Routes: /v1/auth, /v1/me, /v1/payment, /v1/admin         │
└──────────────┬──────────────┬──────────────┬────────────────┘
               │              │              │
               ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Core Service                              │
│                   (Port 3003)                                │
├──────────────────────────────────────────────────────────────┤
│  • Internal-only service (no public access)                  │
│  • User/project/app management                               │
│  • Session creation & validation                             │
│  • Email verification                                        │
│  • OAuth state management                                    │
│  • Admin operations (licensing, user management)             │
│  • Routes: /v1/auth, /v1/email, /v1/license, /v1/admin       │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    Worker Service                            │
│                  (Planned - Phase 1)                         │
├──────────────────────────────────────────────────────────────┤
│  • Background job processing                                 │
│  • Webhook retry logic (failed webhooks)                     │
│  • License expiration checks (daily cron)                    │
│  • Email sending (transactional emails)                      │
│  • Analytics aggregation (usage metrics)                     │
│  • Subscription renewal reminders                            │
│  • Cache warming (license preloading)                        │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
         ┌──────────────────────────────────────────┐
         │         Data & Cache Layer               │
         ├──────────────────┬───────────────────────┤
         │   PostgreSQL 16  │        Redis 7        │
         │   (Drizzle ORM)  │   (Sessions/Cache)    │
         └──────────────────┴───────────────────────┘
```

### Service Responsibilities

**Gateway Service** (`apps/gateway/`):
- ✅ **Public API Gateway** - All external API requests
- ✅ **Authentication** - Session validation via cookie
- ✅ **Payment Flows** - Checkout, webhooks, license checks
- ✅ **Rate Limiting** - Redis-based sliding window
- ✅ **Security Headers** - CORS, CSP, CSRF protection
- ✅ **Client-facing Routes**:
  - `GET /v1/payment/plans/:appId` - Catalog
  - `POST /v1/payment/checkout` - Create checkout
  - `POST /v1/payment/webhook` - Webhook handler
  - `GET /v1/payment/license/:appId` - License status
  - `GET /v1/me/*` - User profile, sessions
  - `POST /v1/auth/logout` - Session termination

**Core Service** (`apps/core/`):
- ✅ **Internal Service** - Not publicly accessible
- ✅ **User Management** - CRUD operations
- ✅ **Session Management** - Creation, validation, rolling TTL
- ✅ **OAuth Flows** - Provider configuration, state management
- ✅ **Email Operations** - Verification codes, magic links
- ✅ **Admin Operations** - License assignment, user invitations
- ✅ **Internal Routes**:
  - `POST /v1/auth/session/exchange` - Validate session
  - `POST /v1/auth/session/rolling-update` - Update TTL
  - `GET /v1/license/:userId` - Fetch user licenses
  - `POST /v1/admin/licenses` - Create license
  - `POST /v1/email/verify` - Send verification

**Worker Service** (`apps/worker/` - Planned):
- 🚧 **Background Jobs** - Async task processing
- 🚧 **Webhook Retries** - Failed webhook reprocessing (exponential backoff)
- 🚧 **License Checks** - Daily expiration checks
- 🚧 **Email Queue** - Transactional email sending
- 🚧 **Subscription Renewals** - Renewal reminders (7 days before)
- 🚧 **Analytics** - Daily/monthly usage aggregation
- 🚧 **Cache Warming** - Preload frequently accessed licenses
- 🚧 **Cleanup Tasks** - Expired sessions, old webhook logs

### Public ID Format

All entities use **prefixed nanoid** format for public-facing IDs:

```typescript
// Format: [3-letter prefix][0][nanoid]
// Standard: 13 characters (prefix + 0 + 9 random chars)
// Sessions: 19 characters (prefix + 0 + 15 random chars)

Examples:
  USR0xY7mK9pQz          // User (13 chars)
  SES0abc123xyz456789    // Session (19 chars - high security)
  PRJ0mNp4Kd8Hz          // Project (13 chars)
  APP0qR5tV9wXy          // App (13 chars)
  PLN0zAb7cD2eF          // Plan (13 chars)
  LIC0gH8jK3mNo          // License (13 chars)
  TXN0pQ9rS4tUv          // Transaction (13 chars)
  PRO0wX5yZ8aBC          // Promotion (13 chars)
  PRC0dE7fG2hIj          // Promotion Code (13 chars)
  WHL0kL9mN4pQr          // Webhook Log (13 chars)
  CFG0sT8uV3wXy          // Payment Config (13 chars)
```

**Alphabet**: `0123456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ`  
(Excludes: i, I, l, L, o, O for clarity)

**Implementation**: `packages/shared/src/id.ts`

---

## 1. Goals

The Phase 1 MVP enables apps to:

1. **Define Plans** (entitlements) and sell them via Lemonsqueezy + Dodo
2. **Keep app integration simple** - No routing logic, no provider logic
3. **Keep schema stable** - Phase 2 is purely additive (multi-provider routing, advanced promos)

### Success Criteria

✅ Apps can sell subscriptions (monthly, yearly) and one-time purchases  
✅ Promo codes work for launch marketing  
✅ License checks return entitlements in <50ms  
✅ Adding a second provider requires zero app changes  
✅ Schema supports multi-org without migration  

---

## 2. Core Concepts

### Plan
**Defines access/entitlements** (not tied to money)

Examples: `FREE`, `PRO`, `PRO_PLUS`, `PREMIUM`

```typescript
{
  slug: "pro",
  name: "Pro Plan",
  entitlements: {
    features: ["api_access", "advanced_analytics"],
    limits: { max_api_calls: 10000 }
  }
}
```

### Price
**A purchasable option** for a plan on a specific provider config

Examples:
- PRO monthly ($20/month)
- PRO yearly ($200/year)
- PRO_PLUS one-time ($99)
- PREMIUM yearly ($500/year)

### Provider Config
**Credentials + environment** for a provider, scoped to an app

Even in Phase 1, allow multiple configs in DB; **use one default**.

Example:
- Lemonsqueezy (live mode) for App X
- Dodo (test mode) for App X

### Purchase
**A checkout attempt** created by Proofa

Always binds to exactly one `provider_config_id` (deterministic routing).

### License
**Proofa's source of truth** for access state

Derived from purchase/webhooks, **not directly from providers**.

### Promotion (MVP)
**Promo code discounts** for launch marketing

Simple rules:
- One promo code per checkout
- Time-window based (starts_at → ends_at)
- Optional "once per user/org" redemption limit

---

## 3. Data Model (Actual Implementation)

### 3.1 Plans Table (Entitlements Only)

**Purpose**: Define plan entitlements, features, and limits (NO pricing)

**Schema** (`packages/db/src/schema.ts`):
```typescript
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  app_id: integer("app_id").notNull().references(() => apps.id),
  
  slug: varchar("slug", { length: 100 }).notNull(),  // 'free', 'pro', 'pro_plus'
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Entitlements (NO pricing columns)
  features: jsonb("features").notNull(),        // { features: [], limits: {} }
  
  // Plan settings
  duration_days: integer("duration_days"),      // null = recurring
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

**Public ID Format**: `PLN0` + 9 random chars (e.g., `PLN0zAb7cD2eF`)

**Design Rationale**:
- Plans are **provider-agnostic** (entitlements don't change per provider)
- Pricing separated to `plan_provider_prices` table
- No Phase 2 rework: Plan structure stays stable
- One plan can have different prices across providers/currencies

**Rules**:
- One row per plan (entitlement set)
- Pricing is NOT stored here (see Section 3.1b)
- Plan changes: create new plan row (versioning) or update same row
- Links to multiple prices via `plan_provider_prices`

---

### 3.1b Plan Provider Prices Table (NEW)

**Purpose**: Store pricing for each plan + provider combination

**Schema** (`packages/db/src/schema.ts`):
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
    
    // Provider reference
    provider_price_id: varchar("provider_price_id", { length: 255 }),
    // Stripe: price_123abc
    // Lemonsqueezy: variant_456def
    // Dodo: price_789ghi
    
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
    index("plan_provider_prices_provider_config_id_idx").on(table.provider_config_id),
    index("plan_provider_prices_billing_type_idx").on(table.billing_type),
  ]
);
```

**Public ID Format**: `PPP0` + 9 random chars (e.g., `PPP0kMn9pQrSt`)

**Design Rationale**:
- **Separates concerns**: Plans (what you get) vs Prices (what you pay)
- **Phase 1 simplicity**: Only 1 provider, but structure supports Phase 2
- **Multi-provider ready**: Phase 2 just adds more rows
- **Zero migration cost**: No table restructuring in Phase 2
- **Provider-specific IDs**: Each provider has unique price identifier

**Query Example** (Catalog API):
```typescript
// Get all prices for a plan with specific provider
const prices = await db
  .select()
  .from(plan_provider_prices)
  .leftJoin(plans, eq(plan_provider_prices.plan_id, plans.id))
  .where(and(
    eq(plan_provider_prices.plan_id, planId),
    eq(plan_provider_prices.provider_config_id, providerConfigId),
    eq(plan_provider_prices.is_active, true)
  ));

// Response structure
{
  plan: {
    publicId: "PLN0zAb7cD2eF",
    name: "Pro Plan",
    features: { ... }
  },
  prices: [
    {
      billingType: "recurring",
      interval: "month",
      amountCents: 2000,
      currency: "usd"
    },
    {
      billingType: "recurring",
      interval: "year",
      amountCents: 20000,
      currency: "usd"
    }
  ]
}
```

---

### 3.3 Payment Provider Configs Table (Renamed)

**Naming Note**: This table stores provider **configurations** (credentials, webhook secrets, environment keys), not a provider registry. Named to distinguish from a future "providers" table that might hold provider metadata.

**Purpose**: Store provider credentials per app

**Schema**:
```typescript
export const payment_provider_configs = pgTable("payment_provider_configs", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  name: varchar("name", { length: 255 }),
  slug: varchar("slug", { length: 255 }),
  
  // Multi-tenancy support
  entity_type: varchar("entity_type", { length: 20 }).notNull(), // 'platform', 'project', 'app'
  entity_id: integer("entity_id"),  // null for platform, project_id or app_id
  
  // Provider details
  provider: varchar("provider", { length: 50 }).notNull(),  // 'stripe', 'lemonsqueezy', 'dodo'
  environment: varchar("environment", { length: 20 }).notNull(), // 'test', 'production'
  
  // Credentials (encrypted at application layer)
  credentials: text("credentials").notNull(),           // Encrypted JSON
  previous_credentials: text("previous_credentials"),   // For rotation
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

**Public ID Format**: `CFG0` + 9 random chars (e.g., `CFG0sT8uV3wXy`)

**Rules**:
- Multiple configs allowed per app
- Phase 1: App references one via `selected_provider_config_id`
- Credentials are encrypted before storage
- Unique per (entity_type, entity_id, provider, environment)

---

### 3.4 Licenses Table (Current State Only)

**Purpose**: Authoritative current access state. Fast reads, simple queries.

**Schema**:
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
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("active"),
  // 'active' | 'past_due' | 'grace' | 'cancelled' | 'expired'
  
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

**Public ID Format**: `LIC0` + 9 random chars (e.g., `LIC0gH8jK3mNo`)

**Design Rationale**:
- Stores current state only (fast reads)
- One license per subject per app (enforced by UNIQUE constraint)
- Phase 1: `subject_type = 'user'`
- Phase 2: Supports orgs via `subject_type` + `subject_id`
- Audit trail stored separately in `license_history`

---

### 3.4b License History Table (NEW - Append-Only Audit Trail)

**Purpose**: Record every meaningful license transition. Never updated, only inserted.

**Schema**:
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
  // Stripe: evt_xyz, LS: evt_abc, Dodo: evt_def
  
  payment_transaction_id: integer("payment_transaction_id").references(() => payment_transactions.id),
  promotion_id: integer("promotion_id").references(() => promotions.id),
  
  // Timestamps
  effective_at: timestamp("effective_at").notNull(),  // When change became active
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("license_history_license_id_idx").on(table.license_id),
  index("license_history_app_id_idx").on(table.app_id),
  index("license_history_subject_idx").on(table.subject_type, table.subject_id),
  index("license_history_reason_idx").on(table.reason),
  index("license_history_effective_at_idx").on(table.effective_at),
  index("license_history_provider_event_idx").on(table.provider_event_id),
]);
```

**Public ID Format**: `LHI0` + 9 random chars (e.g., `LHI0aB1cD2eF`)

**Key Properties**:
- ✅ **Append-only**: Never updated, only inserted
- ✅ **One row per change**: Every meaningful transition recorded
- ✅ **Future-proof**: Already includes `promotion_id`, supports Phase 2
- ✅ **Separate from webhooks**: Does not dedupe events (that's webhook_logs' job)

---

### 3.5 Purchases Table

**Purpose**: First-class record bridging checkout session to payment transaction. Enables Phase 2 multi-provider routing and reconciliation without schema changes.

**Schema**:
```typescript
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  // Format: 'PUR0' + 9 random chars (e.g., 'PUR0aB1cD2eF3gH')
  
  // Application & Subject
  app_id: integer("app_id").notNull().references(() => apps.id),
  subject_type: varchar("subject_type", { length: 50 }).notNull(),
  // 'license' (Phase 1), 'organization' (Phase 2)
  subject_id: integer("subject_id").notNull(),
  // license_id (Phase 1), organization_id (Phase 2)
  
  // What was ordered
  plan_provider_price_id: integer("plan_provider_price_id").notNull()
    .references(() => plan_provider_prices.id),
  // Direct link to price record (includes plan, provider, billing interval)
  
  // Where the purchase happens (routing)
  provider_config_id: integer("provider_config_id").notNull()
    .references(() => payment_provider_configs.id),
  // Real FK for secrets, routing, webhook handling
  
  // Optional promotion
  promotion_code_id: integer("promotion_code_id")
    .references(() => promotion_codes.id),
  // NULL if no promo, otherwise FK to redeemed code
  
  // Webhook reconciliation
  provider_session_id: varchar("provider_session_id", { length: 255 }).notNull(),
  // Stripe: checkout_session_id, LemonSqueezy: checkout_id, etc.
  
  // Status tracking
  status: varchar("status", { length: 20 }).notNull(),
  // 'pending' (awaiting webhook), 'completed', 'expired', 'abandoned', 'failed'
  
  // Link to result
  payment_transaction_id: integer("payment_transaction_id")
    .references(() => payment_transactions.id),
  // Set when checkout completes (status → 'completed')
  
  // Timeline
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

**Key Design Decisions**:
- ✅ **First-class entity**: Not embedded in payment_transactions (enables deduping & multi-provider flows)
- ✅ **Phase 2 ready**: subject_type + subject_id already in place (organization support without rework)
- ✅ **Provider routing**: provider_config_id is the real join key for secrets & API calls
- ✅ **Webhook reconciliation**: provider_session_id enables safe idempotency (webhook may retry/reorder)
- ✅ **Explicit link to price**: plan_provider_price_id means we know exactly what was sold (plan + provider + interval)

**Rules**:
- Insert on checkout initiation
- Update status on webhook events
- Set payment_transaction_id when webhook succeeds
- Dedupe by (app_id, subject_type, subject_id, plan_provider_price_id, provider_config_id) + timestamp uniqueness

---

### 3.6 Payment Transactions Table

**Purpose**: Audit trail of money-related events

**Schema**:
```typescript
export const payment_transactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  // Link to checkout
  purchase_id: integer("purchase_id").notNull().references(() => purchases.id),
  // FK to purchases table (checkout session that led to this transaction)
  
  // Link to license
  license_id: integer("license_id").notNull().references(() => licenses.id),
  
  // Provider info (provider_config_id is the real join key)
  provider_config_id: integer("provider_config_id").notNull()
    .references(() => payment_provider_configs.id),
  // Real FK for routing, secrets, webhook handling
  provider: varchar("provider", { length: 50 }).notNull(),
  // Denormalized convenience: 'stripe', 'lemonsqueezy', 'dodo' (use provider_config_id for logic)
  provider_transaction_id: varchar("provider_transaction_id", { length: 255 }).notNull(),
  provider_customer_id: varchar("provider_customer_id", { length: 255 }),
  
  // Transaction details
  type: varchar("type", { length: 50 }).notNull(), 
  // 'purchase', 'renewal', 'refund', 'chargeback', 'manual_adjustment'
  status: varchar("status", { length: 20 }).notNull(), 
  // 'success', 'failed', 'pending', 'disputed'
  
  // Amount tracking (always in smallest currency unit - cents)
  amount_cents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  
  // Discount tracking (explicit flags for analytics & support)
  discount_applied_cents: integer("discount_applied_cents").notNull().default(0),
  // Actual amount the provider applied (0 if validation failed or no promo)
  discount_applied: boolean("discount_applied").notNull().default(false),
  // Explicit truth flag: Did we successfully apply a discount? (for analytics/reporting)
  
  // Promotion tracking (Phase 1: max 1 per transaction)
  promotion_id: integer("promotion_id").references(() => promotions.id),
  promotion_code_id: integer("promotion_code_id").references(() => promotion_codes.id),
  provider_discount_id: varchar("provider_discount_id", { length: 255 }), // e.g., 'coupon_abc'
  
  // Metadata
  description: text("description"),
  metadata: jsonb("metadata"), // Provider-specific data
  
  // Timeline
  transaction_date: timestamp("transaction_date").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  
  // For disputes/chargebacks
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

**Public ID Format**: `TXN0` + 9 random chars (e.g., `TXN0pQ9rS4tUv`)

**Key Design Decisions**:
- ✅ **Purchase link**: purchase_id connects to checkout session (enables Phase 2 routing)
- ✅ **Provider routing**: provider_config_id is the canonical FK (real join key for secrets/API calls)
- ✅ **Denormalized convenience**: provider string kept for analytics/logging (not used for routing logic)
- ✅ **Discount tracking**: Both discount_applied_cents (for revenue accounting) and discount_applied (for analytics)

**Rules**:
- Insert on webhook events (never update)
- Dedupe by (provider_config_id, provider_transaction_id) — NOT (provider, provider_transaction_id)
- Used for revenue reconciliation
- Promotions tracked for analytics
- discount_applied = true only if provider_discount_id was successfully applied

---

### 3.7 Webhook Logs Table

**Purpose**: Dedupe + retry safety + debugging

**Schema**:
```typescript
export const webhook_logs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  
  // Provider identification
  provider: varchar("provider", { length: 50 }).notNull(), // 'stripe', 'lemonsqueezy', 'dodo'
  event_type: varchar("event_type", { length: 100 }).notNull(), // 'checkout.session.completed'
  event_id: varchar("event_id", { length: 255 }), // Provider's event ID (deduplication)
  
  // Request data
  request_body: jsonb("request_body").notNull(),     // Full payload
  request_headers: jsonb("request_headers"),         // Headers
  signature: text("signature"),                      // Webhook signature
  ip_address: varchar("ip_address", { length: 50 }),
  
  // Processing status
  status: varchar("status", { length: 20 }).notNull().default("not_started"),
  // 'not_started', 'processing', 'completed', 'failed', 'signature_failed', 'skipped'
  
  // Processing timeline
  received_at: timestamp("received_at").notNull().defaultNow(),
  processing_started_at: timestamp("processing_started_at"),
  processing_completed_at: timestamp("processing_completed_at"),
  processing_duration_ms: integer("processing_duration_ms"),
  
  // Results
  payment_transaction_id: integer("payment_transaction_id").references(() => payment_transactions.id),
  license_id: integer("license_id").references(() => licenses.id),
  
  // Error tracking
  error_message: text("error_message"),
  error_stack: text("error_stack"),
  retry_count: integer("retry_count").notNull().default(0),
  last_retry_at: timestamp("last_retry_at"),
  
  // Response details
  response_status: integer("response_status"),       // HTTP status returned
  response_body: jsonb("response_body"),
  
  // Metadata
  metadata: jsonb("metadata"),                       // Extracted metadata (userId, appId)
  notes: text("notes"),                              // Admin notes
  
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

**Public ID Format**: `WHL0` + 9 random chars (e.g., `WHL0kL9mN4pQr`)

**Rules**:
- Always store BEFORE processing
- Processing must be idempotent
- Worker service handles retries for failed webhooks
- Use `event_id` for deduplication
- Store full request/response for debugging

---

## 4. Promotions (MVP)

### 4.1 Promotions Table

```sql
CREATE TABLE promotions (
  id SERIAL PRIMARY KEY,
  public_id VARCHAR(255) UNIQUE NOT NULL,
  app_id INTEGER NOT NULL REFERENCES apps(id),
  
  name VARCHAR(255) NOT NULL,  -- Internal label: "Launch 50% off"
  
  discount_type VARCHAR(20) NOT NULL,  -- 'percent', 'amount'
  discount_value INTEGER NOT NULL,     -- 50 (for 50%) or cents (for $50)
  
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promotions_app_id ON promotions(app_id);
CREATE INDEX idx_promotions_active ON promotions(is_active);
```

---

### 4.2 Promotion Codes Table

```sql
CREATE TABLE promotion_codes (
  id SERIAL PRIMARY KEY,
  public_id VARCHAR(255) UNIQUE NOT NULL,
  
  promotion_id INTEGER NOT NULL REFERENCES promotions(id),
  app_id INTEGER NOT NULL REFERENCES apps(id),
  
  code VARCHAR(100) NOT NULL,  -- User-entered: 'LAUNCH50', 'SAVE20'
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(app_id, LOWER(code))  -- Case-insensitive uniqueness
);

CREATE INDEX idx_promotion_codes_promotion_id ON promotion_codes(promotion_id);
CREATE INDEX idx_promotion_codes_code ON promotion_codes(LOWER(code));
```

---

### 4.3 Promotion Redemptions Table

**Purpose**: Track usage for "once per user/org" limit

```sql
CREATE TABLE promotion_redemptions (
  id SERIAL PRIMARY KEY,
  public_id VARCHAR(255) UNIQUE NOT NULL,
  
  app_id INTEGER NOT NULL REFERENCES apps(id),
  promotion_id INTEGER NOT NULL REFERENCES promotions(id),
  
  subject_type VARCHAR(20) NOT NULL,  -- 'user', 'org'
  subject_id INTEGER NOT NULL,
  
  purchase_id INTEGER REFERENCES purchases(id),  -- Set when purchase succeeds
  
  redeemed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- ⚠️ MVP: Once per user/org per promotion
  UNIQUE(app_id, promotion_id, subject_type, subject_id)
);

CREATE INDEX idx_redemptions_promotion_id ON promotion_redemptions(promotion_id);
CREATE INDEX idx_redemptions_subject ON promotion_redemptions(subject_type, subject_id);
```

**MVP Rules**:
- One promo per checkout
- Validate promo at checkout creation time
- If provider cannot auto-apply promo, user enters it on provider checkout page (Proofa still tracks it)

---

## 5. API Contract (Apps Stay Simple)

### 5.1 Catalog API

**GET** `/v1/payment/plans/:appId`

Returns plans + purchase options for the app's default provider config.

**Response**:
```typescript
{
  selectedProviderConfigId: "ppc_abc123",
  supportsPromoCodes: true,
  plans: [
    {
      publicId: "plan_xyz",
      slug: "pro",
      name: "Pro Plan",
      description: "Perfect for professionals",
      entitlements: {
        features: ["api_access", "advanced_analytics"],
        limits: { max_api_calls: 10000 }
      },
      purchaseOptions: [
        {
          publicId: "price_123",
          billingType: "recurring",
          interval: "month",
          amountCents: 2000,
          currency: "usd"
        },
        {
          publicId: "price_124",
          billingType: "recurring",
          interval: "year",
          amountCents: 20000,
          currency: "usd"
        }
      ]
    },
    // ... more plans
  ]
}
```

**Rules**:
- Only shows prices for the selected provider config
- Apps don't need to know about providers
- Phase 2: Add `preferredCurrency`, `countryCode` for routing

---

### 5.2 Checkout API

**POST** `/v1/payment/checkout`

**Request**:
```typescript
{
  appId: "APP0qR5tV9wXy",
  planProviderPriceId: "price_124",  // Direct reference to plan_provider_prices row
  promoCode?: "LAUNCH50",  // Optional
  
  // Phase 1: Inferred from auth
  // subjectType: "user",
  // subjectId: 123
}
```

**Response**:
```typescript
{
  purchaseId: "PUR0aB1cD2eF3gH",  // First-class purchase record
  checkoutUrl: "https://lemonsqueezy.com/checkout/xyz"
}
```

**Server Flow**:
1. Look up `plan_provider_prices` row by `planProviderPriceId`
2. Extract `provider_config_id` from price row (route to correct provider)
3. Validate `promoCode` (if provided)
4. Create `purchase` row (bind provider_config_id, plan_provider_price_id, promotion_code_id)
5. Create provider checkout session, capture `provider_session_id`
6. Return `purchaseId` + `checkoutUrl`

**Apps do NOT**:
- Compute country/currency/provider logic
- Store provider credentials
- Handle webhook processing

---

### 5.3 License Status API

**GET** `/v1/payment/license/:appId`

Auth-based query returns current license for authenticated user.

**Response**:
```typescript
{
  hasLicense: true,
  license: {
    publicId: "lic_abc",
    status: "active",
    validUntil: "2027-01-04T12:00:00Z",
    plan: {
      slug: "pro",
      name: "Pro Plan",
      entitlements: {
        features: ["api_access", "advanced_analytics"],
        limits: { max_api_calls: 10000 }
      }
    }
  }
}
```

**No License**:
```typescript
{
  hasLicense: false,
  license: null
}
```

---

### 5.4 Promo Validation API (Optional)

**POST** `/v1/payment/validate-promo`

**Request**:
```typescript
{
  code: "LAUNCH50",
  planId: "plan_xyz",
  billingType: "recurring",
  interval: "month"
}
```

**Response**:
```typescript
{
  valid: true,
  promotion: {
    publicId: "promo_123",
    name: "Launch 50% off",
    discountType: "percent",
    discountValue: 50
  },
  originalAmountCents: 2000,
  discountAmountCents: 1000,
  finalAmountCents: 1000
}
```

---

## 6. Webhooks

### 6.1 Endpoints

Provider-specific paths:
- `/v1/webhooks/lemonsqueezy`
- `/v1/webhooks/dodo`

### 6.2 Processing Pattern

```typescript
async function processWebhook(req: Request, providerType: string) {
  // 1. Verify signature using provider_config.webhook_secret
  const signature = req.headers['x-signature'];
  const isValid = await verifySignature(signature, req.body, providerType);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 2. Insert webhook_events (dedupe key = provider_event_id)
  const event = await db.webhookEvents.insert({
    providerType,
    providerEventId: req.body.meta.event_id,
    rawPayload: req.body,
    status: 'received'
  });
  
  // 3. Map provider event → internal event type
  const eventType = mapEventType(req.body.meta.event_name);
  
  // 4. Update purchase and upsert license
  switch (eventType) {
    case 'checkout.completed':
      await handleCheckoutCompleted(req.body);
      break;
    case 'subscription.updated':
      await handleSubscriptionUpdated(req.body);
      break;
    case 'subscription.cancelled':
      await handleSubscriptionCancelled(req.body);
      break;
    // ... more event types
  }
  
  // 5. Insert payment_transactions
  await db.paymentTransactions.insert({
    purchaseId,
    providerEventId: req.body.meta.event_id,
    type: 'payment',
    amountCents,
    status: 'succeeded',
    // ...
  });
  
  // 6. Invalidate cache keys
  await cache.delete(`license:${appId}:${subjectType}:${subjectId}`);
  
  // 7. Mark webhook processed
  await db.webhookEvents.update(event.id, {
    status: 'processed',
    processedAt: new Date()
  });
  
  return res.status(200).json({ received: true });
}
```

### 6.3 Key Event Mappings

| Lemonsqueezy Event | Dodo Event | Internal Event |
|--------------------|------------|----------------|
| `order_created` | `checkout.completed` | `checkout.completed` |
| `subscription_created` | `subscription.created` | `subscription.created` |
| `subscription_updated` | `subscription.updated` | `subscription.updated` |
| `subscription_cancelled` | `subscription.cancelled` | `subscription.cancelled` |
| `subscription_payment_success` | `payment.succeeded` | `payment.succeeded` |
| `subscription_payment_failed` | `payment.failed` | `payment.failed` |

---

## 7. Caching Strategy (MVP)

### Cache Keys

```typescript
`entitlements:${appId}:${subjectType}:${subjectId}`
```

### Cache Operations

**Read** (lazy warm):
```typescript
async function getLicense(appId, subjectType, subjectId) {
  const cacheKey = `entitlements:${appId}:${subjectType}:${subjectId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from DB
  const license = await db.query(`
    SELECT l.*, p.entitlements, p.slug as plan_slug
    FROM licenses l
    JOIN plans p ON p.id = l.plan_id
    WHERE l.app_id = $1 
      AND l.subject_type = $2 
      AND l.subject_id = $3
      AND l.status IN ('active', 'past_due', 'grace')
    LIMIT 1
  `, [appId, subjectType, subjectId]);
  
  // Store in cache (5 min TTL)
  await redis.setex(cacheKey, 300, JSON.stringify(license));
  
  return license;
}
```

**Invalidate** (on webhook/license change):
```typescript
async function invalidateLicenseCache(appId, subjectType, subjectId) {
  const cacheKey = `entitlements:${appId}:${subjectType}:${subjectId}`;
  await redis.del(cacheKey);
}
```

---

## 8. Phase 2 (Additive Only — No Rework)

When ready to add multi-provider routing, none of the core tables change. Instead:

### 8.1 App Payment Routes Table (NEW)

```sql
CREATE TABLE app_payment_routes (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id),
  
  -- Routing conditions
  country_codes TEXT[],     -- ['US', 'CA'] or null = all
  currencies TEXT[],        -- ['usd', 'cad'] or null = all
  
  provider_config_id INTEGER NOT NULL REFERENCES payment_provider_configs(id),
  
  priority INTEGER NOT NULL DEFAULT 0,  -- Higher = preferred
  is_active BOOLEAN NOT NULL DEFAULT true
);
```

**Routing Logic**:
```typescript
function selectProviderConfig(appId, countryCode, currency) {
  // Phase 1: return app.default_provider_config_id
  
  // Phase 2:
  return db.query(`
    SELECT provider_config_id
    FROM app_payment_routes
    WHERE app_id = $1
      AND is_active = true
      AND (country_codes IS NULL OR $2 = ANY(country_codes))
      AND (currencies IS NULL OR $3 = ANY(currencies))
    ORDER BY priority DESC
    LIMIT 1
  `, [appId, countryCode, currency]);
}
```

### 8.2 Promotion Provider Mappings (NEW)

For auto-applying promos at provider level:

```sql
CREATE TABLE promotion_provider_refs (
  id SERIAL PRIMARY KEY,
  promotion_id INTEGER NOT NULL REFERENCES promotions(id),
  provider_config_id INTEGER NOT NULL REFERENCES payment_provider_configs(id),
  
  provider_coupon_id VARCHAR(255) NOT NULL,  -- e.g., 'coupon_abc' (Stripe)
  
  UNIQUE(promotion_id, provider_config_id)
);
```

### 8.3 Advanced Promo Features (NEW)

Add columns to `promotions`:
- `is_first_purchase_only` BOOLEAN
- `max_redemptions_global` INTEGER
- `applies_to_interval` VARCHAR(20)  -- 'first_cycle_only'

---

## 9. Concrete Example (4 Plans, 2 Providers)

### Plans (4 rows)
1. `free` - No cost, basic features
2. `pro` - $20/month or $200/year
3. `pro_plus` - $99 one-time
4. `premium` - $500/year

### Provider Configs (2 rows)
1. Lemonsqueezy (live mode)
2. Dodo (test mode)

### Prices (8 rows)

| Plan | Provider | Billing Type | Interval | Amount |
|------|----------|--------------|----------|--------|
| pro | LS | recurring | month | $20 |
| pro | LS | recurring | year | $200 |
| pro | Dodo | recurring | month | $20 |
| pro | Dodo | recurring | year | $200 |
| pro_plus | LS | one_time | null | $99 |
| pro_plus | Dodo | one_time | null | $99 |
| premium | LS | recurring | year | $500 |
| premium | Dodo | recurring | year | $500 |

**Phase 1**: Apps use LS (default), 4 prices active.  
**Phase 2**: Add Dodo routing for EU customers, 8 prices active.

---

## 10. Implementation Checklist

### Database

- [ ] Create 10 tables (plans, configs, prices, purchases, transactions, licenses, webhooks, promotions, codes, redemptions)
- [ ] Add partial unique index on licenses
- [ ] Add `default_provider_config_id` to apps table
- [ ] Encrypt sensitive fields (credentials, webhook_secret)

### API Endpoints

- [ ] `GET /v1/payment/plans/:appId` (catalog)
- [ ] `POST /v1/payment/checkout` (create purchase)
- [ ] `GET /v1/payment/license/:appId` (check license)
- [ ] `POST /v1/payment/validate-promo` (optional)

### Webhooks

- [ ] `POST /v1/webhooks/lemonsqueezy` (LS handler)
- [ ] `POST /v1/webhooks/dodo` (Dodo handler)
- [ ] Signature verification for both providers
- [ ] Idempotent webhook processing
- [ ] Error handling & retry logic

### Business Logic

- [ ] Provider selection (Phase 1: default config)
- [ ] Promo code validation
- [ ] License creation/update logic
- [ ] Cache invalidation on license changes
- [ ] Entitlement checks (`canAccess`, `getLimit`)

### Testing

- [ ] Test checkout flow (happy path)
- [ ] Test promo code redemption
- [ ] Test webhook processing (all event types)
- [ ] Test license constraint (one active per subject)
- [ ] Test cache hit rate

---

## 11. Success Metrics

Track these to validate MVP success:

1. **Checkout Conversion Rate** > 80%
2. **Webhook Processing Time** < 2 seconds (p95)
3. **License Cache Hit Rate** > 85%
4. **API Response Time** < 100ms (p95)
5. **Promo Redemption Rate** (track for marketing)

---

## 12. Migration Path

### From Current Schema

If you have existing payment tables:

1. Create new tables (no conflicts)
2. Migrate `payment_providers` → `payment_provider_configs`
3. Migrate `plan_provider_prices` (add `provider_config_id`)
4. Create `purchases` table (new concept)
5. Update `licenses` to use `subject_type` + `subject_id`
6. Add partial unique constraint to licenses
7. Deploy webhook handlers with new logic
8. Test with Stripe test mode first
9. Gradually migrate live traffic

### Zero-Downtime Migration

- Run both old and new webhook handlers in parallel
- Dual-write to both schemas during transition
- Validate data consistency
- Switch reads to new schema
- Deprecate old schema after 30 days

---

## Appendix A: Subject Type Pattern

### Why `subject_type` + `subject_id`?

**Flexibility for future features**:
- Phase 1: `subject_type = 'user'`
- Phase 2: Add `subject_type = 'org'` for org billing
- Phase 3: Add `subject_type = 'team'` for team licenses

**No migration needed** when adding org billing:
```sql
-- Phase 1 license
{ subject_type: 'user', subject_id: 123 }

-- Phase 2 org license (no schema change!)
{ subject_type: 'org', subject_id: 456 }
```

**Constraint works across types**:
```sql
UNIQUE(app_id, subject_type, subject_id) 
WHERE status IN ('active', 'past_due', 'grace')
```

User 123 can have:
- ✅ One active user license
- ✅ One active org license (different subject_type)
- ❌ Two active user licenses (constraint violation)

---

## Appendix B: Provider Integration Examples

### Lemonsqueezy Checkout

```typescript
async function createLemonsqueezyCheckout(purchase: Purchase, price: Price) {
  const config = await getProviderConfig(purchase.provider_config_id);
  
  const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.credentials.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          store_id: config.credentials.store_id,
          variant_id: price.provider_price_id,
          custom_price: purchase.promotion_id ? calculateDiscountedPrice() : null,
          checkout_data: {
            custom: {
              purchase_id: purchase.public_id,
              app_id: purchase.app_id,
              subject_type: purchase.subject_type,
              subject_id: purchase.subject_id
            }
          }
        }
      }
    })
  });
  
  const { data } = await response.json();
  return data.attributes.url;
}
```

### Dodo Checkout

```typescript
async function createDodoCheckout(purchase: Purchase, price: Price) {
  const config = await getProviderConfig(purchase.provider_config_id);
  
  const response = await fetch('https://api.dodo.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.credentials.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      price_id: price.provider_price_id,
      success_url: `${process.env.APP_URL}/checkout/success?purchase_id=${purchase.public_id}`,
      cancel_url: `${process.env.APP_URL}/checkout/cancel`,
      metadata: {
        purchase_id: purchase.public_id,
        app_id: purchase.app_id,
        subject_type: purchase.subject_type,
        subject_id: purchase.subject_id
      }
    })
  });
  
  const { checkout_url } = await response.json();
  return checkout_url;
}
```

---

**End of MVP Specification**

This document defines the complete Phase 1 billing system. All future enhancements (multi-provider routing, advanced promos, org billing) are purely additive and require no schema migrations.
