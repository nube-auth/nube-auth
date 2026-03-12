---
title: Installation
description: Install and set up Nube Auth for your project
---

import { Aside } from '@astrojs/starlight/components';

Get started with Nube Auth's hosted service.

## Getting Started

1. Create an account at [nubeauth.com](https://nubeauth.com)
2. Create a new project and app
3. Get your App ID from the dashboard
4. Install the SDK and start building

## Install the SDK

```bash
npm install @nube-auth/sdk
```

Or with your preferred package manager:

```bash
# pnpm
pnpm add @nube-auth/sdk

# yarn
yarn add @nube-auth/sdk
```

## Quick Setup

```typescript
import { NubeAuthClient } from '@nube-auth/sdk';

const nubeAuth = new NubeAuthClient({
  appId: 'your-app-id',
  apiUrl: 'https://api.nubeauth.com'
});

// Start OAuth login
await nubeAuth.login({ provider: 'google' });

// Get current user
const user = await nubeAuth.getUser();
```

<Aside type="note" title="Self-Hosting">
  Self-hosting options will be available after beta. Currently, please use the hosted service.
</Aside>

## Next Steps

- [Configuration](/getting-started/configuration/) - Configure your environment
- [OAuth Providers](/authentication/oauth-providers/) - Set up authentication providers
