---
title: Admin Dashboard
description: Complete guide to the Proofa Admin Dashboard
---


The Admin Dashboard is your control center for managing projects, apps, users, and billing.

## Overview

Access the Admin Dashboard at **[admin.proofa.com](https://admin.proofa.com)**

The dashboard features a contextual sidebar that adapts to your current location:
- **Global View** - Projects, billing, webhooks
- **Project View** - Apps, team, settings
- **App View** - Users, licenses, OAuth configuration

## Projects

### Creating a Project

1. Navigate to **Projects** in the sidebar
2. Click **"Create Project"**
3. Enter project details:
   - **Name** - Display name (e.g., "My SaaS Platform")
   - **Slug** - URL identifier (e.g., "my-saas")
   - **Description** - Optional description
4. Click **"Create"**

<Aside type="tip">
  Project slugs are permanent and used in URLs. Choose carefully!
</Aside>

### Project Dashboard

The project dashboard shows:
- **Total Users** - Across all apps
- **Active Licenses** - Current paid subscribers
- **Monthly Revenue** - MRR from all apps
- **App Count** - Number of apps in project

### Project Settings

Configure project-level settings:
- **Edit Details** - Update name and description
- **Archive Project** - Hide from active projects
- **Delete Project** - Permanently remove (owners only)

<Aside type="caution">
  Deleting a project removes all apps, users, and licenses. This cannot be undone!
</Aside>

## Apps

### Creating an App

1. Select a project
2. Navigate to **Apps**
3. Click **"Create App"**
4. Configure app details:
   - **Name** - App display name
   - **Slug** - URL identifier
   - **Redirect URIs** - Allowed callback URLs
   - **Allowed Origins** - CORS whitelist

### App Dashboard

View key metrics for your app:
- **Total Users** - Registered user count
- **Active Licenses** - Users with valid licenses
- **MRR** - Monthly recurring revenue
- **Session Count** - Active sessions

### App Settings

Configure app-level settings:
- **General** - Name, slug, description
- **Security** - Session TTL, max concurrent sessions
- **Allowed Origins** - CORS configuration
- **Redirect URIs** - OAuth callback URLs

## User Management

### Viewing Users

Navigate to **App → Users** to see all registered users:

| Column | Description |
|--------|-------------|
| Name | User's display name |
| Email | Email address |
| License | Current plan (Free, Pro, etc.) |
| Joined | Registration date |
| Last Login | Last activity timestamp |

### User Actions

Click a user to:
- **View Details** - Full user profile
- **Grant License** - Assign a plan manually
- **Revoke License** - Remove paid access
- **View Sessions** - See active sessions
- **Deactivate** - Disable account

### Searching Users

Use the search bar to find users by:
- Email address
- Name
- User ID

## Licensing

### Plans & Tiers

Create flexible pricing plans:

1. Navigate to **App → Licenses & Plans**
2. Click **"Create Plan"**
3. Configure plan details:

```json
{
  "name": "Pro",
  "slug": "pro",
  "price_monthly": 999,  // $9.99
  "price_yearly": 9999,   // $99.99
  "trial_days": 14,
  "features": [
    "Unlimited storage",
    "Priority support",
    "Advanced analytics"
  ]
}
```

### Plan Types

| Type | Description |
|------|-------------|
| **Free** | No payment required, basic features |
| **Trial** | Limited-time access to paid features |
| **Monthly** | Recurring monthly subscription |
| **Yearly** | Annual subscription (discounted) |
| **Lifetime** | One-time payment, permanent access |

### Managing Licenses

View and manage all licenses:
- **Active** - Valid paid licenses
- **Expired** - Past due date
- **Cancelled** - User cancelled subscription
- **Trial** - Currently in trial period

### Granting Manual Licenses

For special cases (press, partners, etc.):

1. Navigate to **App → Licenses**
2. Click **"Grant License"**
3. Select user and plan
4. Set duration (optional)
5. Click **"Grant"**

## OAuth Configuration

### Enabling Providers

Configure OAuth providers for your app:

1. Navigate to **App → OAuth Config**
2. Select provider (Google, GitHub)
3. Enable provider
4. Enter credentials:
   - **Client ID** - From provider console
   - **Client Secret** - From provider console
5. Set **Redirect URIs**
6. Save configuration

### Provider Setup

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://api.proofa.sh/v1/auth/callback/google`
4. Copy Client ID and Secret to Proofa

#### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create OAuth App
3. Set callback URL: `https://api.proofa.sh/v1/auth/callback/github`
4. Copy Client ID and Secret to Proofa

<Aside type="note">
  OAuth credentials are encrypted at rest using AES-256-GCM.
</Aside>

### Security Settings

Configure session security:
- **Session TTL** - 1-365 days
- **Max Concurrent Sessions** - Limit devices
- **Redirect URIs** - Whitelist callback URLs
- **Allowed Origins** - CORS domains

## Payment Integration

### Setting Up Payment Providers

Configure payment providers at the project level:

1. Navigate to **Project → Payment Providers**
2. Click **"Add Provider"**
3. Select provider:
   - **Stripe**
   - **LemonSqueezy**
   - More coming soon
4. Choose environment:
   - **Test** - For development
   - **Production** - For live payments
5. Enter credentials
6. Save configuration

### Stripe Setup

1. Get API keys from [Stripe Dashboard](https://dashboard.stripe.com)
2. Add to Proofa:
   - **Publishable Key** - Public key for frontend
   - **Secret Key** - Private key for backend
   - **Webhook Secret** - For webhook verification
3. Configure webhook endpoint: `https://api.proofa.sh/v1/webhooks/stripe`

### LemonSqueezy Setup

1. Get API key from [LemonSqueezy Dashboard](https://app.lemonsqueezy.com)
2. Add to Proofa:
   - **API Key**
   - **Store ID**
   - **Webhook Secret**
3. Configure webhook: `https://api.proofa.sh/v1/webhooks/lemonsqueezy`

### App Payment Settings

Override payment provider per app:

1. Navigate to **App → Payment Config**
2. Select payment provider (or use project default)
3. Configure checkout:
   - **Success URL** - Redirect after payment
   - **Cancel URL** - Redirect on cancellation
   - **Custom Branding** - Logo, colors

## API Keys

### Generating API Keys

Create API keys for backend integration:

1. Navigate to **App → API Keys**
2. Click **"Generate API Key"**
3. Copy the key immediately (shown only once)
4. Store securely in your backend

API Key Format:
```
proofa_sk_live_abc123...  (64 characters)
```

### Using API Keys

Include in requests to Proofa API:

```bash
curl -H "Authorization: Bearer proofa_sk_live_abc123..." \
  https://api.proofa.sh/v1/users
```

### Key Management

- **View Current Key** - Masked for security (e.g., `proofa_sk_...abc`)
- **Rotate Key** - Generate new key with grace period
- **Revoke Key** - Immediately invalidate key

<Aside type="caution">
  Never commit API keys to version control or share publicly!
</Aside>

## Team Management

### Inviting Team Members

Add collaborators to your project:

1. Navigate to **Project → Team**
2. Click **"Invite Member"**
3. Enter email address
4. Select role:
   - **Owner** - Full access
   - **Admin** - Manage apps and licenses
   - **Member** - Read-only access
5. Send invitation

### Managing Roles

| Role | Projects | Apps | Users | Licenses | Billing | Team |
|------|----------|------|-------|----------|---------|------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | 👁️ | ✅ | ✅ | ✅ | 👁️ | ❌ |
| Member | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ |

Legend: ✅ Full access, 👁️ Read-only, ❌ No access

### Removing Team Members

Only owners can remove team members:

1. Navigate to **Project → Team**
2. Click **"Remove"** next to member
3. Confirm removal

## Billing Dashboard

### Viewing Transactions

Access global billing overview:

1. Navigate to **Billing** (global sidebar)
2. View revenue charts:
   - **MRR** - Monthly recurring revenue
   - **Growth** - Month-over-month growth
   - **Churn** - Cancellation rate

### Transaction History

Filter transactions by:
- **Date Range** - Last 7/30/90 days
- **Project** - Specific project
- **App** - Specific app
- **Provider** - Stripe, LemonSqueezy
- **Status** - Success, failed, pending

### Exporting Data

Export transactions to CSV:

1. Navigate to **Export** (global sidebar)
2. Select date range
3. Choose filters (project, app, provider)
4. Click **"Export CSV"**
5. Download file

## Webhooks

### Monitoring Webhooks

View all webhook events:

1. Navigate to **Webhooks** (global sidebar)
2. Filter by:
   - **Provider** - Stripe, LemonSqueezy
   - **Event Type** - payment_succeeded, subscription_cancelled, etc.
   - **Status** - Success, failed
   - **Date Range**

### Webhook Details

Click a webhook to view:
- **Request Headers** - Sent by provider
- **Request Body** - JSON payload
- **Response Status** - HTTP status code
- **Response Body** - Your server's response
- **Timestamp** - When event occurred

### Retrying Failed Webhooks

If a webhook fails (e.g., server downtime):

1. Click **"Retry"** on failed webhook
2. Proofa resends event to your endpoint
3. View new response status

<Aside type="tip">
  Set up webhook endpoints at: `https://api.proofa.sh/v1/webhooks/{provider}`
</Aside>

## Refunds

### Processing Refunds

Handle refund requests:

1. Navigate to **Refunds** (global sidebar)
2. View refund requests
3. Click **"Process Refund"**
4. Choose refund type:
   - **Full Refund** - Return entire amount
   - **Partial Refund** - Custom amount
5. Update license status
6. Confirm refund

### Refund History

Track all processed refunds:
- **Amount** - Refunded amount
- **Reason** - Refund reason
- **Date** - When processed
- **Status** - Complete, pending, failed

## Integration Guide

### Quick Integration

Get your app running with Proofa:

1. Navigate to **App → Integration Guide**
2. Follow step-by-step instructions:
   - Install SDK
   - Configure credentials
   - Add login button
   - Handle callback
3. Copy code snippets
4. Test integration

### Code Examples

The integration guide provides ready-to-use code:

```typescript
// Initialize Proofa client
import { ProofaClient } from '@proofa/client';

const proofa = new ProofaClient({
  appId: 'APP0abc123...',
  appToken: 'proofa_sk_live_...',
});

// Start OAuth login
await proofa.auth.login({ provider: 'google' });
```

### Testing Your Integration

Use the built-in test tool:

1. Click **"Test Login Flow"**
2. Follow OAuth redirect
3. Verify callback handling
4. Check user creation

## Analytics & Statistics

### Project Statistics

View project-level analytics:

1. Navigate to **Project → Statistics**
2. View metrics:
   - **User Growth** - New users over time
   - **License Distribution** - Free vs. paid
   - **Revenue Trends** - MRR growth
   - **Churn Rate** - User retention

### App Analytics

Per-app analytics:
- **Active Users** - DAU, WAU, MAU
- **Session Duration** - Average session length
- **Feature Usage** - Which features are used
- **Conversion Rate** - Free to paid conversion

## Keyboard Shortcuts

Speed up your workflow:

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + /` | Toggle sidebar |
| `Cmd/Ctrl + B` | Go to billing |
| `Cmd/Ctrl + P` | Switch project |

## Theme Customization

Toggle between light and dark themes:

1. Click **theme icon** in top header
2. Select:
   - **Light** - Default light theme
   - **Dark** - High contrast dark theme
   - **System** - Follow OS preference

## Best Practices

### Security

- **Use test environment** for development
- **Rotate API keys** regularly (every 90 days)
- **Limit redirect URIs** to your domains only
- **Enable 2FA** for admin accounts (coming soon)

### Organization

- **One project per product** - Separate unrelated apps
- **Descriptive names** - Use clear project/app names
- **Regular backups** - Export data monthly

### Team Collaboration

- **Assign roles carefully** - Principle of least privilege
- **Document changes** - Use internal notes
- **Review access** - Audit team members quarterly

## Troubleshooting

### Cannot Create Project

**Issue:** "Project slug already taken"  
**Solution:** Choose a different slug (must be unique)

### OAuth Not Working

**Issue:** "Invalid redirect URI"  
**Solution:** Add your callback URL to allowed redirect URIs

### Webhooks Failing

**Issue:** Webhooks showing as failed  
**Solution:** 
1. Check your server is running
2. Verify webhook endpoint is publicly accessible
3. Check webhook secret is correct
4. Review webhook logs for error details

### API Key Not Working

**Issue:** "Invalid API key"  
**Solution:**
1. Ensure you copied the full key
2. Check you're using the correct environment (test vs. production)
3. Verify key hasn't been revoked
4. Generate a new key if needed

## Next Steps

- [User Dashboard](/dashboards/user-dashboard) - End user features
- [Integration Guide](/integration/quickstart) - Add Proofa to your app
- [API Reference](/api/admin-api) - Complete API documentation
