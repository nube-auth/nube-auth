# PinboardGPT Extension - Integration Files

These files are ready to use in your `pinboard-gpt-extension` project.

## Setup Instructions

1. **Copy these files to your extension folder**:
   ```bash
   # From proofa-core/docs/extension-templates/
   cp manifest.json ../../../pinboard-gpt-extension/
   cp background.js ../../../pinboard-gpt-extension/
   cp popup.html ../../../pinboard-gpt-extension/popup/
   cp popup.js ../../../pinboard-gpt-extension/popup/
   cp popup.css ../../../pinboard-gpt-extension/popup/
   ```

2. **Create icons folder** (if not exists):
   ```bash
   mkdir -p ../../../pinboard-gpt-extension/icons
   ```

3. **Add icon files**:
   - `icon16.png` (16x16)
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)

4. **Update Proofa app configuration**:
   - Go to Proofa Admin Dashboard
   - Update allowed_hosts: `["pinboardgpt.app", "www.pinboardgpt.app"]`
   - Update redirect_uris: `["https://pinboardgpt.app/auth/callback"]`

## Testing Locally

### Option 1: Load Unpacked Extension (Development)

1. Open Chrome/Edge and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select your `pinboard-gpt-extension` folder
5. The extension will appear in your toolbar

### Option 2: Test with localhost

Update `manifest.json` to include localhost:
```json
"host_permissions": [
  "https://pinboardgpt.app/*",
  "http://localhost:3000/*",
  "https://api.proofa.sh/*"
]
```

And in `background.js`:
```javascript
const CONFIG = {
  GATEWAY_URL: 'https://api.proofa.sh',
  HOMEPAGE_URL: 'http://localhost:3000', // For testing
  // ...
};
```

## File Structure

Your extension should look like:
```
pinboard-gpt-extension/
├── manifest.json
├── background.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Key Features Implemented

### Background Script (`background.js`)
- ✅ Fetches user data from Proofa Gateway
- ✅ Caches data for 5 minutes
- ✅ Monitors auth callback URLs
- ✅ Handles login/logout
- ✅ Reads session cookie from pinboardgpt.app domain

### Popup (`popup.html/js/css`)
- ✅ Shows user profile (name, email, avatar)
- ✅ Displays license info (plan, status, expiry)
- ✅ Login/logout functionality
- ✅ Upgrade plan button
- ✅ Refresh data button
- ✅ Loading/error states

## Configuration

All configuration is in `background.js`:

```javascript
const CONFIG = {
  GATEWAY_URL: 'https://api.proofa.sh',
  HOMEPAGE_URL: 'https://pinboardgpt.app',
  APP_ID: 'pinboardgpt',
  COOKIE_NAME: 'pp_app_session',
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
};
```

## Next Steps

1. **Homepage Integration**: Implement auth pages on pinboardgpt.app
   - See `BROWSER_EXTENSION_INTEGRATION.md` for homepage code

2. **Create Proofa App**: Set up app in Proofa Admin Dashboard
   - Get App ID and configure domains

3. **Test Flow**:
   - Install extension → Click Login
   - Opens pinboardgpt.app/auth/login
   - Select OAuth provider (Google/GitHub)
   - Redirect to Proofa → Authenticate
   - Callback to pinboardgpt.app/auth/callback
   - Extension popup shows user profile

4. **Add Features**:
   - Bookmark management
   - AI suggestions
   - Collections/tags
   - Search functionality

## Troubleshooting

### Extension can't read cookies
**Solution**: Verify `host_permissions` includes `https://pinboardgpt.app/*`

### User data not loading
**Solution**: 
1. Check if cookie exists in Chrome DevTools (Application → Cookies)
2. Verify Gateway URL is correct
3. Check console logs in background script (chrome://extensions → Details → Inspect service worker)

### Login doesn't work
**Solution**: Verify redirect_uri is allowlisted in Proofa app config

### Popup shows error
**Solution**: Open DevTools for popup (right-click popup → Inspect) and check console

## Support

For questions or issues:
- Check `BROWSER_EXTENSION_INTEGRATION.md` for full guide
- Review Proofa documentation
- Contact dev@pinboardgpt.app
