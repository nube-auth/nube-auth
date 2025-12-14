# @proofa/auth

OAuth authentication adapter framework for Proofa.

## Contents

- **Adapters**: Pluggable OAuth provider implementations (Google, GitHub)
- **Types**: OAuth adapter interfaces and type definitions

## Installation

```bash
pnpm install @proofa/auth
```

## Adapter Interface

Each OAuth adapter implements the following interface:

```typescript
interface OAuthAdapter {
  getAuthorizationUrl(state: string, redirectUri: string): string;
  exchangeToken(code: string, redirectUri: string): Promise<OAuthProfile>;
}
```

## Usage

```typescript
import { GoogleOAuthAdapter, GitHubOAuthAdapter } from '@proofa/auth';

// Google OAuth
const googleAdapter = new GoogleOAuthAdapter({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
});

const authUrl = googleAdapter.getAuthorizationUrl(state, redirectUri);
const profile = await googleAdapter.exchangeToken(code, redirectUri);

// GitHub OAuth
const githubAdapter = new GitHubOAuthAdapter({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
});

const authUrl = githubAdapter.getAuthorizationUrl(state, redirectUri);
const profile = await githubAdapter.exchangeToken(code, redirectUri);
```
