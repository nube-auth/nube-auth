import { customAlphabet } from "nanoid";

// Custom alphabet excluding i/I/l/L/o/O for clarity
const ALPHABET = "0123456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ";

// Create nanoid generators with specific lengths
const nano9 = customAlphabet(ALPHABET, 9);  // For standard IDs (12 chars total)
const nano15 = customAlphabet(ALPHABET, 15); // For sessions (18 chars total)

/**
 * Entity type identifiers with 3-letter prefixes + version "0"
 * Simple two-size system: 13 chars (standard) | 19 chars (sessions)
 *
 * Format: [3-letter prefix][0][nanoid]
 *
 * Examples:
 * - USR0xY7mK9pQz (user, 13 chars)
 * - SES0abc123xyz456789 (session, 19 chars)
 */
export const id = {
	/** Generate user ID (USR0, 13 chars total) */
	user: () => `USR0${nano9()}`,

	/** Generate session ID (SES0, 19 chars total) - high security */
	session: () => `SES0${nano15()}`,

	/** Generate project ID (PRJ0, 13 chars total) */
	project: () => `PRJ0${nano9()}`,

	/** Generate app ID (APP0, 13 chars total) */
	app: () => `APP0${nano9()}`,

	/** Generate identity ID (IDN0, 13 chars total) */
	identity: () => `IDN0${nano9()}`,

	/** Generate project member ID (MEM0, 13 chars total) */
	projectMember: () => `MEM0${nano9()}`,

	/** Generate license ID (LIC0, 13 chars total) */
	license: () => `LIC0${nano9()}`,

	/** Generate plan ID (PLN0, 13 chars total) */
	plan: () => `PLN0${nano9()}`,

	/** Generate auth code (AUT0, 13 chars total) */
	authCode: () => `AUT0${nano9()}`,

	/** Generate email verification code (EML0, 13 chars total) */
	emailVerification: () => `EML0${nano9()}`,

	/** Generate audit log ID (AUD0, 13 chars total) */
	auditLog: () => `AUD0${nano9()}`,

	/** Generate request ID (REQ0, 13 chars total) */
	request: () => `REQ0${nano9()}`,

	/** Generate invitation ID (INV0, 13 chars total) */
	invitation: () => `INV0${nano9()}`,

	/** Generate payment config ID (CFG0, 13 chars total) */
	paymentConfig: () => `CFG0${nano9()}`,

	/** Generate OAuth state token (STA0, 13 chars total) */
	state: () => `STA0${nano9()}`,

	/** Generate OAuth provider ID (OAP0, 13 chars total) */
	oauthProvider: () => `OAP0${nano9()}`,

	/** Generate payment provider ID (PAP0, 13 chars total) */
	paymentProvider: () => `PAP0${nano9()}`,
} as const;

/** Type representing valid ID entity types */
export type IdType = keyof typeof id;

/**
 * Create an ID for a given entity type
 * @param type The entity type (user, session, project, app, etc.)
 * @returns A unique prefixed ID
 */
export function createId(type: IdType): string {
	const generator = id[type];
	if (!generator) {
		throw new Error(`Unknown entity type: ${type}`);
	}
	return generator();
}

/**
 * Validation patterns for ID formats
 */
export const idPatterns = {
	user: /^USR0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	session: /^SES0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{15}$/,
	project: /^PRJ0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	app: /^APP0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	identity: /^IDN0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	projectMember: /^MEM0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	license: /^LIC0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	plan: /^PLN0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	authCode: /^AUT0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	emailVerification: /^EML0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	auditLog: /^AUD0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	request: /^REQ0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	invitation: /^INV0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	state: /^STA0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
	paymentConfig: /^CFG0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
} as const;

/**
 * Validate an ID against a specific pattern
 */
export function validateId(type: keyof typeof idPatterns, idValue: string): boolean {
	return idPatterns[type].test(idValue);
}
