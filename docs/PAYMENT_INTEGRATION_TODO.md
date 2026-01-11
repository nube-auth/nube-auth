# Payment Integration TODO

**Last Updated**: January 11, 2026  
**Status**: In Progress - Phase 2 Implementation  
**Reference**: [PAYMENT_SYSTEM_DESIGN.md](./PAYMENT_SYSTEM_DESIGN.md)

---

## 🏗️ Architectural Decision: Routing Rules from Day 1

**Decision**: Use `payment_routing_rules` table as the **primary** provider selection mechanism, NOT `apps.selected_payment_provider_id`.

**Rationale**:
- ✅ Consistent architecture from the start (no migration needed later)
- ✅ Single provider per app = one rule with empty conditions
- ✅ Easy to add multi-provider routing when needed
- ✅ Cleaner code (no fallback logic or conditional branches)
- ✅ Future-proof for country/currency-based routing

**Simple Setup (Phase 1)**:
```sql
-- App uses Stripe by default
INSERT INTO payment_routing_rules (app_id, provider_config_id, priority, conditions)
VALUES (1, 123, 100, '{}'); -- Empty conditions = matches everything
```

**Advanced Setup (Phase 2+)**:
```sql
-- Priority 10: US users → Stripe
INSERT INTO payment_routing_rules (app_id, provider_config_id, priority, conditions)
VALUES (1, 123, 10, '{"country": {"in": ["US", "CA"]}}');

-- Priority 20: EU users → LemonSqueezy
INSERT INTO payment_routing_rules (app_id, provider_config_id, priority, conditions)
VALUES (1, 124, 20, '{"country": {"in": ["GB", "DE", "FR"]}}');

-- Priority 100: Fallback → Stripe
INSERT INTO payment_routing_rules (app_id, provider_config_id, priority, conditions)
VALUES (1, 123, 100, '{}');
```

---

## Current Implementation Status

### ✅ Completed (Foundation)

1. **Database Schema** - All tables created and migrated
   - ✅ `payment_provider_configs` - Provider credentials storage
   - ✅ `plan_provider_prices` - Plan-to-provider price mapping
   - ✅ `purchases` - Checkout session tracking
   - ✅ `payment_transactions` - Transaction audit trail
   - ✅ `subscriptions` - Recurring subscription tracking
   - ✅ `webhook_logs` - Webhook debugging and reprocessing
   - ✅ `promotions`, `promotion_codes`, `promotion_redemptions` - Discount system
   - ✅ `licenses` - User entitlements (existing)
   - ✅ `plans` - Plan definitions (existing)

2. **Database Queries** - Basic CRUD operations
   - ✅ `paymentProviderConfigQueries` in `apps/packages/db/src/queries.ts`
     - findById, findByPublicId, findByProjectId
     - findByProjectAndProvider, findDefaultByProject
     - create, update, delete

3. **Encryption Utilities** - AES-256-GCM credential encryption
   - ✅ File: `apps/services/core/src/utils/encryption.ts`
   - ✅ `encryptCredentials()` - JSON object encryption
   - ✅ `decryptCredentials()` - Decryption and parsing
   - ✅ Uses `env.PAYMENT_CONFIGS_KEY` (32-byte hex)

4. **Admin Provider Management** - Project-level configuration
   - ✅ File: `apps/services/core/src/routes/v1/admin/providers.ts`
   - ✅ `GET /providers/available` - List available providers (Stripe, LemonSqueezy, Dodo)
   - ✅ `GET /providers/:projectId/configs` - List project's provider configs
   - ✅ `GET /providers/:projectId/configs/:providerId` - Get specific config
   - ✅ `POST /providers/:projectId/configs` - Create provider config (encrypted)
   - ✅ `PUT /providers/:projectId/configs/:providerId` - Update config
   - ✅ `DELETE /providers/:projectId/configs/:providerId` - Delete config
   - ✅ Project-level authorization (owner check)
   - ✅ Credential encryption/decryption on write/read

5. **Webhook Infrastructure** - Basic endpoint structure
   - ✅ File: `apps/services/core/src/routes/v1/billing/webhooks.ts`
   - ✅ `POST /v1/billing/webhooks/:provider` - Webhook receiver
   - ✅ Signature extraction (Stripe, LemonSqueezy, Paddle formats)
   - ✅ IP address logging
   - ✅ Rate limiting (100 req/min per IP)
   - ✅ Queue integration (stub - needs implementation)

6. **Checkout Stub** - Placeholder endpoint
   - ✅ File: `apps/services/core/src/routes/v1/billing/checkout.ts`
   - ⚠️ Returns 501 "Not Implemented" (Phase 2 pending)

**⚠️ Deprecation Notice**:
- `apps.selected_payment_provider_id` - Will be removed in favor of routing rules

---

## 🚧 Phase 2 - Payment Provider Integration

### Milestone 0: Routing Infrastructure ✅ COMPLETE

**Priority**: CRITICAL  
**Status**: ✅ COMPLETE  
**Completion Date**: January 11, 2026

#### Completed Tasks:
- [x] 0.1: Database migration created (`0001_add_payment_routing_rules.sql`)
- [x] 0.2: Schema definition added to `schema.ts`
- [x] 0.3: Routing rule queries implemented in `queries.ts`
- [x] 0.4: Provider selection service (`billing/services/provider-selector.ts`)
- [x] 0.5: Admin routing rules endpoints (`/v1/admin/routing-rules`)
- [x] 0.6: `createDefaultRoutingRule()` helper function
- [x] 0.7: Updated provider creation flow

**Files Created/Modified**:
- `apps/packages/db/drizzle/0001_add_payment_routing_rules.sql` - Migration
- `apps/packages/db/src/schema.ts` - Added `payment_routing_rules` table
- `apps/packages/db/src/queries.ts` - Added `routingRuleQueries`
- `apps/services/core/src/billing/services/provider-selector.ts` - NEW
- `apps/services/core/src/routes/v1/admin/routing-rules.ts` - NEW
- `apps/services/core/src/routes/v1/admin/index.ts` - Registered routing-rules router
- `apps/services/core/src/routes/v1/admin/providers.ts` - Added TODO for auto-rule creation

---

### Milestone 0 (LEGACY): Routing Infrastructure Foundation

**Note**: This section is kept for historical reference. Implementation is complete above.

#### 0.1 Database Migration - Add Routing Rules Table (DONE)
✅ Created migration file: `apps/packages/db/drizzle/0001_add_payment_routing_rules.sql`
  ```sql
  CREATE TABLE payment_routing_rules (
    id SERIAL PRIMARY KEY,
    public_id VARCHAR(255) UNIQUE NOT NULL,
    app_id INTEGER REFERENCES apps(id) NOT NULL,
    
    -- Rule definition
    priority INTEGER NOT NULL DEFAULT 100,
    conditions JSONB NOT NULL DEFAULT '{}',
    provider_config_id INTEGER REFERENCES payment_provider_configs(id) NOT NULL,
    
    -- A/B testing support
    traffic_percentage INTEGER DEFAULT 100 
      CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
    
    -- Metadata
    name VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  
  -- Index for fast lookups
  CREATE INDEX idx_routing_rules_app_priority 
  ON payment_routing_rules(app_id, priority) 
  WHERE is_active = true;
  
  -- Index for provider lookups
  CREATE INDEX idx_routing_rules_provider 
  ON payment_routing_rules(provider_config_id);
  ```

#### 0.2 Schema Definition
- [ ] Add to `apps/packages/db/src/schema.ts`:
  ```typescript
  export const payment_routing_rules = pgTable(
    "payment_routing_rules",
    {
      id: serial("id").primaryKey(),
      public_id: varchar("public_id", { length: 255 }).notNull().unique(),
      app_id: integer("app_id")
        .notNull()
        .references(() => apps.id),
      
      priority: integer("priority").notNull().default(100),
      conditions: jsonb("conditions").notNull().default('{}'),
      provider_config_id: integer("provider_config_id")
        .notNull()
        .references(() => payment_provider_configs.id),
      
      traffic_percentage: integer("traffic_percentage").notNull().default(100),
      
      name: varchar("name", { length: 255 }),
      description: text("description"),
      is_active: boolean("is_active").notNull().default(true),
      
      created_at: timestamp("created_at").notNull().defaultNow(),
      updated_at: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => [
      index("idx_routing_rules_app_priority").on(table.app_id, table.priority),
      index("idx_routing_rules_provider").on(table.provider_config_id),
    ],
  );
  ```

#### 0.3 Routing Rule Queries
- [ ] Add to `apps/packages/db/src/queries.ts`:
  ```typescript
  export const routingRuleQueries = {
    // Find all active rules for an app, ordered by priority
    async findActiveByAppId(db: DbClient, appId: number) {
      return db
        .select()
        .from(payment_routing_rules)
        .where(
          and(
            eq(payment_routing_rules.app_id, appId),
            eq(payment_routing_rules.is_active, true)
          )
        )
        .orderBy(asc(payment_routing_rules.priority));
    },
    
    // Find all rules (active + inactive)
    async findByAppId(db: DbClient, appId: number) {
      return db
        .select()
        .from(payment_routing_rules)
        .where(eq(payment_routing_rules.app_id, appId))
        .orderBy(asc(payment_routing_rules.priority));
    },
    
    // Find by public ID
    async findByPublicId(db: DbClient, publicId: string) {
      const results = await db
        .select()
        .from(payment_routing_rules)
        .where(eq(payment_routing_rules.public_id, publicId));
      return results[0];
    },
    
    // Create routing rule
    async create(db: DbClient, data: typeof payment_routing_rules.$inferInsert) {
      const results = await db
        .insert(payment_routing_rules)
        .values(data)
        .returning();
      return results[0]!;
    },
    
    // Update routing rule
    async update(
      db: DbClient,
      ruleId: number,
      data: Partial<typeof payment_routing_rules.$inferInsert>
    ) {
      return db
        .update(payment_routing_rules)
        .set({ ...data, updated_at: new Date() })
        .where(eq(payment_routing_rules.id, ruleId))
        .returning();
    },
    
    // Delete (soft delete via is_active = false)
    asyncBuild selection context (country, currency, amount)
  5. [ ] **Call `selectProvider(app.id, context)`** - Use routing rules
  6. [ ] Load provider config and decrypt credentials
  7. [ ] Get plan-provider price mapping for interval
  8. [ ] Validate promotion code (if provided)
  9. [ ] Create `purchases` record (status: 'pending')
  10. [ ] Call provider adapter `createCheckout()`
  11. [ ] Store provider session ID in purchase
  12
    // Hard delete
    async delete(db: DbClient, ruleId: number) {
      return db
        .delete(payment_routing_rules)
        .where(eq(payment_routing_rules.id, ruleId));
    },
  };
  ```

#### 0.4 Provider Selection Service
- [ ] Create `apps/services/core/src/billing/services/provider-selector.ts`
  ```typescript
  import { getDb, routingRuleQueries, paymentProviderConfigQueries } from "@proofa/db";
  import { createLogger } from "@proofa/shared";
  
  const log = createLogger("provider-selector");
  
  export interface SelectionContext {
    country?: string;        // User's country code (US, GB, etc.)
    currency?: string;        // Plan currency (usd, eur, etc.)
    amountCents?: number;     // Transaction amount
    paymentMethod?: string;   // card, bank_transfer, etc.
    userSegment?: string;     // free, pro, enterprise
    userId?: string;          // For A/B testing
  }
  
  export async function selectProvider(
    appId: number,
    context: SelectionContext
  ) {
    const db = getDb();
    
    // Get active routing rules, ordered by priority
    const rules = await routingRuleQueries.findActiveByAppId(db, appId);
    
    if (rules.length === 0) {
      throw new Error(`No routing rules configured for app ${appId}`);
    }
    
    // Evaluate rules in priority order
    for (const rule of rules) {
      if (matchesConditions(context, rule.conditions)) {
        if (shouldRouteTraffic(rule.traffic_percentage, context.userId)) {
          log.info(
            { appId, ruleId: rule.id, ruleName: rule.name },
            "Provider selected via routing rule"
          );
          
          return await paymentProviderConfigQueries.findById(
            db,
            rule.provider_config_id
          );
        }
      }
    }
    
    // Should never reach here if rules include a catch-all (empty conditions)
    throw new Error(`No matching routing rule for context: ${JSON.stringify(context)}`);
  }
  
  function matchesConditions(
    context: SelectionContext,
    conditions: any
  ): boolean {
    // Empty conditions = matches everything (catch-all rule)
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }
    
    for (const [field, matcher] of Object.entries(conditions)) {
      const value = context[field as keyof SelectionContext];
      
      // Equality check
      if (matcher.eq !== undefined && value !== matcher.eq) {
        return false;
      }
      
      // In array check
      if (matcher.in && Array.isArray(matcher.in)) {
        if (!matcher.in.includes(value)) {
          return false;
        }
      }
      
      // Greater than or equal
      if (matcher.gte !== undefined && (value === undefined || value < matcher.gte)) {
        return false;
      }
      
      // Less than or equal
      if (matcher.lte !== undefined && (value === undefined || value > matcher.lte)) {
        return false;
      }
      
      // Not equal
      if (matcher.ne !== undefined && value === matcher.ne) {
        return false;
      }
    }
    
    return true;
  }
  
  function shouldRouteTraffic(
    percentage: number,
    userId?: string
  ): boolean {
    if (percentage === 100) return true;
    if (percentage === 0) return false;
    
    // Consistent hashing based on userId for A/B testing
    if (userId) {
      const hash = simpleHash(userId);
      return (hash % 100) < percentage;
    }
    
    // Random if no userId
    return Math.random() * 100 < percentage;
  }
  
  function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  ```

#### 0.5 Admin Routing Rules Endpoints
- [ ] Create `apps/services/core/src/routes/v1/admin/routing-rules.ts`
  ```typescript
  /**
   * Payment Routing Rules Admin Routes
   * 
   * Manages provider routing rules per app:
   * - List routing rules
   * - Create new routing rules
   * - Update routing rules
   * - Delete routing rules
   * - Test rule matching
   */
  
  import { Hono } from "hono";
  import { z } from "zod";
  import { 
    getDb, 
    routingRuleQueries, 
    appQueries, 
    userQueries,
    paymentProviderConfigQueries 
  } from "@proofa/db";
  import type { Context } from "hono";
  import { createLogger, createId } from "@proofa/shared";
  
  const log = createLogger("admin-routing-rules");
  const routingRulesRouter = new Hono();
  
  // GET /routing-rules/:appId - List all routing rules for an app
  routingRulesRouter.get("/:appId", async (c: Context) => {
    const appId = c.req.param("appId");
    const userId = c.req.header("X-User-Id");
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    try {
      const db = getDb();
      
      // Validate app access (user must be project owner)
      const app = await appQueries.findByPublicId(db, appId);
      if (!app) {
        return c.json({ error: "App not found" }, 404);
      }
      
      // Get all rules
      const rules = await routingRuleQueries.findByAppId(db, app.id);
      
      // Format response
      const formattedRules = await Promise.all(
        rules.map(async (rule) => {
          const provider = await paymentProviderConfigQueries.findById(
            db,
            rule.provider_config_id
          );
          
          return {
            id: rule.public_id,
            name: rule.name,
            description: rule.description,
            priority: rule.priority,
            conditions: rule.conditions,
            provider: {
              id: provider?.public_id,
              name: provider?.provider,
              environment: provider?.environment,
            },
            trafficPercentage: rule.traffic_percentage,
            isActive: rule.is_active,
            createdAt: rule.created_at,
            updatedAt: rule.updated_at,
          };
        })
      );
      
      return c.json({
        rules: formattedRules,
        total: formattedRules.length,
      });
    } catch (error) {
      log.error({ error, appId }, "Failed to list routing rules");
      return c.json({ error: "Failed to list routing rules" }, 500);
    }
  });
  
  // POST /routing-rules/:appId - Create new routing rule
  routingRulesRouter.post("/:appId", async (c: Context) => {
    // Implementation...
  });
  
  // PUT /routing-rules/:appId/:ruleId - Update routing rule
  routingRulesRouter.put("/:appId/:ruleId", async (c: Context) => {
    // Implementation...
  });
  
  // DELETE /routing-rules/:appId/:ruleId - Delete routing rule
  routingRulesRouter.delete("/:appId/:ruleId", async (c: Context) => {
    // Implementation...
  });
  
  // POST /routing-rules/:appId/test - Test rule matching
  routingRulesRouter.post("/:appId/test", async (c: Context) => {
    // Implementation...
  });
  
  export { routingRulesRouter };
  ```

#### 0.6 Default Rule Creation
- [ ] Update provider config creation to auto-create default routing rule
- [ ] Add helper: `createDefaultRoutingRule(appId, providerConfigId)`
- [ ] Hook into app creation flow

---

### Milestone 1: Provider Adapter Architecture

**Priority**: HIGH  
**Estimated Effort**: 2-3 days

#### 1.1 Define Provider Interface
- [ ] Create `apps/services/core/src/billing/adapters/base.ts`
  ```typescript
  interface PaymentProvider {
    createCheckout(plan, interval, user, config): Promise<CheckoutSession>
    verifyWebhookSignature(payload, signature, secret): boolean
    parseWebhookEvent(payload): WebhookEvent
    handleCheckoutCompleted(event): Promise<CheckoutData>
    handleSubscriptionUpdated(event): Promise<SubscriptionData>
    handleRefund(event): Promise<RefundData>
  }
  ```

#### 1.2 Stripe Adapter Implementation
- [ ] File: `apps/services/core/src/billing/adapters/stripe.ts`
- [ ] Install `stripe` package: `pnpm add stripe --filter @proofa/core`
- [ ] Implement `StripeProvider` class
  - [ ] `createCheckout()` - Create Stripe checkout session
  - [ ] `verifyWebhookSignature()` - HMAC verification
  - [ ] `parseWebhookEvent()` - Parse Stripe webhook
  - [ ] Handle events:
    - [ ] `checkout.session.completed` - New purchase
    - [ ] `invoice.paid` - Subscription renewal
    - [ ] `customer.subscription.updated` - Status change
    - [ ] `customer.subscription.deleted` - Cancellation
    - [ ] `charge.refunded` - Refund
    - [ ] `charge.dispute.created` - Chargeback

#### 1.3 LemonSqueezy Adapter Implementation
- [ ] File: `apps/services/core/src/billing/adapters/lemonsqueezy.ts`
- [ ] Install `@lemonsqueezy/lemonsqueezy.js` or use fetch
- [ ] Implement `LemonSqueezyProvider` class
  - [ ] `createCheckout()` - Redirect to LemonSqueezy
  - [ ] `verifyWebhookSignature()` - HMAC-SHA256
  - [ ] Handle events:
    - [ ] `order_created` - New purchase
    - [ ] `subscription_updated` - Renewal/status change
    - [ ] `subscription_cancelled` - Cancellation
    - [ ] `order_refunded` - Refund

#### 1.4 Dodo Adapter (Feature-Flagged Stub)
- [ ] File: `apps/services/core/src/billing/adapters/dodo.ts`
- [ ] Implement `DodoProvider` class with stubs
  - [ ] All methods throw `NotImplementedError`
  - [ ] Check `isFeatureEnabled('payment_provider_dodo')`
- [ ] Add feature flag to environment config

#### 1.5 Adapter Factory
- [ ] File: `apps/services/core/src/billing/adapters/factory.ts`
- [ ] `getProviderAdapter(provider: string)` - Returns correct adapter
- [ ] `createCheckoutSession(appId, planId, interval, userId)` - Routing logic

---

### Milestone 2: Plan Provider Price Management

**Priority**: HIGH  
**Estimated Effort**: 1-2 days

#### 2.1 Database Queries
- [ ] Add to `apps/packages/db/src/queries.ts`:
  ```typescript
  export const planProviderPriceQueries = {
    findByPlanAndProvider(db, planId, providerConfigId, interval)
    findByProviderPriceId(db, providerPriceId)
    findByPlanId(db, planId)
    create(db, data)
    update(db, id, data)
    deactivate(db, id)
  }
  ```

#### 2.2 Admin Endpoints
- [ ] File: `apps/services/core/src/routes/v1/admin/plan-prices.ts`
- [ ] `GET /admin/plans/:planId/prices` - List all prices for plan
- [ ] `POST /admin/plans/:planId/prices` - Create provider price mapping
  ```json
  {
    "providerConfigId": "PROV0abc",
    "billingType": "recurring",
    "interval": "month",
    "amountCents": 500,
    "currency": "usd",
    "providerPriceId": "price_stripe_abc123"
  }
  ```
- [ ] `PUT /admin/plans/:planId/prices/:priceId` - Update price
- [ ] `DELETE /admin/plans/:planId/prices/:priceId` - Deactivate price

---

### Milestone 3: Checkout Flow Implementation

**Priority**: HIGH  
**Estimated Effort**: 2-3 days

#### 3.1 Plan Listing Endpoint
- [ ] File: `apps/services/core/src/routes/v1/billing/plans.ts`
- [ ] `GET /v1/billing/plans/:appId` - List active plans
  ```json
  {
    "plans": [
      {
        "id": "PLAN0abc",
        "name": "Pro Plan",
        "slug": "pro",
        "description": "...",
        "pricing": {
          "monthly": { "amountCents": 500, "currency": "usd" },
          "yearly": { "amountCents": 5000, "currency": "usd" }
        },
        "features": ["api_access", "analytics"],
        "trialDays": 14
      }
    ]
  }
  ```
- [ ] Public endpoint (no auth required)

#### 3.2 Checkout Session Creation
- [ ] Update `apps/services/core/src/routes/v1/billing/checkout.ts`
- [ ] `POST /v1/billing/checkout` - Create checkout session
  ```json
  {
    "appId": "APP0xyz",
    "planId": "PLAN0abc",
    "interval": "month",
    "promotionCode": "LAUNCH50" // optional
  }
  ```
- [ ] Implementation steps:
  1. [ ] Authenticate user (require valid session)
  2. [ ] Validate app exists and is active
  3. [ ] Validate plan exists and belongs to app
  4. [ ] Get app's `selected_payment_provider_id`
  5. [ ] Load provider config and decrypt credentials
  6. [ ] Get plan-provider price mapping for interval
  7. [ ] Validate promotion code (if provided)
  8. [ ] Create `purchases` record (status: 'pending')
  9. [ ] Call provider adapter `createCheckout()`
  10. [ ] Store provider session ID in purchase
  11. [ ] Return checkout URL
- [ ] Response:
  ```json
  {
    "checkoutUrl": "https://checkout.stripe.com/...",
    "sessionId": "cs_stripe_xyz",
    "purchaseId": "PUR0def"
  }
  ```

#### 3.3 Purchase Queries
- [ ] Add to `apps/packages/db/src/queries.ts`:
  ```typescript
  export const purchaseQueries = {
    create(db, data)
    findByProviderSessionId(db, sessionId)
    findById(db, id)
    updateStatus(db, id, status, transactionId?)
  }
  ```

---

### Milestone 4: Webhook Processing

**Priority**: HIGH  
**Estimated Effort**: 3-4 days

#### 4.1 Webhook Log Queries
- [ ] Add to `apps/packages/db/src/queries.ts`:
  ```typescript
  export const webhookLogQueries = {
    create(db, data)
    updateStatus(db, id, status, result?, error?)
    findByProviderEventId(db, provider, eventId)
    findFailedForRetry(db, limit?)
  }
  ```

#### 4.2 Webhook Verification & Routing
- [ ] Update `apps/services/core/src/routes/v1/billing/webhooks.ts`
- [ ] Implementation:
  1. [ ] Create webhook_log (status: 'not_started')
  2. [ ] Check for duplicate (by provider + event_id)
  3. [ ] Extract provider-specific signature
  4. [ ] Load provider config (webhook_secret)
  5. [ ] Verify signature using provider adapter
  6. [ ] Update webhook_log (status: 'processing')
  7. [ ] Parse event using provider adapter
  8. [ ] Route to event handler
  9. [ ] Update webhook_log (status: 'completed' or 'failed')
  10. [ ] Return 200 (always, to prevent retries)

#### 4.3 Checkout Completed Handler
- [ ] File: `apps/services/core/src/billing/handlers/checkout-completed.ts`
- [ ] Implementation:
  1. [ ] Find purchase by provider_session_id
  2. [ ] Validate purchase status (must be 'pending')
  3. [ ] Extract metadata from webhook (userId, planId, etc.)
  4. [ ] Check if license exists for user+app
  5. [ ] If exists: Update license (plan, valid_until)
  6. [ ] If not: Create new license
  7. [ ] Create payment_transaction record
  8. [ ] Link transaction to purchase
  9. [ ] Update purchase status to 'completed'
  10. [ ] Invalidate license cache
  11. [ ] Log success

#### 4.4 Subscription Updated Handler
- [ ] File: `apps/services/core/src/billing/handlers/subscription-updated.ts`
- [ ] Handle status changes:
  - [ ] `active` → Extend license valid_until
  - [ ] `past_due` → Mark license 'inactive'
  - [ ] `canceled` → Update cancel_at_period_end
  - [ ] `unpaid` → Mark license 'inactive'

#### 4.5 Refund Handler
- [ ] File: `apps/services/core/src/billing/handlers/refund.ts`
- [ ] Create refund transaction (negative amount)
- [ ] Optionally revoke license (based on refund policy)
- [ ] Alert admin for manual review

#### 4.6 Payment Transaction Queries
- [ ] Add to `apps/packages/db/src/queries.ts`:
  ```typescript
  export const paymentTransactionQueries = {
    create(db, data)
    findByProviderTransactionId(db, provider, txnId)
    findByLicenseId(db, licenseId)
    findByPurchaseId(db, purchaseId)
  }
  ```

---

### Milestone 5: License Status & Validation

**Priority**: HIGH  
**Estimated Effort**: 1 day

#### 5.1 License Status Endpoint
- [ ] File: `apps/services/core/src/routes/v1/billing/license.ts`
- [ ] `GET /v1/billing/license/:appId` - Check user's license
  ```json
  {
    "hasLicense": true,
    "license": {
      "id": "LIC0xyz",
      "status": "active",
      "planName": "Pro Plan",
      "planSlug": "pro",
      "validUntil": "2026-02-11T00:00:00Z", // null = lifetime
      "isValid": true,
      "features": ["api_access", "analytics"],
      "daysRemaining": 31
    }
  }
  ```
- [ ] Cache license data (5 min TTL)
- [ ] Cache key: `license:{appId}:{userId}`

#### 5.2 License Queries Enhancement
- [ ] Update `apps/packages/db/src/queries.ts`:
  ```typescript
  export const licenseQueries = {
    // ... existing methods ...
    findByUserAndApp(db, userId, appId)
    createOrUpdate(db, userId, appId, planId, validUntil)
    checkValidity(db, userId, appId) // Returns boolean
    findWithPlan(db, userId, appId) // JOIN with plans
  }
  ```

#### 5.3 Cache Invalidation
- [ ] Create `apps/services/core/src/billing/cache.ts`
- [ ] `invalidateLicenseCache(userId, appId)` - Delete from Redis
- [ ] Call after license updates (webhooks, admin grants)

---

### Milestone 6: Admin UI Integration

**Priority**: MEDIUM  
**Estimated Effort**: 2-3 days

#### 6.1 Provider Configuration UI
- [ ] File: `apps/dashboard/admin/src/pages/ProjectSettings/PaymentProviders.tsx`
- [ ] Components:
  - [ ] Provider list (table with status badges)
  - [ ] Add provider modal (provider select, credentials form)
  - [ ] Edit provider modal (update credentials, webhook secret)
  - [ ] Delete confirmation dialog
  - [ ] Test connection button

#### 6.2 Plan Price Mapping UI
- [ ] File: `apps/dashboard/admin/src/pages/Plans/PlanPrices.tsx`
- [ ] Components:
  - [ ] Price mapping table per plan
  - [ ] Add price modal (provider, interval, amount, provider price ID)
  - [ ] Edit price modal
  - [ ] Deactivate price button

#### 6.3 Transaction Viewer
- [ ] File: `apps/dashboard/admin/src/pages/Billing/Transactions.tsx`
- [ ] Features:
  - [ ] Transaction list (table with filters)
  - [ ] Filter by: provider, status, type, date range
  - [ ] View transaction details (metadata, webhook logs)
  - [ ] Export to CSV

#### 6.4 Webhook Log Viewer
- [ ] File: `apps/dashboard/admin/src/pages/Billing/WebhookLogs.tsx`
- [ ] Features:
  - [ ] Webhook log table
  - [ ] Filter by: provider, status, event type
  - [ ] View raw payload
  - [ ] Reprocess failed webhook button
  - [ ] Performance metrics (avg duration, failure rate)

---

### Milestone 7: Promotions & Discounts

**Priority**: LOW (Phase 2+)  
**Estimated Effort**: 3-4 days

#### 7.1 Promotion Queries
- [ ] Add to `apps/packages/db/src/queries.ts`:
  ```typescript
  export const promotionQueries = {
    findByCode(db, code, appId)
    validateEligibility(db, code, userId, planId, interval)
    incrementUsage(db, codeId)
    createRedemption(db, codeId, purchaseId, userId, discountCents)
  }
  ```

#### 7.2 Promotion Admin Endpoints
- [ ] File: `apps/services/core/src/routes/v1/admin/promotions.ts`
- [ ] `GET /admin/apps/:appId/promotions` - List promotions
- [ ] `POST /admin/apps/:appId/promotions` - Create promotion
- [ ] `POST /admin/apps/:appId/promotions/:promoId/codes` - Add code
- [ ] `DELETE /admin/apps/:appId/promotions/:promoId` - Delete

#### 7.3 Promotion Validation Endpoint
- [ ] File: `apps/services/core/src/routes/v1/billing/promotions.ts`
- [ ] `POST /v1/billing/validate-promo` - Check if code valid
  ```json
  {
    "code": "LAUNCH50",
    "appId": "APP0xyz",
    "planId": "PLAN0abc",
    "interval": "month"
  }
  ```
- [ ] Response:
  ```json
  {
    "valid": true,
    "discountType": "percent",
    "discountValue": 50,
    "finalAmountCents": 250,
    "discountAmountCents": 250
  }
  ```

#### 7.4 Apply Promotion in Checkout
- [ ] Update checkout flow to:
  - [ ] Validate promotion code
  - [ ] Calculate discounted price
  - [ ] Pass discount to provider checkout
  - [ ] Link promotion to purchase/transaction

---

## 📋 Phase 3 - Polish & Monitoring

### Milestone 8: Webhook Reprocessing

**Priority**: MEDIUM  
**Estimated Effort**: 1-2 days

#### 8.1 Reprocessing Service
- [ ] File: `apps/services/core/src/billing/services/webhook-reprocessor.ts`
- [ ] `reprocessWebhook(webhookLogId)` - Replay stored payload
- [ ] Increment retry_count
- [ ] Update last_retry_at
- [ ] Stop after 5 retries

#### 8.2 Admin Endpoint
- [ ] File: `apps/services/core/src/routes/v1/admin/webhooks.ts`
- [ ] `POST /admin/webhooks/:id/reprocess` - Manual reprocess
- [ ] `GET /admin/webhooks/failed` - List failed webhooks
- [ ] `GET /admin/webhooks/:id` - View webhook details

#### 8.3 Automated Retry
- [ ] Create cron job in workers service
- [ ] Query failed webhooks (retry_count < 3)
- [ ] Retry with exponential backoff
- [ ] Alert admin if all retries exhausted

---

### Milestone 9: Subscription Management

**Priority**: MEDIUM  
**Estimated Effort**: 2-3 days

#### 9.1 Subscription Queries
- [ ] Add to `apps/packages/db/src/queries.ts`:
  ```typescript
  export const subscriptionQueries = {
    findByLicenseId(db, licenseId)
    findByProviderSubscriptionId(db, provider, subId)
    create(db, data)
    updateStatus(db, id, status, billingPeriod?)
    markCanceled(db, id, canceledAt)
  }
  ```

#### 9.2 User Endpoints
- [ ] File: `apps/services/core/src/routes/v1/billing/subscriptions.ts`
- [ ] `GET /v1/billing/subscription/:appId` - Get user's subscription
- [ ] `POST /v1/billing/subscription/:appId/cancel` - Cancel subscription
  - [ ] Call provider API to cancel
  - [ ] Update subscription (cancel_at_period_end = true)
  - [ ] Return confirmation

#### 9.3 Admin Endpoints
- [ ] `GET /admin/subscriptions` - List all subscriptions
- [ ] `GET /admin/subscriptions/:id` - View details
- [ ] `POST /admin/subscriptions/:id/cancel` - Admin cancel

---

### Milestone 10: Monitoring & Analytics

**Priority**: LOW  
**Estimated Effort**: 2-3 days

#### 10.1 Revenue Queries
- [ ] File: `apps/services/core/src/routes/v1/admin/analytics.ts`
- [ ] `GET /admin/analytics/revenue` - Revenue breakdown
  ```json
  {
    "totalRevenue": 125000, // cents
    "byProvider": {
      "stripe": 100000,
      "lemonsqueezy": 25000
    },
    "byPlan": {
      "pro": 75000,
      "premium": 50000
    },
    "mrr": 5000, // Monthly Recurring Revenue
    "arr": 60000 // Annual Recurring Revenue
  }
  ```

#### 10.2 Metrics Dashboard
- [ ] Checkout success rate
- [ ] Webhook processing latency (p95, p99)
- [ ] Webhook failure rate
- [ ] Refund rate
- [ ] Active subscriptions
- [ ] Churn rate

#### 10.3 Alerts
- [ ] Alert if webhook failure rate > 5%
- [ ] Alert if checkout success rate < 95%
- [ ] Alert on chargeback created
- [ ] Alert if webhook processing time > 30s

---

## 🔧 Technical Debt & Improvements

### Queue System
- [ ] Replace stub queue with real implementation
  - [ ] Bull/BullMQ for Redis-based queue
  - [ ] Or use existing `@proofa/queue` package
- [ ] Move webhook processing to background worker
- [ ] Add retry logic with exponential backoff

### Testing
- [ ] Unit tests for adapters
- [ ] Integration tests for checkout flow
- [ ] Webhook replay tests with Stripe CLI
- [ ] End-to-end tests with test providers

### Documentation
- [ ] API documentation for all payment endpoints
- [ ] Provider setup guides (Stripe, LemonSqueezy)
- [ ] Webhook setup instructions
- [ ] Troubleshooting guide

### Security
- [ ] Rotate encryption keys procedure
- [ ] PCI compliance checklist
- [ ] Webhook signature verification audit
- [ ] Rate limiting review

---

## 🚀 Deployment Checklist

### Environment Variables
- [ ] `PAYMENT_CONFIGS_KEY` - 32-byte hex encryption key (production)
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- [ ] Feature flags for Dodo provider

### Database Migrations
- [x] All payment tables migrated
- [ ] Add indexes for performance (if needed)

### Provider Setup
- [ ] Create Stripe account
- [ ] Create LemonSqueezy account
- [ ] Configure webhook URLs in provider dashboards
- [ ] Test with provider test mode

### Monitoring
- [ ] Set up alerts for webhook failures
- [ ] Set up revenue tracking dashboard
- [ ] Configure error logging (Sentry/similar)

---

## 📊 Progress Summary

**Total Tasks**: ~135 (increased with routing infrastructure)  
**Completed**: 15 (11%)  
**In Progress**: 0  
**Remaining**: 120

**Phase Status**:
- ✅ Foundation: 100% (Database, queries, encryption, admin provider management)
- 🚧 Phase 2: 0% (Routing infrastructure, provider adapters, checkout, webhooks)
- ⏳ Phase 3: 0% (Advanced routing, promotions, subscriptions, monitoring)

**Critical Path (Must complete in order)**:
1. ✅ Provider config management (DONE)
2. 🔄 **Milestone 0: Routing infrastructure** (NEXT - CRITICAL)
3. 🔄 Milestone 1: Provider adapters
4. 🔄 Milestone 2: Plan-provider price mapping
5. 🔄 Milestone 3: Checkout flow
6. 🔄 Milestone 4: Webhook processing
7. 🔄 Milestone 5: License validation

**Next Immediate Steps**:
1. **Create routing rules migration** (Milestone 0.1)
2. **Add routing rule schema** (Milestone 0.2)
3. **Implement routing queries** (Milestone 0.3)
4. **Create provider selection service** (Milestone 0.4)
5. **Add routing admin endpoints** (Milestone 0.5)

---
Advanced Routing Features (Phase 3+)

### Context-Based Provider Selection (Already Implemented!)

**Current Architecture (Phase 2)**:
```typescript
// Routing rules are used from day 1
const context = {
  country: user.country,        // 'US', 'GB', 'JP'
  currency: plan.currency,      // 'usd', 'eur', 'jpy'
  amountCents: plan.price,      // 500, 10000
  paymentMethod: 'card',        // Optional
  userSegment: 'enterprise',    // Optional
};

const provider = await selectProvider(appId, context);
```

**Simple Usage (Phase 2)**: Single provider via catch-all rule
```sql
-- One rule with empty conditions = default provider
INSERT INTO payment_routing_rules (app_id, provider_config_id, priority, conditions)
VALUES (1, 123, 100, '{}');
```

**Advanced Usage (Phase 3+)**: Multiple providers with conditions
```sql
-- US users → Stripe
INSERT INTO payment_routing_rules 
VALUES (1, 123, 10, '{"country": {"in": ["US", "CA"]}}');

-- EU users → LemonSqueezy  
INSERT INTO payment_routing_rules
VALUES (1, 124, 20, '{"country": {"in": ["GB", "DE", "FR"]}}');

-- Fallback → Stripe
INSERT INTO payment_routing_rules
VALUES (1, 123, 100, '{}');
```

**Use Cases** (Available from Phase 2):
- ✅ Route US users to Stripe (best rates)
- ✅ Advanced Routing Features (Phase 3+)

Once basic routing is working, add these enhancements:

#### **3.1 Provider Health Monitoring** LemonSqueezy
// Creates checkout session on LemonSqueezy
// Returns LemonSqueezy checkout URL
```

---

### Performance Considerations

**Caching**:
```typescript
// Cache routing rules per app (5 min TTL)
const cacheKey = `routing-rules:${app.id}`;
let rules = await redis.get(cacheKey);

if (!rules) {
  rules = await db.loadRoutingRules(app.id);
  await redis.setex(cacheKey, 300, JSON.stringify(rules));
}
```

**Rule Evaluation Complexity**:
- Simple conditions (eq, in): O(1) per field
- Range conditions (gte, lte): O(1) per field
- Total: O(rules × conditions) - typically < 10ms

**Failover Strategy**:
```typescript
try {
  provider = await selectProvider(app, context);
} caArchitecture**: Routing rules table is primary provider selection mechanism (not apps.selected_payment_provider_id)
- **Simple Setup**: One catch-all rule (empty conditions) = single provider behavior
- **Advanced Setup**: Multiple rules with conditions = context-aware routing
- **Provider Priority**: Stripe → LemonSqueezy → Dodo (feature-flagged)
- **No Breaking Changes Policy**: This is active development - refactor freely
- **Security First**: Always encrypt credentials, verify webhooks, never log secrets
- **Idempotency**: All webhook handlers must be idempotent (safe to retry)
- **Atomic Updates**: Use JSONB atomic operations for license updates
- **Cache Strategy**: Hard delete + lazy re-warm for license cache
- **Error Handling**: Always return 200 to webhooks to prevent retries on application errors
- **Routing Performance**: < 10ms rule evaluation, 5-min cache TTL
## 📝 Notes2.0  
**Created**: January 11, 2026  
**Last Updated**: January 11, 2026 (Architecture Decision: Routing Rules Primary)  
**Author**: Payment Integration Team

---

## 🎯 Quick Start Guide

### For Phase 2 Implementation (Current)

**1. Complete Milestone 0 First** (Routing Infrastructure):
   - Migration + schema + queries + service + admin endpoints
   - **This unlocks all other work**

**2. Then Proceed in Order**:
   - Milestone 1: Provider adapters (Stripe, LemonSqueezy, Dodo stub)
   - Milestone 2: Plan-provider prices
   - Milestone 3: Checkout flow (uses routing service)
   - Milestone 4: Webhook processing
   - Milestone 5: License validation

**3. Simple Testing Path**:
   ```sql
   -- Create one routing rule
   INSERT INTO payment_routing_rules (app_id, provider_config_id, priority, conditions)
   VALUES (1, 123, 100, '{}'); -- Catch-all
   
   -- Now checkout flow works with single provider
   -- Later: Add more rules with conditions for multi-provider
   ```

### For Phase 3 (Future)

**Add Advanced Routing**:
- Country-based rules
- Currency-based rules
- Amount-based rules
- A/B testing (traffic_percentage)
- Provider health monitoring
- Cost optimizationis is active development - refactor freely
- **Security First**: Always encrypt credentials, verify webhooks, never log secrets
- **Idempotency**: All webhook handlers must be idempotent (safe to retry)
- **Atomic Updates**: Use JSONB atomic operations for license updates
- **Cache Strategy**: Hard delete + lazy re-warm for license cache
- **Error Handling**: Always return 200 to webhooks to prevent retries on application errors
- **Future Routing**: Phase 4 will add context-aware provider selection via routing rules table

---

**Document Version**: 1.1  
**Created**: January 11, 2026  
**Last Updated**: January 11, 2026  
**Author**: Payment Integration Team
- [ ] Monitor provider API uptime
- [ ] Automatically disable unhealthy providers
- [ ] Fallback to next-priority rule if provider down
- [ ] Alert admin on provider health issues

#### **3.2 Cost Optimization**
- [ ] Track provider fees per transaction
- [ ] Calculate most cost-effective provider
- [ ] Add `cost_percentage` field to routing rules
- [ ] Auto-route to cheapest viable provider

#### **3.3 ML-Based Routing**
- [ ] Collect conversion rate data per provider
- [ ] Train model to predict best provider for user
- [ ] A/B test ML routing vs rule-based
- [ ] Continuously improve routing decisions

#### **3.4 Real-Time Traffic Shifting**
- [ ] Admin dashboard to adjust traffic_percentage
- [ ] Gradual rollout of new providers (0% → 10% → 50% → 100%)
- [ ] Emergency provider switching
- [ ] Blue-green provider deployment

---

### Performance Considerations

**Caching**:
```typescript
// Cache routing rules per app (5 min TTL)
const cacheKey = `routing-rules:${app.id}`;
let rules = await redis.get(cacheKey);

if (!rules) {
  rules = await routingRuleQueries.findActiveByAppId(db, app.id);
  await redis.setex(cacheKey, 300, JSON.stringify(rules));
}
```

**Rule Evaluation Complexity**:
- Simple conditions (eq, in): O(1) per field
- Range conditions (gte, lte): O(1) per field
- Total: O(rules × conditions) - typically < 10ms

**Error Handling**:
```typescript
try {
  provider = await selectProvider(appId, context);
} catch (error) {
  log.error("Provider selection failed, no matching rule");
  throw new Error("No payment provider configured for this app");
}
```

**Cache Invalidation**:
- Invalidate on rule create/update/delete
- 5-minute TTL ensures eventual consistency
- Manual invalidation via admin API