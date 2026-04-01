// Import Node.js-only utilities from dedicated export to avoid browser bundling issues
import { validateEnv as validateEnvVars } from "@nube-auth/shared/env-loader";

export interface Env {
	NODE_ENV: string;
	IS_DEVELOPMENT: boolean;
	GATEWAY_PORT: number;
	DATABASE_URL: string;
	REDIS_URL: string;
	RESEND_API_KEY: string;
	CORE_URL: string;
	S2S_SECRET: string;
	X_NUBE_AUTH_SERVICE_TOKEN: string;
	SESSION_SECRET: string;
	GATEWAY_PUBLIC_URL: string;
	USER_DASHBOARD_URL: string;
	ADMIN_DASHBOARD_URL: string;
	FRONTEND_URL: string;
	COOKIE_DOMAIN: string;
	COOKIE_NAMESPACE: string;
	SEND_EMAILS: boolean;
	EMAIL_FROM: string;
	STRIPE_SECRET_KEY: string;
	STRIPE_WEBHOOK_SECRET: string;

	// SMTP for local email testing (auto-enabled in development)
	SMTP_HOST: string;
	SMTP_PORT: number;

	ENCRYPTION_KEY: string;
	// TTL overrides (in seconds)
	SESSION_TTL_SECONDS: number;
	ADMIN_SESSION_TTL_SECONDS: number;
	ADMIN_INACTIVITY_TIMEOUT_SECONDS: number;
	CACHE_TTL_SECONDS: number;
	REFRESH_TOKEN_TTL_SECONDS: number;
	TOKEN_EXPIRY_BUFFER_SECONDS: number;
	INVITATION_EXPIRY_SECONDS: number;
	// Security overrides
	SESSION_ID_BYTES: number;
	CSRF_TOKEN_BYTES: number;
	// Rate limit overrides
	MAX_LOGIN_ATTEMPTS: number;
	LOGIN_ATTEMPT_WINDOW_SECONDS: number;
	MAX_REQUESTS_PER_MINUTE: number;
}

const requiredEnvVars = [
	"DATABASE_URL",
	"REDIS_URL",
	"RESEND_API_KEY",
	"ENCRYPTION_KEY",
	"CORE_URL",
	"S2S_SECRET",
	"X_NUBE_AUTH_SERVICE_TOKEN",
	"SESSION_SECRET",
] as const;

function normalizeCookieNamespace(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return "";

	const normalized = trimmed
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, "-")
		.replace(/-{2,}/g, "-")
		.replace(/^[-_]+|[-_]+$/g, "");

	if (!normalized) {
		throw new Error("COOKIE_NAMESPACE must contain at least one alphanumeric character");
	}

	return normalized;
}

function validateEnv(): Env {
	// Validate required environment variables
	validateEnvVars(requiredEnvVars);

	return {
		NODE_ENV: process.env["NODE_ENV"] || "production",
		IS_DEVELOPMENT: (process.env["NODE_ENV"] || "production") === "development",
		GATEWAY_PORT: parseInt(process.env["GATEWAY_PORT"] ?? process.env["PORT"] ?? "8080", 10),
		DATABASE_URL: process.env["DATABASE_URL"]!,
		REDIS_URL: process.env["REDIS_URL"]!,
		RESEND_API_KEY: process.env["RESEND_API_KEY"]!,
		CORE_URL: process.env["CORE_URL"]!,
		S2S_SECRET: process.env["S2S_SECRET"]!,
		X_NUBE_AUTH_SERVICE_TOKEN: process.env["X_NUBE_AUTH_SERVICE_TOKEN"]!,
		SESSION_SECRET: process.env["SESSION_SECRET"]!,
		GATEWAY_PUBLIC_URL: process.env["GATEWAY_PUBLIC_URL"] || "http://localhost:3004",
		USER_DASHBOARD_URL: process.env["USER_DASHBOARD_URL"] || "http://localhost:5173",
		ADMIN_DASHBOARD_URL: process.env["ADMIN_DASHBOARD_URL"] || "http://localhost:5174",
		FRONTEND_URL: process.env["FRONTEND_URL"] || "http://localhost:5173",
		// Default to empty string (host-only cookie). Set to ".yourdomain.com" to share cookies
		// across subdomains. NEVER hardcode a domain here — an incorrect default causes browsers
		// to silently reject Set-Cookie when the gateway runs on a different domain.
		COOKIE_DOMAIN: process.env["COOKIE_DOMAIN"] || "",
		// Namespace cookie names so multiple environments can safely share one parent domain.
		// Example: COOKIE_NAMESPACE=s -> nube_s_user_session, nube_s_csrf_token.
		COOKIE_NAMESPACE: normalizeCookieNamespace(process.env["COOKIE_NAMESPACE"] || ""),
		SEND_EMAILS: process.env["SEND_EMAILS"] === "true",
		EMAIL_FROM: process.env["EMAIL_FROM"] || "noreply@localhost",
		STRIPE_SECRET_KEY: process.env["STRIPE_SECRET_KEY"] || "",
		STRIPE_WEBHOOK_SECRET: process.env["STRIPE_WEBHOOK_SECRET"] || "",
		SMTP_HOST: process.env["SMTP_HOST"] ?? "localhost",
		SMTP_PORT: parseInt(process.env["SMTP_PORT"] ?? "1025", 10),

		ENCRYPTION_KEY: process.env["ENCRYPTION_KEY"]!,

		// TTL defaults - production values
		SESSION_TTL_SECONDS: parseInt(process.env["SESSION_TTL_SECONDS"] ?? String(365 * 24 * 60 * 60), 10), // 365 days (user sessions)
		ADMIN_SESSION_TTL_SECONDS: parseInt(process.env["ADMIN_SESSION_TTL_SECONDS"] ?? String(2 * 60 * 60), 10), // 2 hours (admin sessions)
		ADMIN_INACTIVITY_TIMEOUT_SECONDS: parseInt(process.env["ADMIN_INACTIVITY_TIMEOUT_SECONDS"] ?? String(15 * 60), 10), // 15 minutes
		CACHE_TTL_SECONDS: parseInt(process.env["CACHE_TTL_SECONDS"] ?? String(2 * 60), 10), // 2 minutes
		REFRESH_TOKEN_TTL_SECONDS: parseInt(process.env["REFRESH_TOKEN_TTL_SECONDS"] ?? String(365 * 24 * 60 * 60), 10), // 365 days
		TOKEN_EXPIRY_BUFFER_SECONDS: parseInt(process.env["TOKEN_EXPIRY_BUFFER_SECONDS"] ?? "60", 10), // 1 minute
		INVITATION_EXPIRY_SECONDS: parseInt(process.env["INVITATION_EXPIRY_SECONDS"] ?? String(7 * 24 * 60 * 60), 10), // 7 days

		// Security defaults
		SESSION_ID_BYTES: parseInt(process.env["SESSION_ID_BYTES"] ?? "32", 10),
		CSRF_TOKEN_BYTES: parseInt(process.env["CSRF_TOKEN_BYTES"] ?? "32", 10),

		// Rate limit defaults
		MAX_LOGIN_ATTEMPTS: parseInt(process.env["MAX_LOGIN_ATTEMPTS"] ?? "5", 10),
		LOGIN_ATTEMPT_WINDOW_SECONDS: parseInt(process.env["LOGIN_ATTEMPT_WINDOW_SECONDS"] ?? "900", 10), // 15 minutes
		MAX_REQUESTS_PER_MINUTE: parseInt(process.env["MAX_REQUESTS_PER_MINUTE"] ?? "100", 10),
	};
}

export const env = validateEnv();

export function getEnv(): Env {
	return env;
}
