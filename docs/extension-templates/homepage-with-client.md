# Using @nube-auth/client in Vanilla JS Homepage

## Option A: Bundle with esbuild (Recommended)

### 1. Setup
```bash
cd pinboardgpt-homepage
npm init -y
npm install @nube-auth/client esbuild --save-dev
```

### 2. Create source file (`src/nube-auth.js`)
```javascript
import { NubeAuthClient } from '@nube-auth/client';

// Initialize client
export const nubeAuthClient = new NubeAuthClient({
  gatewayUrl: 'https://api.nubeauth.com',
  appId: 'pinboardgpt',
});

// Export helper functions
export async function checkAuth() {
  try {
    return await nube-authClient.auth.checkStatus();
  } catch (error) {
    return { loggedIn: false };
  }
}

export async function getMe() {
  return await nube-authClient.me.get();
}

export async function logout() {
  return await nube-authClient.auth.logout();
}

export function getLoginUrl(returnTo = window.location.href) {
  const params = new URLSearchParams({
    app_id: 'pinboardgpt',
    redirect_uri: `${window.location.origin}/auth/callback`,
    state: btoa(returnTo),
  });
  return `https://api.nubeauth.com/v1/auth/start?${params}`;
}
```

### 3. Build script (`package.json`)
```json
{
  "scripts": {
    "build": "esbuild src/nube-auth.js --bundle --outfile=dist/nube-auth.js --format=esm",
    "watch": "esbuild src/nube-auth.js --bundle --outfile=dist/nube-auth.js --format=esm --watch"
  }
}
```

### 4. Use in HTML
```html
<!DOCTYPE html>
<html>
<head>
  <title>PinboardGPT</title>
</head>
<body>
  <div id="auth-status"></div>

  <script type="module">
    import { checkAuth, getLoginUrl, logout } from './dist/nube-auth.js';

    // Check auth on load
    (async function() {
      const auth = await checkAuth();
      const container = document.getElementById('auth-status');
      
      if (auth.loggedIn) {
        container.innerHTML = `
          <span>Welcome, ${auth.user.name}</span>
          <button onclick="handleLogout()">Logout</button>
        `;
      } else {
        container.innerHTML = `
          <a href="${getLoginUrl()}">Login</a>
        `;
      }
    })();

    // Make logout available globally
    window.handleLogout = async function() {
      await logout();
      window.location.reload();
    };
  </script>
</body>
</html>
```

---

## Option B: Use Vanilla JS Wrapper (No Build Step)

Keep the simple wrapper from the integration guide - it's actually better for a basic homepage:

```html
<!DOCTYPE html>
<html>
<head>
  <title>PinboardGPT</title>
</head>
<body>
  <div id="auth-status"></div>

  <script src="/js/nube-auth-simple.js"></script>
  <script>
    const nubeAuth = new Nube AuthAuth('https://api.nubeauth.com', 'pinboardgpt');

    (async function() {
      const auth = await nubeAuth.checkAuth();
      const container = document.getElementById('auth-status');
      
      if (auth.loggedIn) {
        container.innerHTML = `
          <span>Welcome, ${auth.user.name}</span>
          <button onclick="handleLogout()">Logout</button>
        `;
      } else {
        container.innerHTML = `
          <a href="${nube-auth.getLoginUrl()}">Login</a>
        `;
      }
    })();

    async function handleLogout() {
      await nubeAuth.logout();
      window.location.reload();
    }
  </script>
</body>
</html>
```

Where `nube-auth-simple.js` is:

```javascript
class Nube AuthAuth {
  constructor(gatewayUrl, appId) {
    this.gatewayUrl = gatewayUrl;
    this.appId = appId;
  }

  async _fetch(endpoint, options = {}) {
    const response = await fetch(`${this.gatewayUrl}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async checkAuth() {
    try {
      const data = await this._fetch('/v1/me');
      return { loggedIn: true, user: data.user, license: data.license };
    } catch {
      return { loggedIn: false };
    }
  }

  async logout() {
    return this._fetch('/v1/auth/logout', { method: 'POST' });
  }

  getLoginUrl(returnTo = window.location.href) {
    const params = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: `${window.location.origin}/auth/callback`,
      state: btoa(returnTo),
    });
    return `${this.gatewayUrl}/v1/auth/start?${params}`;
  }
}
```

---

## Recommendation

**For PinboardGPT Homepage**: Use **Option B (Vanilla JS)** because:
- ✅ No build process needed
- ✅ Simple, lightweight (~2KB)
- ✅ All you need is basic auth (login/logout/check status)
- ✅ Easy to deploy (just upload HTML/JS files)

**For PinboardGPT Extension**: Keep the current approach (background script with fetch)
- ✅ Extensions can't use npm packages directly anyway
- ✅ Chrome extensions have their own packaging

**When to use @nube-auth/client with bundler**:
- ❌ Complex admin dashboard with many API calls
- ❌ Need TypeScript type safety
- ❌ Using a framework (React/Vue/Svelte)
- ❌ Need advanced features (retry logic, interceptors, etc.)

---

## Final Structure

```
pinboardgpt-homepage/
├── index.html              # Landing page
├── auth/
│   ├── login.html         # Login page
│   └── callback.html      # OAuth callback
├── js/
│   └── nube-auth-simple.js   # Simple auth wrapper (~2KB)
└── css/
    └── styles.css

pinboard-gpt-extension/
├── manifest.json
├── background.js          # Uses fetch directly
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── icons/
```

**Verdict**: Keep the vanilla JS wrapper for the homepage. No need for `@nube-auth/client` bundling.
