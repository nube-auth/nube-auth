# @nube-auth/client

Nube Auth API client for TypeScript/JavaScript applications.

## Installation

```bash
pnpm add @nube-auth/client
```

## Usage

### Frontend (Cookie-based Authentication)

For frontend applications, the client uses cookies automatically:

```typescript
import { NubeAuthClient } from '@nube-auth/client';

const client = new NubeAuthClient({
  gatewayUrl: 'https://api.nubeauth.com',
  appId: 'APP0abc123', // Required for license/subscription APIs
});

// Get current user
const user = await client.me.get();

// Check license
const isActive = await client.license.isActive();
const license = await client.license.getDetails();

// Subscription management
const sub = await client.subscription.getDetails();
await client.subscription.cancel('switching_plans');

// Logout
await client.auth.logout();
```

### Backend (S2S Token Authentication)

For backend services, provide an S2S token for service-to-service authentication:

```typescript
import { NubeAuthClient } from '@nube-auth/client';

const client = new NubeAuthClient({
  gatewayUrl: process.env.GATEWAY_URL,
  s2sToken: process.env.X_NUBE_AUTH_SERVICE_TOKEN,
  appId: 'APP0abc123',
});

// All requests will include X-Nube-Service-Token header
const user = await client.me.get();
```

## API

### Authentication

- `client.auth.checkStatus()` - Check if user is logged in
- `client.auth.logout()` - Logout current user

### User Profile

- `client.me.get()` - Get current user profile
- `client.me.update(data)` - Update profile (name, picture)

### Sessions

- `client.sessions.list()` - List all active sessions
- `client.sessions.delete(sessionId)` - Delete a specific session
- `client.sessions.deleteAll()` - Logout all sessions

### License (requires `appId`)

- `client.license.isActive()` - Check if user has an active license
- `client.license.getDetails()` - Get full license details

### Subscription (requires `appId`)

- `client.subscription.getDetails()` - Get subscription details
- `client.subscription.cancel(reason?)` - Cancel subscription
- `client.subscription.resume()` - Resume canceled subscription
