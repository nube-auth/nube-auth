// OAuth providers and adapters
export * from './oauth.js';
export { GoogleOAuthAdapter, GitHubOAuthAdapter } from './adapters/index.js';

// OAuth state management (CSRF protection)
export {
  createOAuthState,
  validateOAuthState,
  consumeOAuthState,
  cleanupExpiredStates,
  getPendingStateCount,
} from './state.js';

// OAuth validation schemas
export * from './schemas/index.js';

// Session management
export {
  createSessionCookie,
  parseSessionCookie,
  signSessionId,
  verifySessionId,
  isSessionExpired,
  getSessionTTL,
} from './session.js';

// Cryptography & OTP
export {
  generateOTP,
  hashOTP,
  verifyOTP,
  generateSessionToken,
  generateS2SToken,
  validateS2SToken,
} from './crypto.js';
