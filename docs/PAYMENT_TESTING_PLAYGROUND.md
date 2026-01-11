# Payment Testing Playground - Comprehensive Design

**Status**: DESIGN REVIEW  
**Created**: January 11, 2026  
**Author**: Engineering Team  
**Target Release**: Phase 1 - January 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Goals & Success Metrics](#goals--success-metrics)
3. [Architecture Overview](#architecture-overview)
4. [UI/UX Design](#uiux-design)
5. [Backend API Specifications](#backend-api-specifications)
6. [Security & Safety](#security--safety)
7. [Implementation Plan](#implementation-plan)
8. [Testing Strategy](#testing-strategy)
9. [Production Deployment](#production-deployment)
10. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### What
A comprehensive testing playground in the admin dashboard that allows administrators to test the complete payment flow for all 3 payment providers (Stripe, LemonSqueezy, Dodo) without manual setup or app integration.

### Why
- **Time Savings**: Reduce testing time from 15-30 minutes to 10-30 seconds per scenario
- **Support Efficiency**: Reproduce customer issues instantly without accessing their data
- **Confidence**: Validate payment integrations before and after deployments
- **Onboarding**: Help new engineers understand payment flows visually

### How
Two testing modes:
1. **Webhook Simulation**: Instant testing by simulating webhook events (bypasses real payment providers)
2. **Live Testing**: Real checkout flows using provider sandbox credentials

---

## Goals & Success Metrics

### Primary Goals
1. ✅ Test all 3 payment providers (Stripe, LemonSqueezy, Dodo) in under 30 seconds
2. ✅ Simulate all critical payment scenarios (success, failure, cancellation, refund)
3. ✅ Real-time monitoring of webhook events and license state transitions
4. ✅ Zero risk to production data (test mode only, auto-cleanup)

### Success Metrics
- **Time to Test**: < 30 seconds per provider per scenario
- **Support Resolution Time**: Reduce from 1-2 hours to 5-10 minutes
- **Testing Coverage**: 100% of webhook event types testable
- **Adoption**: Used by 100% of admin team within 2 weeks

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                          │
│  /admin/playground/payments                                  │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Provider   │  │   Quick      │  │   Webhook    │      │
│  │   Config     │  │   Setup      │  │   Simulator  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Live Results Dashboard                       │    │
│  │  - Checkout URL                                      │    │
│  │  - Transaction History                               │    │
│  │  - License Status                                    │    │
│  │  - Webhook Event Log (auto-refresh)                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                Core Service API                              │
│  /api/admin/test/*                                           │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Test Data        │  │ Webhook          │                │
│  │ Management       │  │ Simulator        │                │
│  │                  │  │                  │                │
│  │ - Initialize     │  │ - Simulate       │                │
│  │ - Cleanup        │  │ - Verify         │                │
│  │ - Status         │  │ - Monitor        │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Existing Payment Infrastructure              │    │
│  │  - Payment Adapters (Stripe, LS, Dodo)              │    │
│  │  - Webhook Processor                                 │    │
│  │  - License Manager                                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                Database (PostgreSQL)                         │
│                                                               │
│  Test Data (is_test: true, auto-cleanup: 24h)               │
│  - test_users                                                │
│  - test_apps                                                 │
│  - test_transactions                                         │
│  - test_licenses                                             │
│  - test_webhook_events                                       │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### **Frontend (Admin Dashboard)**
- Display test interface with provider selection
- Show real-time updates (polling every 2s)
- Simulate webhook events via buttons
- Display results (transactions, licenses, events)

#### **Backend (Core Service)**
- Create isolated test environments
- Simulate webhook payloads
- Process webhooks through existing infrastructure
- Monitor test session status
- Auto-cleanup test data

#### **Existing Infrastructure**
- Reuse payment adapters (no changes needed)
- Reuse webhook processor (no changes needed)
- Reuse license manager (no changes needed)

---

## UI/UX Design

### Page Structure

**Route**: `/admin/playground/payments`

### Layout (Grid-based)

```
┌──────────────────────────────────────────────────────────────────┐
│  🧪 Payment Testing Playground              [Clear Test Data] ❌ │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ⚠️ TEST MODE ONLY - Using sandbox credentials                   │
│                                                                   │
├─────────────────────────────────┬────────────────────────────────┤
│                                 │                                │
│  🔧 Provider Configuration      │   ⚡ Quick Test Setup          │
│                                 │                                │
│  Provider: [Stripe      ▼]     │   Test App:  [Auto-create ▼]  │
│  Status:   ✓ Connected          │   Test User: [Auto-create ▼]  │
│  API Key:  sk_test_****4242     │   Plan:      [Pro - $29/mo ▼] │
│                                 │                                │
│  Webhook URL:                   │   Mode:                        │
│  https://api.proofa.com/v1/     │   ○ Simulate (instant)         │
│  billing/webhooks/stripe        │   ● Live Checkout              │
│  [📋 Copy]  [🔗 Test]           │                                │
│                                 │   [🚀 Start Test Flow]         │
│                                 │                                │
├─────────────────────────────────┴────────────────────────────────┤
│                                                                   │
│  🎭 Simulate Webhook Events                                      │
│                                                                   │
│  [✓ Successful Payment]  [⚠️ Failed Payment]  [❌ Cancel Sub]   │
│  [💰 Refund]  [🔄 Update Sub]  [📊 All Scenarios]               │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 Live Results                                                 │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 💳 Checkout Session                                        │ │
│  │ URL: https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4   │ │
│  │ [📋 Copy] [📱 QR Code] [🔗 Open]                           │ │
│  │                                                             │ │
│  │ Status: ⏳ Awaiting payment... (auto-refresh every 2s)     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📜 Recent Activity                                         │ │
│  │                                                             │ │
│  │ ✓ 2s ago   | payment.succeeded      | $29.00              │ │
│  │ ⚠️ 1m ago  | payment.failed         | $29.00              │ │
│  │ ❌ 5m ago  | subscription.canceled  | —                   │ │
│  │ 💰 10m ago | charge.refunded        | $29.00              │ │
│  │                                                             │ │
│  │ [View Full Log]                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌──────────────────────────┬─────────────────────────────────┐ │
│  │ 💳 Latest Transaction    │  📜 License Status              │ │
│  │                          │                                 │ │
│  │ ID: TXN0abc123           │  Status: ✓ Active               │ │
│  │ Amount: $29.00           │  Plan: Pro Plan                 │ │
│  │ Status: ✓ succeeded      │  Expires: Jan 11, 2027          │ │
│  │ Time: 2 seconds ago      │  Grace Period: N/A              │ │
│  │                          │                                 │ │
│  │ [View Details]           │  [View History]                 │ │
│  └──────────────────────────┴─────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Key UI Components

#### **1. Provider Selector**
```typescript
<Select>
  <Option value="stripe">Stripe</Option>
  <Option value="lemonsqueezy">LemonSqueezy</Option>
  <Option value="dodo">Dodo Payments</Option>
</Select>
```

#### **2. Test Mode Banner**
```typescript
<Alert variant="warning" className="bg-orange-50 border-orange-200">
  ⚠️ TEST MODE ONLY - Using sandbox credentials. No real charges.
</Alert>
```

#### **3. Webhook Simulator Buttons**
```typescript
<ButtonGroup>
  <Button onClick={() => simulateWebhook('payment.succeeded')}>
    ✓ Successful Payment
  </Button>
  <Button onClick={() => simulateWebhook('payment.failed')}>
    ⚠️ Failed Payment
  </Button>
  <Button onClick={() => simulateWebhook('subscription.canceled')}>
    ❌ Cancel Subscription
  </Button>
  // ... more buttons
</ButtonGroup>
```

#### **4. Real-Time Activity Feed**
```typescript
<div className="space-y-2">
  {webhookEvents.map(event => (
    <div key={event.id} className="flex items-center gap-3">
      <StatusIcon status={event.status} />
      <span className="text-sm text-gray-500">{formatTimeAgo(event.timestamp)}</span>
      <span className="font-medium">{event.type}</span>
      <span className="text-gray-600">${event.amount}</span>
    </div>
  ))}
</div>
```

#### **5. Auto-Refresh Status**
```typescript
// Poll every 2 seconds for updates
useEffect(() => {
  const interval = setInterval(() => {
    fetchTestStatus(sessionId);
  }, 2000);
  return () => clearInterval(interval);
}, [sessionId]);
```

---

## Backend API Specifications

### API Route Structure

```
/api/admin/test/
  ├── POST   /initialize          - Create test environment
  ├── POST   /simulate-webhook    - Simulate webhook event
  ├── GET    /status/:sessionId   - Get test session status
  ├── DELETE /cleanup              - Manual cleanup
  └── GET    /providers            - Get provider test credentials
```

---

### API Endpoint Details

#### **1. Initialize Test Environment**

```typescript
POST /api/admin/test/initialize

Headers:
  Authorization: Bearer <admin_token>
  X-Admin-Id: <admin_public_id>

Body:
{
  provider: "stripe" | "lemonsqueezy" | "dodo",
  planId?: string,           // Optional: use specific plan
  mode: "simulate" | "live"  // Simulate = instant, Live = real checkout
}

Response: 200 OK
{
  sessionId: "TEST_SESSION_abc123",
  testData: {
    app: {
      id: "APP0test123",
      name: "Test App - Stripe",
      publicId: "APP0test123"
    },
    user: {
      id: "USER0test456",
      email: "test+stripe@proofa.internal",
      publicId: "USER0test456"
    },
    plan: {
      id: "plan_pro",
      name: "Pro Plan",
      amount: 2900, // cents
      interval: "month"
    }
  },
  checkoutUrl?: "https://checkout.stripe.com/...", // Only if mode=live
  expiresAt: "2026-01-12T00:00:00Z" // 24 hours
}

Errors:
- 401: Unauthorized (not admin)
- 400: Invalid provider or plan
- 429: Rate limit exceeded (10/hour)
```

---

#### **2. Simulate Webhook Event**

```typescript
POST /api/admin/test/simulate-webhook

Headers:
  Authorization: Bearer <admin_token>
  X-Admin-Id: <admin_public_id>

Body:
{
  sessionId: "TEST_SESSION_abc123",
  eventType: "payment.succeeded" | "payment.failed" | 
             "subscription.canceled" | "charge.refunded" |
             "subscription.updated",
  metadata?: {
    amount?: number,           // Override amount
    newPlanId?: string,        // For subscription updates
    failureReason?: string     // For failed payments
  }
}

Response: 200 OK
{
  success: true,
  webhookEvent: {
    id: "evt_test_123",
    type: "payment.succeeded",
    processed: true,
    timestamp: "2026-01-11T12:00:00Z"
  },
  result: {
    transaction: {
      id: "TXN0test789",
      amount: 2900,
      status: "succeeded",
      publicId: "TXN0test789"
    },
    license: {
      id: "LIC0test101",
      status: "active",
      validUntil: "2027-01-11T12:00:00Z",
      publicId: "LIC0test101"
    }
  }
}

Errors:
- 401: Unauthorized
- 404: Session not found
- 400: Invalid event type
- 429: Rate limit exceeded
```

---

#### **3. Get Test Session Status**

```typescript
GET /api/admin/test/status/:sessionId

Headers:
  Authorization: Bearer <admin_token>

Response: 200 OK
{
  sessionId: "TEST_SESSION_abc123",
  status: "active" | "completed" | "expired",
  provider: "stripe",
  checkoutUrl: "https://checkout.stripe.com/...",
  testData: {
    app: { ... },
    user: { ... },
    plan: { ... }
  },
  transactions: [
    {
      id: "TXN0test789",
      amount: 2900,
      status: "succeeded",
      createdAt: "2026-01-11T12:00:00Z"
    }
  ],
  license: {
    id: "LIC0test101",
    status: "active",
    validUntil: "2027-01-11T12:00:00Z",
    history: [
      {
        status: "active",
        reason: "payment_succeeded",
        timestamp: "2026-01-11T12:00:00Z"
      }
    ]
  },
  webhookEvents: [
    {
      id: "evt_test_123",
      type: "payment.succeeded",
      processed: true,
      timestamp: "2026-01-11T12:00:00Z"
    }
  ],
  expiresAt: "2026-01-12T12:00:00Z"
}

Errors:
- 401: Unauthorized
- 404: Session not found
```

---

#### **4. Cleanup Test Data**

```typescript
DELETE /api/admin/test/cleanup

Headers:
  Authorization: Bearer <admin_token>

Query Params:
  ?sessionId=TEST_SESSION_abc123  // Optional: specific session
  ?all=true                        // Optional: cleanup all test data

Response: 200 OK
{
  success: true,
  deleted: {
    sessions: 1,
    apps: 1,
    users: 1,
    transactions: 3,
    licenses: 1,
    webhookEvents: 5
  }
}

Errors:
- 401: Unauthorized
- 404: Session not found
```

---

#### **5. Get Provider Test Credentials**

```typescript
GET /api/admin/test/providers

Headers:
  Authorization: Bearer <admin_token>

Response: 200 OK
{
  providers: [
    {
      name: "stripe",
      status: "available",
      testMode: true,
      webhookUrl: "https://api.proofa.com/v1/billing/webhooks/stripe",
      credentials: {
        publicKey: "pk_test_51****",
        hasSecretKey: true  // Don't expose secret key
      }
    },
    {
      name: "lemonsqueezy",
      status: "available",
      testMode: true,
      webhookUrl: "https://api.proofa.com/v1/billing/webhooks/lemonsqueezy",
      credentials: {
        storeId: "12345",
        hasApiKey: true
      }
    },
    {
      name: "dodo",
      status: "available",
      testMode: true,
      webhookUrl: "https://api.proofa.com/v1/billing/webhooks/dodo",
      credentials: {
        hasApiKey: true
      }
    }
  ]
}
```

---

## Security & Safety

### Production Safety Measures

#### **1. Test Mode Enforcement**

```typescript
// Backend validation (apps/services/core/src/routes/v1/admin/test.ts)
async function validateTestModeCredentials(provider: string) {
  const credentials = await getPaymentProviderCredentials(provider);
  
  // CRITICAL: Only allow test/sandbox credentials
  if (provider === "stripe" && !credentials.apiKey.startsWith("sk_test_")) {
    throw new Error("Production Stripe credentials not allowed in test playground");
  }
  
  if (provider === "lemonsqueezy" && !credentials.testMode) {
    throw new Error("Production LemonSqueezy credentials not allowed in test playground");
  }
  
  if (provider === "dodo" && !credentials.testMode) {
    throw new Error("Production Dodo credentials not allowed in test playground");
  }
  
  return credentials;
}
```

---

#### **2. Admin-Only Access**

```typescript
// Route protection
app.use("/api/admin/test/*", requireAdmin());

// Frontend route guard
<Route 
  path="/admin/playground/payments" 
  element={
    <RequireAdmin>
      <PaymentTestingPlayground />
    </RequireAdmin>
  } 
/>
```

---

#### **3. Data Isolation**

```typescript
// Database schema additions
ALTER TABLE users ADD COLUMN is_test BOOLEAN DEFAULT FALSE;
ALTER TABLE apps ADD COLUMN is_test BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN is_test BOOLEAN DEFAULT FALSE;
ALTER TABLE licenses ADD COLUMN is_test BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_test_data_cleanup ON users (is_test, created_at)
  WHERE is_test = TRUE;

// All test data creation
await db.insert(users).values({
  email: `test+${provider}@proofa.internal`,
  is_test: true,
  public_id: generatePublicId("USER"),
  // ... other fields
});
```

---

#### **4. Auto-Cleanup Job**

```typescript
// apps/services/workers/src/jobs/cleanup-test-data.ts
import { createLogger } from "@proofa/shared";
import { getDb } from "@proofa/db";
import { users, apps, transactions, licenses } from "@proofa/db/schema";
import { eq, and, lt } from "drizzle-orm";

const log = createLogger("cleanup-test-data");

export async function cleanupTestData() {
  const db = getDb();
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  try {
    // Delete test licenses
    const deletedLicenses = await db.delete(licenses)
      .where(and(
        eq(licenses.is_test, true),
        lt(licenses.created_at, cutoffTime)
      ))
      .returning({ id: licenses.id });

    // Delete test transactions
    const deletedTransactions = await db.delete(transactions)
      .where(and(
        eq(transactions.is_test, true),
        lt(transactions.created_at, cutoffTime)
      ))
      .returning({ id: transactions.id });

    // Delete test apps
    const deletedApps = await db.delete(apps)
      .where(and(
        eq(apps.is_test, true),
        lt(apps.created_at, cutoffTime)
      ))
      .returning({ id: apps.id });

    // Delete test users
    const deletedUsers = await db.delete(users)
      .where(and(
        eq(users.is_test, true),
        lt(users.created_at, cutoffTime)
      ))
      .returning({ id: users.id });

    log.info({
      licenses: deletedLicenses.length,
      transactions: deletedTransactions.length,
      apps: deletedApps.length,
      users: deletedUsers.length,
    }, "Cleaned up test data older than 24 hours");

  } catch (error) {
    log.error({ err: error }, "Failed to cleanup test data");
    throw error;
  }
}

// Schedule to run hourly
// In workers/src/index.ts
schedule("0 * * * *", cleanupTestData); // Every hour at :00
```

---

#### **5. Audit Logging**

```typescript
// Log every test session creation
await db.insert(admin_audit_logs).values({
  admin_id: adminId,
  action: "test_session_created",
  resource_type: "payment_test",
  resource_id: sessionId,
  metadata: {
    provider,
    mode,
    planId,
  },
  ip_address: c.req.header("x-forwarded-for"),
  user_agent: c.req.header("user-agent"),
});
```

---

#### **6. Rate Limiting**

```typescript
// apps/services/core/src/middleware/rate-limit.ts
import { rateLimiter } from "@proofa/cache";

export async function testPlaygroundRateLimit(c: Context, next: Next) {
  const adminId = c.get("adminId");
  const key = `test_playground:${adminId}`;
  
  const limit = await rateLimiter.check(key, {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  });

  if (!limit.allowed) {
    return c.json({
      error: "Rate limit exceeded",
      retryAfter: limit.retryAfter,
    }, 429);
  }

  await next();
}

// Apply to routes
app.use("/api/admin/test/initialize", testPlaygroundRateLimit);
app.use("/api/admin/test/simulate-webhook", testPlaygroundRateLimit);
```

---

#### **7. Visual Warnings**

```typescript
// Persistent banner in UI
<div className="sticky top-0 z-50 bg-orange-500 text-white px-4 py-2 text-center font-semibold">
  🧪 TEST MODE ONLY - No Real Charges - Sandbox Credentials
</div>

// Orange theme throughout
<div className="bg-orange-50 border-orange-200">
  {/* Test playground content */}
</div>
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Days 1-2)

#### **Day 1: Backend Foundation**
- [ ] Create test session management
  - Database: `test_sessions` table
  - API: `POST /initialize`, `GET /status/:id`
  - Logic: Create test app, user, plan association
- [ ] Add `is_test` column to relevant tables
- [ ] Implement webhook simulator
  - API: `POST /simulate-webhook`
  - Logic: Generate mock webhook payload, process through existing handlers
- [ ] Add rate limiting middleware

#### **Day 2: Frontend Skeleton**
- [ ] Create `/admin/playground/payments` route
- [ ] Build provider selector UI
- [ ] Build quick setup form
- [ ] Build results dashboard (static layout)
- [ ] Add test mode banner

---

### Phase 2: Webhook Simulation (Days 3-4)

#### **Day 3: Simulate Events**
- [ ] Implement simulator buttons UI
- [ ] Create mock webhook payloads for each provider:
  - Stripe: `payment_intent.succeeded`, `customer.subscription.deleted`, etc.
  - LemonSqueezy: `order_created`, `subscription_cancelled`, etc.
  - Dodo: `payment.succeeded`, `subscription.canceled`, etc.
- [ ] Connect buttons to API
- [ ] Display immediate results

#### **Day 4: Real-Time Monitoring**
- [ ] Implement status polling (every 2s)
- [ ] Build webhook event log component
- [ ] Build transaction history component
- [ ] Build license status card
- [ ] Add auto-refresh indicators

---

### Phase 3: Live Testing (Days 5-6)

#### **Day 5: Checkout Integration**
- [ ] Implement live checkout URL generation
- [ ] Display checkout URL with copy/QR code
- [ ] Poll for payment completion
- [ ] Handle webhook reception from real providers

#### **Day 6: Multi-Provider Support**
- [ ] Test with Stripe sandbox
- [ ] Test with LemonSqueezy test mode
- [ ] Test with Dodo sandbox
- [ ] Fix provider-specific issues

---

### Phase 4: Polish & Safety (Days 7-8)

#### **Day 7: Security & Cleanup**
- [ ] Implement auto-cleanup job
- [ ] Add manual cleanup button
- [ ] Implement audit logging
- [ ] Add test mode validation
- [ ] Test rate limiting

#### **Day 8: UX Polish**
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success/failure toast notifications
- [ ] Add "Run All Scenarios" button
- [ ] Add keyboard shortcuts
- [ ] Write user documentation

---

## Testing Strategy

### Unit Tests

```typescript
// Test webhook simulator
describe("Webhook Simulator", () => {
  it("should generate valid Stripe webhook payload", async () => {
    const payload = generateMockWebhook("stripe", "payment.succeeded", {
      amount: 2900,
      userId: "USER0test123",
      appId: "APP0test456",
    });
    
    expect(payload).toHaveProperty("type", "payment_intent.succeeded");
    expect(payload.data.object.amount).toBe(2900);
  });

  it("should process simulated webhook through existing handlers", async () => {
    const result = await simulateWebhook({
      provider: "stripe",
      eventType: "payment.succeeded",
      sessionId: "TEST_SESSION_abc",
    });
    
    expect(result.transaction.status).toBe("succeeded");
    expect(result.license.status).toBe("active");
  });
});
```

---

### Integration Tests

```typescript
// Test complete flow
describe("Payment Testing Playground", () => {
  it("should complete full test flow", async () => {
    // 1. Initialize
    const session = await initializeTestSession({
      provider: "stripe",
      mode: "simulate",
    });
    
    // 2. Simulate success
    const result = await simulateWebhook({
      sessionId: session.sessionId,
      eventType: "payment.succeeded",
    });
    
    // 3. Verify license created
    expect(result.license.status).toBe("active");
    
    // 4. Simulate cancellation
    const cancelResult = await simulateWebhook({
      sessionId: session.sessionId,
      eventType: "subscription.canceled",
    });
    
    // 5. Verify license canceled
    expect(cancelResult.license.status).toBe("canceled");
  });
});
```

---

### Manual Testing Checklist

- [ ] **Stripe**
  - [ ] Simulate successful payment → license active
  - [ ] Simulate failed payment → license suspended
  - [ ] Simulate cancellation → license canceled
  - [ ] Simulate refund → license refunded
  - [ ] Live checkout with test card (4242 4242 4242 4242)

- [ ] **LemonSqueezy**
  - [ ] Simulate order_created → license active
  - [ ] Simulate subscription_cancelled → license canceled
  - [ ] Simulate payment_failed → license suspended
  - [ ] Live checkout in test mode

- [ ] **Dodo**
  - [ ] Simulate payment.succeeded → license active
  - [ ] Simulate subscription.canceled → license canceled
  - [ ] Simulate payment.failed → license suspended
  - [ ] Live checkout in sandbox

- [ ] **Safety**
  - [ ] Production credentials rejected
  - [ ] Rate limiting enforced (10/hour)
  - [ ] Auto-cleanup runs after 24h
  - [ ] Manual cleanup works
  - [ ] Audit logs created

- [ ] **UX**
  - [ ] Auto-refresh works (2s interval)
  - [ ] Toast notifications shown
  - [ ] Loading states displayed
  - [ ] Error messages clear
  - [ ] Mobile responsive

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All tests passing (unit + integration)
- [ ] Test mode validation verified
- [ ] Rate limiting tested
- [ ] Auto-cleanup job scheduled
- [ ] Audit logging verified
- [ ] Admin-only access enforced
- [ ] Documentation complete
- [ ] Team training completed

---

### Deployment Steps

1. **Database Migration**
   ```sql
   -- Add is_test column
   ALTER TABLE users ADD COLUMN is_test BOOLEAN DEFAULT FALSE;
   ALTER TABLE apps ADD COLUMN is_test BOOLEAN DEFAULT FALSE;
   ALTER TABLE transactions ADD COLUMN is_test BOOLEAN DEFAULT FALSE;
   ALTER TABLE licenses ADD COLUMN is_test BOOLEAN DEFAULT FALSE;
   
   -- Create test_sessions table
   CREATE TABLE test_sessions (
     id SERIAL PRIMARY KEY,
     public_id VARCHAR(255) UNIQUE NOT NULL,
     admin_id INTEGER REFERENCES users(id),
     provider VARCHAR(50) NOT NULL,
     mode VARCHAR(20) NOT NULL,
     status VARCHAR(20) DEFAULT 'active',
     test_app_id INTEGER REFERENCES apps(id),
     test_user_id INTEGER REFERENCES users(id),
     plan_id VARCHAR(255),
     checkout_url TEXT,
     expires_at TIMESTAMP NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   
   -- Create indexes
   CREATE INDEX idx_test_sessions_admin ON test_sessions(admin_id);
   CREATE INDEX idx_test_sessions_expires ON test_sessions(expires_at);
   CREATE INDEX idx_test_data_cleanup ON users (is_test, created_at) WHERE is_test = TRUE;
   ```

2. **Deploy Backend**
   - Deploy core service with new routes
   - Verify `/api/admin/test/*` endpoints accessible

3. **Deploy Frontend**
   - Deploy admin dashboard with new page
   - Verify `/admin/playground/payments` accessible

4. **Schedule Cleanup Job**
   - Deploy workers service with cleanup job
   - Verify cron schedule: `0 * * * *` (hourly)

5. **Verify**
   - Test with admin account
   - Run through all scenarios
   - Check auto-cleanup after 24h

---

### Rollback Plan

If issues arise:
1. Remove route from admin dashboard (hide page)
2. Disable API endpoints via feature flag
3. Stop cleanup job
4. Manual cleanup of test data if needed

---

## Future Enhancements

### Phase 2 Features (Post-Launch)

1. **Scenario Presets**
   ```typescript
   // "Run All Scenarios" button
   async function runAllScenarios() {
     await simulateWebhook("payment.succeeded");
     await delay(2000);
     await simulateWebhook("payment.failed");
     await delay(2000);
     await simulateWebhook("subscription.canceled");
     await delay(2000);
     await simulateWebhook("charge.refunded");
   }
   ```

2. **QR Code Generation**
   - Generate QR code for checkout URL
   - Easy mobile testing

3. **Export Test Report**
   - Download results as PDF
   - Include screenshots, logs, timeline

4. **Webhook Replay**
   - Save webhook history
   - Replay previous events for debugging

5. **Error Injection**
   - Force specific errors (network timeout, invalid signature)
   - Test error handling

6. **WebSocket Integration**
   - Real-time updates instead of polling
   - Instant webhook event notifications

7. **Side-by-Side Comparison**
   - Test all 3 providers simultaneously
   - Compare checkout flows, webhook speeds

8. **Custom Scenarios**
   - Create and save custom test sequences
   - Share scenarios with team

9. **Performance Metrics**
   - Track webhook latency
   - Chart processing times

---

## Appendix

### Mock Webhook Payloads

#### **Stripe - Payment Succeeded**
```json
{
  "id": "evt_test_mock_123",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_test_mock_123",
      "amount": 2900,
      "currency": "usd",
      "status": "succeeded",
      "metadata": {
        "userId": "USER0test123",
        "appId": "APP0test456",
        "planId": "plan_pro"
      }
    }
  }
}
```

#### **LemonSqueezy - Order Created**
```json
{
  "meta": {
    "event_name": "order_created",
    "webhook_id": "mock_123"
  },
  "data": {
    "id": "order_mock_123",
    "type": "orders",
    "attributes": {
      "total": 2900,
      "status": "paid",
      "user_email": "test@proofa.internal"
    }
  }
}
```

#### **Dodo - Payment Succeeded**
```json
{
  "id": "evt_mock_123",
  "type": "payment.succeeded",
  "data": {
    "payment_id": "pay_mock_123",
    "amount": 2900,
    "status": "succeeded",
    "metadata": {
      "user_id": "USER0test123",
      "app_id": "APP0test456"
    }
  }
}
```

---

## Questions for Review

1. **Architecture**: Is the two-mode approach (simulate + live) acceptable? Should we focus on one mode first?

2. **Security**: Are the proposed safety measures sufficient for production? Any additional concerns?

3. **Auto-Cleanup**: Is 24 hours the right expiry time? Should we offer configuration?

4. **Rate Limiting**: Is 10 tests/hour per admin appropriate? Too restrictive?

5. **UI Location**: Should this be under `/admin/playground/payments` or `/admin/tools/payments`?

6. **Multi-Provider**: Should we support testing all 3 providers simultaneously or one at a time?

7. **Real-Time**: Is polling every 2 seconds acceptable or should we prioritize WebSocket?

8. **Scope**: Should Phase 1 include both simulate + live modes, or start with simulate only?

---

## Approval & Sign-Off

**Pending Review From**:
- [ ] Product Lead
- [ ] Engineering Lead
- [ ] Security Team
- [ ] DevOps Team

**Approval Date**: _________________

**Notes**: _________________________

---

**Document Version**: 1.0  
**Last Updated**: January 11, 2026  
**Status**: AWAITING REVIEW
