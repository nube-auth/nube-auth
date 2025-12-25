---
title: Installation
description: Install and set up Proofa for your project
---

import { Aside } from '@astrojs/starlight/components';

Get started with Proofa's hosted service.

## Getting Started

1. Create an account at [proofa.dev](https://proofa.dev)
2. Create a new project and app
3. Get your App ID from the dashboard
4. Install the SDK and start building

## Install the SDK

```bash
npm install @proofa/sdk
```

Or with your preferred package manager:

```bash
# pnpm
pnpm add @proofa/sdk

# yarn
yarn add @proofa/sdk
```

## Quick Setup

```typescript
import { ProofaClient } from '@proofa/sdk';

const proofa = new ProofaClient({
  appId: 'your-app-id',
  apiUrl: 'https://api.proofa.dev'
});

// Start OAuth login
await proofa.login({ provider: 'google' });

// Get current user
const user = await proofa.getUser();
```

<Aside type="note" title="Self-Hosting">
  Self-hosting options will be available after beta. Currently, please use the hosted service.
</Aside>

## Next Steps

- [Configuration](/getting-started/configuration/) - Configure your environment
- [OAuth Providers](/authentication/oauth-providers/) - Set up authentication providers
