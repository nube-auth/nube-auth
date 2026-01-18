// popup.js - Main popup script for PinboardGPT Extension

// State elements
const states = {
  loading: document.getElementById('loading-state'),
  loggedOut: document.getElementById('logged-out-state'),
  loggedIn: document.getElementById('logged-in-state'),
  error: document.getElementById('error-state'),
};

// Buttons
const buttons = {
  login: document.getElementById('login-btn'),
  logout: document.getElementById('logout-btn'),
  refresh: document.getElementById('refresh-btn'),
  upgrade: document.getElementById('upgrade-btn'),
  manage: document.getElementById('manage-btn'),
  retry: document.getElementById('retry-btn'),
};

/**
 * Show a specific state and hide others
 * @param {string} stateName - Name of state to show
 */
function showState(stateName) {
  Object.values(states).forEach(el => {
    el.classList.add('hidden');
  });
  if (states[stateName]) {
    states[stateName].classList.remove('hidden');
  }
}

/**
 * Load and display user data
 * @param {boolean} forceRefresh - Force refresh from server
 */
async function loadUserData(forceRefresh = false) {
  try {
    showState('loading');

    // Request user data from background script
    const response = await chrome.runtime.sendMessage({
      action: 'getUserData',
      forceRefresh,
    });

    if (response?.user) {
      renderLoggedInState(response.user, response.license);
    } else {
      showState('loggedOut');
    }
  } catch (error) {
    console.error('Failed to load user data:', error);
    showState('error');
  }
}

/**
 * Render logged-in state with user and license data
 * @param {Object} user - User object
 * @param {Object} license - License object
 */
function renderLoggedInState(user, license) {
  // Populate user info
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  const userAvatarEl = document.getElementById('user-avatar');

  userNameEl.textContent = user.name || 'User';
  userEmailEl.textContent = user.primary_email || '';

  if (user.avatar_url) {
    userAvatarEl.src = user.avatar_url;
    userAvatarEl.style.display = 'block';
  } else {
    // Use initials as fallback
    const initials = getInitials(user.name || user.primary_email || 'U');
    userAvatarEl.src = generateAvatarDataUrl(initials);
    userAvatarEl.style.display = 'block';
  }

  // Populate license info
  const planEl = document.getElementById('license-plan');
  const statusBadgeEl = document.getElementById('license-status-badge');
  const expiresEl = document.getElementById('license-expires');
  const upgradeBtn = buttons.upgrade;

  if (license) {
    // Plan name
    planEl.textContent = formatPlanName(license.plan);

    // Status badge
    statusBadgeEl.textContent = license.status;
    statusBadgeEl.className = `badge badge-${license.status}`;

    // Expiry information
    if (license.valid_until) {
      const expiryDate = new Date(license.valid_until * 1000);
      const daysUntilExpiry = Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry > 0) {
        expiresEl.textContent = `Expires in ${daysUntilExpiry} days`;
      } else {
        expiresEl.textContent = 'Expired';
      }
    } else {
      expiresEl.textContent = 'Lifetime license';
    }

    // Show upgrade button for free/trial users
    if (license.plan === 'free' || license.plan === 'trial') {
      upgradeBtn.classList.remove('hidden');
    } else {
      upgradeBtn.classList.add('hidden');
    }
  } else {
    // No license
    planEl.textContent = 'No License';
    statusBadgeEl.textContent = 'inactive';
    statusBadgeEl.className = 'badge badge-inactive';
    expiresEl.textContent = 'Please purchase a plan';
    upgradeBtn.classList.remove('hidden');
  }

  showState('loggedIn');
}

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
function getInitials(name) {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Generate data URL for avatar with initials
 * @param {string} initials - Initials to display
 * @returns {string} Data URL
 */
function generateAvatarDataUrl(initials) {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#007bff';
  ctx.fillRect(0, 0, 48, 48);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 24, 24);

  return canvas.toDataURL();
}

/**
 * Format plan name for display
 * @param {string} plan - Plan slug
 * @returns {string} Formatted plan name
 */
function formatPlanName(plan) {
  const planNames = {
    free: 'Free',
    trial: 'Trial',
    pro: 'Pro',
    team: 'Team',
    enterprise: 'Enterprise',
  };
  return planNames[plan] || plan.toUpperCase();
}

// ============================================
// EVENT LISTENERS
// ============================================

// Login button
buttons.login?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'login' });
  window.close();
});

// Logout button
buttons.logout?.addEventListener('click', async () => {
  try {
    showState('loading');
    await chrome.runtime.sendMessage({ action: 'logout' });
    showState('loggedOut');
  } catch (error) {
    console.error('Logout failed:', error);
    showState('error');
  }
});

// Refresh button
buttons.refresh?.addEventListener('click', () => {
  loadUserData(true);
});

// Upgrade button
buttons.upgrade?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'upgradePlan' });
  window.close();
});

// Manage account button
buttons.manage?.addEventListener('click', () => {
  chrome.tabs.create({
    url: 'https://pinboardgpt.app/account',
  });
  window.close();
});

// Retry button (error state)
buttons.retry?.addEventListener('click', () => {
  loadUserData(true);
});

// ============================================
// INITIALIZATION
// ============================================

// Load user data when popup opens
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
});

// Optional: Auto-refresh every 30 seconds if popup stays open
let autoRefreshInterval;
document.addEventListener('DOMContentLoaded', () => {
  autoRefreshInterval = setInterval(() => {
    loadUserData(false); // Use cache if fresh
  }, 30000);
});

// Clean up interval when popup closes
window.addEventListener('unload', () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
});
