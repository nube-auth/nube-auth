import type { Context } from "hono";

interface Environment {
	CORE_URL: string;
	X_PROOFA_SERVICE_TOKEN: string;
	GATEWAY_SESSION_SECRET: string;
	UPSTASH_REDIS_REST_URL: string;
	UPSTASH_REDIS_REST_TOKEN: string;
	NODE_ENV: "development" | "production" | "test";
	PORT?: string;
}

function validateEnv(): Environment {
	const requiredVars = [
		"CORE_URL",
		"X_PROOFA_SERVICE_TOKEN",
		"GATEWAY_SESSION_SECRET",
		"UPSTASH_REDIS_REST_URL",
		"UPSTASH_REDIS_REST_TOKEN",
		"NODE_ENV",
	];

	const missing: string[] = [];

	for (const varName of requiredVars) {
		if (!process.env[varName]) {
			missing.push(varName);
		}
	}

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
	}

	return {
		CORE_URL: process.env.CORE_URL!,
		X_PROOFA_SERVICE_TOKEN: process.env.X_PROOFA_SERVICE_TOKEN!,
		GATEWAY_SESSION_SECRET: process.env.GATEWAY_SESSION_SECRET!,
		UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL!,
		UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN!,
		NODE_ENV: (process.env.NODE_ENV || "development") as any,
		PORT: process.env.PORT || "3004",
	};
}

let env: Environment | null = null;

export function getEnv(): Environment {
	if (!env) {
		env = validateEnv();
	}
	return env;
}

export function getEnvFromContext(_c: Context): Environment {
	return getEnv();
}
