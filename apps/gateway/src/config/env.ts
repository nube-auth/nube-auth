import { loadEnv, validateEnv as validateEnvVars } from "@proofa/shared";

// Load environment variables from .env and .env.local
loadEnv();

export interface Env {
	DATABASE_URL: string;
	DATABASE_AUTH_TOKEN?: string;
	REDIS_URL: string;
	RESEND_API_KEY: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
	ENCRYPTION_KEY: string;
}

const requiredEnvVars = [
	"DATABASE_URL",
	"REDIS_URL",
	"RESEND_API_KEY",
	"ENCRYPTION_KEY",
] as const;

function validateEnv(): Env {
	// Validate required environment variables
	validateEnvVars(requiredEnvVars);

	return {
		DATABASE_URL: process.env.DATABASE_URL!,
		DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
		REDIS_URL: process.env.REDIS_URL!,
		RESEND_API_KEY: process.env.RESEND_API_KEY!,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
		ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
	};
}

export const env = validateEnv();
