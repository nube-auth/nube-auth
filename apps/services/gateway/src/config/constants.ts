import { env } from "./env";

// Session & Token TTLs (in seconds)
// Override with environment variables for production
export const SESSION_TTL = env.SESSION_TTL_SECONDS ?? 365 * 24 * 60 * 60; // Default: 365 days (user sessions)

// Admin sessions: Use longer TTL in development for better DX
// Production: 2 hours | Development: 7 days
export const ADMIN_SESSION_TTL = env.IS_DEVELOPMENT 
	? (7 * 24 * 60 * 60) // Dev: 7 days
	: (env.ADMIN_SESSION_TTL_SECONDS ?? 2 * 60 * 60); // Prod: 2 hours

// Admin inactivity: Disabled in development
// Production: 15 minutes | Development: 7 days (effectively disabled)
export const ADMIN_INACTIVITY_TIMEOUT = env.IS_DEVELOPMENT
	? (7 * 24 * 60 * 60) // Dev: 7 days (no interruptions)
	: (env.ADMIN_INACTIVITY_TIMEOUT_SECONDS ?? 15 * 60); // Prod: 15 minutes
export const CACHE_TTL = env.CACHE_TTL_SECONDS ?? 2 * 60; // Default: 2 minutes
export const REFRESH_TOKEN_TTL = env.REFRESH_TOKEN_TTL_SECONDS ?? 365 * 24 * 60 * 60; // Default: 365 days
export const TOKEN_EXPIRY_BUFFER = env.TOKEN_EXPIRY_BUFFER_SECONDS ?? 60; // Default: 1 minute
export const INVITATION_EXPIRY_SECONDS = env.INVITATION_EXPIRY_SECONDS ?? 7 * 24 * 60 * 60; // Default: 7 days

// Security - Token/Session generation
export const SESSION_ID_BYTES = env.SESSION_ID_BYTES ?? 32; // Default: 32 bytes (256 bits)
export const CSRF_TOKEN_BYTES = env.CSRF_TOKEN_BYTES ?? 32; // Default: 32 bytes (256 bits)

// Short-lived exchange code TTL for the audience=app token handoff.
// The code is single-use and expires after this many seconds.
export const EXCHANGE_CODE_TTL = 60; // 60 seconds

// Longer-lived exchange code TTL for combined OAuth+checkout flows.
// The code must survive while the user fills out payment details at the
// provider, so we use 30 minutes instead of 60 seconds.
export const CHECKOUT_EXCHANGE_CODE_TTL = 30 * 60; // 30 minutes

// Rate limiting
export const MAX_LOGIN_ATTEMPTS = env.MAX_LOGIN_ATTEMPTS ?? 5;
export const LOGIN_ATTEMPT_WINDOW = env.LOGIN_ATTEMPT_WINDOW_SECONDS ?? 15 * 60; // Default: 15 minutes
export const MAX_REQUESTS_PER_MINUTE = env.MAX_REQUESTS_PER_MINUTE ?? 100;

// Cookie settings
export const COOKIE_NAME = "gateway_session";
export const COOKIE_PATH = "/";
export const COOKIE_DOMAIN = env.COOKIE_DOMAIN;
export const SECURE_COOKIES = env.NODE_ENV === "production";
export const SAME_SITE = "Lax" as const;

// Routes configuration
export const PUBLIC_ROUTES = ["/auth/start", "/auth/callback", "/health"];

export const AUTH_REQUIRED_ROUTES = ["/me", "/me/profile", "/me/sessions", "/me/logout", "/admin"];

// Headers
export const REQUEST_ID_HEADER = "X-Nube-Request-Id";
export const SERVICE_TOKEN_HEADER = "X-Nube-Service-Token";
export const APP_ID_HEADER = "X-Nube-App-Id";

// CORS
export const CORS_DEFAULT_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"];
export const CORS_CREDENTIALS = true;

// Logging
export const LOG_REQUEST_BODY = env.NODE_ENV === "development";
export const LOG_RESPONSE_BODY = env.NODE_ENV === "development";
