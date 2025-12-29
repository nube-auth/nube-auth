/**
 * Environment variable loading and validation
 * Ensures all required environment variables are present at startup
 */

import { loadEnv } from "@proofa/shared/env-loader";

// Load .env.local first, then .env (will skip if already loaded)
loadEnv();

export interface Environment {
	NODE_ENV: "development" | "staging" | "production";
	PORT: number;
	CORE_PUBLIC_URL: string;
	DATABASE_URL: string;
	DATABASE_AUTH_TOKEN?: string;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
	JWT_SECRET: string;
	SESSION_SECRET: string;
	S2S_SECRET: string;
	REDIS_URL: string;
	LOG_LEVEL: "debug" | "info" | "warn" | "error";
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
	];

	const missing = requiredVars.filter((key) => !process.env[key]);
	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
	}

	return {
		NODE_ENV: (process.env.NODE_ENV as any) || "development",
		PORT: parseInt(process.env.PORT || "3003", 10),
		CORE_PUBLIC_URL: process.env.CORE_PUBLIC_URL!,
		DATABASE_URL: process.env.DATABASE_URL!,
		DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
		GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
		JWT_SECRET: process.env.JWT_SECRET!,
		SESSION_SECRET: process.env.SESSION_SECRET!,
		S2S_SECRET: process.env.S2S_SECRET!,
		REDIS_URL: process.env.REDIS_URL!,
		LOG_LEVEL: (process.env.LOG_LEVEL as any) || "info",
	};
}

export const env = getEnvironment();
