---
title: Browser Extension Integration
description: Complete guide to integrating Proofa authentication into Chrome/Firefox extensions
---


Learn how to integrate Proofa authentication into your browser extension (Chrome, Firefox, Edge).

## Overview

This guide covers:
- Manifest V3 configuration
- OAuth authentication flow
- Session management in extensions
- Background service worker setup
- Popup UI integration

<Aside type="note">
  This guide uses Manifest V3, the latest extension standard required for Chrome and recommended for Firefox.
</Aside>

## Prerequisites

- Chrome/Firefox browser
- Basic understanding of browser extensions
- Proofa app created in Admin Dashboard
- OAuth providers configured

## Project Structure

```
extension/
├── manifest.json           # Extension manifest
├── background.js          # Service worker (handles auth)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── content.js            # Content script (optional)
└── icons/                # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Manifest Configuration

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Your Extension Name",
  "version": "1.0.0",
  "description": "Your extension description",
  
  "permissions": [
    "storage",
    "identity",
    "cookies"
  ],
  
  "host_permissions": [
    "https://api.proofa.sh/*",
    "https://your-app-domain.com/*"
  ],
  
  "background": {
    "service_worker": "background.js"
  },
  
  "action": {
    "default_popup": "popup.html",
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

<Aside type="tip">
  Add your app's domain to `host_permissions` to enable cookie access.
</Aside>

## Background Service Worker

Create `background.js` to handle authentication:

```javascript
// background.js

const CONFIG = {
  appId: 'APP0abc123xyz...',
  gatewayUrl: 'https://api.proofa.sh',
  appDomain: 'https://your-app-domain.com',
};

// Handle login request from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'login') {
    handleLogin(request.provider)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'logout') {
    handleLogout()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'getUser') {
    getUser()
      .then((user) => sendResponse({ success: true, user }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// OAuth login flow
async function handleLogin(provider) {
  const authUrl = `${CONFIG.gatewayUrl}/v1/auth/start?` +
    `app_id=${CONFIG.appId}&` +
    `provider=${provider}&` +
    `redirect_uri=${encodeURIComponent(CONFIG.appDomain + '/auth/callback')}`;

  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: authUrl, active: true }, (tab) => {
      // Listen for the callback
      const tabId = tab.id;
      
      chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
        if (updatedTabId === tabId && changeInfo.url) {
          const url = new URL(changeInfo.url);
          
          // Check if this is the callback URL
          if (url.origin === CONFIG.appDomain && url.pathname === '/auth/callback') {
            // Extract session from URL or cookie
            chrome.cookies.get({
              url: CONFIG.appDomain,
              name: 'pp_app_session'
            }, async (cookie) => {
              if (cookie) {
                // Store session
                await chrome.storage.local.set({ 
                  session: cookie.value,
                  sessionExpiry: Date.now() + (365 * 24 * 60 * 60 * 1000) // 365 days
                });
                
                // Close the tab
                chrome.tabs.remove(tabId);
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
              } else {
                reject(new Error('No session cookie found'));
              }
            });
          }
        }
      });
    });
  });
}

// Logout
async function handleLogout() {
  // Clear local storage
  await chrome.storage.local.remove(['session', 'sessionExpiry', 'user']);
  
  // Delete cookie
  await chrome.cookies.remove({
    url: CONFIG.appDomain,
    name: 'pp_app_session'
  });
  
  // Call logout endpoint
  await fetch(`${CONFIG.gatewayUrl}/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

// Get current user
async function getUser() {
  const { session, sessionExpiry } = await chrome.storage.local.get(['session', 'sessionExpiry']);
  
  if (!session || Date.now() > sessionExpiry) {
    throw new Error('Not authenticated');
  }
  
  // Check cache first
  const { user } = await chrome.storage.local.get('user');
  if (user) {
    return user;
  }
  
  // Fetch from API
  const response = await fetch(`${CONFIG.gatewayUrl}/v1/me`, {
    headers: {
      'Cookie': `pp_app_session=${session}`
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  
  const data = await response.json();
  
  // Cache user data
  await chrome.storage.local.set({ user: data.user });
  
  return data.user;
}
```

## Popup UI

Create `popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 300px;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .login-view, .user-view {
      display: none;
    }
    
    .login-view.active, .user-view.active {
      display: block;
    }
    
    button {
      width: 100%;
      padding: 12px;
      margin: 8px 0;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    
    .btn-google {
      background: #4285f4;
      color: white;
    }
    
    .btn-github {
      background: #24292e;
      color: white;
    }
    
    .btn-logout {
      background: #ef4444;
      color: white;
    }
    
    .user-info {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin-bottom: 12px;
    }
    
    .loading {
      text-align: center;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div id="loading" class="loading">
    <p>Loading...</p>
  </div>
  
  <div id="loginView" class="login-view">
    <h2>Login to Your Extension</h2>
    <button id="googleLogin" class="btn-google">Login with Google</button>
    <button id="githubLogin" class="btn-github">Login with GitHub</button>
  </div>
  
  <div id="userView" class="user-view">
    <div class="user-info">
      <img id="userAvatar" class="avatar" src="" alt="User avatar">
      <h3 id="userName"></h3>
      <p id="userEmail"></p>
    </div>
    <button id="logoutBtn" class="btn-logout">Logout</button>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Create `popup.js`:

```javascript
// popup.js

// Check authentication status on popup open
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getUser' });
    
    if (response.success && response.user) {
      showUserView(response.user);
    } else {
      showLoginView();
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    showLoginView();
  }
});

// Login buttons
document.getElementById('googleLogin')?.addEventListener('click', async () => {
  await handleLogin('google');
});

document.getElementById('githubLogin')?.addEventListener('click', async () => {
  await handleLogin('github');
});

// Logout button
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await handleLogout();
});

async function handleLogin(provider) {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('loginView').classList.remove('active');
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'login',
      provider,
    });
    
    if (response.success) {
      // Refresh to show user view
      const userResponse = await chrome.runtime.sendMessage({ action: 'getUser' });
      if (userResponse.success) {
        showUserView(userResponse.user);
      }
    } else {
      alert('Login failed: ' + response.error);
      showLoginView();
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed');
    showLoginView();
  }
  
  document.getElementById('loading').style.display = 'none';
}

async function handleLogout() {
  try {
    await chrome.runtime.sendMessage({ action: 'logout' });
    showLoginView();
  } catch (error) {
    console.error('Logout error:', error);
    alert('Logout failed');
  }
}

function showLoginView() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('loginView').classList.add('active');
  document.getElementById('userView').classList.remove('active');
}

function showUserView(user) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('loginView').classList.remove('active');
  document.getElementById('userView').classList.add('active');
  
  document.getElementById('userAvatar').src = user.avatar_url || '/icons/icon48.png';
  document.getElementById('userName').textContent = user.name || 'Anonymous';
  document.getElementById('userEmail').textContent = user.email || '';
}
```

## Content Script (Optional)

If you need to access auth in content scripts:

```javascript
// content.js

// Get current user from background
async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getUser' }, (response) => {
      if (response.success) {
        resolve(response.user);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

// Use in your content script
(async () => {
  try {
    const user = await getCurrentUser();
    console.log('Logged in as:', user.email);
    
    // Do something with user data
    injectUserInfo(user);
  } catch (error) {
    console.log('Not authenticated');
  }
})();
```

Add to `manifest.json`:

```json
{
  "content_scripts": [
    {
      "matches": ["https://your-target-site.com/*"],
      "js": ["content.js"]
    }
  ]
}
```

## Testing Your Extension

<Steps>

1. **Load Extension**
   - Open Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select your extension directory

2. **Test Login**
   - Click extension icon
   - Click "Login with Google"
   - Complete OAuth flow
   - Verify popup shows user info

3. **Test Persistence**
   - Close and reopen popup
   - Verify user still logged in
   - Restart browser and check again

4. **Test Logout**
   - Click "Logout" button
   - Verify popup shows login view
   - Check session cleared in storage

</Steps>

## Security Best Practices

### 1. Never Hardcode Secrets

```javascript
// ❌ DON'T: Hardcode app token
const appToken = 'proofa_sk_live_abc123...';

// ✅ DO: Only use public App ID
const appId = 'APP0abc123...';
```

<Aside type="caution">
  **Never** include your App Token in extension code. App ID is safe to expose.
</Aside>

### 2. Validate Redirect URIs

Ensure callback URL matches exactly:

```javascript
const VALID_CALLBACK_PATH = '/auth/callback';

if (url.pathname !== VALID_CALLBACK_PATH) {
  return; // Ignore non-callback URLs
}
```

### 3. Use Secure Storage

```javascript
// Store sensitive data properly
await chrome.storage.local.set({
  session: sessionValue,
  sessionExpiry: Date.now() + ttl,
});

// Clear on logout
await chrome.storage.local.clear();
```

### 4. Handle Session Expiry

```javascript
async function isSessionValid() {
  const { sessionExpiry } = await chrome.storage.local.get('sessionExpiry');
  return Date.now() < sessionExpiry;
}
```

## Common Issues

### Cookies Not Accessible

**Problem:** Cannot read `pp_app_session` cookie

**Solution:**
1. Add domain to `host_permissions` in manifest
2. Ensure HTTPS in production
3. Check cookie SameSite policy

### OAuth Redirect Fails

**Problem:** OAuth window doesn't close

**Solution:**
1. Verify redirect URI in Admin Dashboard
2. Check callback URL handling
3. Ensure tab listener is set up correctly

### Session Not Persisting

**Problem:** User logged out on browser restart

**Solution:**
1. Check `chrome.storage.local` (not `sessionStorage`)
2. Verify session expiry is set correctly
3. Ensure session cookie has long TTL

## Deployment

### Chrome Web Store

1. Create developer account
2. Prepare store listing
3. Upload extension ZIP
4. Submit for review

### Firefox Add-ons

1. Create Mozilla account
2. Package extension: `web-ext build`
3. Upload to [addons.mozilla.org](https://addons.mozilla.org)
4. Submit for review

### Edge Add-ons

Chrome extensions work on Edge with no changes!

## Next Steps

- [Integration Quick Start](/integration/quickstart) - General integration guide
- [Admin Dashboard](/dashboards/admin-dashboard) - Configure OAuth providers
- [API Reference](/api/rest) - API documentation

## Support

Need help with your extension?

- 📧 Email: support@proofa.io
- 💬 GitHub Issues: [github.com/0xdps/proofa-core/issues](https://github.com/0xdps/proofa-core/issues)
