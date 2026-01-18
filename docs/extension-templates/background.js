// background.js - Service Worker for PinboardGPT Extension

const CONFIG = {
  GATEWAY_URL: 'https://api.proofa.sh',
  HOMEPAGE_URL: 'https://pinboardgpt.app',
  APP_ID: 'pinboardgpt',
  COOKIE_NAME: 'pp_app_session',
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
};

// In-memory cache
let userCache = {
  user: null,
  license: null,
  lastFetch: 0,
};

/**
 * Fetch user data from Proofa Gateway
 * @param {boolean} forceRefresh - Skip cache and fetch fresh data
 * @returns {Promise<{user: Object|null, license: Object|null}>}
 */
async function fetchUserData(forceRefresh = false) {
  const now = Date.now();

  // Return cache if fresh and not forcing refresh
  if (!forceRefresh && userCache.user && (now - userCache.lastFetch) < CONFIG.CACHE_TTL) {
    return { user: userCache.user, license: userCache.license };
  }

  try {
    // Get session cookie from pinboardgpt.app domain
    const cookies = await chrome.cookies.getAll({
      domain: '.pinboardgpt.app',
      name: CONFIG.COOKIE_NAME,
    });

    if (cookies.length === 0) {
      console.log('No session cookie found');
      return { user: null, license: null };
    }

    const sessionCookie = cookies[0].value;

    // Make authenticated request to Gateway
    const response = await fetch(`${CONFIG.GATEWAY_URL}/v1/me`, {
      method: 'GET',
      headers: {
        'Cookie': `${CONFIG.COOKIE_NAME}=${sessionCookie}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('Session expired or invalid');
        // Clear cache
        userCache = { user: null, license: null, lastFetch: 0 };
        await chrome.storage.local.clear();
        return { user: null, license: null };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Update cache
    userCache.user = data.user;
    userCache.license = data.license;
    userCache.lastFetch = now;

    // Persist to storage
    await chrome.storage.local.set({
      user: data.user,
      license: data.license,
      lastFetch: now,
    });

    console.log('User data fetched successfully:', data.user?.name);
    return data;
  } catch (error) {
    console.error('Failed to fetch user data:', error);

    // Try to load from storage on error
    try {
      const stored = await chrome.storage.local.get(['user', 'license', 'lastFetch']);
      if (stored.user && stored.lastFetch) {
        userCache.user = stored.user;
        userCache.license = stored.license;
        userCache.lastFetch = stored.lastFetch;
        return {
          user: stored.user || null,
          license: stored.license || null,
        };
      }
    } catch (storageError) {
      console.error('Failed to load from storage:', storageError);
    }

    return { user: null, license: null };
  }
}

/**
 * Open login page in a new tab
 */
function openLoginPage() {
  chrome.tabs.create({
    url: `${CONFIG.HOMEPAGE_URL}/auth/login`,
  });
}

/**
 * Open pricing page in a new tab
 */
function openPricingPage() {
  chrome.tabs.create({
    url: `${CONFIG.HOMEPAGE_URL}/pricing`,
  });
}

/**
 * Logout user and clear all data
 */
async function logout() {
  try {
    // Get session cookie
    const cookies = await chrome.cookies.getAll({
      domain: '.pinboardgpt.app',
      name: CONFIG.COOKIE_NAME,
    });

    if (cookies.length > 0) {
      const sessionCookie = cookies[0].value;

      // Call logout endpoint
      await fetch(`${CONFIG.GATEWAY_URL}/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Cookie': `${CONFIG.COOKIE_NAME}=${sessionCookie}`,
        },
        credentials: 'include',
      });
    }
  } catch (error) {
    console.error('Logout request failed:', error);
  }

  // Clear cache
  userCache = { user: null, license: null, lastFetch: 0 };

  // Clear storage
  await chrome.storage.local.clear();

  console.log('Logged out successfully');
}

// ============================================
// MESSAGE HANDLERS
// ============================================

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getUserData') {
    fetchUserData(request.forceRefresh || false)
      .then(sendResponse)
      .catch(error => {
        console.error('getUserData error:', error);
        sendResponse({ user: null, license: null });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'login') {
    openLoginPage();
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'logout') {
    logout()
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('logout error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'upgradePlan') {
    openPricingPage();
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'refreshData') {
    fetchUserData(true)
      .then(sendResponse)
      .catch(error => {
        console.error('refreshData error:', error);
        sendResponse({ user: null, license: null });
      });
    return true;
  }
});

// ============================================
// TAB MONITORING (detect auth callback)
// ============================================

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Detect auth callback completion
    if (tab.url.startsWith(`${CONFIG.HOMEPAGE_URL}/auth/callback`)) {
      console.log('Auth callback detected, refreshing user data...');
      // Wait a bit for cookie to be set
      setTimeout(() => {
        fetchUserData(true);
      }, 1000);
    }

    // Detect pricing page (might need to refresh license after purchase)
    if (tab.url.includes(`${CONFIG.HOMEPAGE_URL}/pricing`) || 
        tab.url.includes(`${CONFIG.HOMEPAGE_URL}/checkout`)) {
      console.log('Pricing/checkout page detected');
    }
  }
});

// ============================================
// COOKIE CHANGE MONITORING
// ============================================

chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain === '.pinboardgpt.app' && 
      changeInfo.cookie.name === CONFIG.COOKIE_NAME) {
    if (changeInfo.removed) {
      console.log('Session cookie removed, clearing cache');
      userCache = { user: null, license: null, lastFetch: 0 };
      chrome.storage.local.clear();
    } else {
      console.log('Session cookie updated, refreshing data');
      fetchUserData(true);
    }
  }
});

// ============================================
// INITIALIZATION
// ============================================

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  
  // Fetch user data on install/update
  fetchUserData(true);

  // Set up any other initialization here
  if (details.reason === 'install') {
    // First time install
    chrome.tabs.create({
      url: `${CONFIG.HOMEPAGE_URL}/welcome`,
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  // Fetch user data when browser starts
  fetchUserData(true);
});

// Log for debugging
console.log('PinboardGPT background script loaded');
