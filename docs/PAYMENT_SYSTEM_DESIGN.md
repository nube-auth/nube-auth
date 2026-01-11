# Payment System Design Document

## 1. Overview

The Proofa payment system handles subscription management and one-time payments across multiple payment providers. This document defines the **canonical** payment architecture for Proofa.

### Supported Providers
- **Stripe** - Primary payment processor
- **Lemonsqueezy** - Alternative payment processor
- **Dodo** - Payment provider option

### Core Design Principle (Strong Opinion)

**Payment providers handle money. Proofa handles plans, licenses, entitlements, and access.**

This separation is what makes Proofa valuable and future-proof. Providers are replaceable; Proofa is the authority on access control.

---

## 1.1 Goals & Principles

### Primary Goals
✅ Support subscriptions + one-time payments  
✅ Keep pricing logic centralized (no duplication)  
✅ Allow provider swap later (Stripe → Dodo → Paddle, etc.)  
✅ Ensure license & entitlement checks stay inside Proofa  
✅ Provider-agnostic licenses independent of payment provider  
✅ Complete transaction history for audit and reconciliation  

### Non-Goals (v1)
❌ Invoices UI  
❌ Tax/VAT/GST automation  
❌ Coupons / promotions  
❌ Seat-based billing  

### Key Principles
- **Provider-agnostic architecture**: Licenses are independent of payment provider
- **Multi-provider support**: Apps can choose which provider to use
- **Immutable pricing**: Price changes create new prices, never modify existing
- **Transaction history**: Every payment tracked for audit and reconciliation
- **Flexible billing**: Monthly, yearly, and one-time payment options
- **Webhook-driven**: Automatic license updates on payment events
- **Single source of truth**: Proofa controls access, providers control payment state

---

## 2. System Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User/Admin Dashboard                     │
├─────────────────────────────────────────────────────────────┤
│                  Gateway API (Proofa)                       │
├─────────────────────────────────────────────────────────────┤
│                    Payment Routes                           │
│  - GET /plans/:appId                                        │
│  - POST /checkout                                           │
│  - POST /webhook/:provider                                  │
│  - GET /license/:appId                                      │
├─────────────────────────────────────────────────────────────┤
│              Provider Abstraction Layer                     │
│  - StripeProvider                                           │
│  - LemonsqueezyProvider                                     │
│  - DodoProvider                                             │
├─────────────────────────────────────────────────────────────┤
│    Payment Providers (External Services)                    │
│  ├─ Stripe API                                              │
│  ├─ Lemonsqueezy API                                        │
│  └─ Dodo API                                                │
└─────────────────────────────────────────────────────────────┘
        │              │              │
        ↓              ↓              ↓
   Webhooks from Stripe, Lemonsqueezy, Dodo
```

---

## 3. Core Concepts (Canonical)

### 3.1 Plan (Proofa-Owned)

**A Plan defines what the user gets, not how they pay.**

Plans are the central entitlement unit in Proofa. They define:
- **Features**: What functionality is accessible
- **Limits**: Rate limits, quotas, usage caps
- **Duration**: How long the license lasts
- **Status**: Active or inactive

**Examples**:
- `free` - Limited features, no payment required
- `pro` - Core power users, monthly/yearly subscriptions
- `pro_plus` - Lifetime access, one-time payment
- `premium` - Annual premium tier

**Key principle**: Plans are stable. Features change rarely. Pricing changes frequently.

### 3.2 Pricing (Provider-Mapped)

**Pricing defines how much & how often to charge.**

Each plan can have multiple pricing options:
- Monthly subscription
- Yearly subscription
- Lifetime (one-time payment)

Pricing is stored **directly in the plan** using:
- `monthly_price` (cents)
- `yearly_price` (cents)
- `one_time_price` (cents)

**Important rules**:
- ✅ Multiple pricing options per plan
- ✅ One plan → monthly + yearly + lifetime
- ❌ Never modify prices for existing users
- ✅ Price changes mean creating a new plan or version

### 3.3 License (User Entitlement)

**A License represents a user's access to an app under a specific plan.**

Licenses are:
- Provider-agnostic (no Stripe/Dodo specifics)
- The source of truth for access control
- One per user per app
- Updated via webhooks from payment providers

### 3.4 Payment Transaction (Audit Trail)

**Payment Transactions track every monetary event.**

Transactions are:
- Provider-specific (stores Stripe/Lemonsqueezy/Dodo IDs)
- Linked to licenses for audit trail
- Immutable once created
- Used for reconciliation and debugging

### 3.5 Webhook Log (Debugging & Recovery)

**Webhook Logs capture every incoming webhook for reprocessing.**

Logs enable:
- Debugging failed payments
- Reprocessing after fixes
- Performance monitoring
- Security auditing

---

## 3.6 Example Mapping

### Plans
| Plan | Slug | Description |
|------|------|-------------|
| FREE | free | Limited features |
| PRO | pro | Core power users |
| PRO_PLUS | pro_plus | Lifetime access |
| PREMIUM | premium | Annual premium |

### Pricing Options
| Plan | Interval | Amount | Duration |
|------|----------|--------|----------|
| PRO | Monthly | $5 (500¢) | 30 days |
| PRO | Yearly | $20 (2000¢) | 365 days |
| PRO_PLUS | One-time | $50 (5000¢) | null (lifetime) |
| PREMIUM | Yearly | $30 (3000¢) | 365 days |

**Each row maps to**:
- One plan record in Proofa
- One price field (monthly_price, yearly_price, one_time_price)
- One provider price ID (in Stripe/Lemonsqueezy/Dodo)

---

## 4. Data Model

### Database Tables

#### `licenses` (Provider-Agnostic)
```typescript
{
  id: integer (PK)
  public_id: string (unique)
  user_id: integer (FK → users)
  app_id: integer (FK → apps)
  plan_id: integer (FK → plans)
  status: enum ['active', 'inactive', 'canceled', 'expired', 'trialing']
  valid_until: timestamp (nullable - null means perpetual/lifetime)
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp (soft delete)
}

// Unique constraint: one license per user-app combination
UNIQUE(user_id, app_id)

// Indexes
INDEX(user_id)
INDEX(app_id)
INDEX(plan_id)
INDEX(status)
```

**Rules**:
- **One active license per user per app** (enforced via DB-level partial unique index)
- `valid_until = null` means lifetime/perpetual access
- Provider is source of truth for payment status
- License status updated via webhooks only (never trust client redirects)

**DB Constraint** (Partial Unique Index):
```sql
UNIQUE (user_id, app_id)
WHERE status IN ('active', 'past_due', 'grace')
```

**Why DB-level enforcement?**
- Webhooks are async and can race
- Providers retry aggressively
- App logic alone cannot prevent double-license bugs
- DB constraints guarantee atomicity

#### `plan_provider_prices` (Provider Price Mapping - MANDATORY)
```typescript
{
  id: integer (PK)
  public_id: string (unique)
  
  // Link to plan and provider
  plan_id: integer (FK → plans) [NOT NULL]
  provider_config_id: integer (FK → payment_provider_configs) [NOT NULL]
  
  // Billing interval
  billing_interval: enum ['month', 'year', 'one_time'] [NOT NULL]
  
  // Provider's price ID (from Stripe/Lemonsqueezy/Dodo API)
  provider_price_id: string [NOT NULL]
  
  // Pricing details (in cents)
  amount_cents: integer [NOT NULL]
  currency: varchar(3) [NOT NULL, default: 'usd']
  
  // Status
  is_active: boolean [NOT NULL, default: true]
  
  // Audit
  created_at: timestamp [NOT NULL, default: NOW()]
  updated_at: timestamp [NOT NULL, default: NOW()]
  deleted_at: timestamp (nullable, soft delete)
}

// Unique constraint: one price per plan + provider + interval
UNIQUE(plan_id, provider_config_id, billing_interval)
WHERE is_active = true

// Indexes
INDEX(plan_id)
INDEX(provider_config_id)
INDEX(provider_price_id)
INDEX(billing_interval)
```

**Purpose**:
- Map Proofa plans to provider-specific prices
- Support multiple pricing options per plan (monthly/yearly/lifetime)
- Enable price versioning (new provider_price_id when provider pricing changes)
- Enable multi-provider routing (same plan, different prices per provider)
- Clean webhook reconciliation (match provider price IDs to plans)

**Key principle**: Provider price IDs are **not** stored in provider config — they're stored here, tied to a specific plan + interval + provider combination.

**Example**: Plan `pro_monthly_v2` on Stripe has `price_abc123`, on Dodo has `price_dodo_456`

#### `license_history` (Audit Trail for License Changes)
```typescript
{
  id: integer (PK)
  public_id: string (unique)
  license_id: integer (FK → licenses) [NOT NULL]
  
  // What changed
  change_type: enum [
    'created',           // License created
    'plan_changed',      // Upgraded/downgraded plan
    'status_changed',    // active → expired, etc.
    'expiry_extended',   // valid_until extended
    'expiry_reduced',    // valid_until shortened
    'deleted'            // Soft deleted
  ] [NOT NULL]
  
  // Old vs new values (JSON snapshot)
  old_value: jsonb (nullable)  // { plan_id: 1, status: 'active', valid_until: '...' }
  new_value: jsonb (nullable)  // { plan_id: 2, status: 'active', valid_until: '...' }
  
  // Why it changed
  reason: enum [
    'purchase',          // New purchase
    'renewal',           // Subscription renewed
    'refund',            // Payment refunded
    'admin_manual',      // Admin manually changed
    'system_auto',       // System auto-expired/updated
    'upgrade',           // User upgraded plan
    'downgrade'          // User downgraded plan
  ] [NOT NULL]
  
  // Who changed it
  changed_by_user_id: integer (FK → users, nullable)  // Admin who made change
  changed_by_system: boolean [default: false]
  
  // Link to payment (if applicable)
  payment_transaction_id: integer (FK → payment_transactions, nullable)
  
  // Notes for admin/audit
  notes: text (nullable)
  
  created_at: timestamp [NOT NULL, default: NOW()]
}

// Indexes
INDEX(license_id)
INDEX(change_type)
INDEX(reason)
INDEX(created_at)
```

**Purpose**:
- Track ALL license changes (payment-related and non-payment)
- Complete audit trail for compliance
- Answer "who changed what when" for customer support
- Track admin manual changes (extend expiry, grant access, etc.)
- Debug access issues by reviewing change history

**Key differences from payment_transactions**:
- `payment_transactions` tracks **monetary events only** (purchase, renewal, refund)
- `license_history` tracks **all license state changes** (including admin manual changes, system auto-expiry, etc.)

**Example usage**:
```typescript
// Admin manually extends license (no payment)
await updateLicense(licenseId, { valid_until: newDate });
await createLicenseHistory({
  license_id: licenseId,
  change_type: 'expiry_extended',
  reason: 'admin_manual',
  old_value: { valid_until: oldDate },
  new_value: { valid_until: newDate },
  changed_by_user_id: adminUserId,
  notes: 'Customer support request #1234',
});

// Webhook creates license (automatic)
await createLicense({ userId, appId, planId, status: 'active', valid_until });
await createLicenseHistory({
  license_id: licenseId,
  change_type: 'created',
  reason: 'purchase',
  new_value: { plan_id: planId, status: 'active', valid_until },
  payment_transaction_id: transaction.id,
  changed_by_system: true,
});
```

#### `payment_transactions` (Provider-Specific Tracking)
```typescript
{
  id: integer (PK)
  public_id: string (unique)
  
  // Link to license
  license_id: integer (FK → licenses) [NOT NULL]
  
  // Provider identification
  provider: enum ['stripe', 'lemonsqueezy', 'dodo'] [NOT NULL]
  provider_transaction_id: string [NOT NULL, UNIQUE with provider]
  provider_customer_id: string (nullable)
  
  // Transaction details
  type: enum ['purchase', 'renewal', 'refund', 'chargeback', 'manual_adjustment'] [NOT NULL]
  status: enum ['success', 'failed', 'pending', 'disputed'] [NOT NULL]
  
  // Amount tracking (in cents)
  amount_cents: integer [NOT NULL]
  currency: string (3-char code, default 'usd')
  
  // Metadata
  description: text (e.g., "Monthly subscription renewal")
  metadata: jsonb {
    stripe?: { invoice_id, payment_intent_id, ... },
    lemonsqueezy?: { order_id, subscription_id, ... },
    dodo?: { transaction_id, ... },
    plan_snapshot?: { name, price, duration_days, ... }
  }
  
  // Timeline
  transaction_date: timestamp (when it happened in provider)
  created_at: timestamp (when we logged it)
  
  // Disputes
  dispute_reason: string (nullable)
  resolved_at: timestamp (nullable)
  
  // Admin audit
  created_by_user_id: integer (FK → users, nullable)
  notes: text (nullable)
}

// Unique constraint: prevent duplicate webhook processing
UNIQUE(provider, provider_transaction_id)

// Indexes
INDEX(license_id)
INDEX(provider_transaction_id)
INDEX(provider)
INDEX(type)
INDEX(status)
INDEX(transaction_date)
```

#### `webhook_logs` (Webhook Request Tracking)
```typescript
{
  id: integer (PK)
  public_id: string (unique)
  
  // Provider identification
  provider: enum ['stripe', 'lemonsqueezy', 'dodo'] [NOT NULL]
  event_type: string (e.g., 'checkout.session.completed') [NOT NULL]
  event_id: string (provider's event ID for deduplication)
  
  // Request data
  request_body: jsonb [NOT NULL] // Full webhook payload
  request_headers: jsonb // Headers (signature, content-type, etc.)
  signature: text // Webhook signature
  ip_address: string (50 chars)
  
  // Processing status
  status: enum ['not_started', 'processing', 'completed', 'failed', 
                'signature_failed', 'skipped'] [NOT NULL, default: 'not_started']
  
  // Processing timeline
  received_at: timestamp [NOT NULL, default: NOW()]
  processing_started_at: timestamp (nullable)
  processing_completed_at: timestamp (nullable)
  processing_duration_ms: integer (calculated: completed - started)
  
  // Results (what was created/updated)
  payment_transaction_id: integer (FK → payment_transactions, nullable)
  license_id: integer (FK → licenses, nullable)
  
  // Error tracking
  error_message: text (nullable)
  error_stack: text (nullable)
  retry_count: integer [default: 0]
  last_retry_at: timestamp (nullable)
  
  // Response details
  response_status: integer (HTTP status code we returned)
  response_body: jsonb (response we sent back)
  
  // Metadata
  metadata: jsonb // Extracted data (userId, appId, planId, etc.)
  notes: text // Admin notes for manual investigation
  
  created_at: timestamp [NOT NULL, default: NOW()]
  updated_at: timestamp [NOT NULL, default: NOW()]
}

// Unique constraint: prevent duplicate event processing
UNIQUE(provider, event_id)

// Indexes
INDEX(provider)
INDEX(event_type)
INDEX(event_id)
INDEX(status)
INDEX(received_at)
INDEX(payment_transaction_id)
INDEX(license_id)
```

**Purpose**: 
- Log every incoming webhook for debugging
- Enable reprocessing of failed webhooks
- Track processing performance
- Identify duplicate events
- Audit trail for all webhook activity

**Status Flow**:
```
not_started → processing → completed
                      ↓
                   failed (can retry)
                      ↓
            signature_failed (security issue)
```

#### `payment_providers` (renamed to `payment_provider_configs` - Already Exists)
```typescript
{
  id: integer (PK)
  public_id: string (unique)
  provider: enum ['stripe', 'lemonsqueezy', 'dodo']
  environment: enum ['test', 'production']
  entity_type: enum ['platform', 'project', 'app']
  entity_id: integer (nullable)
  credentials: text (encrypted JSON)
  webhook_secret: text
  is_active: boolean
  metadata: jsonb
  created_at: timestamp
  updated_at: timestamp
```
}

// Unique constraint: one provider config per entity per provider per environment
UNIQUE(entity_type, entity_id, provider, environment)

// Indexes
INDEX(entity_type, entity_id)
INDEX(provider)
```

#### `plans`
```typescript
{
  id: integer (PK)
  public_id: string (unique)
  app_id: integer (FK → apps)
  name: string               // "Pro Plan"
  slug: string               // "pro" - stable identifier
  description: text (nullable)
  
  // Pricing (in cents)
  monthly_price: integer (nullable)     // 500 = $5/month
  yearly_price: integer (nullable)      // 2000 = $20/year
  one_time_price: integer (nullable)    // 5000 = $50 lifetime
  
  // License duration
  duration_days: integer (nullable)     // 30, 365, or null for lifetime
  
  // Trial settings
  trial_enabled: boolean
  trial_days: integer (nullable)
  
  // Features & Entitlements
  features: jsonb              // ["api_access", "advanced_analytics", "priority_support"]
  
  // Status
  status: enum ['active', 'inactive']
  is_active: boolean
  
  created_at: timestamp
  updated_at: timestamp
```
}

// Indexes
INDEX(app_id)
INDEX(slug)
INDEX(status)
```

**Plan Design Principles**:
- **Plans define entitlements** (what users can do)
- **Prices define payment terms** (how much, how often)
- **Slug is stable** - used for code references (e.g., `if (plan.slug === 'pro')`)
- **Features are flexible** - stored as JSON array for easy feature flag checks
- **Limits can be stored** - in features jsonb (e.g., `{"max_api_calls": 10000}`)

**Why inline pricing?**
- Simpler queries (no joins for pricing)
- Clear 1:1 mapping per interval
- Provider price IDs mapped in checkout logic
- Easy to version (create new plan, deactivate old)

**Price Change Strategy**:
```typescript
// ❌ WRONG: Modify existing plan price
UPDATE plans SET monthly_price = 700 WHERE slug = 'pro';

// ✅ RIGHT: Create new plan, mark old as inactive
INSERT INTO plans (slug, name, monthly_price, ...) 
VALUES ('pro_v2', 'Pro Plan', 700, ...);

UPDATE plans SET is_active = false WHERE slug = 'pro';
```

---

## 4. Payment Flow Diagrams

### 4.1 Purchase Flow

```
User Clicks "Subscribe"
    ↓
GET /v1/payment/plans/:appId
    ↓
Display available plans
    ↓
User Selects Plan & Interval
    ↓
POST /v1/payment/checkout
  - Lookup: app.selected_provider_config_id
  - Get provider credentials from payment_providers table
  - Route to correct provider handler
    ├─ StripeCheckout(paymentProvider, plan, user)
    ├─ LemonsqueezyCheckout(paymentProvider, plan, user)
    └─ DodoCheckout(paymentProvider, plan, user)
    ↓
Provider Returns Checkout Session/URL
    ↓
Response: { checkoutUrl, sessionId }
    ↓
User Redirected to Provider Checkout
    ↓
User Completes Payment on Provider
    ↓
Provider Sends Webhook: checkout.session.completed (or equivalent)
    ↓
POST /v1/payment/webhook/stripe (or /lemonsqueezy, /dodo)
    ↓
Verify webhook signature (provider-specific)
    ↓
Extract metadata (userId, appId, planId, interval)
    ↓
Check if license exists for user+app
    ├─ If EXISTS: Update license (plan_id, valid_until, status)
    └─ If NOT EXISTS: Create new license
    ↓
Create payment_transaction record
    ├─ type: 'purchase'
    ├─ status: 'success'
    ├─ amount_cents: [from provider]
    ├─ provider: 'stripe' | 'lemonsqueezy' | 'dodo'
    ├─ provider_transaction_id: [from provider]
    └─ provider_customer_id: [from provider]
    ↓
License ACTIVE ✓
    ↓
User can now access app
```

### 4.2 Renewal Flow

```
Stripe Sends Webhook: customer.subscription.updated
    ↓
POST /v1/payment/webhook/stripe
    ↓
Verify signature
    ↓
Extract: subscription_id from webhook
    ↓
Query payment_transactions:
  WHERE provider = 'stripe'
  AND provider_transaction_id = subscription_id
    ↓
Find associated license_id
    ↓
Check subscription status in webhook
  ├─ If active: Update license
  │   - valid_until += plan.duration_days
  │   - status = 'active'
  └─ If past_due/overdue: Update license
      - status = 'inactive'
    ↓
Create payment_transaction record
    ├─ type: 'renewal'
    ├─ status: 'success' (or 'failed' if overdue)
    ├─ amount_cents: [from subscription item]
    └─ description: 'Subscription renewal'
```

### 4.3 Refund Flow

```
User Requests Refund via Provider Dashboard
    ↓
Provider Issues Refund
    ↓
Provider Sends Webhook: charge.refunded (Stripe) 
                        or equivalent
    ↓
POST /v1/payment/webhook/stripe
    ↓
Verify signature
    ↓
Extract: refund amount, original charge_id
    ↓
Query payment_transactions:
  WHERE provider = 'stripe'
  AND provider_transaction_id = charge_id
    ↓
Find associated license_id
    ↓
Create NEW payment_transaction record
    ├─ type: 'refund'
    ├─ status: 'success'
    ├─ amount_cents: -[refund_amount] (negative!)
    ├─ provider_transaction_id: refund_id
    └─ description: 'Refund - customer request'
    ↓
Calculate refund impact on license
  ├─ If full refund: 
  │   - valid_until -= plan.duration_days OR mark canceled
  └─ If partial: Track credit balance
    ↓
Update license status if needed
```

### 4.4 Chargeback Flow

```
Customer Disputes Charge
    ↓
Provider Initiates Chargeback
    ↓
Provider Sends Webhook: charge.dispute.created
    ↓
POST /v1/payment/webhook/stripe
    ↓
Create payment_transaction record
    ├─ type: 'chargeback'
    ├─ status: 'disputed'
    ├─ dispute_reason: 'customer_initiated_chargeback'
    └─ description: 'Chargeback initiated'
    ↓
Update license:
  - status = 'disputed' (or keep 'active' for review)
    ↓
Alert admin for manual review
    ↓
Dispute Resolves (Won/Lost)
    ↓
Provider Sends Resolution Webhook
    ↓
Update payment_transaction.resolved_at
    ↓
Update license status based on outcome
```

---

## 4.5 License & Entitlement Resolution

**On every API request that requires authorization:**

```typescript
// Request flow
Request → Proofa Gateway
  → Cache lookup (license + plan)
  → Fallback to DB if cache miss
  → Feature + limit evaluation
  → Allow or deny access
```

**Entitlement Check (Feature Flags)**:
```typescript
async function canAccess(userId: string, appId: string, feature: string): Promise<boolean> {
  // 1. Get user's license
  const license = await getLicense(userId, appId);
  if (!license || license.status !== 'active') {
    return false;
  }
  
  // 2. Check expiry (if not lifetime)
  if (license.valid_until && license.valid_until < new Date()) {
    return false;
  }
  
  // 3. Get plan features
  const plan = await getPlan(license.plan_id);
  
  // 4. Check if feature is included
  return plan.features.includes(feature);
}
```

**Usage**:
```typescript
// In API route
if (await canAccess(userId, appId, 'api_access')) {
  // Allow API call
} else {
  return res.status(403).json({ error: 'Upgrade to Pro for API access' });
}
```

**Limit Check (Rate Limits / Quotas)**:
```typescript
async function getLimit(userId: string, appId: string, limitKey: string): Promise<number> {
  const license = await getLicense(userId, appId);
  const plan = await getPlan(license.plan_id);
  
  // Extract limit from plan features JSON
  // e.g., features: { "max_api_calls_per_day": 1000 }
  return plan.features[limitKey] || 0;
}

// Usage
const maxCalls = await getLimit(userId, appId, 'max_api_calls_per_day');
if (userCallsToday >= maxCalls) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}
```

**Caching Strategy**:
```typescript
// Cache license + plan for 5 minutes
const CACHE_TTL = 5 * 60; // 5 minutes

async function getLicenseWithPlan(userId: string, appId: string) {
  const cacheKey = `license:${userId}:${appId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from DB
  const license = await db.query(`
    SELECT l.*, p.features, p.slug
    FROM licenses l
    JOIN plans p ON p.id = l.plan_id
    WHERE l.user_id = $1 AND l.app_id = $2
  `, [userId, appId]);
  
  // Store in cache
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(license));
  
  return license;
}
```

**Why Proofa is Still Needed (vs. Just Using Provider)**:

Without Proofa:
- ❌ Payment provider = pricing + logic + auth coupling
- ❌ Hard to migrate providers
- ❌ No cross-provider abstraction
- ❌ No centralized entitlement system
- ❌ Features tied to payment state

With Proofa:
- ✅ One auth + licensing brain
- ✅ Providers are replaceable
- ✅ Clean audit trail
- ✅ Works with any payment system
- ✅ Centralized feature flags
- ✅ Provider-agnostic access control

---

## 4.6 Promotions & Discounts (Phase 1)

**Core Principle**: Promotions are **billing modifiers**, not plan changes. Discounts never affect entitlements or access control.

### Phase 1 Model

**4 Tables**:

1. **`promotions`** - Core discount rules with time window
   - `name` (internal, e.g., "First year 50% off")
   - `discount_type` ('percent' or 'amount')
   - `discount_value` (50 for 50%, or 5000 for $50 USD)
   - `duration_type` ('once' or 'cycles')
   - `duration_cycles` (null or N for recurring)
   - Eligibility rules: `is_new_customers_only`, `allowed_intervals`, `disallow_trials`, `min_amount_cents`
   - Window: `starts_at`, `ends_at` (when promo can be redeemed)
   - Status: `is_active`

2. **`promotion_codes`** - Multiple user-facing codes per promotion
   - `code` ('FIRSTYEAR50', 'SAVETODAY', etc.) - unique
   - Links to one `promotion_id`
   - Separate from name = supports campaign tracking & A/B testing

3. **`promotion_plans`** - Many-to-many linking promotions to eligible plans
   - Restrict which plans qualify for the discount
   - Empty = all plans eligible

4. **`promotion_redemptions`** - Usage tracking
   - `user_id`, `app_id`, `promotion_id`
   - Phase 1 constraint: **ONE redemption per user/org per promo** (enforced at DB level)
   - Links to `license_id` and `payment_transaction_id` for audit

### Design Decisions (Locked)

**1. No Stacking (Phase 1)**
- Maximum one promotion per checkout
- Phase 2 can add `is_stackable` flag + stack limit rules

**2. Eligibility Validation at Checkout Creation Only**
- Validate when user clicks "Apply Coupon" at checkout
- Eligibility is "frozen" at that moment
- If promo window closes after validation, discount still applies (user already redeemed)
- Prevents confusing UX where coupon applies then vanishes

**3. Discounts ≠ Entitlements**
```typescript
// canAccess() should NEVER check promotions
async function canAccess(userId: string, appId: string, feature: string): Promise<boolean> {
  const license = await getLicense(userId, appId);
  const plan = await getPlan(license.plan_id);
  
  // Check feature in plan, IGNORE discount_amount or promotion_id
  return plan.features.includes(feature);
}

// Instead: promotions only affect billing
async function getCheckoutTotal(
  planId: string, 
  interval: 'month' | 'year' | 'one_time',
  promotionCode?: string
): Promise<{ amountCents: number, discountCents: number }> {
  const plan = await getPlan(planId);
  const baseCost = plan[`${interval}_price`];
  
  if (!promotionCode) {
    return { amountCents: baseCost, discountCents: 0 };
  }
  
  const promo = await validateAndGetPromotion(promotionCode);
  const discountAmount = calculateDiscount(baseCost, promo);
  
  return { 
    amountCents: baseCost - discountAmount, 
    discountCents: discountAmount 
  };
}
```

**4. Provider Mapping (Pattern)**

Like `plan_provider_prices`, each promotion maps to provider-specific coupon objects:

```
Proofa Promotion "First Year 50%"
├─ Stripe: coupon_50_percent_off_first_year
├─ Lemonsqueezy: discount_xyz_code_promo_001
└─ Dodo: FIRSTYEAR50

promotion_provider_refs table:
{
  promotion_id: 1,
  payment_provider_id: 1 (Stripe),
  provider_object_id: "coupon_50_percent_off_first_year",
  provider_object_type: "coupon"
}
```

Provider refs are **immutable**: if Stripe coupon terms change, create a new Proofa promotion rather than updating the existing one.

**5. Transaction Audit Trail**

All promotions tracked on `payment_transactions`:
```typescript
{
  id: 123,
  amount_cents: 4500, // After discount
  promotion_id: 1, // Which promo was applied
  promotion_code_id: 2, // Which code user entered
  provider_discount_id: "coupon_xyz", // Provider's coupon ID
  // ... standard transaction fields
}
```

### Checkout Flow with Promotions

```
1. User selects plan + interval
   → GET /v1/payment/plans/:appId (fetch pricing)

2. User enters promo code (optional)
   → POST /v1/payment/validate-promo
   → Validates:
     - Promotion exists + is_active
     - Code exists + is_active
     - User eligibility (new customer? right interval? min amount?)
     - Promo window (now between starts_at and ends_at?)
     - User hasn't already redeemed this promo
   → Returns: discount_amount, adjusted_total

3. User clicks "Checkout"
   → POST /v1/payment/checkout
   → Includes: promotion_code (optional)
   → Backend:
     - Re-validate promo (frozen state)
     - Create Stripe/Lemonsqueezy checkout session with provider coupon
     - Include promo details in session metadata
     - Store promotion_id + code in order/metadata

4. Provider webhook fires (checkout.session.completed)
   → POST /v1/webhooks/stripe
   → Webhook handler:
     - Create license (standard flow)
     - Record promotion_id + code on payment_transaction
     - Create promotion_redemption entry
     - Update analytics (promo usage count)

5. License created with discount applied
   → License is **independent** of discount (no discount field)
   → Features = plan features (UNAFFECTED by discount)
   → Billing amount = discounted total (tracked in transaction)
```

### Phase 1 Constraints

| Aspect | Phase 1 | Phase 2+ |
|--------|---------|----------|
| Promos per checkout | 1 | Many (with stacking rules) |
| Redemptions per user | 1 per promo | Configurable limit |
| Global redemption limit | None | max_redemptions_global field |
| Eligibility rules | 5 fixed columns | Custom rules engine |
| Plan targeting | Many-to-many | Many-to-many (same) |
| Stacking | None | Optional (is_stackable flag) |

### Why This Works

✅ **Simple**: 4 tables, clear data model  
✅ **Flexible**: Multiple codes per promo for campaigns  
✅ **Immutable**: Provider refs never change (new promo if terms change)  
✅ **Auditable**: Full transaction trail with promo context  
✅ **Provider-agnostic**: Maps to any provider's coupon system  
✅ **Access-control safe**: Discounts completely separate from entitlements  
✅ **Scalable to Phase 2**: Easy to add global limits, stacking, custom rules  

---

## 5. API Endpoints

### 5.1 GET /v1/payment/plans/:appId

**Purpose**: List all available plans for an app

**Authentication**: Public (no auth required)

**Parameters**:
```typescript
appId: string (public_id of app)
```

**Response** (200 OK):
```typescript
{
  plans: [
    {
      publicId: string
      name: string
      slug: string
      description: string | null
      monthlyPrice: number | null (cents)
      yearlyPrice: number | null (cents)
      oneTimePrice: number | null (cents)
      durationDays: number | null
      trialEnabled: boolean
      trialDays: number | null
      features: object
    }
  ]
}
```

**Error Cases**:
- 404: App not found
- 500: Database error

---

### 5.2 POST /v1/payment/checkout

**Purpose**: Create checkout session for purchasing a plan

**Authentication**: Required (user session cookie)

**Body**:
```typescript
{
  appId: string         // public_id
  planId: string        // public_id
  interval: 'month' | 'year' | 'one-time'
}
```

**Process**:
1. Authenticate user
2. Get app → get selected_payment_provider_id
3. Get payment_provider config (decrypt credentials)
4. Get plan (validate pricing for interval)
5. Call provider-specific checkout handler
6. Return provider checkout URL

**Response** (200 OK):
```typescript
{
  checkoutUrl: string    // URL to redirect to
  sessionId: string      // Provider's session ID (for tracking)
}
```

**Error Cases**:
- 401: Not authenticated
- 404: App not found, Plan not found
- 400: Invalid interval for plan (no pricing)
- 500: Payment provider error, database error

**Metadata Stored for Webhook**:
```typescript
{
  userId: string
  appId: string
  planId: string
  interval: 'month' | 'year' | 'one-time'
  timestamp: ISO8601
}
```

---

### 5.3 Webhook Endpoints (Provider-Specific Paths)

**DECISION**: Use provider-specific endpoints, NOT generic `/webhook/:provider` paths.

**Endpoints**:
```
POST /v1/webhooks/stripe
POST /v1/webhooks/dodo
POST /v1/webhooks/lemonsqueezy
```

**Why separate paths?**
- Signature verification differs per provider (HMAC algorithm, header names)
- Payload schemas differ significantly
- Easier to rotate webhook secrets per provider
- Easier to debug failures (specific provider logs)
- Reduces branching at the security-critical path

**Internal Routing Pattern**:
```
StripeWebhookHandler.verify() → normalize → PaymentEvent
DodoWebhookHandler.verify()   → normalize → PaymentEvent
LemonsqueezyWebhookHandler.verify() → normalize → PaymentEvent
```

Each handler validates signature with its provider-specific secret, then converts to common `PaymentEvent` type.

---

### 5.4 POST /v1/webhooks/stripe

**Purpose**: Receive and process webhook events from Stripe

**Authentication**: Stripe HMAC signature verification

**Request Body**: Raw Stripe event body

**Processing Steps**:
1. **Log webhook immediately** → Create webhook_logs entry with status='not_started'
2. Extract `stripe-signature` header
3. Get payment_provider config (Stripe webhook secret)
4. **Update webhook_logs** → status='processing', processing_started_at=NOW()
5. Verify signature using `stripe.webhooks.constructEvent()`
   - If invalid: Update webhook_logs → status='signature_failed', return 400
6. Parse event, extract event_type and event_id
7. Route to appropriate Stripe event handler
8. Create/update license and payment_transaction
9. **Update webhook_logs** → status='completed', payment_transaction_id, license_id, processing_completed_at=NOW()
10. If error: Update webhook_logs → status='failed', error_message, error_stack

**Webhook Logging Flow**:
```
Webhook Received at /v1/webhooks/stripe
    ↓
Create webhook_logs entry (status='not_started')
  - provider: 'stripe'
  - request_body: full Stripe event
  - request_headers: all headers (stripe-signature, etc.)
  - signature: extracted from stripe-signature header
  - ip_address: requester IP
  - event_type: event.type from payload
  - event_id: event.id from payload
    ↓
Update status='processing', processing_started_at=NOW()
    ↓
Verify signature with webhook_secret
    ├─ INVALID: Update webhook_logs
    │   - status='signature_failed'
    │   - error_message='Invalid signature'
    │   - Return 400
    │
    └─ VALID: Continue
        ↓
    Route event_type to handler
      ├─ checkout.session.completed
      ├─ invoice.paid
      ├─ customer.subscription.updated
      ├─ customer.subscription.deleted
      ├─ charge.refunded
      └─ charge.dispute.created
        ↓
    Execute handler (create/update license)
        ↓
    Create payment_transaction
        ↓
    Update webhook_logs
    - status='completed'
    - payment_transaction_id, license_id
    - processing_completed_at=NOW()
    - Return 200 { success: true }
```

**Error Handling**:
```
If error at any step:
  - Update webhook_logs → status='failed'
  - Log error_message and error_stack
  - Return 500 (provider will retry)
  - Mark for manual reprocessing
```

---

### 5.5 POST /v1/webhooks/dodo

**Purpose**: Receive and process webhook events from Dodo

**Authentication**: Dodo signature verification (HMAC-SHA256)

**Similar to Stripe**, but with Dodo-specific event types and verification.

---

### 5.6 POST /v1/webhooks/lemonsqueezy

**Purpose**: Receive and process webhook events from Lemonsqueezy

**Authentication**: Lemonsqueezy signature verification

**Similar to Stripe**, but with Lemonsqueezy-specific event types and verification.

---

### 5.7 GET /v1/payment/license/:appId

**Purpose**: Check user's current license status for an app

**Authentication**: Required (user session cookie)

**Parameters**:
```typescript
appId: string // public_id
```

**Response** (200 OK - License exists):
```typescript
{
  hasLicense: true
  license: {
    publicId: string
    status: 'active' | 'inactive' | 'canceled' | 'expired'
    validUntil: ISO8601 | null  // null = perpetual
    isValid: boolean             // validUntil > now
  }
}
```

**Response** (404 - No license):
```typescript
{
  hasLicense: false
  error: "No active license"
}
```

**Caching**:
- Cache key: `license:{appId}:{userId}`
- TTL: 5 minutes
- Hard delete on webhook updates (lazy re-warm)

**Error Cases**:
- 401: Not authenticated
- 404: App not found, no license exists
- 500: Database error

---        - status='failed' (or 'signature_failed')
        - error_message
        - error_stack
        - response_status=400/500
        - response_body={ error: message }
```

**Supported Events**:

#### Stripe Events
- `checkout.session.completed` → Create/update license (purchase)
- `invoice.paid` → Extend license (renewal)
- `customer.subscription.deleted` → Cancel license
- `customer.subscription.updated` → Update license status
- `charge.refunded` → Create refund transaction
- `charge.dispute.created` → Flag license as disputed

#### Lemonsqueezy Events
- `order_created` → Create/update license (purchase)
- `subscription_updated` → Update license status (renewal)
- `subscription_cancelled` → Cancel license
- `order_refunded` → Create refund transaction
- `subscription_expired` → Mark license expired

#### Dodo Events
- `transaction.completed` → Create/update license (purchase)
- `transaction.refunded` → Create refund transaction
- `subscription.renewed` → Update license (renewal)
- `subscription.cancelled` → Cancel license

**Response** (200 OK):
```typescript
{
  success: true
}
```

**Error Cases**:
- 400: Invalid signature, malformed payload
- 404: App/license not found (may still return 200 to prevent retries)
- 500: Database error (return error to trigger provider retry)

**Idempotency**:
```sql
-- Unique constraint prevents duplicate processing
UNIQUE(provider, provider_transaction_id)

-- If duplicate webhook received, update existing transaction
ON CONFLICT (provider, provider_transaction_id)
DO UPDATE SET updated_at = NOW()

-- Webhook logs also track duplicates
UNIQUE(provider, event_id)

-- If duplicate webhook received, can check webhook_logs
SELECT * FROM webhook_logs
WHERE provider = 'stripe'
AND event_id = 'evt_xxx'
AND status = 'completed'
-- If found, skip processing and return 200
```

---

### 5.4 GET /v1/payment/license/:appId

**Purpose**: Check user's current license status for an app

**Authentication**: Required (user session cookie)

**Parameters**:
```typescript
appId: string // public_id
```

**Response** (200 OK - License exists):
```typescript
{
  hasLicense: true
  license: {
    publicId: string
    status: 'active' | 'inactive' | 'canceled' | 'expired'
    validUntil: ISO8601 | null  // null = perpetual
    isValid: boolean             // validUntil > now
  }
}
```

**Response** (404 - No license):
```typescript
{
  hasLicense: false
  error: "No active license"
}
```

**Error Cases**:
- 401: Not authenticated
- 404: App not found, no license exists
- 500: Database error

---

## 6. Provider Implementation

### 6.1 Provider Interface

Each provider implementation follows this interface:

```typescript
interface PaymentProvider {
  // Create checkout session
  createCheckout(
    credentials: ProviderCredentials,
    plan: Plan,
    user: User,
    interval: 'month' | 'year' | 'one-time'
  ): Promise<{
    checkoutUrl: string
    sessionId: string
  }>

  // Verify webhook signature
  verifyWebhookSignature(
    payload: string,
    signature: string,
    webhookSecret: string
  ): boolean

  // Parse webhook event
  parseWebhookEvent(payload: string): WebhookEvent

  // Handle specific event
  handleCheckoutCompleted(event: WebhookEvent): Promise<CheckoutCompletedData>
  handleSubscriptionUpdated(event: WebhookEvent): Promise<SubscriptionUpdatedData>
  handleSubscriptionCanceled(event: WebhookEvent): Promise<SubscriptionCanceledData>
  handleRefund(event: WebhookEvent): Promise<RefundData>
}
```

### 6.2 Stripe Implementation

**Credentials Structure**:
```typescript
{
  secretKey: string        // sk_live_... or sk_test_...
  publishableKey: string   // pk_live_... or pk_test_...
}
```

**Checkout**:
```typescript
const session = await stripe.checkout.sessions.create({
  mode: interval === 'one-time' ? 'payment' : 'subscription',
  success_url: `${FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${FRONTEND_URL}/payment-cancelled`,
  customer_email: user.email,
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name, description },
      unit_amount: price,
      recurring: interval !== 'one-time' ? { interval } : undefined
    },
    quantity: 1
  }],
  metadata: { userId, appId, planId, interval }
})
```

**Webhook Verification**:
```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)
```

**Events Handled**:
- `checkout.session.completed` - new purchase
- `invoice.paid` - subscription renewal
- `customer.subscription.deleted` - cancellation
- `customer.subscription.updated` - status change
- `charge.refunded` - refund
- `charge.dispute.created` - chargeback

---

### 6.3 Lemonsqueezy Implementation

**Credentials Structure**:
```typescript
{
  apiKey: string          // API key for authentication
  storeId: string        // Store ID for this provider
}
```

**Checkout**:
```typescript
// Redirect to Lemonsqueezy checkout
const checkoutUrl = `https://checkout.lemonsqueezy.com/checkout?...`
```

**Webhook Verification**:
```typescript
// HMAC-SHA256 verification
const signature = headers['x-signature']
const hash = hmac(body, webhookSecret)
verify(hash === signature)
```

**Events Handled**:
- `order_created` - purchase
- `subscription_updated` - status/renewal
- `subscription_cancelled` - cancellation
- `order_refunded` - refund

---

### 6.4 Dodo Implementation

**Credentials Structure**:
```typescript
{
  apiKey: string          // API key
  merchantId: string      // Merchant ID
}
```

**Checkout & Webhook**: Similar pattern to Lemonsqueezy

---

## 7. Database Queries

### 7.1 Find All Transactions for a License

```sql
SELECT * FROM payment_transactions
WHERE license_id = $1
ORDER BY transaction_date DESC;
```

### 7.2 Find Transaction by Provider ID

```sql
SELECT * FROM payment_transactions
WHERE provider = $1
AND provider_transaction_id = $2;
```

### 7.3 Calculate Revenue by Provider

```sql
SELECT
  provider,
  COUNT(*) as transaction_count,
  SUM(amount_cents) / 100.0 as total_revenue_dollars,
  currency
FROM payment_transactions
WHERE type IN ('purchase', 'renewal')
AND status = 'success'
GROUP BY provider, currency
ORDER BY total_revenue_dollars DESC;
```

### 7.4 Find Disputed Transactions

```sql
SELECT * FROM payment_transactions
WHERE status = 'disputed'
AND resolved_at IS NULL
ORDER BY created_at DESC;
```

### 7.5 License Audit Trail

```sql
SELECT
  l.*,
  COUNT(t.id) as transaction_count,
  MAX(t.transaction_date) as last_transaction
FROM licenses l
LEFT JOIN payment_transactions t ON t.license_id = l.id
WHERE l.id = $1
GROUP BY l.id;
```

### 7.6 User's Total Spent

```sql
SELECT
  l.user_id,
  COUNT(DISTINCT l.id) as licenses_purchased,
  COUNT(t.id) as total_transactions,
  SUM(CASE WHEN t.type = 'refund' THEN t.amount_cents ELSE 0 END) / 100.0 as total_refunds_dollars,
  (SUM(CASE WHEN t.type IN ('purchase', 'renewal') 
            THEN t.amount_cents ELSE 0 END) +
   SUM(CASE WHEN t.type = 'refund' THEN t.amount_cents ELSE 0 END)) / 100.0 as net_spent_dollars
FROM licenses l
JOIN payment_transactions t ON t.license_id = l.id
WHERE l.user_id = $1
AND t.status = 'success'
GROUP BY l.user_id;
```

### 7.7 Find Failed Webhooks for Reprocessing

```sql
SELECT * FROM webhook_logs
WHERE status = 'failed'
AND retry_count < 3
ORDER BY received_at DESC;
```

### 7.8 Webhook Processing Performance

```sql
SELECT
  provider,
  event_type,
  COUNT(*) as total_webhooks,
  AVG(processing_duration_ms) as avg_duration_ms,
  MAX(processing_duration_ms) as max_duration_ms,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  100.0 * COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*) as success_rate
FROM webhook_logs
WHERE received_at > NOW() - INTERVAL '24 hours'
GROUP BY provider, event_type
ORDER BY total_webhooks DESC;
```

### 7.9 Find Webhook Log by Event ID

```sql
SELECT * FROM webhook_logs
WHERE provider = $1
AND event_id = $2;
```

### 7.10 Recent Webhook Activity

```sql
SELECT
  wl.id,
  wl.provider,
  wl.event_type,
  wl.status,
  wl.received_at,
  wl.processing_duration_ms,
  pt.type as transaction_type,
  pt.amount_cents
FROM webhook_logs wl
LEFT JOIN payment_transactions pt ON pt.id = wl.payment_transaction_id
ORDER BY wl.received_at DESC
LIMIT 50;
```

---

## 8. Error Handling & Edge Cases

### 8.1 Duplicate Webhooks

**Problem**: Provider may send same webhook multiple times

**Solution**: Two-level deduplication

**Level 1 - Webhook Logs**:
```sql
-- Unique constraint on webhook_logs
UNIQUE(provider, event_id)

-- Check if already processed
SELECT * FROM webhook_logs
WHERE provider = 'stripe'
AND event_id = 'evt_xxx'
AND status = 'completed';

-- If found, skip processing and return 200
```

**Level 2 - Payment Transactions**:
```sql
-- Unique constraint on payment_transactions
UNIQUE(provider, provider_transaction_id)

-- If duplicate transaction, upsert
ON CONFLICT (provider, provider_transaction_id)
DO UPDATE SET
  updated_at = NOW(),
  notes = CONCAT(notes, '; webhook received again at ', NOW())
```

### 8.2 Webhook Arrives Before Payment Processed

**Problem**: Webhook received but customer not yet created in our DB

**Solution**: 
1. Check if license exists for (user_id, app_id)
2. If not, create it
3. Extract user info from metadata

### 8.3 Webhook Signature Verification Fails

**Problem**: Signature doesn't match (tampering, wrong secret, etc.)

**Solution**:
```typescript
if (!verifySignature(payload, signature, webhookSecret)) {
  log.error('Invalid webhook signature')
  return { error: 'Invalid signature' }
  // Do NOT process - return 400 to prevent retries
}
```

### 8.4 License Already Exists During Purchase

**Problem**: User has license for app, purchases again

**Solution**:
```typescript
const existing = await findLicense(userId, appId)
if (existing) {
  // Update existing license
  await updateLicense(existing.id, {
    plan_id: newPlanId,
    valid_until: calculateNewExpiry(),
    status: 'active',
    updated_at: now()
  })
} else {
  // Create new license
  await createLicense({ userId, appId, planId, ... })
}
```

### 8.5 Partial Refund Handling

**Problem**: User refunded partial amount (not full subscription)

**Solution**: Track in metadata, don't auto-adjust license

```typescript
if (refundAmount < totalPurchaseAmount) {
  // Create transaction but don't modify license
  await createTransaction({
    type: 'refund',
    status: 'success',
    amount_cents: -refundAmount,
    metadata: { partial: true, reason: 'partial_refund' }
  })
  // Alert admin for manual review
  log.warn('Partial refund - manual review needed')
}
```

### 8.6 Failed Payment Retry

**Problem**: Payment fails initially but provider retries

**Solution**: Same transaction ID in webhook, update status

```typescript
const txn = await findTransaction(providerId, transactionId)
if (txn) {
  // Update status (failed -> success, or pending -> success)
  await updateTransaction(txn.id, { status: 'success' })
} else {
  // New transaction record
  await createTransaction({ ... })
}
```

### 8.7 Webhook Retry Policy (LOCKED DECISION)

**Decision**: Exponential backoff + provider retries (NOT 3 retries only).

**Provider-Native Retries** (First Line of Defense)
- Stripe, Dodo, Lemonsqueezy all retry aggressively
- Trust their retry logic
- Your job: be **idempotent** (same webhook, same result)

**Internal Retry Policy** (For YOUR Failures)

When webhook processing fails (not signature failure):
- Mark webhook_logs → status='failed', increment retry_count
- Schedule retries with exponential backoff:

| Attempt | Delay | Total Time |
|---------|-------|-----------|
| 1 | Immediate | ~0s |
| 2 | +5 minutes | 5min |
| 3 | +30 minutes | 35min |
| 4 | +2 hours | 2h35min |
| 5 | +24 hours | 26h35min |
| After | Mark as failed, alert admin | — |

**Implementation**:
```typescript
async function scheduleWebhookRetry(webhookLogId: number, attempt: number) {
  const delays = [0, 5, 30, 120, 1440]; // minutes
  const delayMs = delays[attempt] * 60 * 1000;
  
  if (attempt >= 5) {
    // Give up, alert admin
    await markWebhookFailed(webhookLogId);
    await alertAdmin(`Webhook ${webhookLogId} failed after 5 attempts`);
    return;
  }
  
  // Schedule next retry
  await queue.scheduleRetry(webhookLogId, delayMs);
}
```

**Why this approach?**
- Providers already retry aggressively → trust them
- Your failures are rare (network, DB, bugs)
- Exponential backoff prevents thundering herd
- After 5 attempts (26+ hours), surfaces to admin
- Idempotency is your safety net (duplicate webhooks are safe)

---

### 8.8 Cache Invalidation Strategy (LOCKED DECISION)

**Decision**: Hard delete immediately, lazy re-warm.

**On License Update** (via webhook):
```typescript
async function updateLicenseFromWebhook(userId: string, appId: string, newLicense: License) {
  // 1. Update DB
  await db.updateLicense(userId, appId, newLicense);
  
  // 2. HARD DELETE cache immediately
  await redis.del(`license:${appId}:${userId}`);
  await redis.del(`entitlement:${appId}:${userId}`);
  
  // Do NOT re-warm in webhook handler
  // Let the next API call populate cache naturally
}
```

**Why hard delete?**
- Webhooks are write-heavy but sporadic
- Cache re-warming inside webhook handler increases latency
- Webhook handler should be fast (log, return 200)
- Cache consumers (API requests) will naturally re-populate on next read

**Cache Re-warming** (Lazy):
```typescript
async function getLicenseWithCache(userId: string, appId: string) {
  const cacheKey = `license:${appId}:${userId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss → fetch from DB
  const license = await db.getLicense(userId, appId);
  
  // Store in cache for next time (5 minute TTL)
  await redis.setex(cacheKey, 300, JSON.stringify(license));
  
  return license;
}
```

**Result**:
- Webhook completes fast (cache delete only)
- Next API request pays the "re-warm" cost (DB fetch)
- System stays responsive and simple

---

### 8.9 Plan Versioning Strategy (LOCKED DECISION)

**Decision**: Create new plan row per price change (immutable versioning).

**WRONG Approach** (Mutating in-place):
```typescript
// ❌ DON'T DO THIS
UPDATE plans SET monthly_price = 700 WHERE slug = 'pro';
```

**Problems**:
- Old subscriptions lose pricing history
- Audit trail becomes unreliable
- Licenses lose connection to original pricing
- Can't answer "what price did user sign up at?"

**RIGHT Approach** (Versioned slugs):
```typescript
// ✅ DO THIS
// Old plan (retire)
SELECT id FROM plans WHERE slug = 'pro' AND is_active = true;
// Returns: plan_id = 123, monthly_price = 500

// Create new version
INSERT INTO plans (
  app_id, slug, name, monthly_price, yearly_price, 
  duration_days, features, is_active
) VALUES (
  1, 'pro_v2', 'Pro Plan', 700, 2400,
  30, '["api_access"]', true
);
// Returns: plan_id = 124

// Mark old plan inactive
UPDATE plans SET is_active = false WHERE id = 123;
```

**Result**:
- Existing users keep old pricing (plan_id = 123)
- New users see new pricing (plan_id = 124)
- Audit trail intact
- Clean versioning history
- Easy to revert (SET is_active = true WHERE id = 123)

**Queries**:
```sql
-- Find what price user signed up at
SELECT p.monthly_price, p.slug
FROM licenses l
JOIN plans p ON p.id = l.plan_id
WHERE l.user_id = $1 AND l.app_id = $2;

-- List all plan versions
SELECT slug, monthly_price, is_active, created_at
FROM plans
WHERE app_id = $1
ORDER BY slug, created_at DESC;
```

### 8.7 Webhook Reprocessing

**Problem**: Webhook failed due to temporary issue (DB down, network error, bug)

**Solution**: Manual or automated reprocessing from webhook_logs

**Query Failed Webhooks**:
```sql
SELECT * FROM webhook_logs
WHERE status = 'failed'
AND retry_count < 3
AND received_at > NOW() - INTERVAL '7 days'
ORDER BY received_at ASC;
```

**Reprocessing Logic**:
```typescript
async function reprocessWebhook(webhookLogId: number) {
  const webhookLog = await getWebhookLog(webhookLogId);
  
  if (webhookLog.status === 'completed') {
    throw new Error('Webhook already processed successfully');
  }
  
  if (webhookLog.retry_count >= 3) {
    throw new Error('Max retries exceeded');
  }
  
  // Update retry tracking
  await updateWebhookLog(webhookLogId, {
    status: 'processing',
    retry_count: webhookLog.retry_count + 1,
    last_retry_at: new Date(),
    processing_started_at: new Date()
  });
  
  try {
    // Reprocess using stored request data
    const result = await processWebhookEvent(
      webhookLog.provider,
      webhookLog.request_body,
      webhookLog.event_type
    );
    
    // Success - update webhook log
    await updateWebhookLog(webhookLogId, {
      status: 'completed',
      payment_transaction_id: result.transactionId,
      license_id: result.licenseId,
      processing_completed_at: new Date(),
      processing_duration_ms: Date.now() - webhookLog.processing_started_at.getTime()
    });
    
    return { success: true, result };
  } catch (error) {
    // Failed again - update webhook log
    await updateWebhookLog(webhookLogId, {
      status: 'failed',
      error_message: error.message,
      error_stack: error.stack,
      processing_completed_at: new Date()
    });
    
    throw error;
  }
}
```

**Admin Endpoint for Reprocessing**:
```typescript
// POST /v1/admin/webhooks/:id/reprocess
router.post('/webhooks/:id/reprocess', requireAdmin, async (req, res) => {
  const webhookLogId = parseInt(req.params.id);
  
  try {
    const result = await reprocessWebhook(webhookLogId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

**Automated Retry Strategy**:
```typescript
// Cron job: retry failed webhooks every 5 minutes
async function retryFailedWebhooks() {
  const failedWebhooks = await db.query(`
    SELECT * FROM webhook_logs
    WHERE status = 'failed'
    AND retry_count < 3
    AND last_retry_at < NOW() - INTERVAL '5 minutes'
    LIMIT 10
  `);
  
  for (const webhook of failedWebhooks) {
    try {
      await reprocessWebhook(webhook.id);
      log.info(`Reprocessed webhook ${webhook.id} successfully`);
    } catch (error) {
      log.error(`Failed to reprocess webhook ${webhook.id}:`, error);
    }
  }
}
```

---

## 9. Security Considerations

### 9.1 Webhook Signature Verification
✅ Every webhook MUST be verified before processing
✅ Use provider's official SDK for verification
✅ Log failed verifications

### 9.2 Credentials Management
✅ Encrypt payment provider credentials at rest
✅ Use environment variables for secrets
✅ Never log credentials
✅ Rotate credentials periodically

### 9.3 PCI Compliance
✅ Never store full credit card numbers
✅ Use provider's hosted checkout (not custom forms)
✅ Validate amounts on server-side
✅ Audit all payment operations

### 9.4 Rate Limiting
✅ Limit checkout endpoint (max 10/minute per user)
✅ Limit webhook retries from providers

### 9.5 Input Validation
✅ Validate appId, planId, interval exist
✅ Validate amount matches plan pricing
✅ Validate webhook payload structure

---

## 10. Monitoring & Alerts

### Key Metrics to Track

1. **Checkout Success Rate**
   ```sql
   SELECT
     COUNT(*) as total_checkouts,
     COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
     100 * COUNT(CASE WHEN status = 'success' THEN 1 END) / COUNT(*) as success_rate
   FROM payment_transactions
   WHERE type = 'purchase'
   AND created_at > NOW() - INTERVAL '24 hours'
   ```

2. **Webhook Processing Latency**
   ```sql
   SELECT
     provider,
     AVG(processing_duration_ms) as avg_duration_ms,
     PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_duration_ms) as p95_duration_ms,
     MAX(processing_duration_ms) as max_duration_ms
   FROM webhook_logs
   WHERE status = 'completed'
   AND received_at > NOW() - INTERVAL '1 hour'
   GROUP BY provider;
   ```
   - Alert if p95 > 5000ms (5 seconds)
   - Alert if max > 30000ms (30 seconds)

3. **Webhook Failure Rate**
   ```sql
   SELECT
     provider,
     COUNT(*) as total_webhooks,
     COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
     COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
     COUNT(CASE WHEN status = 'signature_failed' THEN 1 END) as signature_failed,
     100.0 * COUNT(CASE WHEN status = 'failed' THEN 1 END) / COUNT(*) as failure_rate
   FROM webhook_logs
   WHERE received_at > NOW() - INTERVAL '1 hour'
   GROUP BY provider;
   ```
   - Alert if failure_rate > 5%
   - Alert immediately if signature_failed > 0 (security issue)

4. **Refund Rate**
   ```sql
   SELECT
     SUM(amount_cents) / 100.0 as refund_amount,
     COUNT(*) as refund_count
   FROM payment_transactions
   WHERE type = 'refund'
   AND created_at > NOW() - INTERVAL '7 days'
   ```

5. **Disputed Transactions**
   - Alert when new dispute created
   - Track resolution time

6. **Webhook Queue Health**
   ```sql
   SELECT
     status,
     COUNT(*) as count,
     MIN(received_at) as oldest_webhook
   FROM webhook_logs
   WHERE received_at > NOW() - INTERVAL '1 hour'
   GROUP BY status;
   ```
   - Alert if status='not_started' count > 10 (backlog building)
   - Alert if status='processing' for > 5 minutes (stuck webhook)

### Log Events

Log these events for monitoring:

```
[WEBHOOK_RECEIVED]
  provider, event_type, event_id, webhook_log_id

[WEBHOOK_SIGNATURE_VERIFIED]
  provider, event_type, valid, webhook_log_id

[WEBHOOK_SIGNATURE_FAILED]
  provider, event_type, reason, ip_address, webhook_log_id

[WEBHOOK_PROCESSING_STARTED]
  provider, event_type, webhook_log_id

[WEBHOOK_PROCESSING_COMPLETED]
  provider, event_type, duration_ms, transaction_id, webhook_log_id

[WEBHOOK_PROCESSING_FAILED]
  provider, event_type, error, retry_count, webhook_log_id

[WEBHOOK_REPROCESSED]
  webhook_log_id, attempt_number, success

[PAYMENT_CHECKOUT_INITIATED]
  userId, appId, planId, interval, provider

[PAYMENT_CHECKOUT_SUCCESS]
  userId, appId, sessionId, amount

[PAYMENT_CHECKOUT_FAILED]
  userId, appId, error, reason

[WEBHOOK_RECEIVED]
  provider, event_type, transaction_id

[WEBHOOK_VERIFIED]
  provider, event_type, valid

[WEBHOOK_FAILED]
  provider, event_type, reason

[LICENSE_CREATED]
  userId, appId, planId, valid_until

[LICENSE_UPDATED]
  userId, appId, planId, valid_until

[REFUND_PROCESSED]
  transaction_id, amount, impact_on_license

[DISPUTE_CREATED]
  transaction_id, reason

[DISPUTE_RESOLVED]
  transaction_id, outcome (won/lost)
```

---

## 11. Admin Responsibilities

### What Admins Can Do

✅ **Plan Management**
- Create / disable plans
- Update plan features and limits
- Set trial periods
- Change plan pricing (creates new version)

✅ **Provider Configuration**
- Configure payment provider credentials
- Set webhook secrets
- Switch between test/production modes
- Map plans to provider price IDs

✅ **License Management**
- View user licenses
- Manually grant / revoke access
- Override expiration dates (for support cases)
- Audit license history

✅ **Transaction Monitoring**
- View all payment transactions
- Track refunds and chargebacks
- Generate revenue reports
- Export transaction data

✅ **Webhook Debugging**
- View webhook logs
- Reprocess failed webhooks
- Monitor webhook performance
- Investigate signature failures

### What Admins Cannot Do

❌ **Direct Provider Manipulation**
- Change provider billing state directly
- Cancel subscriptions in provider (use provider dashboard)
- Modify active subscription amounts

❌ **Breaking Changes**
- Delete plans with active licenses
- Modify prices for existing subscriptions
- Remove features from active plans

**Why?** Provider is source of truth for payment state. Proofa reads, never writes to provider.

---

## 12. Provider Selection Scope (LOCKED DECISION)

**Decision**: App-level only in Phase 1, project-level inheritance in Phase 2+.

### Phase 1 (Current): App-Level Only

**Structure**:
```sql
apps.selected_provider_config_id → payment_provider_configs.id
```

**Resolution**:
```typescript
async function getPaymentProvider(appId: string) {
  const app = await getApp(appId);
  return getPaymentProvider(app.selected_payment_provider_id);
}
```

**Why app-level only?**
- App is the commercial boundary
- Each app can have different payment terms
- Simplifies initial implementation
- No inheritance logic needed yet

### Phase 2 (Future): Project-Level Override

**Extended structure**:
```sql
projects.payment_provider_override → payment_provider_configs.id (nullable)
apps.selected_provider_config_id → payment_provider_configs.id
```

**Resolution order**:
1. Project override (if present)
2. App default (if present)
3. Routing rules (country/currency, future)

**Implementation** (when needed):
```typescript
async function getPaymentProvider(appId: string) {
  const app = await getApp(appId);
  const project = await getProject(app.project_id);
  
  // Priority: project override > app default
  return getPaymentProvider(
    project.payment_provider_override ||
    app.selected_payment_provider_id
  );
}
```

---

## 13. Paddle / Dodo Stubs Behind Feature Flags (LOCKED DECISION)

**Decision**: Stub adapters behind feature flags (NOT omitted entirely).

**Why stubs?**
- Keeps adapter interface stable
- Allows early testing with mocks
- Avoids "Stripe-first" bias in core logic
- Lets you validate routing logic early
- Prepares for future integration

### Implementation

**Adapter Interface** (all providers implement):
```typescript
interface PaymentProvider {
  createCheckout(plan, interval, user): Promise<CheckoutSession>
  verifyWebhookSignature(payload, signature): boolean
  parseWebhookEvent(payload): WebhookEvent
  // ... more methods
}
```

**Stripe** (full implementation):
```typescript
class StripeProvider implements PaymentProvider {
  async createCheckout(plan, interval, user) {
    // Real Stripe API calls
  }
  // All methods implemented
}
```

**Lemonsqueezy** (full implementation):
```typescript
class LemonsqueezyProvider implements PaymentProvider {
  async createCheckout(plan, interval, user) {
    // Real Lemonsqueezy API calls
  }
  // All methods implemented
}
```

**Dodo** (feature-flagged stub):
```typescript
class DodoProvider implements PaymentProvider {
  async createCheckout(plan, interval, user) {
    if (!isFeatureEnabled('payment_provider_dodo')) {
      throw new Error('Dodo provider not yet available');
    }
    // Implementation TBD
  }
  
  verifyWebhookSignature(payload, signature) {
    throw new NotImplementedError('Dodo webhook verification');
  }
  // All methods throw NotImplementedError
}
```

### Feature Flag Usage

**Admin UI**:
```typescript
// Only show Dodo if flag is enabled
const providers = [
  { id: 'stripe', name: 'Stripe', enabled: true },
  { id: 'lemonsqueezy', name: 'Lemonsqueezy', enabled: true },
  { id: 'dodo', name: 'Dodo', enabled: isFeatureEnabled('payment_provider_dodo') },
];
```

**Webhook Endpoints**:
```typescript
// Dodo webhook exists but disabled
if (!isFeatureEnabled('payment_provider_dodo')) {
  return res.status(503).json({ error: 'Dodo webhooks not yet enabled' });
}
```

**Testing**:
```typescript
// Can test routing logic with mock Dodo before real credentials exist
const mockDodo = new DodoProvider(); // throws NotImplementedError if called
const router = new PaymentRouter([
  stripe, lemonsqueezy, mockDodo
]);
// Router logic is fully tested before Dodo is live
```

**Rollout Path**:
1. Merge stub with feature flag OFF
2. Add real credentials to stub
3. Implement all methods
4. Test thoroughly with feature flag ON
5. Enable feature flag for users gradually
6. Monitor errors, then enable fully

**Result**:
- Core routing logic is provider-agnostic and tested early
- Real implementations can be added without refactoring
- Feature flags prevent premature rollout
- Easy to switch providers mid-flight
- No "Stripe-first" bias in design

---

## 14. Migration & Future-Proofing

### Migration Ready

This design supports:

✅ **Provider Migration**
```typescript
// Example: Migrate from Stripe to Dodo
// Step 1: Configure Dodo provider
INSERT INTO payment_providers (provider, entity_type, ...)
VALUES ('dodo', 'app', ...);

// Step 2: Update app to use Dodo
UPDATE apps SET selected_provider_config_id = [dodo_id]
WHERE id = [app_id];

// Step 3: Existing licenses continue working
// New purchases go through Dodo
// Old Stripe subscriptions still process via Stripe webhooks
```

✅ **Multiple Providers Simultaneously**
- Different apps can use different providers
- Regional pricing (Stripe for US, Dodo for Asia)
- A/B testing providers

✅ **Future Enhancements**
- Coupons & promo codes (add to plans table)
- Usage-based billing (add metering to payment_transactions)
- Seat-based pricing (add seats to licenses)
- Tax automation (add tax_amount to payment_transactions)
- Trials (already supported via trial_enabled/trial_days)

### Versioning Strategy

**When prices change:**
```typescript
// ❌ WRONG: Modify existing plan
UPDATE plans SET monthly_price = 700 WHERE slug = 'pro';

// ✅ RIGHT: Create new plan version
INSERT INTO plans (
  slug, name, monthly_price, yearly_price, 
  features, duration_days, is_active
) VALUES (
  'pro_v2', 'Pro Plan', 700, 2400,
  '["api_access", "advanced_analytics"]', 30, true
);

// Mark old plan inactive (but keep for existing users)
UPDATE plans SET is_active = false WHERE slug = 'pro';
```

**Result:**
- Existing users keep old pricing
- New users see new pricing
- Both plans tracked separately
- Clean audit trail

### Best Practices (Opinionated)

✅ **Start with one provider** (reduce complexity)  
✅ **Keep plans static** (features rarely change)  
✅ **Treat prices as immutable** (create new versions)  
✅ **Let Proofa be the authority on access, not payments**  
✅ **Always process webhooks, never trust client redirects**  
✅ **Cache licenses aggressively** (5-minute TTL minimum)  
✅ **Log everything** (webhooks, transactions, license changes)  

---

## 13. Implementation Timeline

### Phase 1 (Stripe - MVP)
- [ ] Payment endpoints (plans, checkout, license)
- [ ] Stripe webhook handler
- [ ] Stripe provider integration
- [ ] Transaction tracking
- [ ] License lifecycle management

### Phase 2 (Lemonsqueezy)
- [ ] Lemonsqueezy provider implementation
- [ ] Lemonsqueezy webhook handler
- [ ] Testing & validation

### Phase 3 (Dodo)
- [ ] Dodo provider implementation
- [ ] Dodo webhook handler
- [ ] Testing & validation

### Phase 4 (Polish)
- [ ] Refund handling
- [ ] Chargeback handling
- [ ] Admin dashboard (view transactions, disputes)
- [ ] Revenue reporting
- [ ] Monitoring & alerts

---

## 12. Testing Strategy

### Unit Tests
- Provider credential validation
- Webhook signature verification
- Amount calculation for different intervals
- Transaction idempotency

### Integration Tests
- Full purchase flow (checkout → payment → license)
- Renewal flow
- Refund flow
- Chargeback flow
- Webhook logging and reprocessing
- Webhook deduplication (same event_id received twice)

### End-to-End Tests
- Stripe test mode full flow
- Lemonsqueezy sandbox flow
- Dodo sandbox flow
- Webhook failure and retry scenarios

### Manual Testing
- Test cards from each provider
- Webhook replay with Stripe CLI
- Payment success/failure scenarios
- Manual webhook reprocessing via admin API

---

## 13. Webhook Logging Reference

### Quick Reference

**Purpose**: Track ALL incoming webhooks for debugging and reprocessing

**Key Features**:
- ✅ Logs complete request (body, headers, signature)
- ✅ Tracks processing status (not_started → processing → completed/failed)
- ✅ Records processing timeline (received, started, completed)
- ✅ Links to created payment_transaction and license
- ✅ Stores errors for debugging
- ✅ Enables manual reprocessing
- ✅ Prevents duplicate processing via unique constraint

**Status Values**:
- `not_started` - Webhook received, not yet processed
- `processing` - Currently being processed
- `completed` - Successfully processed
- `failed` - Processing failed (retryable)
- `signature_failed` - Signature verification failed (security issue)
- `skipped` - Duplicate or intentionally skipped

**Common Queries**:

```sql
-- Find webhooks that need reprocessing
SELECT * FROM webhook_logs
WHERE status = 'failed'
AND retry_count < 3
ORDER BY received_at ASC;

-- Check if webhook already processed (deduplication)
SELECT * FROM webhook_logs
WHERE provider = 'stripe'
AND event_id = 'evt_xxx'
AND status = 'completed';

-- Performance analysis
SELECT
  provider,
  event_type,
  AVG(processing_duration_ms) as avg_ms,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful
FROM webhook_logs
WHERE received_at > NOW() - INTERVAL '24 hours'
GROUP BY provider, event_type;

-- Find stuck webhooks (processing for > 5 minutes)
SELECT * FROM webhook_logs
WHERE status = 'processing'
AND processing_started_at < NOW() - INTERVAL '5 minutes';
```

**Reprocessing Workflow**:
1. Query failed webhooks (status='failed', retry_count < 3)
2. Call reprocessing function with webhook_log_id
3. Function replays webhook using stored request_body
4. Updates webhook_log with new status and results
5. Increments retry_count

**Admin Endpoints** (to be implemented):
- `GET /v1/admin/webhooks` - List all webhooks with filters
- `GET /v1/admin/webhooks/:id` - Get specific webhook details
- `POST /v1/admin/webhooks/:id/reprocess` - Manually reprocess a webhook
- `GET /v1/admin/webhooks/stats` - Webhook processing statistics

---

## 14. Future Enhancements

1. **Subscription Management**
   - Allow users to pause/resume subscriptions
   - Plan upgrades/downgrades

2. **Payment Method Management**
   - Add/remove credit cards
   - Set default payment method

3. **Usage-Based Billing**
   - Track API calls, per-user costs
   - Metered billing

4. **Tax Compliance**
   - VAT/GST calculation
   - Tax invoice generation

5. **Revenue Insights**
   - MRR (Monthly Recurring Revenue)
   - Churn rate
   - Customer lifetime value

6. **Dunning Management**
   - Failed payment retry strategy
   - Automated email sequences

---

## 15. Glossary

| Term | Definition |
|------|-----------|
| **License** | A user's entitlement to access an app under a specific plan |
| **Plan** | Defines what features a user gets (not how they pay) |
| **Entitlement** | Permission to access a feature or resource |
| **Provider** | External payment processor (Stripe, Lemonsqueezy, Dodo) |
| **Transaction** | Record of a monetary event (purchase, renewal, refund) |
| **Webhook** | HTTP callback from provider to our API |
| **MRR** | Monthly Recurring Revenue - sum of monthly subscriptions |
| **Churn** | Customers who cancel subscriptions |
| **Dunning** | Collecting payment after initial failure |
| **PCI** | Payment Card Industry compliance standard |
| **Idempotent** | Same operation can be retried safely |
| **Lifetime** | One-time payment, perpetual access (valid_until = null) |
| **Proration** | Adjusting charges for mid-cycle changes |

---

## 16. Key Takeaways & Final Recommendations

### Core Architecture Principles

1. **Separation of Concerns**
   - **Payment providers handle money** (charging, refunds, subscriptions)
   - **Proofa handles access** (licenses, features, limits, entitlements)
   - Never mix these responsibilities

2. **Provider Independence**
   - Licenses are provider-agnostic (no Stripe fields)
   - Payment transactions track provider-specific IDs
   - Easy to migrate providers without affecting licenses

3. **Immutability**
   - Transactions are immutable (never updated, only created)
   - Price changes create new plans, never modify existing
   - Existing users unaffected by pricing changes

4. **Webhook-Driven**
   - Never trust client success redirects
   - Always process webhooks for license updates
   - Log every webhook for debugging and recovery

5. **Single Source of Truth**
   - Provider: payment state (active, canceled, past_due)
   - Proofa: access state (can user use feature X?)
   - Never duplicate state management

### Implementation Checklist

**Phase 1 - Stripe MVP**:
- [ ] Configure Stripe provider credentials
- [ ] Implement checkout flow (create sessions)
- [ ] Implement webhook handler (signature verification)
- [ ] Create/update licenses on payment events
- [ ] Record payment transactions for audit
- [ ] Log all webhooks for debugging
- [ ] Implement license validation in API routes
- [ ] Add feature flag checks (`canAccess`)
- [ ] Add rate limit checks (`getLimit`)
- [ ] Cache licenses for performance

**Phase 2 - Polish**:
- [ ] Add Lemonsqueezy provider
- [ ] Add Dodo provider
- [ ] Implement webhook reprocessing UI
- [ ] Admin dashboard for licenses/transactions
- [ ] Revenue reporting queries
- [ ] Failed payment notifications
- [ ] Trial period handling

**Phase 3 - Advanced**:
- [ ] Plan upgrades/downgrades
- [ ] Seat-based billing
- [ ] Usage-based metering
- [ ] Tax automation
- [ ] Coupons/promotions

### Common Pitfalls to Avoid

❌ **Storing provider-specific fields in licenses** (we fixed this!)  
❌ **Trusting client redirects instead of webhooks**  
❌ **Modifying prices instead of versioning**  
❌ **Duplicating payment logic in multiple places**  
❌ **Not logging webhooks (can't debug failures)**  
❌ **Not caching licenses (performance issues)**  
❌ **Coupling features to payment provider**  

### Success Metrics

Track these to ensure the system is healthy:

1. **Checkout success rate** > 95%
2. **Webhook processing time** < 5 seconds (p95)
3. **Webhook failure rate** < 2%
4. **License cache hit rate** > 90%
5. **License resolution time** < 50ms
6. **Refund rate** < 5%
7. **Chargeback rate** < 1%

### Final Recommendation (Opinionated)

**Start simple. Scale smart.**

1. Begin with **Stripe only** (most mature ecosystem)
2. Keep **plans stable** (3-5 plans maximum initially)
3. **Price immutably** (always version, never modify)
4. **Cache aggressively** (5-minute TTL minimum)
5. **Log everything** (webhooks, transactions, license changes)
6. Let **Proofa control access**, not payment providers
7. **Trust webhooks**, not client redirects

This architecture is battle-tested, provider-agnostic, and future-proof.

---

**Document Version**: 2.0 (Merged Canonical Spec)  
**Last Updated**: January 4, 2026  
**Status**: Production Ready  
**Canonical Authority**: This document defines Proofa payment architecture
