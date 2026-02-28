# PRD: Licensing Infrastructure v2

**Version:** 2.0.0  
**Created:** February 28, 2026  
**Status:** Approved — Ready for Implementation  
**Supersedes:** Current plans/licenses schema, `docs/PLAN_LICENSE_FLOW.md` (current state audit)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Architecture Overview](#3-architecture-overview)
4. [Data Model](#4-data-model)
5. [Entity Lifecycle & State Machines](#5-entity-lifecycle--state-machines)
6. [API Design](#6-api-design)
7. [Promotions & Discounts](#7-promotions--discounts)
8. [Payment Integration](#8-payment-integration)
9. [Webhook Processing](#9-webhook-processing)
10. [SDK Contract](#10-sdk-contract)
11. [Admin Dashboard UX](#11-admin-dashboard-ux)
12. [Migration Strategy](#12-migration-strategy)
13. [Security Considerations](#13-security-considerations)
14. [Implementation Order](#14-implementation-order)
15. [Appendix: Decision Log](#15-appendix-decision-log)

---

## 1. Problem Statement

### Current State

The existing licensing model conflates **capability** (what a plan offers) with **commercial packaging** (how much it costs). A single `plans` table stores name, features, monthly/yearly/one-time prices, trial config, and duration — all in one row.

**Critical issues identified** (see [PLAN_LICENSE_FLOW.md](PLAN_LICENSE_FLOW.md)):

| # | Severity | Issue |
|---|----------|-------|
| 1 | Critical | Frontend API path (`/projects/:pid/apps/:aid/plans`) doesn't match Core route (`/plans`) |
| 2 | Critical | Frontend sends `snake_case`, Core expects `camelCase` |
| 3 | Critical | `appId` not included in request body (Core requires it) |
| 4 | Critical | Change Plan endpoint is dead code (no matching Core route) |
| 5 | Moderate | `features` type mismatch (frontend sends `string[]`, schema expects `jsonb`) |
| 6 | Moderate | `license_history` table defined but never written to |
| 7 | Moderate | Plan options in Change Plan modal are hardcoded |

**Architectural problems:**

- No concept of **Price** as a separate entity — pricing lives on the Plan
- No concept of **Subscription** as a billing lifecycle — only a flat license with `valid_until`
- No grace period handling for failed renewals
- Price changes require creating a new plan version (fragile)
- Plan and pricing cannot vary independently
- No clean mapping to external payment provider prices
- Seats/devices licensing not possible with current 1:1 user→license model

### Why Redesign

A plan should describe **what** access a user gets. A price should describe **how** they pay. A subscription should track the **billing lifecycle**. A license should be the **access control artifact** that the SDK checks. These are four distinct concerns that must be separated to support:

- Multiple pricing tiers per plan (monthly/yearly/lifetime)
- Trial periods attached to pricing, not plans
- Subscription lifecycle (renewals, grace periods, cancellations)
- Multi-device/seat licensing
- Payment provider flexibility (Stripe, LemonSqueezy, Dodo)
- Clean webhook reconciliation

---

## 2. Goals & Non-Goals

### Goals (v2)

- **4-layer separation**: Plan → Price → Subscription → License
- **Plan = capability only**: Features, limits, entitlements. No pricing.
- **Price = commercial packaging**: Amount, currency, interval, trial config. 1:N per plan.
- **Subscription = billing lifecycle**: Recurring billing tracking with grace periods. Distinct from license.
- **License = access control**: The artifact that SDK checks. One active per user per app.
- **License history**: Active audit trail for all license state changes.
- **Seat/device licensing**: Separate `license_activations` table for multi-device support.
- **Provider-agnostic**: `external_price_id` + `external_provider` on prices for payment mapping.
- **Idempotent operations**: Unique constraints, idempotency key headers, webhook event dedup.
- **Clean API paths**: Fix all 4 critical path/casing/payload issues.
- **Admin dashboard**: Separate Plan and Price creation flows.

### Non-Goals (v2)

- Usage-based billing (metered pricing)
- Invoicing UI
- Tax/VAT/GST automation
- Multi-currency support (USD only for v2)
- Organization/team billing entity (user-level only)
- Promotion stacking (max 1 promo per checkout for v2)
- Recurring/forever discounts (first-payment-only in v2; provider handles natively if needed)
- Mid-cycle plan upgrades/downgrades (cancel + repurchase only)
- Proration and billing reconciliation
- Partial refund handling (full refunds only in v2)
- Self-service plan changes by end users (admin-only for v2)

---

## 3. Architecture Overview

### 4-Layer Model

```
┌─────────────────────────────────────────────────┐
│                    PLAN                          │
│  "What does the user get?"                      │
│  Features, limits, entitlements                  │
│  Stable — changes rarely                        │
├─────────────────────────────────────────────────┤
│                    PRICE                         │
│  "How do they pay?"                             │
│  Amount, interval, currency, trial config        │
│  1:N per Plan — changes when pricing changes     │
├─────────────────────────────────────────────────┤
│                 SUBSCRIPTION                     │
│  "What is their billing state?"                 │
│  Recurring billing lifecycle, grace period       │
│  1:1 with active recurring price                │
│  NOT created for one-time purchases              │
├─────────────────────────────────────────────────┤
│                   LICENSE                        │
│  "Can they access the app?"                     │
│  Status, valid_until, activation tracking        │
│  1 active per user per app                      │
│  The artifact the SDK checks                    │
└─────────────────────────────────────────────────┘
```

### Relationship Diagram

```
Plan (1) ──── (N) Price
 │                  │
 │                  ├── (0..1) Subscription  [recurring prices only]
 │                  │              │
 │                  │              └── grace_period_end
 │                  │
 │                  └── ───────── License (1 per user per app)
 │                                   │
 │                                   └── (N) LicenseActivation [seats/devices]
 │
 └──── (N:M) Promotion  [via promotion_plans]
                │
                ├── (N) PromotionCode  [user-facing codes]
                ├── (N) PromotionProviderRef  [provider coupon mapping]
                └── (N) PromotionRedemption  [usage tracking]

License (1) ──── (N) LicenseHistory [audit trail]
```

### Data Flow

```
Admin creates Plan → Admin creates Price(s) for Plan
                          │
User initiates payment → selects Plan + Price
                          │
                    ┌─────┴─────┐
                    │           │
              Recurring    One-time
                    │           │
            Subscription    License created
            created         directly
                    │
            Webhook confirms payment
                    │
            License created/updated
                    │
            LicenseHistory written
                    │
            SDK validates license ← { valid: true, plan, price, dates }
```

---

## 4. Data Model

### 4.1 Plans Table (Capability Only)

> **What does the user get?** No pricing information.

**Free Plan Invariant:** Every app MUST have exactly one Free plan that:
- `slug = 'free'`, `status = 'active'`, `is_active = true`
- Has one Price: `billing_type = 'one_time'`, `amount_cents = 0`
- Cannot be archived or deleted
- Is the fallback plan for all post-cancel / post-refund transitions

This invariant is enforced at app creation time and validated by a startup check.

```
plans
├── id                  serial PK
├── public_id           varchar(255) UNIQUE NOT NULL  — "PLN0..."
├── app_id              integer FK → apps.id NOT NULL
├── name                varchar(255) NOT NULL         — "Pro Plan"
├── slug                varchar(255) NOT NULL         — "pro" (stable code reference)
├── description         text                          — Human-readable description
├── features            jsonb NOT NULL DEFAULT '[]'   — Feature flags & limits
├── status              varchar(20) NOT NULL DEFAULT 'active'  — 'active' | 'archived'
├── display_order       integer NOT NULL DEFAULT 0    — Sort order in UI
├── is_active           boolean NOT NULL DEFAULT true  — Soft toggle
├── created_at          timestamp NOT NULL DEFAULT NOW()
├── updated_at          timestamp NOT NULL DEFAULT NOW()
└── deleted_at          timestamp                     — Soft delete
```

**Indexes:**
- `plans_app_id_idx` ON (app_id)
- `plans_slug_idx` ON (slug)
- `plans_status_idx` ON (status)

**Unique:** `plans_app_slug_unique` ON (app_id, slug) WHERE deleted_at IS NULL

**Features JSONB shape:**
```typescript
// Flat feature flags
["api_access", "advanced_analytics", "priority_support"]

// Or structured with limits
{
  flags: ["api_access", "advanced_analytics"],
  limits: {
    max_api_calls: 10000,
    max_storage_mb: 500,
    max_team_members: 5
  }
}
```

**What's removed from current plans:**
- ~~monthly_price~~ → moved to `prices.amount_cents`
- ~~yearly_price~~ → moved to `prices.amount_cents`
- ~~one_time_price~~ → moved to `prices.amount_cents`
- ~~duration_days~~ → moved to `prices.duration_days`
- ~~trial_enabled~~ → moved to `prices.trial_enabled`
- ~~trial_days~~ → moved to `prices.trial_days`

### 4.2 Prices Table (Commercial Packaging)

> **How do they pay?** Pricing lives here, not on the plan.

```
prices
├── id                  serial PK
├── public_id           varchar(255) UNIQUE NOT NULL  — "PRC0..."
├── plan_id             integer FK → plans.id NOT NULL
├── app_id              integer FK → apps.id NOT NULL — Denormalized for query perf
│
│   ── Billing ──
├── billing_type        varchar(20) NOT NULL          — 'recurring' | 'one_time' | 'lifetime'
├── interval            varchar(20)                   — 'month' | 'year' (NULL for one_time/lifetime)
├── amount_cents        integer NOT NULL              — Price in cents (999 = $9.99)
├── currency            varchar(3) NOT NULL DEFAULT 'usd'
├── duration_days       integer                       — License duration. NULL = perpetual/until canceled
│
│   ── Trial ──
├── trial_enabled       boolean NOT NULL DEFAULT false
├── trial_days          integer                       — Trial period in days (requires trial_enabled=true)
│
│   ── Provider Mapping ──
├── external_provider   varchar(50)                   — 'stripe' | 'lemonsqueezy' | 'dodo'
├── external_price_id   varchar(255)                  — Provider's price ID (e.g., 'price_abc123')
│
│   ── Status ──
├── is_active           boolean NOT NULL DEFAULT true  — Soft toggle
├── created_at          timestamp NOT NULL DEFAULT NOW()
├── updated_at          timestamp NOT NULL DEFAULT NOW()
└── deleted_at          timestamp                     — Soft delete
```

**Indexes:**
- `prices_plan_id_idx` ON (plan_id)
- `prices_app_id_idx` ON (app_id)
- `prices_billing_type_idx` ON (billing_type)
- `prices_external_price_id_idx` ON (external_price_id)

**Unique:** `prices_external_price_id_unique` ON (external_price_id) WHERE external_price_id IS NOT NULL AND deleted_at IS NULL

**Design decisions:**
- `trial_enabled` + `trial_days` live here, NOT on Plan. Trial is a commercial incentive, not a capability.
- `external_provider` + `external_price_id` replaces the separate `plan_provider_prices` table for v2 simplicity. One price ↔ one provider price. If multi-provider per price is needed later, extract to a mapping table.
- `duration_days`: NULL means perpetual (lifetime) or until subscription cancels (recurring).
- `app_id` is denormalized from `plan.app_id` for faster queries (avoid extra join).

**Example rows:**
| Plan | billing_type | interval | amount_cents | trial_enabled | trial_days | external_provider | external_price_id |
|------|-------------|----------|-------------|--------------|-----------|------------------|------------------|
| Pro | recurring | month | 999 | true | 14 | stripe | price_abc123 |
| Pro | recurring | year | 9999 | false | — | stripe | price_def456 |
| Pro Plus | lifetime | — | 29900 | false | — | stripe | price_ghi789 |
| Free | one_time | — | 0 | false | — | — | — |

### 4.3 Subscriptions Table (Billing Lifecycle)

> **What is their billing state?** Only for recurring prices. Not created for one-time purchases.

```
subscriptions
├── id                      serial PK
├── public_id               varchar(255) UNIQUE NOT NULL  — "SUB0..."
├── user_id                 integer FK → users.id NOT NULL
├── app_id                  integer FK → apps.id NOT NULL — Denormalized
├── license_id              integer FK → licenses.id NOT NULL
├── price_id                integer FK → prices.id NOT NULL
│
│   ── Provider ──
├── provider_config_id      integer FK → payment_provider_configs.id NOT NULL
├── provider                varchar(50) NOT NULL          — 'stripe' | 'lemonsqueezy' | 'dodo'
├── provider_subscription_id varchar(255) NOT NULL        — Provider's subscription ID
├── provider_customer_id    varchar(255)                  — Provider's customer ID
│
│   ── Status ──
├── status                  varchar(50) NOT NULL          — See state machine below
│
│   ── Billing Period ──
├── billing_interval        varchar(20) NOT NULL          — 'month' | 'year'
├── billing_period_start    timestamp
├── billing_period_end      timestamp
├── next_billing_date       timestamp
│
│   ── Grace Period ──
├── grace_period_end        timestamp                     — When grace period expires after failed payment
│
│   ── Cancellation ──
├── cancel_at_period_end    boolean NOT NULL DEFAULT false
├── canceled_at             timestamp
├── ended_at                timestamp                     — When subscription fully ended
│
│   ── Trial ──
├── trial_start             timestamp
├── trial_end               timestamp
│
│   ── Amount ──
├── amount_cents            integer NOT NULL
├── currency                varchar(3) NOT NULL DEFAULT 'usd'
│
│   ── Metadata ──
├── metadata                jsonb                         — Provider-specific data
├── created_at              timestamp NOT NULL DEFAULT NOW()
└── updated_at              timestamp NOT NULL DEFAULT NOW()
```

**Indexes:**
- `subscriptions_user_id_idx` ON (user_id)
- `subscriptions_app_id_idx` ON (app_id)
- `subscriptions_license_id_idx` ON (license_id)
- `subscriptions_price_id_idx` ON (price_id)
- `subscriptions_provider_subscription_id_idx` ON (provider_subscription_id)
- `subscriptions_status_idx` ON (status)
- `subscriptions_next_billing_date_idx` ON (next_billing_date)

**Unique:** `subscriptions_provider_sub_unique` ON (provider_config_id, provider_subscription_id)

**Key decision:** `grace_period_end` lives HERE, not on License. The license mirrors subscription status — when subscription enters grace, license stays active. When grace expires and subscription moves to `unpaid`, license becomes `expired`. This keeps the license as a clean access-control artifact that doesn't need to understand billing concepts.

### 4.4 Licenses Table (Access Control)

> **Can they access the app?** The artifact the SDK checks.

```
licenses
├── id                  serial PK
├── public_id           varchar(255) UNIQUE NOT NULL  — "LIC0..."
├── user_id             integer FK → users.id NOT NULL
├── app_id              integer FK → apps.id NOT NULL
├── plan_id             integer FK → plans.id NOT NULL
├── price_id            integer FK → prices.id        — NULL for admin-granted licenses
│
│   ── Status ──
├── status              varchar(20) NOT NULL DEFAULT 'active'
│                       — 'active' | 'trialing' | 'expired' | 'canceled' | 'suspended'
├── valid_until         timestamp                     — NULL = perpetual / until canceled
│
│   ── Source ──
├── source              varchar(20) NOT NULL DEFAULT 'purchase'
│                       — 'purchase' | 'admin_grant' | 'auto_free' | 'invitation' | 'webhook'
│
│   ── Metadata ──
├── max_activations     integer                       — NULL = unlimited. Max concurrent devices/seats.
├── metadata            jsonb                         — Flexible: { granted_by, note, ... }
├── is_test             boolean NOT NULL DEFAULT false
├── created_at          timestamp NOT NULL DEFAULT NOW()
├── updated_at          timestamp NOT NULL DEFAULT NOW()
└── deleted_at          timestamp                     — Soft delete
```

**Indexes:**
- `licenses_user_id_idx` ON (user_id)
- `licenses_app_id_idx` ON (app_id)
- `licenses_plan_id_idx` ON (plan_id)
- `licenses_price_id_idx` ON (price_id)
- `licenses_status_idx` ON (status)
- `licenses_is_test_idx` ON (is_test, created_at)

**Unique:** `licenses_user_app_unique` ON (user_id, app_id) — One active license per user per app.

**What's new:**
- `price_id` — Links to the price the user purchased (NULL for admin grants)
- `source` — How the license was created (purchase, admin grant, auto-free, invitation)
- `max_activations` — Seats/device cap (NULL = unlimited). Checked against `license_activations`.
- `metadata` — Flexible JSONB for admin notes, grant reasons, migration data.

**What's unchanged:**
- `user_id`, `app_id`, `plan_id`, `status`, `valid_until`, `is_test` — Same shape.
- Unique constraint on (user_id, app_id) — One license per user per app.

### 4.5 License Activations Table (Seats/Devices)

> Tracks concurrent device/seat usage against `licenses.max_activations`.

```
license_activations
├── id                  serial PK
├── public_id           varchar(255) UNIQUE NOT NULL  — "ACT0..."
├── license_id          integer FK → licenses.id NOT NULL
├── device_id           varchar(255) NOT NULL         — Client-generated device fingerprint
├── device_name         varchar(255)                  — "MacBook Pro", "iPhone 15"
├── device_type         varchar(50)                   — 'desktop' | 'mobile' | 'tablet' | 'browser'
├── ip_address          varchar(50)
├── user_agent          text
├── last_seen_at        timestamp NOT NULL DEFAULT NOW()
├── deactivated_at      timestamp                     — NULL = currently active
├── created_at          timestamp NOT NULL DEFAULT NOW()
└── updated_at          timestamp NOT NULL DEFAULT NOW()
```

**Indexes:**
- `license_activations_license_id_idx` ON (license_id)
- `license_activations_device_id_idx` ON (device_id)
- `license_activations_last_seen_at_idx` ON (last_seen_at)

**Unique:** `license_activations_license_device_unique` ON (license_id, device_id) WHERE deactivated_at IS NULL

**How it works:**
1. SDK calls `POST /v1/license/activate` with `{ licenseKey, deviceId, deviceName }`
2. Server checks `COUNT(*) FROM license_activations WHERE license_id = ? AND deactivated_at IS NULL`
3. If count < `license.max_activations` (or max_activations is NULL): create activation
4. If count >= max: reject with `{ error: "max_activations_reached", limit: N, active: count }`
5. Stale activations (no `last_seen_at` within 30 days) are auto-deactivated by a scheduled job

**Concurrency rule:** Device activation MUST run inside a database transaction with a `SELECT ... FOR UPDATE` lock on the license row. This prevents race conditions where two concurrent activation requests could exceed `max_activations`. The check-and-insert is atomic:

```sql
BEGIN;
  SELECT * FROM licenses WHERE id = ? FOR UPDATE;
  SELECT COUNT(*) FROM license_activations WHERE license_id = ? AND deactivated_at IS NULL;
  -- If count < max_activations: INSERT INTO license_activations ...
  -- Else: ROLLBACK and return error
COMMIT;
```

### 4.6 License History Table (Audit Trail)

> Tracks ALL license state changes. Actively written to on every mutation.

```
license_history
├── id                      serial PK
├── public_id               varchar(255) UNIQUE NOT NULL  — "LHI0..."
├── license_id              integer FK → licenses.id NOT NULL
│
│   ── What Changed ──
├── change_type             varchar(50) NOT NULL
│       — 'created' | 'plan_changed' | 'price_changed' | 'status_changed'
│       — 'expiry_extended' | 'expiry_reduced' | 'activation_added'
│       — 'activation_removed' | 'deleted'
│
│   ── Snapshot ──
├── old_value               jsonb          — Previous state snapshot
├── new_value               jsonb          — New state snapshot
│
│   ── Why ──
├── reason                  varchar(50) NOT NULL
│       — 'purchase' | 'renewal' | 'refund' | 'admin_manual'
│       — 'system_auto' | 'upgrade' | 'downgrade' | 'webhook'
│       — 'invitation' | 'trial_start' | 'trial_end'
│
│   ── Who ──
├── changed_by_user_id      integer FK → users.id   — Admin who made change (NULL if system)
├── changed_by_system       boolean NOT NULL DEFAULT false
│
│   ── Payment Link ──
├── payment_transaction_id  integer FK → payment_transactions.id
│
│   ── Notes ──
├── notes                   text           — Admin/audit notes
│
└── created_at              timestamp NOT NULL DEFAULT NOW()
```

**Indexes:** Same as current schema (license_id, change_type, reason, created_at).

**Change from current:** Actively written to on every license mutation. No changes to table structure — it already has the right shape.

---

## 5. Entity Lifecycle & State Machines

### 5.1 Plan Lifecycle

```
   ┌─────────┐
   │  active  │ ← Created
   └────┬─────┘
        │ archive
   ┌────▼──────┐
   │ archived  │ ← Existing licenses still work, no new purchases
   └────┬──────┘
        │ delete (soft)
   ┌────▼──────┐
   │  deleted  │ ← deleted_at set
   └───────────┘
```

**Rules:**
- Active plans can be purchased.
- Archived plans: existing licenses still valid, but no new purchases allowed.
- Deleting a plan that has active licenses → force archive instead.

### 5.2 Price Lifecycle

```
   ┌─────────┐
   │  active  │ ← Created
   └────┬─────┘
        │ deactivate
   ┌────▼──────┐
   │ inactive  │ ← No new purchases. Existing subscriptions keep running.
   └────┬──────┘
        │ delete (soft)
   ┌────▼──────┐
   │  deleted  │ ← deleted_at set
   └───────────┘
```

**Rules:**
- Active prices can be purchased.
- Deactivating a price: existing subscriptions on that price keep running. No new purchases.
- Price changes = create new Price, deactivate old one. Immutable pricing.

### 5.3 Subscription State Machine

```
                    ┌──────────┐
        ┌──────────►│ trialing │
        │           └─────┬────┘
        │                 │ trial ends
        │                 ▼
   ┌────┴────┐      ┌──────────┐     payment fails    ┌──────────┐
   │ created │─────►│  active   │────────────────────►│ past_due │
   └─────────┘      └─────┬────┘                      └─────┬────┘
                          │                                  │
              user cancels│                    grace expires  │
                          │                                  │
                    ┌─────▼──────┐                    ┌──────▼────┐
                    │ canceled   │                    │  unpaid   │
                    │(end of period)│                 └─────┬─────┘
                    └─────┬──────┘                         │
                          │ period ends                    │ provider ends
                          ▼                                ▼
                    ┌───────────┐                    ┌───────────┐
                    │   ended   │                    │   ended   │
                    └───────────┘                    └───────────┘
```

**Status values:** `trialing` | `active` | `past_due` | `canceled` | `unpaid` | `ended` | `paused`

**Grace period flow:**
1. Payment fails → subscription moves to `past_due`
2. `grace_period_end` is set (typically billing_period_end + grace days from provider)
3. License **stays active** during grace period
4. If payment retries succeed → back to `active`
5. If grace expires without payment → subscription moves to `unpaid` → license expires

### 5.4 License State Machine

```
   ┌──────────┐
   │ trialing │ ← Created via trial price
   └────┬─────┘
        │ trial ends + payment succeeds
        ▼
   ┌──────────┐     subscription unpaid /     ┌──────────┐
   │  active  │     valid_until passed        │ expired  │
   │          │────────────────────────────►  │          │
   └────┬─────┘                               └──────────┘
        │                                          ▲
        │ admin suspends                           │ subscription canceled
        ▼                                          │ + period ends
   ┌──────────┐                               ┌───┴──────┐
   │suspended │                               │ canceled │
   └──────────┘                               └──────────┘
```

**Status values:** `active` | `trialing` | `expired` | `canceled` | `suspended`

**License ↔ Subscription sync rules:**
| Subscription Status | License Status | Notes |
|---|---|---|
| `trialing` | `trialing` | During trial period |
| `active` | `active` | Normal active state |
| `past_due` (grace active) | `active` | License stays active during grace |
| `unpaid` (grace expired) | → Free plan | License mutated to free plan (see below) |
| `canceled` (period remaining) | `active` | Access until period ends |
| `ended` | → Free plan | License mutated to free plan (see below) |
| `paused` | `suspended` | Billing paused |

### 5.5 Free Plan Transition (Post-Cancel / Post-Refund)

When a paid subscription ends (cancel expiration, unpaid, or refund), the user doesn't lose their license row — they get downgraded to the Free plan.

**Trigger conditions:**
- Subscription `ended` (period expired after cancel)
- Subscription `unpaid` (grace period expired)
- Full refund received
- Trial canceled (immediate)

**Mutation (same row, NOT a new license):**
```sql
UPDATE licenses SET
  plan_id = FREE_PLAN_ID,
  price_id = NULL,
  status = 'active',
  valid_until = NULL,
  source = 'auto_free',
  updated_at = NOW()
WHERE user_id = ? AND app_id = ?;
```

**Write license_history:**
```
change_type = 'plan_changed'
reason = 'downgrade_auto'  -- or 'refund' for refund cases
old_value = { plan_id: PRO_PLAN_ID, status: 'expired', ... }
new_value = { plan_id: FREE_PLAN_ID, status: 'active', ... }
changed_by_system = true
```

**Why mutate instead of delete + create:**
- UNIQUE constraint on (user_id, app_id) — one row per user per app
- Preserves license history chain (same license_id)
- No orphaned activation records
- Clean audit trail

### 5.6 Upgrade / Downgrade Policy

**In v2, mid-cycle plan upgrades/downgrades are NOT supported.**

Allowed flows:
- User can **cancel** their subscription (at period end)
- After expiration (auto-transition to Free), user can **purchase a different plan**
- Admin can manually change a license's plan via `PATCH /v1/admin/.../licenses/:id`

Not supported in v2:
- Mid-cycle plan switching (Pro → Pro Plus)
- Proration (partial billing adjustments)
- Monthly ↔ yearly switching
- In-app upgrade/downgrade buttons

This avoids Stripe proration complexity, billing reconciliation, and complex state transitions. Phase 2+ can add upgrade flows if needed.

### 5.7 Trial Cancel Rule

**If a user cancels during a trial period:**

1. Subscription ends **immediately** (not at period end — trials are free)
2. License transitions to **Free plan immediately** (same mutation as §5.5)
3. Trial **cannot be resumed** — prevents trial-cancel-retrial exploit
4. Write license_history: `change_type = 'status_changed'`, `reason = 'trial_end'`

**Implementation:**
```
IF subscription.status == 'trialing' AND cancel requested:
  → Cancel subscription immediately (not at period end)
  → Mutate license to Free plan
  → Set subscription.status = 'ended'
  → Record trial_used = true on subscription (prevents re-trial)
```

**Anti-abuse:** Track whether a user has already trialed a plan. One trial per user per plan per app. Enforced by checking existing `license_history` for `reason = 'trial_start'` with matching plan_id.

### 5.8 Refund Handling

**In v2, all refunds are treated as full refunds.** Partial refund events do not modify the license.

On full refund webhook (`charge.refunded` / `refund.succeeded`):

1. Subscription → `ended`
2. License → **immediately transition to Free plan** (same §5.5 mutation)
3. Write license_history: `change_type = 'plan_changed'`, `reason = 'refund'`
4. Record refund on `payment_transactions`

**Partial refunds:** No license changes. The payment_transaction records the partial refund amount, but the license and subscription are unaffected. Admin can manually revoke if needed.

### 5.9 "New Customer" Definition

Used by promotion eligibility check (`is_new_customers_only`).

**Definition:** A user is a "new customer" for an app if they have **never had a paid license** for that app.

```sql
-- Returns true if user is NOT new (has prior paid license)
SELECT EXISTS (
  SELECT 1 FROM licenses
  WHERE user_id = ?
    AND app_id = ?
    AND source = 'purchase'
) AS has_paid_before;
```

**Rules:**
- Expired paid licenses **still count** — user is not "new" even if their Pro expired
- Free plan licenses do **not** disqualify — `source = 'auto_free'` is ignored
- Admin-granted licenses do **not** disqualify — `source = 'admin_grant'` is ignored
- Only `source = 'purchase'` counts as a prior paid relationship

---

## 6. API Design

### 6.1 Plan CRUD (Admin)

All paths relative to Core: `/v1/admin/apps/:appId/plans`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create plan |
| GET | `/` | List plans for app |
| GET | `/:planId` | Get single plan |
| PATCH | `/:planId` | Update plan |
| DELETE | `/:planId` | Soft delete / archive plan |

**Create Plan — Request:**
```json
{
  "name": "Pro Plan",
  "slug": "pro",
  "description": "For power users",
  "features": ["api_access", "advanced_analytics", "priority_support"],
  "displayOrder": 0
}
```

**Create Plan — Response (201):**
```json
{
  "planId": "PLN0abc...",
  "name": "Pro Plan",
  "slug": "pro",
  "description": "For power users",
  "features": ["api_access", "advanced_analytics", "priority_support"],
  "status": "active",
  "displayOrder": 0,
  "createdAt": "2026-02-28T..."
}
```

### 6.2 Price CRUD (Admin)

All paths relative to Core: `/v1/admin/apps/:appId/plans/:planId/prices`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create price for plan |
| GET | `/` | List prices for plan |
| GET | `/:priceId` | Get single price |
| PATCH | `/:priceId` | Update price (limited fields) |
| DELETE | `/:priceId` | Deactivate price |

**Create Price — Request:**
```json
{
  "billingType": "recurring",
  "interval": "month",
  "amountCents": 999,
  "currency": "usd",
  "durationDays": null,
  "trialEnabled": true,
  "trialDays": 14,
  "externalProvider": "stripe",
  "externalPriceId": "price_abc123"
}
```

**Create Price — Response (201):**
```json
{
  "priceId": "PRC0def...",
  "planId": "PLN0abc...",
  "billingType": "recurring",
  "interval": "month",
  "amountCents": 999,
  "currency": "usd",
  "durationDays": null,
  "trialEnabled": true,
  "trialDays": 14,
  "externalProvider": "stripe",
  "externalPriceId": "price_abc123",
  "isActive": true,
  "createdAt": "2026-02-28T..."
}
```

**Price update rules:**
- Can update: `is_active`, `external_provider`, `external_price_id`, `trial_enabled`, `trial_days`
- Cannot update: `amount_cents`, `billing_type`, `interval` (create new price instead — immutable pricing)

### 6.3 Subscription Management (Admin + Webhooks)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/admin/apps/:appId/subscriptions` | List subscriptions |
| GET | `/v1/admin/apps/:appId/subscriptions/:subId` | Get subscription detail |
| PATCH | `/v1/admin/apps/:appId/subscriptions/:subId` | Admin cancel/pause |

Subscriptions are primarily created/updated via webhooks, not admin UI.

### 6.4 User Subscription Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/subscription` | Get current user's subscription for this app |
| POST | `/v1/subscription/cancel` | Cancel subscription (at period end) |
| POST | `/v1/subscription/resume` | Resume a canceled subscription (before period ends) |

**Cancel — Request:**
```json
{
  "reason": "too_expensive"
}
```

**Cancel — Response (200):**
```json
{
  "subscriptionId": "SUB0abc...",
  "status": "canceled",
  "cancelAt": "2026-03-28T...",
  "accessUntil": "2026-03-28T..."
}
```

**Cancellation flow:**
1. **User calls** `POST /v1/subscription/cancel` with optional reason
2. **Server** looks up active subscription for (user_id, app_id)
3. **Server** calls provider API to cancel at period end:
   - Stripe: `stripe.subscriptions.update(subId, { cancel_at_period_end: true })`
   - LemonSqueezy: `PATCH /v1/subscriptions/{id}` with `cancelled: true`
   - Dodo: provider-specific cancel endpoint
4. **Server** updates local subscription: `status = 'canceled'`, `cancel_at = period_end`
5. **License stays active** until `cancel_at` date (user keeps access through paid period)
6. **At period end:** provider webhook fires `customer.subscription.deleted` → license expires
7. **Write license_history**: `change_type = 'status_changed'`, `reason = 'user_canceled'`

**Resume flow** (before period ends):
1. User calls `POST /v1/subscription/resume`
2. Server calls provider API to uncancel:
   - Stripe: `stripe.subscriptions.update(subId, { cancel_at_period_end: false })`
3. Server updates local subscription: `status = 'active'`, `cancel_at = NULL`
4. Write license_history

**Important:** Cancel always means "cancel at end of billing period" — never immediate. The user paid for the full period and keeps access until it ends. Immediate revocation is admin-only. **Exception:** trial cancellation is immediate (see §5.7).

When the subscription ends (period expires), the license automatically transitions to the Free plan (see §5.5). The user retains their account and can purchase a new plan at any time.

### 6.5 License Management (Admin)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/admin/apps/:appId/licenses/grant` | Admin grant license |
| GET | `/v1/admin/apps/:appId/licenses` | List licenses for app |
| GET | `/v1/admin/apps/:appId/licenses/:licenseId` | Get license detail |
| PATCH | `/v1/admin/apps/:appId/licenses/:licenseId` | Update license (extend, change plan) |
| DELETE | `/v1/admin/apps/:appId/licenses/:licenseId` | Revoke license |
| GET | `/v1/admin/apps/:appId/licenses/:licenseId/history` | License change history |

**Grant License — Request:**
```json
{
  "userId": "USR0abc...",
  "planId": "PLN0def...",
  "priceId": "PRC0ghi...",
  "source": "admin_grant",
  "durationDays": 90,
  "maxActivations": 3,
  "note": "Early adopter grant"
}
```

### 6.6 License Validation (SDK / Public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/license/validate` | Validate license for current user + app |
| POST | `/v1/license/activate` | Register device activation |
| POST | `/v1/license/deactivate` | Remove device activation |

**Validate — Response:**
```json
{
  "valid": true,
  "license": {
    "licenseId": "LIC0abc...",
    "status": "active",
    "plan": {
      "planId": "PLN0def...",
      "slug": "pro",
      "name": "Pro Plan",
      "features": ["api_access", "advanced_analytics"]
    },
    "price": {
      "priceId": "PRC0ghi...",
      "billingType": "recurring",
      "interval": "month",
      "amountCents": 999
    },
    "validUntil": "2026-05-28T...",
    "activations": {
      "current": 2,
      "max": 3
    }
  }
}
```

**Invalid — Response:**
```json
{
  "valid": false,
  "reason": "expired",
  "license": {
    "licenseId": "LIC0abc...",
    "status": "expired",
    "plan": { "slug": "pro", "name": "Pro Plan" },
    "validUntil": "2026-01-15T..."
  }
}
```

### 6.7 API Path Convention Fix

**Problem:** Frontend currently calls `/v1/admin/projects/:pid/apps/:aid/plans` but Core mounts at `/v1/admin/plans`.

**Solution:** Restructure Core routes to be app-scoped:

```
/v1/admin/apps/:appId/plans          ← Plan CRUD
/v1/admin/apps/:appId/plans/:planId/prices  ← Price CRUD
/v1/admin/apps/:appId/licenses       ← License CRUD
/v1/admin/apps/:appId/subscriptions  ← Subscription read
```

Frontend calls (via Gateway proxy):
```
POST /v1/admin/apps/${appId}/plans
POST /v1/admin/apps/${appId}/plans/${planId}/prices
GET  /v1/admin/apps/${appId}/licenses
```

Gateway forwards as-is to Core. No path rewriting needed.

---

## 7. Promotions & Discounts

### 7.1 Core Principle

**Promotions are one-time billing modifiers, not plan changes.** A promo gives a user a discount on their first purchase/first billing cycle — e.g., "first year free" or "50% off first year". Discounts never affect entitlements or access control. A discounted purchase creates the exact same license as a full-price purchase.

Promotions target **Plans**, not Prices. A promo like "50% off Pro" applies to the Plan. An optional `allowed_intervals` filter controls which Price intervals qualify (e.g., only yearly). This avoids N mapping rows per Price.

**Simplicity constraint:** All promos apply to the **first payment only** (`duration = once`). No recurring/forever discounts in v2. If we need repeating discounts later, the provider handles it natively.

### 7.2 Current State

Three promotion tables already exist in the schema:
- **`promotions`** — Discount rules: `discount_type` (percent/fixed), `discount_value`, `starts_at`/`ends_at` window, `is_active`
- **`promotion_codes`** — User-facing codes (e.g., "SAVE50") with `max_uses` / `current_uses`
- **`promotion_redemptions`** — Usage tracking: links code → purchase with `discount_cents`

Checkout passthrough already works — the checkout route accepts `promoCode`, and all three provider adapters (Stripe, LemonSqueezy, Dodo) pass it to the provider's checkout session.

**What's missing:** Proofa-side validation, eligibility checks, plan targeting, provider coupon mapping, admin CRUD, redemption recording, and the `promotion_plans` M:M table.

### 7.3 Schema Changes

#### 7.3.1 Extend `promotions` Table

Add eligibility columns to the existing table:

```
promotions (EXTEND existing table)
+ allowed_intervals     jsonb
│                       — ["month","year"] or NULL (all intervals)
+ is_new_customers_only boolean NOT NULL DEFAULT false
│                       — Only users with no existing license for this app
+ max_redemptions       integer
│                       — Global cap across all codes (NULL = unlimited)
+ current_redemptions   integer NOT NULL DEFAULT 0
│                       — Global counter across all codes
```

**Removed from earlier design (keeping it simple):**
- ~~`duration_type`~~ — Always "once" (first payment only). No recurring/forever discounts.
- ~~`duration_cycles`~~ — Not needed when duration is always once.
- ~~`allowed_billing_types`~~ — Unnecessary filter. All billing types eligible.
- ~~`min_amount_cents`~~ — Over-engineering. Admin picks plans, that's sufficient.

#### 7.3.2 Create `promotion_plans` Table (Plan Targeting)

```
promotion_plans
├── id                  serial PK
├── promotion_id        integer FK → promotions.id NOT NULL
├── plan_id             integer FK → plans.id NOT NULL
└── created_at          timestamp NOT NULL DEFAULT NOW()
```

**Unique:** `promotion_plans_promo_plan_unique` ON (promotion_id, plan_id)

**Indexes:**
- `promotion_plans_promotion_id_idx` ON (promotion_id)
- `promotion_plans_plan_id_idx` ON (plan_id)

**Rules:** Empty (no rows for a promotion) = all plans eligible. If rows exist, only listed plans qualify.

#### 7.3.3 Create `promotion_provider_refs` Table (Provider Coupon Mapping)

```
promotion_provider_refs
├── id                  serial PK
├── public_id           varchar(255) UNIQUE NOT NULL  — "PPR0..."
├── promotion_id        integer FK → promotions.id NOT NULL
├── provider_config_id  integer FK → payment_provider_configs.id NOT NULL
├── provider_coupon_id  varchar(255) NOT NULL
│                       — Provider's coupon/discount ID (Stripe: 'coupon_abc', LS: 'discount_xyz')
├── provider_object_type varchar(50) NOT NULL DEFAULT 'coupon'
│                       — 'coupon' | 'promotion_code' | 'discount'
├── is_active           boolean NOT NULL DEFAULT true
├── created_at          timestamp NOT NULL DEFAULT NOW()
└── updated_at          timestamp NOT NULL DEFAULT NOW()
```

**Unique:** `promotion_provider_refs_promo_provider_unique` ON (promotion_id, provider_config_id) WHERE is_active = true

**Indexes:**
- `promotion_provider_refs_promotion_id_idx` ON (promotion_id)
- `promotion_provider_refs_provider_config_id_idx` ON (provider_config_id)

**Immutable pattern:** If provider coupon terms change, deactivate old ref and create a new Proofa promotion.

### 7.4 Promotion ↔ v2 Layer Relationships

```
Plan ←──── promotion_plans ────→ Promotion (first payment only)
  │                                  │
  └── Price                          ├── allowed_intervals filter
       │                             └── promotion_codes (user-facing)
       │
       └── external_price_id
            ↕
       promotion_provider_refs.provider_coupon_id
            ↕
       Provider checkout session (Stripe/LS/Dodo)
```

Key: Promotions live in the **billing layer** alongside Prices. They never touch Plan (capability) or License (access control). All discounts are first-payment-only.

### 7.5 Validation Flow

```
POST /v1/billing/validate-promo
  body: { code, priceId }

Server:
  1. Look up promotion_code → promotion
  2. Check promotion.is_active + within starts_at/ends_at window
  3. Check code.is_active + code.current_uses < code.max_uses
  4. Check promotion.max_redemptions (global cap)
  5. Look up Price → Plan
  6. Check promotion_plans (if rows exist, plan must be in the list)
  7. Check allowed_intervals includes price.interval (if set)
  8. Check is_new_customers_only → user has no existing license for this app
  9. Check user hasn't already redeemed this promotion (promotion_redemptions)

Response (valid):
  {
    valid: true,
    discountCents: 500,
    adjustedTotal: 499,
    promotion: { name: "Launch 50% off", discountType: "percent", discountValue: 50 }
  }

Response (invalid):
  { valid: false, reason: "promotion_expired" | "code_exhausted" | "plan_not_eligible" | ... }
```

### 7.6 Updated Checkout Flow with Promotions

```
1. User selects Plan + Price
   → GET /v1/billing/plans/:appId (fetch available plans + prices)

2. User enters promo code (optional)
   → POST /v1/billing/validate-promo { code, priceId }
   → Returns discount preview

3. User clicks "Checkout"
   → POST /v1/billing/checkout { priceId, promoCode? }
   → Backend:
     a. Re-validate promo (eligibility frozen at this moment)
     b. Look up promotion_provider_refs → get provider_coupon_id
     c. Pass provider_coupon_id to adapter (NOT the raw user code)
     d. Create checkout session with provider
   → Returns: { checkoutUrl, sessionId }

4. Provider webhook fires (checkout.session.completed)
   → POST /v1/webhooks/:provider
   → Webhook handler:
     a. Create license (standard v2 flow)
     b. Record on payment_transaction: promotion_id, promotion_code_id, discount_applied_cents
     c. Create promotion_redemption entry
     d. Increment promotion_codes.current_uses (atomic)
     e. Increment promotions.current_redemptions (atomic)
     f. Write license_history

5. License created — identical to full-price purchase
   → Features = plan features (UNAFFECTED by discount)
   → Billing amount = discounted total (tracked in transaction only)
```

### 7.7 Promotion API (Admin)

All paths relative to Core: `/v1/admin/apps/:appId/promotions`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create promotion |
| GET | `/` | List promotions for app |
| GET | `/:promoId` | Get promotion detail (with codes, plan targets, provider refs) |
| PATCH | `/:promoId` | Update promotion (name, dates, eligibility, is_active) |
| DELETE | `/:promoId` | Deactivate promotion |

**Promotion Codes:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/:promoId/codes` | Create code(s) for promotion |
| GET | `/:promoId/codes` | List codes |
| PATCH | `/:promoId/codes/:codeId` | Update code (is_active, max_uses) |
| DELETE | `/:promoId/codes/:codeId` | Deactivate code |

**Provider Refs:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/:promoId/provider-refs` | Map promotion to provider coupon |
| GET | `/:promoId/provider-refs` | List provider mappings |
| DELETE | `/:promoId/provider-refs/:refId` | Deactivate provider mapping |

**Redemption History:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:promoId/redemptions` | List redemptions for promotion |

**Create Promotion — Request:**
```json
{
  "name": "First Year 50% Off",
  "discountType": "percent",
  "discountValue": 50,
  "startsAt": "2026-03-01T00:00:00Z",
  "endsAt": "2026-03-31T23:59:59Z",
  "allowedIntervals": ["year"],
  "isNewCustomersOnly": true,
  "maxRedemptions": 100,
  "planIds": ["PLN0abc...", "PLN0def..."]
}
```

**Create Promotion — Response (201):**
```json
{
  "promotionId": "PRM0abc...",
  "name": "First Year 50% Off",
  "discountType": "percent",
  "discountValue": 50,
  "startsAt": "2026-03-01T00:00:00Z",
  "endsAt": "2026-03-31T23:59:59Z",
  "allowedIntervals": ["year"],
  "isNewCustomersOnly": true,
  "maxRedemptions": 100,
  "currentRedemptions": 0,
  "isActive": true,
  "plans": ["PLN0abc...", "PLN0def..."],
  "codes": [],
  "createdAt": "2026-02-28T..."
}
```

### 7.8 Typical Promo Use Cases

| Use Case | Configuration |
|----------|---------------|
| "First year free" | `discountType: "percent"`, `discountValue: 100`, `allowedIntervals: ["year"]`, `isNewCustomersOnly: true` |
| "50% off first year" | `discountType: "percent"`, `discountValue: 50`, `allowedIntervals: ["year"]`, `isNewCustomersOnly: true` |
| "$5 off Pro plan" | `discountType: "fixed"`, `discountValue: 500` (cents), `planIds: ["PLN0pro..."]` |
| "Launch discount" | `discountType: "percent"`, `discountValue: 30`, `startsAt/endsAt` window, `maxRedemptions: 500` |

### 7.9 Phase 1 Constraints

| Aspect | Phase 1 (v2) | Phase 2+ |
|--------|-------------|----------|
| Discount duration | First payment only | Recurring/forever via `duration_type` |
| Promos per checkout | 1 | Many (stacking rules) |
| Redemptions per user | 1 per promo | Configurable limit |
| Global redemption limit | `max_redemptions` field | Same |
| Eligibility rules | 3 columns (intervals, new-only, max-redemptions) | Custom rules engine |
| Plan targeting | M:M via `promotion_plans` | Same |
| Stacking | None | `is_stackable` flag + stack limit |
| Provider mapping | Manual via admin UI | Auto-sync via provider API |

---

## 8. Payment Integration

### 8.1 Payment Flow (App-Initiated)

```
App (frontend) → POST /v1/payment/checkout
  body: { planId, priceId }

Gateway:
  1. Resolve app from session/token
  2. Look up Price → get external_provider, external_price_id
  3. Look up payment_routing_rules → get provider_config_id
  4. Call provider (Stripe/LemonSqueezy/Dodo) → create checkout session
  5. Return { checkoutUrl, sessionId }

App redirects user to checkoutUrl
  → User pays on provider-hosted page
  → Provider sends webhook to Proofa
```

### 8.2 Provider Mapping (v2 Simple)

For v2, each Price has `external_provider` + `external_price_id`:

```
Price: "Pro Monthly"
  → external_provider: "stripe"
  → external_price_id: "price_abc123"
```

At checkout time:
1. Look up Price by `priceId`
2. Get `external_provider` and `external_price_id`
3. Find matching `payment_provider_config` for the app + provider
4. Use credentials from `payment_provider_config` to create checkout session
5. Pass `external_price_id` as the item in checkout

**Future (v3):** If same price needs multiple providers (Stripe in US, LemonSqueezy in EU), extract to a `price_provider_mappings` table. Not needed for v2.

### 8.3 Existing Tables (Kept As-Is)

The following payment-related tables already exist and remain unchanged:

- **`payment_provider_configs`** — Provider credentials per project
- **`plan_provider_prices`** — Legacy provider price mapping (coexists with `prices.external_*` for backward compat, deprecate over time)
- **`purchases`** — Checkout session tracking
- **`payment_transactions`** — Immutable payment records (with `promotion_id`, `promotion_code_id`, `discount_applied_cents` columns)
- **`webhook_logs`** — Webhook request/response tracking
- **`promotion_codes`** — Promo codes per promotion (existing)
- **`promotion_redemptions`** — Redemption tracking (existing)

See §7 for modified/new promotion tables: `promotions` (extended), `promotion_plans` (new), `promotion_provider_refs` (new).

---

## 9. Webhook Processing

### 9.1 Endpoint Structure

```
POST /v1/webhooks/stripe
POST /v1/webhooks/lemonsqueezy
POST /v1/webhooks/dodo
```

Each endpoint:
1. Verifies provider-specific signature
2. Logs raw payload to `webhook_logs`
3. Enqueues processing job (queue-based, not inline)
4. Returns `200 OK` immediately

### 9.2 Event → Action Mapping

| Provider Event | Action |
|---------------|--------|
| `checkout.session.completed` | Create License + Subscription (if recurring) + Record promotion redemption (if promo applied) |
| `invoice.payment_succeeded` | Extend License `valid_until` |
| `invoice.payment_failed` | Set Subscription `past_due` + `grace_period_end` |
| `customer.subscription.updated` | Sync Subscription status |
| `customer.subscription.deleted` | End Subscription → License transitions to Free plan (§5.5) |
| `charge.refunded` | Full refund: Subscription → ended, License → Free plan (§5.5). Partial refund: no license change. |

**Promotion recording on `checkout.session.completed`:**

When the checkout was initiated with a promo code:
1. Write `promotion_id`, `promotion_code_id`, `discount_applied_cents` on `payment_transactions` row
2. Create `promotion_redemptions` entry (code_id, purchase_id, discount_cents)
3. Atomically increment `promotion_codes.current_uses`
4. Atomically increment `promotions.current_redemptions`

### 9.3 Idempotency

Three layers of dedup:

1. **Webhook event ID**: `webhook_logs` has UNIQUE on `(provider, event_id)`. Duplicate webhook → skip.
2. **Unique constraints**: License has UNIQUE on `(user_id, app_id)`. Double-create → upsert.
3. **Idempotency key header**: Checkout API accepts `Idempotency-Key` header. Same key within 24h → return cached response.

### 9.4 Queue-Based Processing

```
Webhook received
  → Verify signature
  → Log to webhook_logs (status: 'not_started')
  → Enqueue job: { webhookLogId, provider, eventType }
  → Return 200 OK

Worker picks up job:
  → Read webhook_logs entry
  → Process event (create/update license, subscription, etc.)
  → Write license_history
  → Update webhook_logs (status: 'completed' | 'failed')
  → If failed: retry with exponential backoff (max 3 retries)
```

---

## 10. SDK Contract

### 10.1 License Validation Response

The SDK (`@proofa/client`) calls the license validation endpoint and returns a typed response:

```typescript
interface LicenseValidation {
  valid: boolean;
  reason?: 'expired' | 'canceled' | 'suspended' | 'no_license' | 'max_activations';
  license?: {
    licenseId: string;       // "LIC0..."
    status: LicenseStatus;   // 'active' | 'trialing' | 'expired' | 'canceled' | 'suspended'
    plan: {
      planId: string;        // "PLN0..."
      slug: string;          // "pro"
      name: string;          // "Pro Plan"
      features: string[];    // ["api_access", "advanced_analytics"]
    };
    price?: {
      priceId: string;       // "PRC0..."
      billingType: string;   // "recurring" | "one_time" | "lifetime"
      interval?: string;     // "month" | "year"
      amountCents: number;
    };
    validUntil: string | null;   // ISO 8601 or null for perpetual
    activations?: {
      current: number;
      max: number | null;        // null = unlimited
    };
  };
}
```

### 10.2 SDK Usage

```typescript
import { Proofa } from '@proofa/client';

const proofa = new Proofa({ appId: 'APP0...' });

// Check license
const result = await proofa.license.validate();
if (result.valid) {
  console.log(result.license.plan.slug); // "pro"
  console.log(result.license.plan.features); // ["api_access", ...]
}

// Check specific feature
const hasFeature = result.license?.plan.features.includes('advanced_analytics');

// Activate device
await proofa.license.activate({
  deviceId: 'fingerprint-hash',
  deviceName: 'MacBook Pro'
});
```

---

## 11. Admin Dashboard UX

### 11.1 Plan Management (AppLicenses.tsx)

**Current:** Single modal with plan name, slug, description, and all pricing fields.

**New:** Two-step flow.

**Step 1 — Create/Edit Plan:**
| Field | Type | Required |
|-------|------|----------|
| Name | text | Yes |
| Slug | text (auto-generated) | Yes |
| Description | textarea | No |
| Features | tag list (add/remove) | No |
| Display Order | number | No |

**Step 2 — Create/Edit Prices (per plan):**

Each plan shows a list of prices with "Add Price" button.

| Field | Type | Required |
|-------|------|----------|
| Billing Type | select: recurring / one_time / lifetime | Yes |
| Interval | select: month / year (shown only for recurring) | Conditional |
| Amount | currency input (dollars, converts to cents) | Yes |
| Duration Days | number (shown for one_time) | No |
| Trial Enabled | toggle | No |
| Trial Days | number (shown when trial enabled) | Conditional |
| External Provider | select: stripe / lemonsqueezy / dodo | No |
| External Price ID | text | No |

### 11.2 License Management

**List view:** Table with columns:
- User (name + email)
- Plan (name)
- Status (badge)
- Source (purchase / admin_grant / auto_free)
- Valid Until
- Activations (2/3)
- Actions (view, extend, revoke)

**Grant dialog:**
- User search/select
- Plan dropdown
- Price dropdown (optional)
- Duration days (optional)
- Max activations (optional)
- Note (optional)

### 11.3 Subscription View (Read-Only)

List of subscriptions for the app. Admin can cancel/pause but cannot modify billing directly (that happens in the payment provider dashboard).

### 11.4 Promotion Management

**Promotions tab** (new tab in app detail page, alongside Plans & Licenses):

**List view:** Table with columns:
- Name ("Launch 50% Off")
- Discount ("50%" or "$5.00")
- Window (Mar 1 – Mar 31)
- Status (active / expired / inactive badge)
- Usage (42 / 100)
- Codes count (3)
- Actions (view, edit, deactivate)

**Create Promotion dialog:**
| Field | Type | Required |
|-------|------|----------|
| Name | text | Yes |
| Discount Type | select: percent / fixed | Yes |
| Discount Value | number (50 for 50%, or dollars for fixed) | Yes |
| Starts At | date picker | Yes |
| Ends At | date picker | No |
| Plan Targets | multi-select from app's plans (empty = all) | No |
| Allowed Intervals | checkbox group: month / year | No |
| New Customers Only | toggle | No |
| Max Redemptions | number (global cap) | No |

**Promotion detail page:**
- Promotion settings (edit)
- Codes sub-table: Code string, max uses, current uses, status, actions (generate, deactivate)
- Provider refs sub-table: Provider, coupon ID, object type, status (add, deactivate)
- Redemption history: User, code used, discount amount, date, purchase link

---

## 12. Migration Strategy

### Approach: Clean Wipe (Dev Mode)

Since this is active development and not production data:

1. **Drop and recreate** the `plans`, `licenses`, `license_history` tables
2. **Create new** `prices` and `license_activations` tables
3. **Create new** `promotion_plans` and `promotion_provider_refs` tables
4. **Extend existing** `promotions` table with eligibility columns (`allowed_intervals`, `is_new_customers_only`, `max_redemptions`, `current_redemptions`)
5. **Keep existing** payment tables (`payment_provider_configs`, `plan_provider_prices`, `purchases`, `payment_transactions`, `subscriptions`, `webhook_logs`, `promotion_codes`, `promotion_redemptions`)
6. **Modify existing** `subscriptions` table to add `grace_period_end`, `price_id`, link to new license/price IDs
7. **Update** `invitations` table FK from old plans to new plans

### Migration Steps

```
Step 1: Create new schema (plans_v2, prices, license_activations, promotion_plans, promotion_provider_refs)
Step 2: Drop old plans, licenses, license_history
Step 3: Rename plans_v2 → plans
Step 4: Alter promotions table (add allowed_intervals, is_new_customers_only, max_redemptions, current_redemptions)
Step 5: Alter subscriptions table (add grace_period_end, price_id)
Step 6: Update invitations FK
Step 7: Run drizzle-kit generate + push
```

### Drizzle Migration

Since we're doing a clean wipe:
```bash
# Generate migration
pnpm --filter @proofa/db drizzle-kit generate

# Push to dev database
pnpm --filter @proofa/db drizzle-kit push
```

---

## 13. Security Considerations

### Access Control

- Plan/Price CRUD: Admin-only (project owner/admin role)
- Promotion CRUD: Admin-only (project owner/admin role)
- License grant/revoke: Admin-only
- License validate: Authenticated user (scoped to their user_id)
- Device activate/deactivate: Authenticated user (scoped to their license)
- Promo validate: Authenticated user (scoped to app context)
- Subscription cancel/resume: Authenticated user (scoped to their own subscription only)
- Subscription view: Admin for all, user for their own

### Input Validation

All endpoints validated with Zod schemas:
- Plan slugs: `^[a-z0-9-_]+$`, max 100 chars
- Price amounts: Non-negative integers (cents)
- Duration days: Positive integers when provided
- Features: Array of strings, max 50 items, max 255 chars each
- Promo codes: `^[A-Z0-9_-]+$`, max 50 chars
- Discount values: Positive integers (percent: 1-100, fixed: cents)
- Promo dates: Valid ISO 8601, `starts_at` before `ends_at`

### ID Exposure

Per project conventions:
- API responses use `public_id` (PLN0..., PRC0..., LIC0..., SUB0..., ACT0...)
- Internal `id` never exposed
- Route params accept public IDs, service looks up internal ID

### Webhook Security

- Signature verification per provider (Stripe: `stripe-signature` header, etc.)
- Webhook secrets stored encrypted in `payment_provider_configs`
- Raw payloads logged to `webhook_logs` for audit
- Queue-based processing prevents webhook timeout

---

## 14. Implementation Order

### Phase 1: Schema & Queries

1. Update `apps/packages/db/src/schema.ts` — New `plans`, `prices`, `license_activations`, `promotion_plans`, `promotion_provider_refs` tables. Modify `licenses`, `subscriptions`, `promotions`.
2. Generate Drizzle migration
3. Create query helpers in `@proofa/db/queries`: `planQueries`, `priceQueries`, `licenseQueries`, `subscriptionQueries`, `activationQueries`, `promotionQueries`

### Phase 2: Core Routes (Plans & Licenses)

4. Plan CRUD routes: `POST/GET/PATCH/DELETE /v1/admin/apps/:appId/plans`
5. Price CRUD routes: `POST/GET/PATCH/DELETE /v1/admin/apps/:appId/plans/:planId/prices`
6. License management routes: grant, list, update, revoke, history
7. License validation route: `GET /v1/license/validate`
8. Device activation routes: `POST /v1/license/activate`, `POST /v1/license/deactivate`
9. User subscription routes: `GET /v1/subscription`, `POST /v1/subscription/cancel`, `POST /v1/subscription/resume`

### Phase 3: Core Routes (Promotions)

10. Promotion CRUD routes: `POST/GET/PATCH/DELETE /v1/admin/apps/:appId/promotions`
11. Promotion code management: `POST/GET/PATCH/DELETE /v1/admin/apps/:appId/promotions/:promoId/codes`
12. Provider ref mapping: `POST/GET/DELETE /v1/admin/apps/:appId/promotions/:promoId/provider-refs`
13. Validation endpoint: `POST /v1/billing/validate-promo`
14. Upgrade checkout route: validate promo + resolve provider coupon via `promotion_provider_refs` + pass to adapter

### Phase 4: Frontend

15. Update AppLicenses.tsx: Split into Plan + Price creation flows
16. Update license list view with new fields (source, activations)
17. Add subscription list view (read-only)
18. Add Promotions tab: promotion list, create/edit dialog, codes management, provider refs, redemption history

### Phase 5: Webhook Integration

19. Webhook endpoints: `/v1/webhooks/:provider`
20. Event processing logic (checkout complete → create license + record redemption)
21. Queue worker for async processing
22. Webhook handler: record `promotion_id`, `promotion_code_id`, `discount_applied_cents` on `payment_transaction`, create `promotion_redemption`, increment counters

### Phase 6: SDK

23. Update `@proofa/client` license validation response type
24. Add activation/deactivation methods
25. Add subscription cancel/resume methods

---

## 15. Appendix: Decision Log

| # | Decision | Rationale | Alternatives Considered |
|---|----------|-----------|------------------------|
| 1 | Keep `license_history` | Already has the right shape. Actively write to it for all license mutations. | Remove and rely on audit_logs (too generic) |
| 2 | `grace_period_end` on Subscription only | License is a clean access-control artifact. Subscription owns billing state. License mirrors subscription via sync rules. | Grace on License (leaks billing into access control) |
| 3 | Seats/devices in separate `license_activations` table | Clean separation. License stays simple (max_activations cap). Activation tracking is its own concern with device metadata. | Seats column on License (loses device tracking), JSONB array (no index/constraint support) |
| 4 | Clean wipe migration | Dev mode only, no production data. Fresh start is simpler and less error-prone than data migration. | Incremental migration (unnecessary complexity for dev) |
| 5 | `external_price_id` + `external_provider` on prices table | Simple v2 approach. One price ↔ one provider price. Avoids an extra mapping table. | Separate `price_provider_mappings` table (overengineered for v2) |
| 6 | Trial config on Price, not Plan | Trial is a commercial incentive (pay mechanism), not a capability. Same plan (Pro) can have trial on monthly but not on yearly. | Trial on Plan (can't vary per pricing interval) |
| 7 | `source` field on License | Distinguishes purchase vs admin_grant vs auto_free vs invitation. Critical for analytics and audit. | Metadata JSONB only (not queryable) |
| 8 | Queue-based webhook processing | Prevents timeout on heavy webhook processing. Enables retry with backoff. Provider gets 200 immediately. | Inline processing (risky with complex DB operations) |
| 9 | Immutable pricing | Price changes = new Price row. Old subscriptions keep old price. Prevents billing confusion. | Mutable prices with version column (error-prone) |
| 10 | One license per user per app | UNIQUE constraint on (user_id, app_id). User can upgrade/downgrade but always has exactly one license per app. | Multiple active licenses per app (complex, rarely needed) |
| 11 | Promotions target Plans, not Prices | A promo like "50% off Pro" applies to the Plan. `allowed_intervals` controls which Prices qualify. Avoids N mapping rows per Price. | Target Prices directly (too granular, admin overhead) |
| 12 | Separate `promotion_provider_refs` table | Clean mapping from Proofa promotions to provider-specific coupons. Immutable pattern — new promo if terms change. | Inline `provider_coupon_id` on promotions table (only supports one provider) |
| 13 | Proofa-side validation before provider passthrough | Server validates eligibility (window, usage, plan targeting) before creating checkout. Prevents invalid promo codes from reaching provider. | Provider-only validation (no Proofa-side analytics, can't enforce custom eligibility rules) |
| 14 | No promo stacking in v2 | Max 1 promotion per checkout. Keeps discount logic simple and predictable. Phase 2 can add `is_stackable` flag. | Allow stacking (complex discount calculation, confusing UX) |
| 15 | Discounts never affect entitlements | A discounted purchase creates the same license as full-price. Promotions live in the billing layer only. | Discount-specific plan features (violates separation, creates support nightmares) |
| 16 | First-payment-only promos (v2) | All promos are one-time ("first year free", "50% off first year"). Recurring/forever discounts are overengineered for v2. Provider can handle natively if needed. | `duration_type` with once/forever/repeating (unnecessary complexity, most promos are one-time) |
| 17 | User cancel = cancel at period end | Never immediate. User paid for the period and keeps access. Immediate revocation is admin-only. Matches Stripe/LS default. Exception: trial cancel is immediate. | Immediate cancel (unfair to user, refund complexity) |
| 18 | No upgrades/downgrades in v2 | Cancel + repurchase only. Avoids proration, billing reconciliation, and complex state transitions. Phase 2+ can add upgrade flows. | Mid-cycle switching with proration (Stripe chaos, complex state) |
| 19 | Post-cancel → Free plan (mutate same row) | Keeps UNIQUE (user_id, app_id) constraint. Preserves license_history chain. No orphaned activations. Clean audit trail. | Delete + create new row (breaks history chain), expire and leave expired (user has no access at all) |
| 20 | Free plan invariant per app | Every app has exactly one undeletable Free plan. Required for post-cancel/refund transitions. Enforced at app creation. | No free plan (user loses all access on cancel — bad UX) |
| 21 | Full refund = immediate free plan transition | Clean and simple. Partial refunds don't change license (admin can manually revoke). No partial-refund proration logic. | Proportional access reduction (overengineered, confusing) |
| 22 | Atomic device activation | SELECT FOR UPDATE lock prevents race conditions on max_activations. Without this, concurrent requests could exceed the cap. | Application-level mutex (fragile, doesn't work across instances) |
| 23 | Trial cancel = immediate end + no re-trial | Trials are free — no "paid period" to honor. Prevents trial-cancel-retrial abuse. One trial per user per plan per app. | Cancel at period end (allows gaming), allow re-trial (abuse vector) |
| 24 | New customer = never had `source='purchase'` for this app | Expired paid licenses still count. Free/admin-grant don't disqualify. Simple, queryable, no ambiguity. | Check current plan only (user could churn and re-qualify), check any license (admin grants disqualify unfairly) |

---

## References

- [PLAN_LICENSE_FLOW.md](PLAN_LICENSE_FLOW.md) — Current state audit (issues 1-7)
- [PAYMENT_SYSTEM_DESIGN.md](PAYMENT_SYSTEM_DESIGN.md) — Payment architecture (kept as-is for payment tables, §4.6 for promotion spec)
- [PRODUCT_SPEC.md](PRODUCT_SPEC.md) — Original product specification
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture reference
