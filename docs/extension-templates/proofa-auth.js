/**
 * ProofaAuth - Lightweight vanilla JS client for Proofa authentication
 * 
 * Usage:
 *   const proofa = new ProofaAuth('https://api.proofa.sh', 'your-app-id');
 *   const auth = await proofa.checkAuth();
 *   if (!auth.loggedIn) {
 *     window.location.href = proofa.getLoginUrl();
 *   }
 * 
 * @version 1.0.0
 * @license MIT
 */

class ProofaAuth {
  /**
   * Initialize Proofa authentication client
   * @param {string} gatewayUrl - Proofa Gateway URL (e.g., 'https://api.proofa.sh')
   * @param {string} appId - Your app ID or slug
   */
  constructor(gatewayUrl, appId) {
    this.gatewayUrl = gatewayUrl;
    this.appId = appId;
  }

  /**
   * Internal fetch helper with credentials
   * @private
   */
  async _fetch(endpoint, options = {}) {
    const url = `${this.gatewayUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Important: sends pp_app_session cookie
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ProofaError(
        error.message || `HTTP ${response.status}`,
        response.status,
        error.code
      );
    }

    return response.json();
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<{loggedIn: boolean, user?: Object, license?: Object}>}
   */
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

  /**
   * Get current user profile
   * @returns {Promise<{user: Object, license: Object}>}
   */
  async getMe() {
    return this._fetch('/v1/me');
  }

  /**
   * Update user profile
   * @param {Object} data - Profile data to update
   * @param {string} [data.name] - User's display name
   * @param {string} [data.avatar_url] - User's avatar URL
   * @returns {Promise<Object>} Updated user object
   */
  async updateProfile(data) {
    return this._fetch('/v1/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Logout current user
   * @returns {Promise<{ok: boolean}>}
   */
  async logout() {
    return this._fetch('/v1/auth/logout', { method: 'POST' });
  }

  /**
   * Get login URL to redirect user for authentication
   * @param {string} [returnTo] - URL to return to after login (defaults to current page)
   * @param {string} [provider] - Specific OAuth provider (google, github, etc.)
   * @returns {string} Login URL
   */
  getLoginUrl(returnTo = window.location.href, provider = null) {
    const params = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: `${window.location.origin}/auth/callback`,
      state: btoa(returnTo), // Encode return URL in state
    });

    if (provider) {
      params.set('provider', provider);
    }

    return `${this.gatewayUrl}/v1/auth/start?${params}`;
  }

  /**
   * Get list of active sessions
   * @returns {Promise<{sessions: Array}>}
   */
  async getSessions() {
    return this._fetch('/v1/sessions');
  }

  /**
   * Delete a specific session
   * @param {string} sessionId - Session public ID to delete
   * @returns {Promise<{ok: boolean}>}
   */
  async deleteSession(sessionId) {
    return this._fetch(`/v1/sessions/${sessionId}`, { method: 'DELETE' });
  }

  /**
   * Logout from all sessions
   * @returns {Promise<{ok: boolean}>}
   */
  async logoutAll() {
    return this._fetch('/v1/sessions', { method: 'DELETE' });
  }
}

/**
 * Custom error class for Proofa API errors
 */
class ProofaError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ProofaError';
    this.status = status;
    this.code = code;
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ProofaAuth, ProofaError };
}

// Export for ES6 modules
if (typeof window !== 'undefined') {
  window.ProofaAuth = ProofaAuth;
  window.ProofaError = ProofaError;
}
