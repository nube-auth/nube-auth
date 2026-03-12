---
title: Authentication Overview
description: How authentication works in Nube Auth
---

Nube Auth supports multiple authentication methods to fit your application's needs.

## Authentication Methods

| Method | Description | Best For |
|--------|-------------|----------|
| **OAuth** | Google, GitHub, etc. | Consumer apps, quick signup |
| **Magic Links** | Passwordless email links | Security-focused apps |

## Authentication Flow

```mermaid
sequenceDiagram
    User->>App: Click "Login with Google"
    App->>Nube Auth: Initiate OAuth flow
    Nube Auth->>Google: Redirect to consent
    Google->>Nube Auth: Return with code
    Nube Auth->>App: Return with session token
    App->>User: Logged in!
```

## Basic Usage

```typescript
import { NubeAuthClient } from '@nube-auth/sdk';

const nubeAuth = new NubeAuthClient({ appId: 'your-app' });

// OAuth login
await nubeAuth.login({ provider: 'google' });

// Magic link
await nube-auth.sendMagicLink({ email: 'user@example.com' });

// Get current user
const user = await nubeAuth.getUser();

// Logout
await nubeAuth.logout();
```

## User Object

After authentication, you get a user object:

```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: 'google' | 'github' | 'email';
  createdAt: Date;
  updatedAt: Date;
}
```

## Session Management

Sessions are automatically managed:

- **Access tokens** - Short-lived (15 min default)
- **Refresh tokens** - Long-lived (7 days default)
- **Rolling sessions** - Auto-extend on activity

See [Sessions](/sessions/overview/) for details.

## Next Steps

- [OAuth Providers](/authentication/oauth-providers/) - Configure providers
- [Magic Links](/authentication/magic-links/) - Passwordless auth
