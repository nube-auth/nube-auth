/**
 * Environment loader for Proofa
 * Loads .env first, then .env.local to allow local overrides
 */

import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load environment variables from .env and .env.local files
 * .env.local values override .env values
 * 
 * @param workspaceRoot - Optional path to workspace root (defaults to process.cwd())
 */
export function loadEnv(workspaceRoot?: string): void {
	const root = workspaceRoot || process.cwd();

	// Load .env first (base configuration)
	const envPath = resolve(root, ".env");
	if (existsSync(envPath)) {
		const result = config({ path: envPath });
		if (result.error) {
			console.warn(`Warning: Failed to load .env file: ${result.error.message}`);
		} else {
			console.log("✓ Loaded .env file");
		}
	} else {
		console.warn("Warning: .env file not found");
	}

	// Load .env.local second (local overrides)
	const envLocalPath = resolve(root, ".env.local");
	if (existsSync(envLocalPath)) {
		const result = config({ path: envLocalPath, override: true });
		if (result.error) {
			console.warn(`Warning: Failed to load .env.local file: ${result.error.message}`);
		} else {
			console.log("✓ Loaded .env.local file (overrides applied)");
		}
	}
}

/**
 * Get a required environment variable
 * Throws an error if the variable is not set
 */
export function getRequiredEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getOptionalEnv(key: string, defaultValue = ""): string {
	return process.env[key] || defaultValue;
}

/**
 * Validate that all required environment variables are set
 */
export function validateEnv(requiredVars: readonly string[]): void {
	const missing: string[] = [];

	for (const key of requiredVars) {
		if (!process.env[key]) {
			missing.push(key);
		}
	}

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables:\n  - ${missing.join("\n  - ")}\n\nPlease check your .env and .env.local files.`
		);
	}
}
