import { createLogger, serializeError } from "./logger.js";
import { decrypt, encrypt, maskSecret } from "./encryption.js";

const log = createLogger("credentials");

/**
 * Credential encryption utilities specifically for OAuth and payment providers
 * Handles JSON credential objects and provides type-safe encryption/decryption
 */

/**
 * OAuth Provider Credentials
 */
export interface OAuthCredentials {
	client_id: string;
	client_secret: string;
	redirect_uri?: string;
	[key: string]: string | undefined;
}

/**
 * Payment Provider Credentials
 */
export interface PaymentCredentials {
	api_key?: string;
	secret_key?: string;
	publishable_key?: string;
	store_id?: string;
	[key: string]: string | undefined;
}

/**
 * Encrypt OAuth credentials for storage
 */
export function encryptOAuthCredentials(credentials: OAuthCredentials, encryptionKey: string): string {
	const json = JSON.stringify(credentials);
	return encrypt(json, encryptionKey);
}

/**
 * Decrypt OAuth credentials from storage
 */
export function decryptOAuthCredentials(encryptedCredentials: string, encryptionKey: string): OAuthCredentials {
	const json = decrypt(encryptedCredentials, encryptionKey);
	return JSON.parse(json) as OAuthCredentials;
}

/**
 * Encrypt payment credentials for storage
 */
export function encryptPaymentCredentials(credentials: PaymentCredentials, encryptionKey: string): string {
	const json = JSON.stringify(credentials);
	return encrypt(json, encryptionKey);
}

/**
 * Decrypt payment credentials from storage
 */
export function decryptPaymentCredentials(encryptedCredentials: string, encryptionKey: string): PaymentCredentials {
	const json = decrypt(encryptedCredentials, encryptionKey);
	return JSON.parse(json) as PaymentCredentials;
}

/**
 * Mask OAuth credentials for display
 */
export function maskOAuthCredentials(credentials: OAuthCredentials): Record<string, string> {
	const masked: Record<string, string> = {};
	for (const [key, value] of Object.entries(credentials)) {
		if (value) {
			masked[key] = maskSecret(value);
		}
	}
	return masked;
}

/**
 * Mask payment credentials for display
 */
export function maskPaymentCredentials(credentials: PaymentCredentials): Record<string, string> {
	const masked: Record<string, string> = {};
	for (const [key, value] of Object.entries(credentials)) {
		if (value) {
			masked[key] = maskSecret(value);
		}
	}
	return masked;
}

/**
 * Validate OAuth credentials have required fields
 */
export function validateOAuthCredentials(credentials: unknown): credentials is OAuthCredentials {
	if (!credentials || typeof credentials !== "object") {
		return false;
	}
	const creds = credentials as Record<string, unknown>;
	return typeof creds["client_id"] === "string" && typeof creds["client_secret"] === "string";
}

/**
 * Validate payment credentials have at least one key
 */
export function validatePaymentCredentials(credentials: unknown): credentials is PaymentCredentials {
	if (!credentials || typeof credentials !== "object") {
		return false;
	}
	const creds = credentials as Record<string, unknown>;
	// At least one field should be present
	return (
		typeof creds["api_key"] === "string" ||
		typeof creds["secret_key"] === "string" ||
		typeof creds["publishable_key"] === "string" ||
		typeof creds["store_id"] === "string"
	);
}

/**
 * Safely try to decrypt credentials, return null if fails
 */
export function safeDecryptOAuthCredentials(
	encryptedCredentials: string,
	encryptionKey: string,
): OAuthCredentials | null {
	try {
		return decryptOAuthCredentials(encryptedCredentials, encryptionKey);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to decrypt OAuth credentials");
		return null;
	}
}

/**
 * Safely try to decrypt credentials, return null if fails
 */
export function safeDecryptPaymentCredentials(
	encryptedCredentials: string,
	encryptionKey: string,
): PaymentCredentials | null {
	try {
		return decryptPaymentCredentials(encryptedCredentials, encryptionKey);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to decrypt payment credentials");
		return null;
	}
}
