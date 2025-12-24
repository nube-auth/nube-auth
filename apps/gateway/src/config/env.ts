import type { Context } from "hono";

interface Environment {
	CORE_URL: string;
	CORE_S2S_TOKEN: string;
	SESSION_SECRET: string;
	UPSTASH_REDIS_REST_URL: string;
	UPSTASH_REDIS_REST_TOKEN: string;
	NODE_ENV: "development" | "production" | "test";
	PORT?: string;
}

function validateEnv(): Environment {
	const requiredVars = [
		"CORE_URL",
		"CORE_S2S_TOKEN",
		"SESSION_SECRET",
		"UPSTASH_REDIS_REST_URL",
		"UPSTASH_REDIS_REST_TOKEN",
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
		CORE_S2S_TOKEN: process.env.CORE_S2S_TOKEN!,
		SESSION_SECRET: process.env.SESSION_SECRET!,
		UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL!,
		UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN!,
		NODE_ENV: (process.env.NODE_ENV || "development") as Environment["NODE_ENV"],
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
