---
title: Configuration
description: Configure Proofa for your environment
---

Proofa is configured through environment variables and SDK options.

## SDK Configuration

```typescript
import { ProofaClient } from '@proofa/sdk';

const proofa = new ProofaClient({
  // Required
  appId: 'your-app-id',
  
  // API URL (defaults to hosted Proofa)
  apiUrl: 'https://api.proofa.sh',
  
  // Optional: Custom redirect URI
  redirectUri: 'https://yourapp.com/auth/callback',
  
  // Optional: Storage for tokens (defaults to localStorage)
  storage: localStorage,
});
```

## Environment Variables

For self-hosted deployments, configure these environment variables:

### Core Settings

```bash
# Application
NODE_ENV=production
PORT=3001

# Database (Turso)
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-token

# Redis (Upstash)
REDIS_URL=redis://your-redis-url
REDIS_TOKEN=your-token
```

### Authentication

```bash
# JWT secrets (generate secure random strings)
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# OAuth: Google
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# OAuth: GitHub
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

### Session Settings

```bash
# Session duration (seconds)
SESSION_TTL=604800  # 7 days

# Rolling session extension
SESSION_ROLLING=true
SESSION_ROLLING_TTL=86400  # 1 day
```

## OAuth Provider Setup

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-domain/auth/callback/google`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set callback URL: `https://your-domain/auth/callback/github`
4. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

## Next Steps

- [OAuth Providers](/authentication/oauth-providers/) - Provider details
- [Environment](/self-hosting/environment/) - Full environment reference
