---
title: Licensing Overview
description: Implement flexible licensing for your SaaS
---

Nube Auth's licensing system lets you implement any business model.

## Concepts

| Concept | Description |
|---------|-------------|
| **Plan** | A pricing tier (Free, Pro, Enterprise) |
| **License** | A user's subscription to a plan |
| **Entitlement** | A feature or capability |
| **Limit** | Usage quotas (API calls, storage, etc.) |

## Basic Usage

```typescript
// Check if user has a feature
const canExport = await nube-auth.hasEntitlement('export');

if (canExport) {
  // Show export button
}

// Get user's current plan
const license = await nube-auth.getLicense();
console.log(license.plan); // 'pro'

// Check usage limits
const usage = await nube-auth.getUsage('api_calls');
console.log(usage.current, usage.limit); // 450, 1000
```

## License Structure

```typescript
interface License {
  id: string;
  userId: string;
  plan: string;
  status: 'active' | 'canceled' | 'expired' | 'trial';
  entitlements: string[];
  limits: Record<string, { current: number; max: number }>;
  trialEndsAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}
```

## Auto-Provisioning

New users automatically get a license:

```bash
# Default plan for new users
DEFAULT_PLAN=free

# Enable trial for new users
ENABLE_TRIAL=true
TRIAL_DAYS=14
TRIAL_PLAN=pro
```

## Checking Entitlements

```typescript
// Single entitlement
if (await nube-auth.hasEntitlement('advanced_analytics')) {
  showAnalyticsDashboard();
}

// Multiple entitlements (all required)
if (await nube-auth.hasEntitlements(['export', 'api_access'])) {
  enableAPIExport();
}

// Any of multiple entitlements
if (await nube-auth.hasAnyEntitlement(['export_csv', 'export_pdf'])) {
  showExportMenu();
}
```

## Gating Features

React example:

```tsx
function FeatureGate({ feature, children, fallback }) {
  const { hasEntitlement, loading } = useEntitlement(feature);
  
  if (loading) return <Skeleton />;
  if (!hasEntitlement) return fallback || <UpgradePrompt />;
  
  return children;
}

// Usage
<FeatureGate feature="advanced_reports">
  <AdvancedReports />
</FeatureGate>
```

## Webhooks

Nube Auth sends real-time webhook events when licenses change. Key events:

| Event | When |
|-------|------|
| `license.created` | User first gets a license |
| `license.upgraded` | User moves to a higher plan |
| `license.downgraded` | User moves to a lower plan |
| `license.canceled` | Subscription is canceled |
| `license.expired` | Access period ends |
| `license.renewed` | Subscription renews |
| `license.trial_started` | Trial begins |
| `license.trial_ended` | Trial ends (converted or not) |

See [Webhooks](/integration/webhooks/) for full payload schemas, signature verification, and the complete event reference.

## Next Steps

- [Plans & Tiers](/licensing/plans/) - Configure your pricing
- [Webhooks](/integration/webhooks/) - Receive real-time event notifications
