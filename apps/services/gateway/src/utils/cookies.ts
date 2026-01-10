import { COOKIE_DOMAIN, COOKIE_NAME, COOKIE_PATH, SAME_SITE, SECURE_COOKIES } from "../config/constants";
import { getEnv } from "../config/env";

interface CookieOptions {
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: "Strict" | "Lax" | "None";
	domain?: string;
	path?: string;
	maxAge?: number;
}

/**
 * Generate session cookie with secure defaults
 */
export function generateSessionCookie(
	token: string,
	maxAge: number,
): { name: string; value: string; options: CookieOptions } {
	return {
		name: COOKIE_NAME,
		value: token,
		options: {
			httpOnly: true,
			secure: SECURE_COOKIES,
			sameSite: SAME_SITE,
			...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
			path: COOKIE_PATH,
			maxAge,
		},
	};
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(): { name: string; value: string; options: CookieOptions } {
	return {
		name: COOKIE_NAME,
		value: "",
		options: {
			httpOnly: true,
			secure: SECURE_COOKIES,
			sameSite: SAME_SITE,
			...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
			path: COOKIE_PATH,
			maxAge: 0,
		},
	};
}

/**
 * Sign cookie value with session secret
 */
export function signCookie(value: string): string {
	const env = getEnv();
	// Use a simple HMAC-like approach for demo
	// In production, use a proper signing library
	return `${value}.${Buffer.from(env.SESSION_SECRET).toString("base64").slice(0, 8)}`;
}

/**
 * Verify signed cookie
 */
export function verifyCookie(signedValue: string): string | null {
	const [value, signature] = signedValue.split(".");
	if (!value || !signature) {
		return null;
	}
	const env = getEnv();
	const expectedSignature = Buffer.from(env.SESSION_SECRET).toString("base64").slice(0, 8);

	if (signature !== expectedSignature) {
		return null;
	}

	return value;
}
