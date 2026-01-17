---
title: Quick Start
description: Get Proofa running in your application in under 5 minutes
outline: deep
---

Get Proofa integrated into your application quickly.

## Install the SDK

```bash
npm install @proofa/sdk
# or
pnpm add @proofa/sdk
# or
yarn add @proofa/sdk
```

## Initialize the Client

```typescript
import { ProofaClient } from '@proofa/sdk';

const proofa = new ProofaClient({
  appId: 'your-app-id',
  apiUrl: 'https://api.proofa.sh' // or your self-hosted URL
});
```

## Add Authentication

```typescript
// Start OAuth login
async function handleLogin() {
  await proofa.login({ provider: 'google' });
}

// Handle callback (in your callback page)
async function handleCallback() {
  const result = await proofa.handleCallback();
  if (result.success) {
    // User is now authenticated
    const user = await proofa.getUser();
    console.log('Welcome', user.name);
  }
}

// Logout
async function handleLogout() {
  await proofa.logout();
}
```

## Check Authentication Status

```typescript
// Get current user (returns null if not authenticated)
const user = await proofa.getUser();

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
  const { user, loading } = useProofa();
  
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  
  return children;
}
```

## Next Steps

- [Installation](/getting-started/installation/) - Detailed setup guide
- [Configuration](/getting-started/configuration/) - Environment and options
- [OAuth Providers](/authentication/oauth-providers/) - Configure providers
