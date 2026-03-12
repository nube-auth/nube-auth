---
title: Quick Start
description: Get Nube Auth running in your application in under 5 minutes
outline: deep
---

Get Nube Auth integrated into your application quickly.

## Install the SDK

```bash
npm install @nube-auth/sdk
# or
pnpm add @nube-auth/sdk
# or
yarn add @nube-auth/sdk
```

## Initialize the Client

```typescript
import { NubeAuthClient } from '@nube-auth/sdk';

const nubeAuth = new NubeAuthClient({
  appId: 'your-app-id',
  apiUrl: 'https://api.nubeauth.com' // or your self-hosted URL
});
```

## Add Authentication

```typescript
// Start OAuth login
async function handleLogin() {
  await nubeAuth.login({ provider: 'google' });
}

// Handle callback (in your callback page)
async function handleCallback() {
  const result = await nube-auth.handleCallback();
  if (result.success) {
    // User is now authenticated
    const user = await nubeAuth.getUser();
    console.log('Welcome', user.name);
  }
}

// Logout
async function handleLogout() {
  await nubeAuth.logout();
}
```

## Check Authentication Status

```typescript
// Get current user (returns null if not authenticated)
const user = await nubeAuth.getUser();

if (user) {
  console.log('Logged in as:', user.email);
} else {
  console.log('Not authenticated');
}
```

## Protect Routes

```typescript
// React example
function ProtectedRoute({ children }) {
  const { user, loading } = useNube Auth();
  
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  
  return children;
}
```

## Next Steps

- [Installation](/getting-started/installation/) - Detailed setup guide
- [Configuration](/getting-started/configuration/) - Environment and options
- [OAuth Providers](/authentication/oauth-providers/) - Configure providers
