// Session & Token TTLs (in seconds)
// Override with environment variables for production
export const SESSION_TTL = process.env.SESSION_TTL ? parseInt(process.env.SESSION_TTL, 10) : 365 * 24 * 60 * 60; // Default: 365 days
export const CACHE_TTL = process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL, 10) : 2 * 60; // Default: 2 minutes
export const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL
	? parseInt(process.env.REFRESH_TOKEN_TTL, 10)
	: 7 * 24 * 60 * 60; // Default: 7 days
export const TOKEN_EXPIRY_BUFFER = process.env.TOKEN_EXPIRY_BUFFER ? parseInt(process.env.TOKEN_EXPIRY_BUFFER, 10) : 60; // Default: 1 minute
export const INVITATION_EXPIRY_DAYS = process.env.INVITATION_EXPIRY_DAYS
	? parseInt(process.env.INVITATION_EXPIRY_DAYS, 10)
	: 7; // Default: 7 days

// Security - Token/Session generation
export const SESSION_ID_BYTES = process.env.SESSION_ID_BYTES ? parseInt(process.env.SESSION_ID_BYTES, 10) : 32; // Default: 32 bytes (256 bits)
export const CSRF_TOKEN_BYTES = process.env.CSRF_TOKEN_BYTES ? parseInt(process.env.CSRF_TOKEN_BYTES, 10) : 32; // Default: 32 bytes (256 bits)

// Rate limiting
export const MAX_LOGIN_ATTEMPTS = process.env.MAX_LOGIN_ATTEMPTS ? parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) : 5;
export const LOGIN_ATTEMPT_WINDOW = process.env.LOGIN_ATTEMPT_WINDOW
	? parseInt(process.env.LOGIN_ATTEMPT_WINDOW, 10)
	: 15 * 60; // Default: 15 minutes
export const MAX_REQUESTS_PER_MINUTE = process.env.MAX_REQUESTS_PER_MINUTE
	? parseInt(process.env.MAX_REQUESTS_PER_MINUTE, 10)
	: 100;

// Cookie settings
export const COOKIE_NAME = "gateway_session";
export const COOKIE_PATH = "/";
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
export const SECURE_COOKIES = process.env.NODE_ENV === "production";
export const SAME_SITE = "Lax" as const;

// Routes configuration
export const PUBLIC_ROUTES = ["/auth/start", "/auth/callback", "/health"];

export const AUTH_REQUIRED_ROUTES = ["/me", "/me/profile", "/me/sessions", "/me/logout", "/admin"];

// Headers
export const REQUEST_ID_HEADER = "X-Request-ID";
export const SERVICE_TOKEN_HEADER = "X-Proofa-Service-Token";
export const APP_ID_HEADER = "X-App-ID";

// CORS
export const CORS_DEFAULT_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"];
export const CORS_CREDENTIALS = true;

// Logging
export const LOG_REQUEST_BODY = process.env.NODE_ENV === "development";
export const LOG_RESPONSE_BODY = process.env.NODE_ENV === "development";
