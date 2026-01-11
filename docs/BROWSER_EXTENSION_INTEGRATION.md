# Browser Extension Integration Guide for Proofa

**Project**: PinboardGPT Browser Extension  
**Tech Stack**: Vanilla JS (no React)  
**Authentication**: Proofa  
**Last Updated**: January 11, 2026

---

## Architecture Overview

### Components

1. **Homepage** (`pinboardgpt.app`) - Vanilla HTML/CSS/JS
   - Landing page, pricing, docs
   - Handles authentication callback
   - Stores session cookie (`pp_app_session`)

2. **Browser Extension** - Chrome/Firefox Extension
   - **Popup**: Shows user info, license status
   - **Background Script**: Manages auth state, API calls
   - **Content Scripts**: (Optional) Inject functionality into pages

3. **Proofa Gateway** (`api.proofa.sh`)
   - Authentication provider
   - User/license management

---

## Setup: Create App in Proofa

### 1. Admin Creates App

In Proofa Admin Dashboard (`admin.proofa.com`):

```json
{
  "name": "PinboardGPT",
  "slug": "pinboardgpt",
  "allowed_hosts": [
    "pinboardgpt.app",
    "www.pinboardgpt.app"
  ],
  "redirect_uris": [
    "https://pinboardgpt.app/auth/callback",
    "http://localhost:3000/auth/callback"
  ],
  "enabled_providers": ["google", "github"],
  "licensing_required": true,
  "default_license_plan": "trial",
  "app_session_ttl_days": 90
}
```

### 2. Get Credentials

After app creation, note these values:
- **App ID**: `APP0xyz123...` (or slug: `pinboardgpt`)
- **Gateway URL**: `https://api.proofa.sh`
- **API Key**: (Generated automatically in `app_tokens`)

---

## Part 1: Homepage Integration (Vanilla JS)

### File Structure

```
pinboardgpt.app/
├── index.html              # Landing page
├── pricing.html            # Pricing/plans page
├── auth/
│   ├── login.html         # Login page
│   └── callback.html      # OAuth callback handler
├── js/
│   ├── proofa.js          # Proofa client wrapper
│   └── auth.js            # Auth helper functions
└── css/
    └── styles.css
```

### 1. Proofa Client Wrapper (`js/proofa.js`)

```javascript
// js/proofa.js
class ProofaClient {
  constructor(config) {
    this.gatewayUrl = config.gatewayUrl || 'https://api.proofa.sh';
    this.appId = config.appId;
  }

  // Helper: Make authenticated API calls
  async _fetch(endpoint, options = {}) {
    const url = `${this.gatewayUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Critical: sends pp_app_session cookie
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Check if user is authenticated
  async checkAuth() {
    try {
      const data = await this._fetch('/v1/me');
      return {
        loggedIn: true,
        user: data.user,
        license: data.license,
      };
    } catch (error) {
      return { loggedIn: false };
    }
  }

  // Get current user
  async getMe() {
    return this._fetch('/v1/me');
  }

  // Logout
  async logout() {
    return this._fetch('/v1/auth/logout', { method: 'POST' });
  }

  // Get login URL
  getLoginUrl(returnTo = window.location.href) {
    const params = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: `${window.location.origin}/auth/callback`,
      state: btoa(returnTo), // Encode return URL
    });
    return `${this.gatewayUrl}/v1/auth/start?${params}`;
  }
}

// Export for use in other scripts
window.ProofaClient = ProofaClient;

// Initialize global instance
window.proofaClient = new ProofaClient({
  gatewayUrl: 'https://api.proofa.sh',
  appId: 'pinboardgpt',
});
```

### 2. Login Page (`auth/login.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - PinboardGPT</title>
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body>
  <div class="login-container">
    <h1>Welcome to PinboardGPT</h1>
    <p>Sign in to continue</p>
    
    <div class="providers">
      <button onclick="loginWithGoogle()" class="btn btn-google">
        <img src="/icons/google.svg" alt="Google">
        Continue with Google
      </button>
      
      <button onclick="loginWithGitHub()" class="btn btn-github">
        <img src="/icons/github.svg" alt="GitHub">
        Continue with GitHub
      </button>
    </div>
  </div>

  <script src="../js/proofa.js"></script>
  <script>
    function loginWithGoogle() {
      const loginUrl = window.proofaClient.getLoginUrl();
      window.location.href = loginUrl + '&provider=google';
    }

    function loginWithGitHub() {
      const loginUrl = window.proofaClient.getLoginUrl();
      window.location.href = loginUrl + '&provider=github';
    }

    // Or generic login (user picks provider)
    function login() {
      window.location.href = window.proofaClient.getLoginUrl();
    }
  </script>
</body>
</html>
```

### 3. OAuth Callback Handler (`auth/callback.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Authenticating...</title>
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body>
  <div class="callback-container">
    <div class="spinner"></div>
    <p>Completing authentication...</p>
  </div>

  <script src="../js/proofa.js"></script>
  <script>
    (async function() {
      try {
        // Proofa Gateway has already set pp_app_session cookie
        // Just verify it worked
        const auth = await window.proofaClient.checkAuth();
        
        if (auth.loggedIn) {
          // Get return URL from state parameter
          const params = new URLSearchParams(window.location.search);
          const state = params.get('state');
          const returnTo = state ? atob(state) : '/';
          
          // Send message to extension (if installed)
          window.postMessage({ 
            type: 'PROOFA_AUTH_SUCCESS',
            user: auth.user,
            license: auth.license,
          }, window.location.origin);
          
          // Redirect back to where user came from
          setTimeout(() => {
            window.location.href = returnTo;
          }, 500);
        } else {
          throw new Error('Authentication failed');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        document.querySelector('.callback-container').innerHTML = `
          <p style="color: red;">Authentication failed. Please try again.</p>
          <a href="/auth/login">Back to Login</a>
        `;
      }
    })();
  </script>
</body>
</html>
```

### 4. Check Auth State on Homepage

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PinboardGPT - AI-Powered Bookmarks</title>
</head>
<body>
  <nav>
    <div class="logo">PinboardGPT</div>
    <div id="nav-auth">
      <!-- Will be populated by JavaScript -->
    </div>
  </nav>

  <script src="/js/proofa.js"></script>
  <script>
    (async function() {
      const authContainer = document.getElementById('nav-auth');
      
      try {
        const auth = await window.proofaClient.checkAuth();
        
        if (auth.loggedIn) {
          // User is logged in
          authContainer.innerHTML = `
            <span>Welcome, ${auth.user.name}</span>
            <button onclick="handleLogout()">Logout</button>
          `;
        } else {
          // Not logged in
          authContainer.innerHTML = `
            <a href="/auth/login" class="btn">Login</a>
          `;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authContainer.innerHTML = `
          <a href="/auth/login" class="btn">Login</a>
        `;
      }
    })();

    async function handleLogout() {
      try {
        await window.proofaClient.logout();
        window.location.reload();
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  </script>
</body>
</html>
```

---

## Part 2: Browser Extension Integration

### Extension Structure

```
extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── background/
│   └── background.js
├── content/
│   └── content.js (optional)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 1. Manifest (`manifest.json`)

```json
{
  "manifest_version": 3,
  "name": "PinboardGPT",
  "version": "1.0.0",
  "description": "AI-powered bookmark management",
  "permissions": [
    "storage",
    "cookies",
    "tabs"
  ],
  "host_permissions": [
    "https://pinboardgpt.app/*",
    "https://api.proofa.sh/*"
  ],
  "background": {
    "service_worker": "background/background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 2. Background Script (`background/background.js`)

```javascript
// background/background.js

const GATEWAY_URL = 'https://api.proofa.sh';
const HOMEPAGE_URL = 'https://pinboardgpt.app';

// Cache user data in extension storage
let cachedUser = null;
let cachedLicense = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fetch user data from Gateway
async function fetchUserData(forceRefresh = false) {
  const now = Date.now();
  
  // Return cache if fresh
  if (!forceRefresh && cachedUser && (now - lastFetch) < CACHE_TTL) {
    return { user: cachedUser, license: cachedLicense };
  }

  try {
    // Get session cookie from pinboardgpt.app domain
    const cookies = await chrome.cookies.getAll({
      domain: '.pinboardgpt.app',
      name: 'pp_app_session'
    });

    if (cookies.length === 0) {
      // No session cookie found
      return { user: null, license: null };
    }

    // Make authenticated request to Gateway
    const response = await fetch(`${GATEWAY_URL}/v1/me`, {
      credentials: 'include',
      headers: {
        'Cookie': `pp_app_session=${cookies[0].value}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the data
    cachedUser = data.user;
    cachedLicense = data.license;
    lastFetch = now;

    // Store in chrome.storage for persistence
    await chrome.storage.local.set({
      user: data.user,
      license: data.license,
      lastFetch: now
    });

    return data;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    
    // Try to load from storage on error
    const stored = await chrome.storage.local.get(['user', 'license']);
    return {
      user: stored.user || null,
      license: stored.license || null
    };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getUserData') {
    fetchUserData(request.forceRefresh).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === 'login') {
    // Open login page in new tab
    chrome.tabs.create({
      url: `${HOMEPAGE_URL}/auth/login`
    });
    sendResponse({ success: true });
  }

  if (request.action === 'logout') {
    // Clear cache
    cachedUser = null;
    cachedLicense = null;
    chrome.storage.local.clear();
    
    // Call logout endpoint
    fetch(`${GATEWAY_URL}/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'upgradePlan') {
    // Open pricing page
    chrome.tabs.create({
      url: `${HOMEPAGE_URL}/pricing`
    });
    sendResponse({ success: true });
  }
});

// Listen for tab updates to detect auth callback
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.startsWith(`${HOMEPAGE_URL}/auth/callback`)) {
    // Auth callback completed, refresh user data
    setTimeout(() => {
      fetchUserData(true);
    }, 1000);
  }
});

// Initial fetch when extension loads
chrome.runtime.onInstalled.addListener(() => {
  fetchUserData(true);
});
```

### 3. Popup HTML (`popup/popup.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PinboardGPT</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <!-- Loading State -->
    <div id="loading-state" class="state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <!-- Not Logged In State -->
    <div id="logged-out-state" class="state" style="display: none;">
      <div class="header">
        <img src="../icons/icon48.png" alt="PinboardGPT">
        <h1>PinboardGPT</h1>
      </div>
      <p>Sign in to access your bookmarks</p>
      <button id="login-btn" class="btn btn-primary">Login</button>
    </div>

    <!-- Logged In State -->
    <div id="logged-in-state" class="state" style="display: none;">
      <div class="header">
        <img id="user-avatar" src="" alt="Avatar" class="avatar">
        <div>
          <h2 id="user-name"></h2>
          <p id="user-email" class="email"></p>
        </div>
      </div>

      <div class="license-info">
        <div class="license-badge">
          <span id="license-plan" class="plan"></span>
          <span id="license-status" class="status"></span>
        </div>
        <p id="license-expires" class="expires"></p>
      </div>

      <div class="actions">
        <button id="upgrade-btn" class="btn btn-upgrade" style="display: none;">
          Upgrade Plan
        </button>
        <button id="refresh-btn" class="btn btn-secondary">
          Refresh
        </button>
        <button id="logout-btn" class="btn btn-secondary">
          Logout
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div id="error-state" class="state" style="display: none;">
      <p class="error-message">Failed to load user data</p>
      <button id="retry-btn" class="btn">Retry</button>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

### 4. Popup Script (`popup/popup.js`)

```javascript
// popup/popup.js

const states = {
  loading: document.getElementById('loading-state'),
  loggedOut: document.getElementById('logged-out-state'),
  loggedIn: document.getElementById('logged-in-state'),
  error: document.getElementById('error-state'),
};

function showState(stateName) {
  Object.values(states).forEach(el => el.style.display = 'none');
  states[stateName].style.display = 'block';
}

async function loadUserData(forceRefresh = false) {
  try {
    showState('loading');

    const response = await chrome.runtime.sendMessage({
      action: 'getUserData',
      forceRefresh
    });

    if (response.user) {
      renderLoggedInState(response.user, response.license);
    } else {
      showState('loggedOut');
    }
  } catch (error) {
    console.error('Failed to load user data:', error);
    showState('error');
  }
}

function renderLoggedInState(user, license) {
  // Populate user info
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-email').textContent = user.primary_email;
  
  if (user.avatar_url) {
    document.getElementById('user-avatar').src = user.avatar_url;
  }

  // Populate license info
  const planElement = document.getElementById('license-plan');
  const statusElement = document.getElementById('license-status');
  const expiresElement = document.getElementById('license-expires');
  const upgradeBtn = document.getElementById('upgrade-btn');

  if (license) {
    planElement.textContent = license.plan.toUpperCase();
    statusElement.textContent = license.status;
    statusElement.className = `status status-${license.status}`;

    if (license.valid_until) {
      const expiryDate = new Date(license.valid_until * 1000);
      expiresElement.textContent = `Expires: ${expiryDate.toLocaleDateString()}`;
    } else {
      expiresElement.textContent = 'Lifetime license';
    }

    // Show upgrade button if not on highest tier
    if (license.plan === 'free' || license.plan === 'trial') {
      upgradeBtn.style.display = 'block';
    }
  } else {
    planElement.textContent = 'NO LICENSE';
    statusElement.textContent = 'inactive';
    upgradeBtn.style.display = 'block';
  }

  showState('loggedIn');
}

// Event listeners
document.getElementById('login-btn')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'login' });
  window.close(); // Close popup
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'logout' });
  loadUserData(true);
});

document.getElementById('refresh-btn')?.addEventListener('click', () => {
  loadUserData(true);
});

document.getElementById('upgrade-btn')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'upgradePlan' });
  window.close();
});

document.getElementById('retry-btn')?.addEventListener('click', () => {
  loadUserData(true);
});

// Load user data when popup opens
loadUserData();
```

### 5. Popup Styles (`popup/popup.css`)

```css
/* popup/popup.css */
body {
  width: 320px;
  min-height: 200px;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #ffffff;
}

.popup-container {
  padding: 16px;
}

.state {
  text-align: center;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.header h1 {
  margin: 0;
  font-size: 18px;
}

.header h2 {
  margin: 0;
  font-size: 16px;
  text-align: left;
}

.email {
  font-size: 12px;
  color: #666;
  margin: 4px 0 0;
  text-align: left;
}

.license-info {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  margin: 16px 0;
}

.license-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.plan {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background: #d4edda;
  color: #155724;
}

.status-expired {
  background: #f8d7da;
  color: #721c24;
}

.status-trial {
  background: #fff3cd;
  color: #856404;
}

.expires {
  font-size: 12px;
  color: #666;
  margin: 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-upgrade {
  background: #28a745;
  color: white;
}

.btn-upgrade:hover {
  background: #218838;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #dc3545;
  margin: 20px 0;
}
```

---

## Part 3: Payment & Plan Upgrade Flow

### 1. Pricing Page (`pricing.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Pricing - PinboardGPT</title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <nav>
    <div class="logo">PinboardGPT</div>
    <div id="nav-auth"></div>
  </nav>

  <div class="pricing-container">
    <h1>Choose Your Plan</h1>
    
    <div class="plans">
      <!-- Free Plan -->
      <div class="plan-card">
        <h2>Free</h2>
        <div class="price">$0<span>/forever</span></div>
        <ul class="features">
          <li>100 bookmarks</li>
          <li>Basic AI suggestions</li>
          <li>Manual organization</li>
        </ul>
        <button onclick="selectPlan('free')" class="btn">Get Started</button>
      </div>

      <!-- Pro Plan -->
      <div class="plan-card featured">
        <div class="badge">Most Popular</div>
        <h2>Pro</h2>
        <div class="price">$9<span>/month</span></div>
        <ul class="features">
          <li>Unlimited bookmarks</li>
          <li>Advanced AI features</li>
          <li>Auto-tagging & categorization</li>
          <li>Priority support</li>
        </ul>
        <button onclick="selectPlan('pro')" class="btn btn-primary">Upgrade to Pro</button>
      </div>

      <!-- Team Plan -->
      <div class="plan-card">
        <h2>Team</h2>
        <div class="price">$29<span>/month</span></div>
        <ul class="features">
          <li>Everything in Pro</li>
          <li>5 team members</li>
          <li>Shared collections</li>
          <li>Admin dashboard</li>
        </ul>
        <button onclick="selectPlan('team')" class="btn">Get Team</button>
      </div>
    </div>
  </div>

  <script src="/js/proofa.js"></script>
  <script>
    async function selectPlan(planSlug) {
      try {
        // Check if user is logged in
        const auth = await window.proofaClient.checkAuth();
        
        if (!auth.loggedIn) {
          // Redirect to login, return to pricing after
          const returnUrl = encodeURIComponent(window.location.href);
          window.location.href = `/auth/login?return_to=${returnUrl}`;
          return;
        }

        // If user is already on this plan
        if (auth.license?.plan === planSlug) {
          alert('You are already on this plan');
          return;
        }

        // Free plan - just update license (admin action)
        if (planSlug === 'free') {
          alert('Contact support to downgrade to free plan');
          return;
        }

        // Redirect to checkout (implement in Part 4)
        window.location.href = `/checkout?plan=${planSlug}`;
      } catch (error) {
        console.error('Plan selection error:', error);
        alert('Something went wrong. Please try again.');
      }
    }

    // Show user auth status in nav
    (async function() {
      const authContainer = document.getElementById('nav-auth');
      const auth = await window.proofaClient.checkAuth();
      
      if (auth.loggedIn) {
        authContainer.innerHTML = `
          <span>Logged in as ${auth.user.name}</span>
        `;
      } else {
        authContainer.innerHTML = `
          <a href="/auth/login" class="btn">Login</a>
        `;
      }
    })();
  </script>
</body>
</html>
```

### 2. Checkout Flow (Phase 2)

**Note**: Full payment integration requires Proofa's payment system (Stripe/LemonSqueezy). For MVP, you can:

**Option A: Manual License Grants**
- User selects plan on pricing page
- Admin manually grants license via Admin Dashboard
- User sees updated license in extension popup

**Option B: Payment Provider Integration** (Full Implementation)
1. User selects plan → Creates checkout session via Proofa Gateway
2. Redirects to Stripe/LemonSqueezy hosted checkout
3. After payment, webhook updates license in Proofa Core
4. Extension polls for license update

---

## Complete End-to-End Flow

### User Journey

```
1. User installs browser extension
   ↓
2. Opens extension popup → sees "Login" button
   ↓
3. Clicks "Login" → opens pinboardgpt.app/auth/login in new tab
   ↓
4. Clicks "Continue with Google"
   ↓
5. Redirects to api.proofa.sh/v1/auth/start
   ↓
6. Proofa redirects to Google OAuth
   ↓
7. User authenticates with Google
   ↓
8. Proofa creates session, redirects to pinboardgpt.app/auth/callback
   ↓
9. Callback page sets pp_app_session cookie, closes tab
   ↓
10. Extension background script detects auth completion
    ↓
11. Background script fetches user data from Gateway
    ↓
12. Popup shows user profile + license info
    ↓
13. User clicks "Upgrade Plan" in popup
    ↓
14. Opens pinboardgpt.app/pricing in new tab
    ↓
15. User selects plan and completes checkout
    ↓
16. Webhook updates license in Proofa
    ↓
17. Extension polls and refreshes license data
    ↓
18. Popup shows updated license (e.g., "PRO")
```

---

## Testing Checklist

### Homepage Testing
- [ ] Login redirects to Proofa correctly
- [ ] Callback sets pp_app_session cookie
- [ ] checkAuth() returns user data after login
- [ ] Logout clears session cookie
- [ ] Navigation shows correct auth state

### Extension Testing
- [ ] Popup shows "Login" when not authenticated
- [ ] Login button opens homepage login
- [ ] After auth, popup shows user profile
- [ ] License info displays correctly
- [ ] Refresh button updates data
- [ ] Logout clears cached data
- [ ] Upgrade button opens pricing page

### Integration Testing
- [ ] Cookie domain matches (pinboardgpt.app)
- [ ] Extension can read cookies from homepage domain
- [ ] Background script fetches user data successfully
- [ ] Auth state syncs between homepage and extension
- [ ] License updates reflect in extension within 5 minutes

---

## Security Considerations

1. **Cookie Security**
   - Ensure `pp_app_session` has `Secure` and `HttpOnly` flags
   - Use `SameSite=Lax` to prevent CSRF
   - Domain: `.pinboardgpt.app` (allows subdomain access)

2. **Extension Permissions**
   - Only request necessary permissions (`storage`, `cookies`, `tabs`)
   - Limit `host_permissions` to your domains only

3. **API Security**
   - Always use `credentials: 'include'` for authenticated requests
   - Never expose API keys in client-side code
   - Validate all user inputs

4. **Content Security Policy**
   - Set strict CSP headers on homepage
   - Avoid inline scripts where possible

---

## Troubleshooting

### Issue: Extension can't read cookies
**Solution**: Ensure `host_permissions` includes `https://pinboardgpt.app/*`

### Issue: Auth callback doesn't set cookie
**Solution**: Check redirect_uri is allowlisted in Proofa app config

### Issue: User data not updating
**Solution**: Clear cache by clicking "Refresh" or check cache TTL

### Issue: Login opens but nothing happens
**Solution**: Check browser console for errors, verify Gateway URL

---

## Next Steps

1. **MVP**: Implement basic auth flow (login/logout, show user in popup)
2. **Phase 2**: Add payment integration for plan upgrades
3. **Phase 3**: Add extension features (bookmark management, AI suggestions)
4. **Phase 4**: Analytics, usage tracking, advanced features

---

## Support

For integration help:
- **Proofa Docs**: https://docs.proofa.com
- **Contact**: dev@pinboardgpt.app

**Last Updated**: January 11, 2026
