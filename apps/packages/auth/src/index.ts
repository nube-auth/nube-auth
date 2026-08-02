// OAuth providers and adapters

export { GitHubOAuthAdapter, GoogleOAuthAdapter } from "./adapters/index.js";
// Cryptography & OTP
export {
	generateOTP,
	generateS2SToken,
	generateSessionToken,
	hashOTP,
	validateS2SToken,
	verifyOTP,
} from "./crypto.js";
export * from "./oauth.js";
// HTTP client helpers
export { pingpong } from "./pingpong.js";
// OAuth validation schemas
export * from "./schemas/index.js";
// Session management
export {
	configureSessionSecret,
	createSessionCookie,
	getSessionTTL,
	isSessionExpired,
	parseSessionCookie,
	signSessionId,
	verifySessionId,
} from "./session.js";
export type { StateStore } from "./state.js";
// OAuth state management (CSRF protection)
export {
	configureStateStore,
	consumeOAuthState,
	createOAuthState,
	validateOAuthState,
} from "./state.js";
