// OAuth providers and adapters

export { GitHubOAuthAdapter, GoogleOAuthAdapter } from './adapters/index.js';
// Cryptography & OTP
export {
	generateOTP,
	generateS2SToken,
	generateSessionToken,
	hashOTP,
	validateS2SToken,
	verifyOTP,
} from './crypto.js';
export * from './oauth.js';

// OAuth validation schemas
export * from './schemas/index.js';

// Session management
export {
	createSessionCookie,
	getSessionTTL,
	isSessionExpired,
	parseSessionCookie,
	signSessionId,
	verifySessionId,
} from './session.js';
// OAuth state management (CSRF protection)
export {
	cleanupExpiredStates,
	consumeOAuthState,
	createOAuthState,
	getPendingStateCount,
	validateOAuthState,
} from './state.js';
