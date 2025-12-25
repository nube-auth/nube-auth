---
title: Licensing Overview
description: Implement flexible licensing for your SaaS
---

Proofa's licensing system lets you implement any business model.

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
const canExport = await proofa.hasEntitlement('export');

if (canExport) {
  // Show export button
}

// Get user's current plan
const license = await proofa.getLicense();
console.log(license.plan); // 'pro'

// Check usage limits
const usage = await proofa.getUsage('api_calls');
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
if (await proofa.hasEntitlement('advanced_analytics')) {
  showAnalyticsDashboard();
}

// Multiple entitlements (all required)
if (await proofa.hasEntitlements(['export', 'api_access'])) {
  enableAPIExport();
}

// Any of multiple entitlements
if (await proofa.hasAnyEntitlement(['export_csv', 'export_pdf'])) {
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

Get notified of license changes:

```typescript
// In your webhook handler
app.post('/webhooks/proofa', (req, res) => {
  const { event, data } = req.body;
  
  switch (event) {
    case 'license.upgraded':
      // User upgraded their plan
      break;
    case 'license.canceled':
      // User canceled subscription
      break;
    case 'license.expired':
      // License expired
      break;
  }
});
```

## Next Steps

- [Plans & Tiers](/licensing/plans/) - Configure your pricing
