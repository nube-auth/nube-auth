/**
 * Environment variable loading and validation
 * Ensures all required environment variables are present at startup
 */

export interface Environment {
	NODE_ENV: "development" | "staging" | "production";
	IS_DEVELOPMENT: boolean;
	CORE_PORT: number;
	CORE_PUBLIC_URL: string; // Optional — only needed if core is called directly (no gateway proxy)
	API_BASE_URL: string;
	DATABASE_URL: string;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	JWT_SECRET: string;
	SESSION_SECRET: string;
	S2S_SECRET: string;
	REDIS_URL: string;
	EMAIL_API_KEY: string;
	EMAIL_API_BASE_URL: string;
	EMAIL_THEME_ID?: string | undefined;
	SEND_EMAILS: boolean;
	PAYMENT_CONFIGS_KEY: string;
	PAYMENT_CONFIGS_KEY_PREVIOUS?: string | undefined; // Optional fallback for zero-downtime key rotation
	EMAIL_FROM: string;
	ADMIN_DASHBOARD_URL: string;
	USER_DASHBOARD_URL: string;
	LOG_LEVEL: "debug" | "info" | "warn" | "error";
	CORE_SESSION_TTL_SECONDS: number;
	SESSION_REFRESH_THRESHOLD_SECONDS: number;
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
	// Allowed redirect origins for OAuth (comma-separated)
	ALLOWED_REDIRECT_ORIGINS: string[];
	// Payment provider keys (optional - for testing/integration)
	STRIPE_SECRET_KEY?: string | undefined;
	STRIPE_PUBLISHABLE_KEY?: string | undefined;
	LEMONSQUEEZY_API_KEY?: string | undefined;
	DODO_API_KEY?: string | undefined;
	ENABLE_PAYMENT_PLAYGROUND: boolean;
}

function readInt(raw: string | undefined, fallback: number, min: number, max: number, name: string): number {
	if (raw == null || raw.trim() === "") return fallback;
	const value = Number(raw);
	if (!Number.isInteger(value) || value < min || value > max) {
		throw new Error(`${name} must be an integer between ${min} and ${max}`);
	}
	return value;
}

function getEnvironment(): Environment {
	const requiredVars = [
		"DATABASE_URL",
		"GOOGLE_CLIENT_ID",
		"GOOGLE_CLIENT_SECRET",
		"JWT_SECRET",
		"SESSION_SECRET",
		"S2S_SECRET",
		"REDIS_URL",
		"EMAIL_API_KEY",
		"PAYMENT_CONFIGS_KEY",
	];

	const missing = requiredVars.filter((key) => !process.env[key]);
	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
	}

	const nodeEnv = (process.env["NODE_ENV"] as Environment["NODE_ENV"] | undefined) ?? "production";

	const environment: Environment = {
		NODE_ENV: nodeEnv,
		IS_DEVELOPMENT: nodeEnv === "development",
		CORE_PORT: readInt(process.env["CORE_PORT"] ?? process.env["PORT"], 8080, 1, 65535, "CORE_PORT"),
		CORE_PUBLIC_URL: process.env["CORE_PUBLIC_URL"] ?? "",
		API_BASE_URL: process.env["API_BASE_URL"] ?? (process.env["CORE_PUBLIC_URL"] || "http://localhost:3003"),
		DATABASE_URL: process.env["DATABASE_URL"]!,
		GOOGLE_CLIENT_ID: process.env["GOOGLE_CLIENT_ID"]!,
		GOOGLE_CLIENT_SECRET: process.env["GOOGLE_CLIENT_SECRET"]!,
		GITHUB_CLIENT_ID: process.env["GITHUB_CLIENT_ID"] ?? "",
		GITHUB_CLIENT_SECRET: process.env["GITHUB_CLIENT_SECRET"] ?? "",
		JWT_SECRET: process.env["JWT_SECRET"]!,
		SESSION_SECRET: process.env["SESSION_SECRET"]!,
		S2S_SECRET: process.env["S2S_SECRET"]!,
		REDIS_URL: process.env["REDIS_URL"]!,
		EMAIL_API_KEY: process.env["EMAIL_API_KEY"]!,
		EMAIL_API_BASE_URL: process.env["EMAIL_API_BASE_URL"] ?? "",
		EMAIL_THEME_ID: process.env["EMAIL_THEME_ID"] ?? undefined,
		SEND_EMAILS: process.env["SEND_EMAILS"] === "true",
		EMAIL_FROM: process.env["EMAIL_FROM"] ?? "noreply@localhost",
		ADMIN_DASHBOARD_URL: process.env["ADMIN_DASHBOARD_URL"] ?? "http://localhost:5174",
		USER_DASHBOARD_URL: process.env["USER_DASHBOARD_URL"] ?? "http://localhost:5173",
		PAYMENT_CONFIGS_KEY: process.env["PAYMENT_CONFIGS_KEY"]!,
		PAYMENT_CONFIGS_KEY_PREVIOUS: process.env["PAYMENT_CONFIGS_KEY_PREVIOUS"] ?? undefined,
		LOG_LEVEL: (process.env["LOG_LEVEL"] as Environment["LOG_LEVEL"] | undefined) ?? "info",
		CORE_SESSION_TTL_SECONDS: readInt(
			process.env["CORE_SESSION_TTL_SECONDS"],
			365 * 24 * 60 * 60,
			60,
			10 * 365 * 24 * 60 * 60,
			"CORE_SESSION_TTL_SECONDS",
		),
		SESSION_REFRESH_THRESHOLD_SECONDS: readInt(
			process.env["SESSION_REFRESH_THRESHOLD_SECONDS"],
			30 * 24 * 60 * 60,
			60,
			10 * 365 * 24 * 60 * 60,
			"SESSION_REFRESH_THRESHOLD_SECONDS",
		),
		SESSION_TTL_SECONDS: readInt(
			process.env["SESSION_TTL_SECONDS"],
			7 * 24 * 60 * 60,
			60,
			10 * 365 * 24 * 60 * 60,
			"SESSION_TTL_SECONDS",
		),
		JWT_TTL_SECONDS: readInt(process.env["JWT_TTL_SECONDS"], 3600, 60, 7 * 24 * 60 * 60, "JWT_TTL_SECONDS"),
		EMAIL_CODE_TTL_SECONDS: readInt(
			process.env["EMAIL_CODE_TTL_SECONDS"],
			600,
			30,
			24 * 60 * 60,
			"EMAIL_CODE_TTL_SECONDS",
		),
		OAUTH_STATE_TTL_SECONDS: readInt(
			process.env["OAUTH_STATE_TTL_SECONDS"],
			600,
			30,
			24 * 60 * 60,
			"OAUTH_STATE_TTL_SECONDS",
		),
		REFRESH_TOKEN_TTL_SECONDS: readInt(
			process.env["REFRESH_TOKEN_TTL_SECONDS"],
			30 * 24 * 60 * 60,
			60,
			10 * 365 * 24 * 60 * 60,
			"REFRESH_TOKEN_TTL_SECONDS",
		),
		MAX_LOGIN_ATTEMPTS: readInt(process.env["MAX_LOGIN_ATTEMPTS"], 5, 1, 100, "MAX_LOGIN_ATTEMPTS"),
		RATE_LIMIT_WINDOW_SECONDS: readInt(
			process.env["RATE_LIMIT_WINDOW_SECONDS"],
			900,
			1,
			24 * 60 * 60,
			"RATE_LIMIT_WINDOW_SECONDS",
		),
		MAX_EMAIL_ATTEMPTS: readInt(process.env["MAX_EMAIL_ATTEMPTS"], 3, 1, 100, "MAX_EMAIL_ATTEMPTS"),
		MAX_OAUTH_ATTEMPTS: readInt(process.env["MAX_OAUTH_ATTEMPTS"], 3, 1, 100, "MAX_OAUTH_ATTEMPTS"),
		// Allowed redirect origins for OAuth
		ALLOWED_REDIRECT_ORIGINS: (
			process.env["ALLOWED_REDIRECT_ORIGINS"] ??
			"http://localhost:3004,http://localhost:5173,http://localhost:5174"
		)
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean),
		// Payment provider keys (optional)
		STRIPE_SECRET_KEY: process.env["STRIPE_SECRET_KEY"],
		STRIPE_PUBLISHABLE_KEY: process.env["STRIPE_PUBLISHABLE_KEY"],
		LEMONSQUEEZY_API_KEY: process.env["LEMONSQUEEZY_API_KEY"],
		DODO_API_KEY: process.env["DODO_API_KEY"],
		ENABLE_PAYMENT_PLAYGROUND: process.env["ENABLE_PAYMENT_PLAYGROUND"] === "true" || nodeEnv === "development",
	};

	if (nodeEnv === "production") {
		for (const key of ["ADMIN_DASHBOARD_URL", "USER_DASHBOARD_URL"] as const) {
			const value = process.env[key];
			if (!value || value.includes("localhost") || value.includes("127.0.0.1")) {
				throw new Error(`${key} must be set to a non-localhost URL in production`);
			}
		}
	}

	return environment;
}

export const env = getEnvironment();
