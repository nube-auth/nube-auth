---
title: Plans & Tiers
description: Configure pricing plans and tiers
---

Define plans in your Proofa dashboard or via the API.

## Creating Plans

### Via Dashboard

1. Go to **Settings → Licensing → Plans**
2. Click **Create Plan**
3. Configure name, price, entitlements, and limits

### Via API

```typescript
await proofa.admin.createPlan({
  id: 'pro',
  name: 'Pro',
  description: 'For growing teams',
  price: 29,
  interval: 'month',
  entitlements: [
    'advanced_analytics',
    'export',
    'api_access',
    'priority_support'
  ],
  limits: {
    api_calls: 10000,
    storage_gb: 50,
    team_members: 10
  }
});
```

## Example Plans

```typescript
const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    entitlements: ['basic_features'],
    limits: { api_calls: 100, storage_gb: 1 }
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    interval: 'month',
    entitlements: ['basic_features', 'advanced_analytics', 'export'],
    limits: { api_calls: 10000, storage_gb: 50 }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null, // Custom pricing
    entitlements: ['*'], // All features
    limits: { api_calls: -1, storage_gb: -1 } // Unlimited
  }
];
```

## Plan Structure

```typescript
interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number | null;  // null for custom pricing
  interval?: 'month' | 'year';
  entitlements: string[];
  limits: Record<string, number>;  // -1 for unlimited
  metadata?: Record<string, any>;
}
```

## Upgrading/Downgrading

```typescript
// Upgrade user to Pro
await proofa.admin.updateLicense({
  userId: 'user-id',
  plan: 'pro'
});

// With proration
await proofa.admin.updateLicense({
  userId: 'user-id',
  plan: 'enterprise',
  prorate: true
});
```

## Stripe Integration

Connect Proofa to Stripe for payments:

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Map Proofa plans to Stripe prices:

```typescript
await proofa.admin.updatePlan({
  id: 'pro',
  stripeProductId: 'prod_xxx',
  stripePriceId: 'price_xxx'
});
```

## Custom Entitlements

Add custom entitlements per user:

```typescript
// Add entitlement not in their plan
await proofa.admin.addEntitlement({
  userId: 'user-id',
  entitlement: 'beta_feature',
  reason: 'Beta tester program'
});

// Remove custom entitlement
await proofa.admin.removeEntitlement({
  userId: 'user-id',
  entitlement: 'beta_feature'
});
```

## Custom Limits

Override plan limits for specific users:

```typescript
await proofa.admin.setLimit({
  userId: 'user-id',
  limit: 'api_calls',
  value: 50000,  // Override plan's 10000
  reason: 'High-value customer'
});
```
