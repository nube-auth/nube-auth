---
title: User Dashboard
description: Guide to the Proofa User Dashboard
---

import { Aside } from '@astrojs/starlight/components';

The User Dashboard provides a simple interface for end users to manage their accounts and sessions.

## Overview

Access the User Dashboard at **[account.proofa.com](https://account.proofa.com)**

The dashboard focuses on essential account management features:
- **Profile** - View and update your information
- **Sessions** - Manage active logins
- **Security** - Monitor account activity

## Logging In

### OAuth Login

1. Visit [account.proofa.com](https://account.proofa.com)
2. Click **"Login with Google"** or **"Login with GitHub"**
3. Authorize Proofa to access your profile
4. Redirected to dashboard after login

### Magic Link Login

1. Click **"Login with Email"**
2. Enter your email address
3. Check your inbox for magic link
4. Click link to login (expires in 15 minutes)

<Aside type="tip">
  Magic links are single-use and expire quickly for security.
</Aside>

## Profile Management

### Viewing Your Profile

Navigate to **Profile** to see:
- **Name** - Your display name
- **Email** - Primary email address
- **Avatar** - Profile picture
- **Member Since** - Account creation date
- **Connected Accounts** - Linked OAuth providers

### Updating Your Profile

Edit your profile information:

1. Click **"Edit Profile"**
2. Update fields:
   - **Name** - Display name
   - **Avatar URL** - Link to profile picture
3. Click **"Save Changes"**

<Aside type="note">
  Your email address is tied to your OAuth provider and cannot be changed directly.
</Aside>

### Profile Picture

Set your avatar using:
- **Gravatar** - Automatic based on email
- **Custom URL** - Link to image hosted elsewhere
- **OAuth Provider** - Use Google/GitHub avatar

## Connected Accounts

### Viewing Connected Accounts

See all OAuth providers linked to your account:

| Provider | Email/Username | Linked Date | Actions |
|----------|---------------|-------------|---------|
| Google | user@gmail.com | Jan 1, 2026 | Unlink |
| GitHub | @username | Jan 5, 2026 | Unlink |

### Linking a New Account

Add additional login methods:

1. Click **"Link Account"**
2. Select provider (Google, GitHub)
3. Authorize connection
4. Provider added to your account

<Aside type="tip">
  Linking multiple accounts makes it easier to login with different providers.
</Aside>

### Unlinking Accounts

Remove a connected OAuth provider:

1. Click **"Unlink"** next to provider
2. Confirm removal
3. Provider disconnected

<Aside type="caution">
  You must have at least one connected account to maintain access to your account.
</Aside>

## Session Management

### Viewing Active Sessions

Navigate to **Sessions** to see all active logins:

Each session shows:
- **Device** - Browser and operating system (e.g., "Chrome on macOS")
- **Location** - Approximate city/country (based on IP)
- **IP Address** - Login IP address
- **Last Activity** - When session was last used
- **Created** - When you logged in
- **Current Session** - Highlighted if it's your current device

### Session Security Indicators

Sessions display security warnings:

🔒 **Normal** - Regular activity  
⚠️ **New Device** - First login from this device  
🚨 **Suspicious** - Unusual location or device

### Logging Out of a Session

Remove individual sessions:

1. Click **"Logout"** next to session
2. Session immediately invalidated
3. Device must re-authenticate to access your account

<Aside type="note">
  You cannot logout your current session this way. Use the main "Logout" button instead.
</Aside>

### Logout All Other Sessions

Revoke all sessions except your current one:

1. Click **"Logout All Other Sessions"**
2. Confirm action
3. All devices except current one logged out

Use this if:
- You suspect unauthorized access
- You lost a device
- You want to ensure only you have access

## Security Features

### Session TTL

User sessions automatically expire after **365 days** of inactivity:
- **Rolling Sessions** - Refreshes on activity
- **Automatic Refresh** - If last activity > 30 days ago
- **Secure Cookies** - HttpOnly, Secure, SameSite=Lax

### Session Hijacking Protection

Proofa uses fingerprinting to detect session theft:
- **IP Address** - Monitors for changes
- **User-Agent** - Tracks browser/device
- **Automatic Invalidation** - Suspicious changes log you out

### Geographic Monitoring

Sessions showing unusual locations trigger warnings:
- **New Country** - First login from this country
- **VPN Detection** - Known VPN/proxy IP ranges
- **Rapid Location Changes** - Impossible travel (e.g., US → China in 1 hour)

## Account Settings

### Email Preferences

Control email notifications:
- **Security Alerts** - New device logins
- **Product Updates** - Feature announcements
- **Marketing** - Newsletter and promotions

### Privacy Settings

Manage your data:
- **Profile Visibility** - Who can see your profile
- **Activity Tracking** - Anonymous usage analytics
- **Data Portability** - Export your data

### Deleting Your Account

Permanently remove your account:

1. Navigate to **Settings → Delete Account**
2. Review warning (cannot be undone)
3. Enter password or confirm via email
4. Click **"Delete Account"**

<Aside type="caution">
  Deleting your account removes all data and cannot be reversed!
</Aside>

## Theme Customization

### Switching Themes

Toggle between light and dark themes:

1. Click **theme icon** in header
2. Select:
   - **Light** - Default light theme
   - **Dark** - High contrast dark theme
   - **System** - Follow OS preference

Your theme preference is saved automatically.

## License Information

### Viewing Your License

If you have a paid subscription through an app:

1. The dashboard shows your **current plan**
2. View details:
   - **Plan Name** - e.g., "Pro", "Enterprise"
   - **Status** - Active, trial, expired
   - **Valid Until** - Expiration date
   - **Features** - What your plan includes

### Managing Subscriptions

<Aside type="note">
  Subscriptions are managed through the app you subscribed to, not the User Dashboard.
</Aside>

To change or cancel your subscription:
1. Return to the app you purchased from
2. Navigate to their billing/subscription page
3. Manage your subscription there

## Troubleshooting

### Cannot Login

**Issue:** OAuth redirect fails  
**Solution:**
1. Clear browser cookies
2. Try different browser
3. Check you're using correct provider
4. Contact app support if persists

### Session Keeps Expiring

**Issue:** Logged out frequently  
**Solution:**
1. Check you're not clearing cookies
2. Disable privacy extensions temporarily
3. Ensure browser allows cookies from `proofa.com`

### Cannot Unlink Account

**Issue:** "Must have at least one connected account"  
**Solution:** Link another provider before unlinking current one

### Missing Sessions

**Issue:** Session not shown in list  
**Solution:**
1. Refresh page
2. Check session hasn't expired
3. Sessions older than 90 days may be archived

### Suspicious Activity Alert

**Issue:** Warning about unknown location  
**Solution:**
1. If it's you, click **"This was me"**
2. If not you, click **"Logout All Sessions"**
3. Change password immediately
4. Review connected accounts

## Mobile Access

### Mobile Browser

Access the User Dashboard from mobile:
1. Visit [account.proofa.com](https://account.proofa.com)
2. Responsive design adapts to screen size
3. All features available on mobile

### Mobile App (Coming Soon)

Native iOS and Android apps in development:
- Biometric authentication
- Push notifications for security alerts
- Faster, native experience

## Accessibility

### Screen Reader Support

The User Dashboard is fully accessible:
- Semantic HTML for screen readers
- ARIA labels on interactive elements
- Keyboard navigation support

### Keyboard Shortcuts

Navigate efficiently with keyboard:

| Shortcut | Action |
|----------|--------|
| `Tab` | Navigate to next element |
| `Shift + Tab` | Navigate to previous element |
| `Enter` | Activate button/link |
| `Esc` | Close modal/dialog |

## Privacy & Data

### What Data We Collect

The User Dashboard collects:
- **Profile Info** - Name, email, avatar (from OAuth)
- **Session Data** - IP, device, timestamps
- **Activity** - Page views, feature usage (anonymous)

### What We Don't Collect

We never collect:
- Passwords (OAuth-only)
- Payment details (handled by providers)
- Browsing history outside Proofa
- Personal messages or content

### Data Retention

- **Active Sessions** - Deleted after expiration
- **Old Sessions** - Archived after 90 days
- **Account Data** - Retained until account deletion
- **Audit Logs** - Kept for 365 days for security

### GDPR Compliance

Your rights under GDPR:
- **Access** - Export your data anytime
- **Rectification** - Correct inaccurate data
- **Erasure** - Delete your account
- **Portability** - Download data in JSON format

## Support

### Getting Help

Need assistance?

1. **Documentation** - Check [docs.proofa.com](https://docs.proofa.com)
2. **FAQ** - Common questions answered
3. **Email Support** - support@proofa.io
4. **Status Page** - Check service status at status.proofa.com

### Feature Requests

Suggest new features:
- Email: feedback@proofa.io
- GitHub: [github.com/0xdps/proofa-core/issues](https://github.com/0xdps/proofa-core/issues)

## Best Practices

### Security

- ✅ **Enable 2FA** (when available)
- ✅ **Review sessions** regularly
- ✅ **Link multiple providers** for backup access
- ✅ **Use strong passwords** (for email account)
- ❌ Don't share session cookies
- ❌ Don't stay logged in on shared devices

### Privacy

- ✅ **Logout on shared computers**
- ✅ **Review connected accounts** monthly
- ✅ **Use private browsing** on public WiFi
- ❌ Don't use public computers for sensitive actions

## Next Steps

- [Admin Dashboard](/dashboards/admin-dashboard) - If you manage apps
- [Integration Guide](/integration/quickstart) - If you're a developer
- [Security Best Practices](/security/overview) - Learn more about security
