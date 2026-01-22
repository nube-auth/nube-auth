# Payment System Guide

Complete guide for payment integration and subscription management in Proofa.

---

## Overview

The Proofa payment system handles subscription management and one-time payments across multiple payment providers using a routing-first architecture.

### Supported Providers

- **Stripe** - ✅ Fully implemented
- **LemonSqueezy** - ⏳ Planned
- **Dodo** - ⏳ Planned

### Core Architecture Principles

1. **Provider-Agnostic**: Licenses independent of payment provider
2. **Routing-First**: Context-aware provider selection
3. **Multi-Provider**: Apps can use different providers
4. **Webhook-Driven**: Automatic license updates on payment events
5. **Single Source of Truth**: Proofa controls access, providers control payment state

---

## Architecture

### Component Flow

```
User/Admin Dashboard
    ↓
Gateway API
    ↓
Routing Service (selects provider)
    ↓
Provider Adapter (Stripe/LemonSqueezy/Dodo)
    ↓
External Payment Provider
    ↓
Webhook Handler
    ↓
Database (purchases, transactions, licenses)
```

---

## Provider Routing System

### How Provider Selection Works

1. **Routing Rules** evaluate in priority order (lower = higher precedence)
2. **Conditions** filter based on context (country, currency, amount, etc.)
3. **Traffic Percentage** enables A/B testing (0-100%)
4. **Catch-all Rule** ensures a provider is always selected

### Example: Geographic Routing

```json
[
  {
    "name": "US/Canada - Stripe",
    "priority": 10,
    "conditions": {
      "country": { "in": ["US", "CA"] }
    },
    "provider_config_id": 123
  },
  {
    "name": "Europe - LemonSqueezy",
    "priority": 20,
    "conditions": {
      "country": { "in": ["GB", "DE", "FR"] }
    },
    "provider_config_id": 456
  },
  {
    "name": "Default - Stripe",
    "priority": 100,
    "conditions": {},
    "provider_config_id": 123
  }
]
```

### Routing Context

```typescript
{
  country?: string;      // User's country (US, GB, etc.)
  currency?: string;     // Plan currency (usd, eur, etc.)
  amountCents?: number;  // Transaction amount
  paymentMethod?: string; // card, bank_transfer, etc.
  userSegment?: string;  // free, pro, enterprise, etc.
  userId?: string;       // For consistent A/B testing
  planSlug?: string;     // Plan identifier
}
```

---

## Stripe Integration (Implemented)

### Creating Checkout Sessions

```typescript
POST /v1/billing/checkout

{
  "appId": "APP0abc123",
  "productId": "price_1234567890",
  "customerEmail": "test@example.com",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel",
  "mode": "subscription",
  "trialPeriodDays": 14,
  "metadata": {
    "appId": "APP0abc123",
    "userId": "USER0xyz789"
  }
}

Response:
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_...",
  "provider": "stripe"
}
```

### Webhook Processing

**Supported Events:**
- `checkout.session.completed` - Initial purchase
- `invoice.payment_succeeded` - Subscription renewals

**Flow:**
1. Webhook received at `/v1/billing/webhooks/stripe`
2. Signature verification
3. Job enqueued to `billing` queue
4. Worker processes webhook
5. Payment details extracted
6. Database records created:
   - Purchase (PUR0...)
   - Transaction (TXN0...)
   - Subscription (SUB0...)
   - License (LIC0...)

### Testing with Stripe CLI

```bash
# Forward webhooks to local
stripe listen --forward-to localhost:3003/v1/billing/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

---

## Database Schema

### Key Tables

#### payment_providers
- Stores provider configurations
- Encrypted credentials (AES-256-GCM)
- Per-app provider settings

#### payment_routing_rules
- Priority-based routing rules
- Condition matching
- Traffic percentage for A/B testing

#### purchases
- Records all purchases
- Links to app, user, provider
- Stores transaction ID and metadata

#### transactions
- Payment transaction details
- Links to purchase
- Immutable audit log

#### subscriptions
- Subscription status tracking
- Billing period dates
- Provider subscription ID

#### licenses
- User access credentials
- License key generation
- Validity period tracking

---

## Provider Adapters

### Adapter Interface

All providers must implement:

```typescript
interface PaymentProviderAdapter {
  // Create checkout session
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession>;
  
  // Verify webhook signature
  verifyWebhook(signature: string, rawBody: string): Promise<WebhookEvent | null>;
  
  // Extract payment details
  extractPaymentDetails(event: WebhookEvent): Promise<PaymentDetails>;
  
  // Cancel subscription
  cancelSubscription(subscriptionId: string, immediate: boolean): Promise<void>;
  
  // Get subscription details
  getSubscription(subscriptionId: string): Promise<SubscriptionDetails>;
}
```

### Stripe Adapter (Complete)

Location: `apps/services/core/src/billing/adapters/stripe.ts`

Features:
- ✅ Checkout session creation (subscription + one-time)
- ✅ Webhook signature verification
- ✅ Payment detail extraction
- ✅ Subscription management
- ✅ Trial period support
- ✅ Promotional codes

---

## Security & Credentials

### Credential Encryption

- Stored encrypted at rest (AES-256-GCM)
- Decrypted just-in-time for use
- Never logged or exposed in errors
- Uses `PAYMENT_CONFIGS_KEY` from environment

### Webhook Verification

- Signature verification using provider SDK
- Raw body preserved for verification
- Invalid signatures rejected
- IP address logging for fraud detection

---

## API Endpoints

### Admin API

#### Provider Configuration
```
POST   /v1/admin/providers/:projectId/configs
GET    /v1/admin/providers/:projectId/configs
PUT    /v1/admin/providers/:projectId/configs/:configId
DELETE /v1/admin/providers/:projectId/configs/:configId
```

#### Routing Rules
```
GET    /v1/admin/routing-rules/:appId
POST   /v1/admin/routing-rules/:appId
PUT    /v1/admin/routing-rules/:appId/:ruleId
DELETE /v1/admin/routing-rules/:appId/:ruleId
POST   /v1/admin/routing-rules/:appId/test
```

### Billing API

```
POST   /v1/billing/checkout
POST   /v1/billing/webhooks/:provider
```

---

## Development Workflow

### 1. Configure Provider

```bash
curl -X POST http://localhost:3003/v1/admin/providers/:projectId/configs \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "stripe",
    "environment": "test",
    "credentials": {
      "api_key": "sk_test_...",
      "webhook_secret": "whsec_..."
    }
  }'
```

### 2. Create Routing Rule

```bash
curl -X POST http://localhost:3003/v1/admin/routing-rules/:appId \
  -H "Content-Type: application/json" \
  -d '{
    "provider_config_id": 123,
    "priority": 100,
    "conditions": {},
    "name": "Default Provider"
  }'
```

### 3. Test Checkout

```bash
curl -X POST http://localhost:3003/v1/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "APP0abc123",
    "productId": "price_1234567890",
    "customerEmail": "test@example.com",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "mode": "subscription"
  }'
```

---

## License Generation

### License Key Format

- Format: `XXXX-XXXX-XXXX-XXXX`
- Character set: A-Z (excluding I, O), 2-9
- Example: `H7K3-P2M9-W4XZ-Q6RT`

### License Validity

- **Subscriptions**: Valid for 1 year, auto-renewed on payment
- **One-time**: Valid for 30 days from purchase
- **Status**: Activated immediately upon successful payment

---

## Monitoring & Alerts

### Key Metrics

- Checkout session creation rate
- Webhook processing time
- Queue job completion rate
- Failed webhook attempts
- License generation rate

### Alert Triggers

- Webhook signature verification failures
- Queue job failures (> 3 attempts)
- Credential decryption errors
- Database insert failures

---

## Future Enhancements

### Planned Features (Not Yet Implemented)

- ❌ LemonSqueezy integration
- ❌ Dodo integration
- ❌ Payment failure handling
- ❌ Refund support
- ❌ Multi-currency support
- ❌ Tax calculation
- ❌ Usage-based billing
- ❌ Invoice generation
- ❌ Email notifications

---

## Related Documentation

- [Payment System Design (Full)](./PAYMENT_SYSTEM_DESIGN.md) - Complete technical specification
- [Admin API Reference](./ADMIN_API_QUICK_REFERENCE.md) - API endpoints
- [Plan & License Testing](./PLAN_LICENSE_TESTING_GUIDE.md) - Testing guide

---

**Last Updated**: January 22, 2026  
**Status**: Stripe Integration Complete
