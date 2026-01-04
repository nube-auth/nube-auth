/**
 * Environment variable loading and validation
 * Ensures all required environment variables are present at startup
 */

import { loadEnv } from "@proofa/shared/env-loader";

// Load .env.local first, then .env (will skip if already loaded)
loadEnv();

export interface Environment {
	NODE_ENV: "development" | "staging" | "production";
	IS_DEVELOPMENT: boolean;
	CORE_PORT: number;
	CORE_PUBLIC_URL: string;
	DATABASE_URL: string;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	JWT_SECRET: string;
	SESSION_SECRET: string;
	S2S_SECRET: string;
	REDIS_URL: string;
	RESEND_API_KEY: string;
	SEND_EMAILS: boolean;
	EMAIL_FROM: string;
	// SMTP for local email testing (auto-enabled in development)
	SMTP_HOST: string;
	SMTP_PORT: number;
	LOG_LEVEL: "debug" | "info" | "warn" | "error";
	CORE_SESSION_TTL_DAYS: number;
	SESSION_REFRESH_THRESHOLD_HOURS: number;
	// TTL overrides (in seconds)
	SESSION_TTL_SECONDS: number;
	JWT_TTL_SECONDS: number;
	EMAIL_CODE_TTL_SECONDS: number;
	OAUTH_STATE_TTL_SECONDS: number;
	REFRESH_TOKEN_TTL_SECONDS: number;
	// Limit overrides
	MAX_LOGIN_ATTEMPTS: number;
	RATE_LIMIT_WINDOW_SECONDS: number;
	MAX_EMAIL_ATTEMPTS: number;
	MAX_OAUTH_ATTEMPTS: number;
}

function getEnvironment(): Environment {
	const requiredVars = [
		"CORE_PUBLIC_URL",
		"DATABASE_URL",
		"GOOGLE_CLIENT_ID",
		"GOOGLE_CLIENT_SECRET",
		"JWT_SECRET",
		"SESSION_SECRET",
		"S2S_SECRET",
		"REDIS_URL",
		"RESEND_API_KEY",
	];

	const missing = requiredVars.filter((key) => !process.env[key]);
	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
	}

	const nodeEnv = (process.env["NODE_ENV"] as Environment["NODE_ENV"] | undefined) ?? "production";

	const environment: Environment = {
		NODE_ENV: nodeEnv,
		IS_DEVELOPMENT: nodeEnv === "development",
		CORE_PORT: parseInt(process.env["CORE_PORT"] ?? "3003", 10),
		CORE_PUBLIC_URL: process.env["CORE_PUBLIC_URL"]!,
		DATABASE_URL: process.env["DATABASE_URL"]!,
		GOOGLE_CLIENT_ID: process.env["GOOGLE_CLIENT_ID"]!,
		GOOGLE_CLIENT_SECRET: process.env["GOOGLE_CLIENT_SECRET"]!,
		GITHUB_CLIENT_ID: process.env["GITHUB_CLIENT_ID"] ?? "",
		GITHUB_CLIENT_SECRET: process.env["GITHUB_CLIENT_SECRET"] ?? "",
		JWT_SECRET: process.env["JWT_SECRET"]!,
		SESSION_SECRET: process.env["SESSION_SECRET"]!,
		S2S_SECRET: process.env["S2S_SECRET"]!,
		REDIS_URL: process.env["REDIS_URL"]!,
		RESEND_API_KEY: process.env["RESEND_API_KEY"]!,
		SEND_EMAILS: process.env["SEND_EMAILS"] === "true",
		EMAIL_FROM: process.env["EMAIL_FROM"] ?? "noreply@proofa.sh",
		SMTP_HOST: process.env["SMTP_HOST"] ?? "localhost",
		SMTP_PORT: parseInt(process.env["SMTP_PORT"] ?? "1025", 10),
		LOG_LEVEL: (process.env["LOG_LEVEL"] as Environment["LOG_LEVEL"] | undefined) ?? "info",
		CORE_SESSION_TTL_DAYS: parseInt(process.env["CORE_SESSION_TTL_DAYS"] ?? "7", 10),
		SESSION_REFRESH_THRESHOLD_HOURS: parseInt(process.env["SESSION_REFRESH_THRESHOLD_HOURS"] ?? "1", 10),
		// TTL overrides (in seconds) - production defaults
		SESSION_TTL_SECONDS: parseInt(process.env["SESSION_TTL_SECONDS"] ?? String(7 * 24 * 60 * 60), 10), // 7 days
		JWT_TTL_SECONDS: parseInt(process.env["JWT_TTL_SECONDS"] ?? "3600", 10), // 1 hour
		EMAIL_CODE_TTL_SECONDS: parseInt(process.env["EMAIL_CODE_TTL_SECONDS"] ?? "600", 10), // 10 minutes
		OAUTH_STATE_TTL_SECONDS: parseInt(process.env["OAUTH_STATE_TTL_SECONDS"] ?? "600", 10), // 10 minutes
		REFRESH_TOKEN_TTL_SECONDS: parseInt(process.env["REFRESH_TOKEN_TTL_SECONDS"] ?? String(30 * 24 * 60 * 60), 10), // 30 days
		// Limit overrides - production defaults
		MAX_LOGIN_ATTEMPTS: parseInt(process.env["MAX_LOGIN_ATTEMPTS"] ?? "5", 10),
		RATE_LIMIT_WINDOW_SECONDS: parseInt(process.env["RATE_LIMIT_WINDOW_SECONDS"] ?? "900", 10), // 15 minutes
		MAX_EMAIL_ATTEMPTS: parseInt(process.env["MAX_EMAIL_ATTEMPTS"] ?? "3", 10),
		MAX_OAUTH_ATTEMPTS: parseInt(process.env["MAX_OAUTH_ATTEMPTS"] ?? "3", 10),
	};

	return environment;
}

export const env = getEnvironment();
