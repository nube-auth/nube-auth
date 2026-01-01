/**
 * Secret validation utilities
 * Ensures production environments use secure secrets
 */

/** Known weak/development secrets that should never be used in production */
const WEAK_SECRETS = [
	"dev-secret",
	"development-secret",
	"test-secret",
	"change-me",
	"your-secret-here",
	"secret",
	"password",
	"123456",
	"abc123",
];

interface SecretValidationResult {
	valid: boolean;
	warnings: string[];
	errors: string[];
}

/**
 * Check if a secret meets minimum security requirements
 * @param secret The secret to validate
 * @param name The name of the secret (for error messages)
 * @param options Validation options
 */
export function validateSecret(
	secret: string | undefined,
	name: string,
	options: {
		minLength?: number | undefined;
		required?: boolean | undefined;
		isProduction?: boolean | undefined;
	} = {},
): SecretValidationResult {
	const { minLength = 32, required = true, isProduction = process.env.NODE_ENV === "production" } = options;
	const warnings: string[] = [];
	const errors: string[] = [];

	// Check if secret exists
	if (!secret || secret.trim() === "") {
		if (required) {
			errors.push(`${name} is required but not set`);
		}
		return { valid: errors.length === 0, warnings, errors };
	}

	// Check for weak secrets
	const lowerSecret = secret.toLowerCase();
	if (WEAK_SECRETS.some((weak) => lowerSecret.includes(weak))) {
		if (isProduction) {
			errors.push(`${name} contains a weak/development secret value - unsafe for production`);
		} else {
			warnings.push(`${name} contains a development secret - make sure to change this in production`);
		}
	}

	// Check minimum length
	if (secret.length < minLength) {
		if (isProduction) {
			errors.push(
				`${name} is too short (${secret.length} chars). Minimum ${minLength} chars required in production`,
			);
		} else {
			warnings.push(`${name} is shorter than recommended (${secret.length}/${minLength} chars)`);
		}
	}

	// Check for entropy (basic check - all same char or sequential)
	if (new Set(secret).size < 10) {
		if (isProduction) {
			errors.push(`${name} has low entropy - use a cryptographically secure random value`);
		} else {
			warnings.push(`${name} has low entropy - consider using a stronger secret`);
		}
	}

	return { valid: errors.length === 0, warnings, errors };
}

/**
 * Validate multiple secrets at once
 */
export function validateSecrets(
	secrets: Array<{ value: string | undefined; name: string; minLength?: number; required?: boolean }>,
	options: { isProduction?: boolean; throwOnError?: boolean } = {},
): SecretValidationResult {
	const { isProduction, throwOnError = true } = options;
	const allWarnings: string[] = [];
	const allErrors: string[] = [];

	for (const { value, name, minLength, required } of secrets) {
		const result = validateSecret(value, name, { minLength, required, isProduction });
		allWarnings.push(...result.warnings);
		allErrors.push(...result.errors);
	}

	// Log warnings
	if (allWarnings.length > 0) {
		console.warn("[Security] Secret validation warnings:");
		for (const w of allWarnings) {
			console.warn(`  ⚠️  ${w}`);
		}
	}

	// Handle errors
	if (allErrors.length > 0) {
		console.error("[Security] Secret validation errors:");
		for (const e of allErrors) {
			console.error(`  ❌ ${e}`);
		}

		if (throwOnError) {
			throw new Error(`Security validation failed: ${allErrors.join("; ")}`);
		}
	}

	return { valid: allErrors.length === 0, warnings: allWarnings, errors: allErrors };
}

/**
 * Generate a secure random secret
 */
export function generateSecret(length: number = 64): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}
