# @nube-auth/auth

OAuth authentication adapter framework and HTTP client for Nube Auth.

## Contents

- **Adapters**: Pluggable OAuth provider implementations (Google, GitHub)
- **pingpong**: HTTP client used throughout the codebase (re-exported from `@pingpong-js/fetch`)
- **Types**: OAuth adapter interfaces and type definitions
- **Crypto/Session utilities**: Session token generation, S2S token generation, OTP, etc.

## Installation

```bash
pnpm install @nube-auth/auth
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
import { GoogleOAuthAdapter, GitHubOAuthAdapter } from '@nube-auth/auth';

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

## HTTP Client (pingpong)

`pingpong` is the project's HTTP client, re-exported from `@pingpong-js/fetch`. Use it instead of native `fetch()` for all HTTP requests across the codebase:

```typescript
import { pingpong } from '@nube-auth/auth';

const response = await pingpong('/api/endpoint', {
  method: 'POST',
  body: data,
});

// response.data is already parsed JSON
if (response.ok()) {
  console.log(response.data);
} else if (response.isError()) {
  console.error(response.status);
}
```

Key features:
- `response.data` — auto-parsed JSON, no `.json()` needed
- `response.ok()` — true for 2xx status codes
- `response.isError()` — true for 4xx/5xx
- `response.status` — HTTP status code
- `response.body` — raw response body string
