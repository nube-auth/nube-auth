// Import Node.js-only utilities from dedicated export to avoid browser bundling issues
import { loadEnv, validateEnv as validateEnvVars } from "@proofa/shared/env-loader";

// Load environment variables from .env and .env.local
loadEnv();

export interface Env {
	DATABASE_URL: string;
	DATABASE_AUTH_TOKEN?: string | undefined;
	REDIS_URL: string;
	RESEND_API_KEY: string;
	CORE_URL: string;
	CORE_S2S_TOKEN: string;
	X_PROOFA_SERVICE_TOKEN: string;
	GATEWAY_SESSION_SECRET: string;
	GATEWAY_PUBLIC_URL?: string | undefined;
	USER_DASHBOARD_URL?: string | undefined;
	ADMIN_DASHBOARD_URL?: string | undefined;
	COOKIE_DOMAIN?: string | undefined;
	SEND_EMAILS?: string | undefined;
	EMAIL_FROM?: string | undefined;
	NODE_ENV?: string | undefined;
	GOOGLE_CLIENT_ID?: string | undefined;
	GOOGLE_CLIENT_SECRET?: string | undefined;
	GITHUB_CLIENT_ID?: string | undefined;
	GITHUB_CLIENT_SECRET?: string | undefined;
	ENCRYPTION_KEY: string;
}

const requiredEnvVars = [
	"DATABASE_URL",
	"REDIS_URL",
	"RESEND_API_KEY",
	"ENCRYPTION_KEY",
	"CORE_URL",
	"CORE_S2S_TOKEN",
	"X_PROOFA_SERVICE_TOKEN",
	"GATEWAY_SESSION_SECRET",
] as const;

function validateEnv(): Env {
	// Validate required environment variables
	validateEnvVars(requiredEnvVars);

	return {
		DATABASE_URL: process.env["DATABASE_URL"]!,
		DATABASE_AUTH_TOKEN: process.env["DATABASE_AUTH_TOKEN"],
		REDIS_URL: process.env["REDIS_URL"]!,
		RESEND_API_KEY: process.env["RESEND_API_KEY"]!,
		CORE_URL: process.env["CORE_URL"]!,
		CORE_S2S_TOKEN: process.env["CORE_S2S_TOKEN"]!,
		X_PROOFA_SERVICE_TOKEN: process.env["X_PROOFA_SERVICE_TOKEN"]!,
		GATEWAY_SESSION_SECRET: process.env["GATEWAY_SESSION_SECRET"]!,
		GATEWAY_PUBLIC_URL: process.env["GATEWAY_PUBLIC_URL"],
		USER_DASHBOARD_URL: process.env["USER_DASHBOARD_URL"],
		ADMIN_DASHBOARD_URL: process.env["ADMIN_DASHBOARD_URL"],
		COOKIE_DOMAIN: process.env["COOKIE_DOMAIN"],
		SEND_EMAILS: process.env["SEND_EMAILS"],
		EMAIL_FROM: process.env["EMAIL_FROM"],
		NODE_ENV: process.env["NODE_ENV"],
		GOOGLE_CLIENT_ID: process.env["GOOGLE_CLIENT_ID"],
		GOOGLE_CLIENT_SECRET: process.env["GOOGLE_CLIENT_SECRET"],
		GITHUB_CLIENT_ID: process.env["GITHUB_CLIENT_ID"],
		GITHUB_CLIENT_SECRET: process.env["GITHUB_CLIENT_SECRET"],
		ENCRYPTION_KEY: process.env["ENCRYPTION_KEY"]!,
	};
}

export const env = validateEnv();

export function getEnv(): Env {
	return env;
}
