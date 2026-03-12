---
title: OAuth Providers
description: Configure OAuth authentication providers
---

Nube Auth supports popular OAuth providers out of the box.

## Supported Providers

| Provider | Status | Scopes |
|----------|--------|--------|
| Google | ✅ Stable | `email`, `profile` |
| GitHub | ✅ Stable | `user:email`, `read:user` |

## Google Setup

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Add authorized redirect URI:
   - Development: `http://localhost:3000/auth/callback/google`
   - Production: `https://your-domain/auth/callback/google`

### 2. Configure Environment

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Use in Your App

```typescript
await nubeAuth.login({ provider: 'google' });
```

## GitHub Setup

### 1. Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set callback URL:
   - Development: `http://localhost:3000/auth/callback/github`
   - Production: `https://your-domain/auth/callback/github`

### 2. Configure Environment

```bash
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

### 3. Use in Your App

```typescript
await nubeAuth.login({ provider: 'github' });
```

## Multiple Providers

Users can link multiple providers to one account:

```typescript
// Link additional provider to existing account
await nube-auth.linkProvider({ provider: 'github' });

// Get linked providers
const user = await nubeAuth.getUser();
console.log(user.linkedProviders); // ['google', 'github']
```

## Custom Scopes

Request additional OAuth scopes:

```typescript
await nubeAuth.login({ 
  provider: 'google',
  scopes: ['email', 'profile', 'calendar.readonly']
});
```

## Error Handling

```typescript
try {
  await nubeAuth.login({ provider: 'google' });
} catch (error) {
  if (error.code === 'OAUTH_DENIED') {
    console.log('User cancelled login');
  } else if (error.code === 'PROVIDER_ERROR') {
    console.log('Provider returned an error');
  }
}
```
