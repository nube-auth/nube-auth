---
title: Integration Quick Start
description: Integrate Nube Auth authentication into your application in minutes
---


Get Nube Auth authentication running in your app quickly. This guide covers the essential steps to integrate Nube Auth.

## Overview

Integrating Nube Auth into your application involves:

1. **Create an app** in the Admin Dashboard
2. **Configure OAuth** providers
3. **Add authentication** to your application
4. **Handle callbacks** after login
5. **Verify sessions** on protected routes

## Prerequisites

Before starting, you need:
- A Nube Auth account at [admin.nubeauth.com](https://admin.nubeauth.com)
- A project and app created
- OAuth providers configured (Google, GitHub)

## Installation

### For React Applications

```bash
npm install @nube-auth/client @nube-auth/react
# or
pnpm add @nube-auth/client @nube-auth/react
# or
yarn add @nube-auth/client @nube-auth/react
```

### For Vanilla JavaScript

```bash
npm install @nube-auth/client
# or
pnpm add @nube-auth/client
```

### For Browser Extensions

No npm package needed! Use vanilla JavaScript with fetch API.

<Aside type="tip">
  Browser extensions cannot use npm packages directly. See the [Browser Extension Guide](/integration/browser-extension) for details.
</Aside>

## Configuration

### Get Your App Credentials

1. Go to [Admin Dashboard](https://admin.nubeauth.com)
2. Navigate to your **App**
3. Go to **API Keys** or **Integration Guide**
4. Copy your **App ID** and **App Token**

Example credentials:
```
App ID: APP0abc123xyz...
App Token: nube_sk_live_...
```

<Aside type="caution">
  Never commit your App Token to version control! Use environment variables.
</Aside>

### Environment Variables

Create a `.env` file:

```bash
VITE_NUBE_AUTH_APP_ID=APP0abc123xyz...
VITE_NUBE_AUTH_GATEWAY_URL=https://api.nubeauth.com
```

For backend (Node.js):
```bash
NUBE_AUTH_APP_TOKEN=nube_sk_live_...
NUBE_AUTH_GATEWAY_URL=https://api.nubeauth.com
```

## React Integration

### Setup Provider

Wrap your app with `NubeAuthProvider`:

```tsx
// main.tsx or App.tsx
import { NubeAuthProvider } from '@nube-auth/react';

function App() {
  return (
    <NubeAuthProvider
      appId={import.meta.env.VITE_NUBE_AUTH_APP_ID}
      gatewayUrl={import.meta.env.VITE_NUBE_AUTH_GATEWAY_URL}
    >
      <YourApp />
    </NubeAuthProvider>
  );
}
```

### Add Login Button

```tsx
import { useNube Auth } from '@nube-auth/react';

function LoginPage() {
  const { login, isLoading } = useNube Auth();

  const handleGoogleLogin = () => {
    login({ provider: 'google' });
  };

  const handleGitHubLogin = () => {
    login({ provider: 'github' });
  };

  return (
    <div>
      <h1>Login</h1>
      <button onClick={handleGoogleLogin} disabled={isLoading}>
        Login with Google
      </button>
      <button onClick={handleGitHubLogin} disabled={isLoading}>
        Login with GitHub
      </button>
    </div>
  );
}
```

### Handle Callback

Create a callback page:

```tsx
// pages/callback.tsx
import { useNube Auth } from '@nube-auth/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function CallbackPage() {
  const { handleCallback } = useNube Auth();
  const navigate = useNavigate();

  useEffect(() => {
    handleCallback()
      .then(() => {
        navigate('/dashboard');
      })
      .catch((error) => {
        console.error('Login failed:', error);
        navigate('/login');
      });
  }, []);

  return <div>Logging in...</div>;
}
```

### Protect Routes

```tsx
import { useNube Auth } from '@nube-auth/react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useNube Auth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

// Usage in router
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### Display User Info

```tsx
import { useNube Auth } from '@nube-auth/react';

function UserProfile() {
  const { user, logout } = useNube Auth();

  if (!user) return null;

  return (
    <div>
      <img src={user.avatar_url} alt={user.name} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Vanilla JavaScript Integration

### Initialize Client

```typescript
import { NubeAuthClient } from '@nube-auth/client';

const nubeAuth = new NubeAuthClient({
  appId: 'APP0abc123xyz...',
  gatewayUrl: 'https://api.nubeauth.com',
});
```

### Add Login

```html
<button id="google-login">Login with Google</button>
<button id="github-login">Login with GitHub</button>

<script type="module">
  import { NubeAuthClient } from '@nube-auth/client';

  const nubeAuth = new NubeAuthClient({
    appId: 'APP0abc123xyz...',
    gatewayUrl: 'https://api.nubeauth.com',
  });

  document.getElementById('google-login').addEventListener('click', () => {
    nubeAuth.login({ provider: 'google' });
  });

  document.getElementById('github-login').addEventListener('click', () => {
    nubeAuth.login({ provider: 'github' });
  });
</script>
```

### Handle Callback

```html
<!-- callback.html -->
<div id="status">Logging in...</div>

<script type="module">
  import { NubeAuthClient } from '@nube-auth/client';

  const nubeAuth = new NubeAuthClient({
    appId: 'APP0abc123xyz...',
    gatewayUrl: 'https://api.nubeauth.com',
  });

  nube-auth.handleCallback()
    .then(() => {
      window.location.href = '/dashboard.html';
    })
    .catch((error) => {
      document.getElementById('status').textContent = 'Login failed';
      console.error(error);
    });
</script>
```

### Check Authentication

```javascript
// Get current user
const user = await nubeAuth.getUser();

if (user) {
  console.log('Logged in as:', user.email);
  document.getElementById('user-name').textContent = user.name;
} else {
  console.log('Not logged in');
  window.location.href = '/login.html';
}
```

## Backend Verification

### Verify Sessions

On your backend, verify user sessions:

```typescript
import { NubeAuthClient } from '@nube-auth/client';

const nubeAuth = new NubeAuthClient({
  appId: process.env.NUBE_AUTH_APP_ID,
  appToken: process.env.NUBE_AUTH_APP_TOKEN,
  gatewayUrl: process.env.NUBE_AUTH_GATEWAY_URL,
});

// Express middleware example
async function authenticateUser(req, res, next) {
  const sessionCookie = req.cookies.pp_app_session;

  if (!sessionCookie) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const session = await nube-auth.verifySession(sessionCookie);
    req.user = session.user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid session' });
  }
}

// Use in routes
app.get('/api/protected', authenticateUser, (req, res) => {
  res.json({ message: 'Protected data', user: req.user });
});
```

### Check License

Verify user has a valid license:

```typescript
async function requireLicense(req, res, next) {
  const user = req.user; // From authenticateUser middleware

  try {
    const license = await nube-auth.getLicense(user.userId);

    if (!license || license.status !== 'active') {
      return res.status(403).json({ error: 'No active license' });
    }

    req.license = license;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'License check failed' });
  }
}

// Use in premium routes
app.get('/api/premium', authenticateUser, requireLicense, (req, res) => {
  res.json({ message: 'Premium content', license: req.license });
});
```

## Browser Extension Integration

For browser extensions, use vanilla JavaScript with fetch:

```javascript
// background.js (service worker)
async function handleLogin(provider) {
  const appId = 'APP0abc123xyz...';
  const gatewayUrl = 'https://api.nubeauth.com';
  const redirectUri = chrome.identity.getRedirectURL('callback');

  const authUrl = `${gatewayUrl}/v1/auth/start?app_id=${appId}&provider=${provider}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: true,
    },
    async (callbackUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Auth failed:', chrome.runtime.lastError);
        return;
      }

      // Extract session cookie and store
      const url = new URL(callbackUrl);
      const params = new URLSearchParams(url.search);
      const session = params.get('session');

      if (session) {
        await chrome.storage.local.set({ session });
        console.log('Login successful');
      }
    }
  );
}
```

See the complete [Browser Extension Integration Guide](/integration/browser-extension) for detailed instructions.

## Testing Your Integration

### 1. Test Login Flow

1. Click "Login with Google" button
2. Verify redirect to Google OAuth
3. Grant permissions
4. Check callback handling
5. Confirm redirect to dashboard

### 2. Test Protected Routes

1. Navigate to protected page while logged out
2. Verify redirect to login
3. Login and revisit protected page
4. Confirm access granted

### 3. Test Logout

1. Click logout button
2. Verify session cleared
3. Attempt to access protected route
4. Confirm redirect to login

## Common Issues

### Redirect URI Mismatch

**Error:** `redirect_uri_mismatch`

**Solution:**
1. Go to Admin Dashboard → App → OAuth Config
2. Add your callback URL to **Redirect URIs**
3. Include protocol and exact path: `https://example.com/callback`

### CORS Errors

**Error:** `Access-Control-Allow-Origin`

**Solution:**
1. Go to Admin Dashboard → App → Settings
2. Add your domain to **Allowed Origins**
3. Include protocol: `https://example.com`

### Cookie Not Set

**Error:** Session cookie not set after login

**Solution:**
1. Ensure your site uses HTTPS in production
2. Check `SameSite=Lax` cookie policy
3. Verify domain matches (no subdomain mismatch)

### Session Expires Immediately

**Error:** User logged out right after login

**Solution:**
1. Check session TTL in App Settings
2. Verify session cookie not being cleared by browser
3. Disable privacy extensions temporarily

## Next Steps

- [Browser Extension Guide](/integration/browser-extension) - Complete extension integration
- [React Hooks Reference](/integration/react-hooks) - All available hooks
- [API Reference](/api/rest) - Complete REST API docs
- [Admin Dashboard](/dashboards/admin-dashboard) - Configure your app

## Support

Need help? 

- 📧 Email: support@nubeauth.com
- 📖 Docs: [docs.nubeauth.com](https://docs.nubeauth.com)
- 💬 GitHub: [github.com/0xdps/nube-auth](https://github.com/0xdps/nube-auth)
