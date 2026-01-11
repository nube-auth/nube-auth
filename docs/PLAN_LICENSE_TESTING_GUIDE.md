# Plan → License Flow Testing Guide

**Status**: Ready for Testing  
**Date**: January 2026  
**Implementation**: Complete (9/10 tasks done)

## Overview

This guide documents how to test the complete end-to-end flow from plan creation to license validation. The implementation includes:

1. ✅ License history tracking (audit trail)
2. ✅ Fixed critical bugs in purchases.ts
3. ✅ Admin plan CRUD API
4. ✅ Plan sync worker (multi-provider)
5. ✅ Updated checkout flow (plan-based)
6. ✅ User license check API

---

## Implementation Summary

### Phase 1: Database & Bug Fixes (Tasks 1-4)

#### Task 1-2: License History Table
**File**: `apps/packages/db/src/schema.ts` (lines 290-325)

```typescript
export const license_history = pgTable("license_history", {
  id: serial("id").primaryKey(),
  public_id: varchar("public_id", { length: 255 }).notNull().unique(),
  license_id: integer("license_id").notNull().references(() => licenses.id),
  user_id: integer("user_id").notNull().references(() => users.id),
  app_id: integer("app_id").notNull().references(() => apps.id),
  plan_id: integer("plan_id").notNull().references(() => plans.id),
  change_type: varchar("change_type", { length: 50 }).notNull(),
  // ... rest of fields
});
```

**What it does**: Tracks every license change (created, renewed, expired, downgraded, upgraded, refunded) for complete audit trail.

**Migration**: Applied successfully via `pnpm db:migrate`

---

#### Task 3-4: Fixed purchases.ts
**File**: `apps/services/core/src/billing/services/purchases.ts` (complete rewrite, 211 lines)

**Critical bug fixed**: Original code tried to insert 6 non-existent fields:
- ❌ `purchase_id`, `license_key`, `user_public_id`, `is_active`, `valid_from`, `metadata`
- ✅ Replaced with correct schema: `user_id`, `app_id`, `plan_id`, `status`, `valid_until`

**New implementation**:
1. Looks up user by email (from webhook)
2. Looks up plan by public_id (from webhook metadata)
3. Creates/updates license using upsert pattern
4. Creates license_history record for audit trail
5. Handles both new licenses and renewals

**Key code**:
```typescript
await licenseQueries.upsert(db, user.id, app.id, {
  public_id: createId("license"),
  plan_id: plan.id,
  status: "active",
  valid_until: validUntil,
});

await db.insert(license_history).values({
  public_id: createId("license_history"),
  license_id: license.id,
  user_id: user.id,
  app_id: app.id,
  plan_id: plan.id,
  change_type: "created",
  // ... rest
});
```

---

### Phase 2: Plan Management (Task 5)

#### Task 5: Admin Plan CRUD API
**File**: `apps/services/core/src/routes/v1/admin/plans.ts` (549 lines)

**Endpoints**:

1. **POST /v1/admin/plans** - Create plan
   - Validates at least one price exists (monthly or yearly)
   - Creates plan with pricing in single transaction
   - Returns plan with public_id

2. **GET /v1/admin/plans/:appId** - List plans
   - Optional `includeInactive` query param
   - Returns plans with pricing

3. **GET /v1/admin/plans/:appId/:planId** - Get single plan
   - Returns plan details with pricing

4. **PATCH /v1/admin/plans/:appId/:planId** - Update plan
   - **Smart versioning**: If pricing changes, creates new version (plan_v2, plan_v3)
   - **In-place updates**: If only name/description/features change, updates existing
   - Soft-deletes old version if pricing changed

5. **DELETE /v1/admin/plans/:appId/:planId** - Soft delete
   - Sets `is_active=false`
   - Preserves data for historical records

**Example request**:
```bash
curl -X POST http://localhost:3003/v1/admin/plans \
  -H "X-User-Id: USER0abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "APP0xyz789",
    "name": "Pro Plan",
    "slug": "pro",
    "description": "Full feature access",
    "features": ["feature1", "feature2"],
    "pricing": {
      "monthly": { "amountCents": 999 },
      "yearly": { "amountCents": 9990 }
    }
  }'
```

---

### Phase 3: Provider Sync (Tasks 6-7)

#### Task 6: Adapter Methods
**Files**: 
- `apps/services/core/src/billing/adapters/types.ts` - Interface definitions
- `apps/services/core/src/billing/adapters/stripe.ts` - Stripe implementation

**New interfaces**:
```typescript
interface CreateProductParams {
  name: string;
  description?: string;
}

interface CreateProductResult {
  productId: string;
}

interface CreatePriceParams {
  productId: string;
  amountCents: number;
  currency: string;
  interval?: "month" | "year";
  intervalCount?: number;
}

interface CreatePriceResult {
  priceId: string;
}
```

**Added to PaymentProviderAdapter**:
- `createProduct()` - Creates product in provider (Stripe/LemonSqueezy)
- `createPrice()` - Creates price for product (supports recurring & one-time)

**Stripe implementation**:
```typescript
async createProduct(params: CreateProductParams): Promise<CreateProductResult> {
  const product = await this.stripe.products.create({
    name: params.name,
    description: params.description,
  });
  return { productId: product.id };
}

async createPrice(params: CreatePriceParams): Promise<CreatePriceResult> {
  const priceData: Stripe.PriceCreateParams = {
    product: params.productId,
    unit_amount: params.amountCents,
    currency: params.currency.toLowerCase(),
  };

  if (params.interval) {
    priceData.recurring = {
      interval: params.interval,
      interval_count: params.intervalCount || 1,
    };
  }

  const price = await this.stripe.prices.create(priceData);
  return { priceId: price.id };
}
```

---

#### Task 7: Plan Sync Worker
**File**: `apps/services/workers/src/sync-plan-to-providers.ts` (307 lines)

**Purpose**: Syncs Proofa plans to all active payment providers (Stripe, LemonSqueezy, etc.)

**Logic flow**:
1. Get plan by public_id
2. Get app and all active `payment_provider_configs` for the project
3. For each active provider:
   - Decrypt credentials
   - Create payment adapter
   - Call `adapter.createProduct()` to create product in provider
   - For each interval (monthly/yearly):
     - Call `adapter.createPrice()` to create price in provider
     - Store mapping in `plan_provider_prices` table
4. Track synced vs failed providers
5. Implement retry logic (5 attempts, exponential backoff)
6. Send success/failure notifications

**Retry schedule**:
- Attempt 1: Immediate
- Attempt 2: 5 minutes
- Attempt 3: 30 minutes
- Attempt 4: 2 hours
- Attempt 5: 24 hours

**Example usage**:
```typescript
import { syncPlanToProviders } from "./sync-plan-to-providers";

const result = await syncPlanToProviders("PLAN0abc123");

console.log(result);
// {
//   success: true,
//   planId: "PLAN0abc123",
//   synced: ["stripe", "lemonsqueezy"],
//   failed: []
// }
```

**Database mappings created**:
```sql
INSERT INTO plan_provider_prices (
  plan_id,
  provider_config_id,
  billing_type,    -- 'recurring' or 'one-time'
  interval,         -- 'month', 'year', or null
  amount_cents,
  provider_price_id -- e.g., 'price_1A2B3C' from Stripe
) VALUES (...);
```

---

### Phase 4: Checkout & License (Tasks 8-9)

#### Task 8: Updated Checkout Flow
**File**: `apps/services/core/src/routes/v1/billing/checkout.ts` (updated)

**Old flow** (deprecated):
```typescript
{
  "appId": "APP0...",
  "productId": "price_1A2B3C",  // Provider's price ID
  "mode": "subscription"
}
```

**New flow** (plan-based):
```typescript
{
  "appId": "APP0...",
  "planId": "PLAN0...",         // Proofa plan ID
  "interval": "month",          // or "year"
  "customerEmail": "user@example.com",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

**Implementation logic**:
1. Verify plan exists and is active
2. Select payment provider based on routing rules (country, currency)
3. Lookup `plan_provider_prices` for:
   - `plan_id` = plan's internal ID
   - `provider_config_id` = selected provider's ID
   - `interval` = requested interval (month/year)
4. Get `provider_price_id` from mapping
5. Pass to `adapter.createCheckout()` with provider's price ID
6. Add Proofa metadata to checkout session:
   - `proofa_plan_id`: Original plan public_id
   - `proofa_interval`: Requested interval
7. Return checkout URL

**Example**:
```bash
curl -X POST http://localhost:3003/v1/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "APP0xyz789",
    "planId": "PLAN0abc123",
    "interval": "month",
    "customerEmail": "user@example.com",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel"
  }'

# Response:
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_...",
  "provider": "stripe",
  "planName": "Pro Plan",
  "amountCents": 999,
  "interval": "month"
}
```

**Error handling**:
- Plan not found → 400 "Invalid plan ID"
- No active provider → 400 "No payment provider configured"
- Price mapping missing → 400 "Price not available" (plan not synced yet)

---

#### Task 9: User License Check API
**File**: `apps/services/core/src/routes/v1/license/index.ts` (updated)

**Endpoint**: `GET /v1/license/:appId`

**Authentication**: Requires `X-User-Id` header (set by gateway)

**Logic**:
1. Extract `userPublicId` from `X-User-Id` header
2. Lookup user by public_id
3. Lookup app by public_id
4. Query licenses WHERE:
   - `user_id` = user's internal ID
   - `app_id` = app's internal ID
   - `status` = 'active'
   - `valid_until` IS NULL OR >= NOW()
5. Return license with plan details

**Example request**:
```bash
curl -X GET http://localhost:3003/v1/license/APP0xyz789 \
  -H "X-User-Id: USER0abc123"
```

**Response (has license)**:
```json
{
  "hasLicense": true,
  "license": {
    "id": "LIC0def456",
    "status": "active",
    "validUntil": "2025-12-31T23:59:59.000Z",
    "plan": {
      "id": "PLAN0abc123",
      "name": "Pro Plan",
      "slug": "pro",
      "description": "Full feature access",
      "features": ["feature1", "feature2"]
    }
  }
}
```

**Response (no license)**:
```json
{
  "hasLicense": false,
  "appId": "APP0xyz789",
  "message": "No active license found for this app"
}
```

---

## Complete End-to-End Flow

### Step 1: Admin Creates Plan

```bash
# Create plan via Admin API
curl -X POST http://localhost:3003/v1/admin/plans \
  -H "X-User-Id: USER0admin" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "APP0test123",
    "name": "Pro Plan",
    "slug": "pro",
    "description": "Full feature access",
    "features": ["unlimited_projects", "priority_support"],
    "pricing": {
      "monthly": { "amountCents": 999 },
      "yearly": { "amountCents": 9990 }
    }
  }'

# Response:
{
  "message": "Plan created successfully",
  "plan": {
    "id": "PLAN0abc123",
    "name": "Pro Plan",
    "slug": "pro",
    "pricing": [
      { "interval": "month", "amountCents": 999 },
      { "interval": "year", "amountCents": 9990 }
    ]
  }
}
```

---

### Step 2: Worker Syncs Plan to Providers

```typescript
// Triggered by plan creation (or manually)
import { syncPlanToProviders } from "@proofa/workers";

const result = await syncPlanToProviders("PLAN0abc123");

// Result:
{
  success: true,
  planId: "PLAN0abc123",
  synced: [
    {
      provider: "stripe",
      productId: "prod_ABC123",
      prices: [
        { interval: "month", priceId: "price_monthly_123" },
        { interval: "year", priceId: "price_yearly_456" }
      ]
    }
  ],
  failed: []
}
```

**What happens**:
1. Worker gets plan from database
2. Finds all active payment providers for the app's project
3. For Stripe:
   - Calls `stripe.products.create()` → creates product
   - Calls `stripe.prices.create()` twice → creates monthly & yearly prices
4. Stores mappings in `plan_provider_prices`:
   ```sql
   plan_id | provider_config_id | interval | provider_price_id    | amount_cents
   --------|-------------------|----------|---------------------|-------------
   123     | 1                 | month    | price_monthly_123   | 999
   123     | 1                 | year     | price_yearly_456    | 9990
   ```

---

### Step 3: User Checks Out

```bash
# User dashboard calls checkout API
curl -X POST http://localhost:3003/v1/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "APP0test123",
    "planId": "PLAN0abc123",
    "interval": "month",
    "customerEmail": "user@example.com",
    "successUrl": "https://myapp.com/success",
    "cancelUrl": "https://myapp.com/cancel"
  }'

# Response:
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_abc123",
  "provider": "stripe",
  "planName": "Pro Plan",
  "amountCents": 999,
  "interval": "month"
}
```

**What happens**:
1. Verifies plan exists and is active
2. Selects payment provider (based on routing rules)
3. Looks up `plan_provider_prices` WHERE:
   - `plan_id` = 123 (plan's internal ID)
   - `provider_config_id` = 1 (Stripe provider ID)
   - `interval` = 'month'
4. Gets `provider_price_id` = 'price_monthly_123'
5. Calls `stripeAdapter.createCheckout()` with that price ID
6. Returns Stripe checkout URL to user

---

### Step 4: Webhook Creates License

```bash
# Stripe sends webhook after successful payment
POST http://localhost:3003/v1/webhooks/stripe
Content-Type: application/json
Stripe-Signature: ...

{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_abc123",
      "customer_email": "user@example.com",
      "metadata": {
        "proofa_plan_id": "PLAN0abc123",
        "proofa_interval": "month"
      },
      "subscription": "sub_123"
    }
  }
}
```

**What happens** (in `purchases.ts`):
1. Webhook handler extracts customer email and plan_id from metadata
2. Looks up user by email → finds `USER0xyz789`
3. Looks up plan by public_id → finds plan with ID 123
4. Creates/updates license:
   ```typescript
   await licenseQueries.upsert(db, userId, appId, {
     public_id: createId("license"),
     plan_id: 123,
     status: "active",
     valid_until: new Date("2025-02-10"), // 1 month from now
   });
   ```
5. Creates license_history record:
   ```typescript
   await db.insert(license_history).values({
     public_id: createId("license_history"),
     license_id: license.id,
     user_id: userId,
     app_id: appId,
     plan_id: 123,
     change_type: "created",
     // ... rest
   });
   ```

---

### Step 5: User Validates License

```bash
# User app calls license check API
curl -X GET http://localhost:3003/v1/license/APP0test123 \
  -H "X-User-Id: USER0xyz789"

# Response:
{
  "hasLicense": true,
  "license": {
    "id": "LIC0def456",
    "status": "active",
    "validUntil": "2025-02-10T23:59:59.000Z",
    "plan": {
      "id": "PLAN0abc123",
      "name": "Pro Plan",
      "slug": "pro",
      "description": "Full feature access",
      "features": ["unlimited_projects", "priority_support"]
    }
  }
}
```

**What happens**:
1. Extracts `USER0xyz789` from `X-User-Id` header
2. Queries licenses WHERE:
   - `user_id` = internal ID of USER0xyz789
   - `app_id` = internal ID of APP0test123
   - `status` = 'active'
   - `valid_until` >= NOW() OR `valid_until` IS NULL
3. Returns license with plan details

---

## Testing Checklist

### Prerequisites
- [ ] Database running with latest migrations applied
- [ ] Core service running (`pnpm dev:core`)
- [ ] Workers service available
- [ ] Gateway running (for authentication headers)
- [ ] Payment provider configured (Stripe test mode)

### Test 1: Plan Creation
- [ ] Create plan via POST /v1/admin/plans
- [ ] Verify plan created in database
- [ ] Verify pricing records created
- [ ] Try invalid request (missing pricing) → expect 400
- [ ] List plans via GET /v1/admin/plans/:appId
- [ ] Get single plan via GET /v1/admin/plans/:appId/:planId

### Test 2: Plan Sync
- [ ] Run sync worker: `syncPlanToProviders("PLAN0...")`
- [ ] Verify product created in Stripe dashboard
- [ ] Verify prices created in Stripe dashboard
- [ ] Verify mappings in `plan_provider_prices` table
- [ ] Test sync with no active providers → expect graceful skip
- [ ] Test sync with invalid credentials → expect retry logic

### Test 3: Checkout
- [ ] Create checkout session via POST /v1/billing/checkout
- [ ] Verify correct provider selected
- [ ] Verify correct price mapping used
- [ ] Open checkout URL → complete payment in Stripe test mode
- [ ] Verify metadata included (proofa_plan_id, proofa_interval)
- [ ] Try checkout for plan not synced → expect 400

### Test 4: Webhook & License Creation
- [ ] Complete Stripe checkout (use test card: 4242 4242 4242 4242)
- [ ] Wait for webhook to fire
- [ ] Check logs for purchase creation
- [ ] Verify license created in `licenses` table
- [ ] Verify license_history record created
- [ ] Check user by email was found correctly
- [ ] Check plan lookup from metadata worked

### Test 5: License Validation
- [ ] Call GET /v1/license/:appId with user's X-User-Id header
- [ ] Verify returns hasLicense=true and plan details
- [ ] Test with user who has no license → expect hasLicense=false
- [ ] Test with expired license → expect hasLicense=false
- [ ] Test with inactive license (status != 'active') → expect hasLicense=false

### Test 6: Plan Updates & Versioning
- [ ] Update plan name/description → expect in-place update
- [ ] Update plan pricing → expect new version created
- [ ] Verify old version soft-deleted (is_active=false)
- [ ] Verify existing licenses still reference old plan_id
- [ ] New checkouts use new plan version

### Test 7: Audit Trail
- [ ] Complete full flow (plan → sync → checkout → webhook)
- [ ] Query license_history for user
- [ ] Verify "created" record exists
- [ ] Simulate renewal → verify "renewed" record
- [ ] Simulate cancellation → verify "expired" record

---

## Troubleshooting

### Issue: "Price not available for selected plan"
**Cause**: Plan not synced to payment provider yet  
**Solution**: Run sync worker for that plan

### Issue: "No payment provider configured"
**Cause**: No active provider in payment_provider_configs  
**Solution**: Add provider via admin dashboard

### Issue: Webhook not creating license
**Cause**: Plan ID missing from checkout metadata  
**Solution**: Verify checkout.ts adds metadata correctly

### Issue: License check returns false for paid user
**Cause**: User lookup failing or license status not 'active'  
**Solution**: Check user email matches webhook email, verify license status

---

## Next Steps

1. **Testing** (Task 10): Run through complete flow with real Stripe test account
2. **Add LemonSqueezy**: Implement LemonSqueezy adapter methods
3. **Worker Scheduling**: Set up cron job to auto-sync new plans
4. **Monitoring**: Add alerts for failed sync attempts
5. **Admin Dashboard UI**: Build UI for plan management

---

## Architecture Compliance

✅ **ID Management**:
- All API responses use public IDs (PLAN0..., USER0..., APP0...)
- Internal IDs only used for database queries
- Service headers use public IDs

✅ **JSONB Updates**:
- Plan features use atomic updates
- No read-modify-write patterns

✅ **Error Logging**:
- No credentials in logs
- Structured logging with context
- serializeError() used for errors

✅ **Configuration**:
- All env vars accessed via config/env.ts
- No direct process.env access

✅ **HTTP Client**:
- Uses pingpong from @proofa/auth (not native fetch)

✅ **Rate Limiting**:
- Disabled in development mode
- Enforced in production

---

**Last Updated**: January 10, 2026  
**Status**: Implementation Complete, Ready for Testing  
**Version**: 1.0
