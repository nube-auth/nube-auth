import * as crypto from "node:crypto";

/**
 * Get the session secret from environment
 */
function getSessionSecret(): string {
	return process.env['SESSION_SECRET']!;
}

/**
 * Create a signed session cookie
 */
export function createSessionCookie(
	sessionId: string,
	options?: {
		secure?: boolean;
		sameSite?: "Strict" | "Lax" | "None";
		domain?: string;
		path?: string;
		maxAge?: number;
	},
): { name: string; value: string; attributes: Record<string, unknown> } {
	const signed = signSessionId(sessionId);

	return {
		name: "proofa_session",
		value: signed,
		attributes: {
			httpOnly: true,
			secure: options?.secure ?? true,
			sameSite: options?.sameSite ?? "Lax",
			domain: options?.domain,
			path: options?.path ?? "/",
			maxAge: options?.maxAge ?? 7 * 24 * 60 * 60,
		},
	};
}

/**
 * Parse and verify session cookie
 */
export function parseSessionCookie(cookieValue: string): string | null {
	try {
		return verifySessionId(cookieValue);
	} catch {
		return null;
	}
}

/**
 * Sign session ID with HMAC
 */
export function signSessionId(sessionId: string): string {
	const secret = getSessionSecret();
	const hmac = crypto.createHmac("sha256", secret).update(sessionId).digest("hex");
	return `${sessionId}.${hmac}`;
}

/**
 * Verify signed session ID using constant-time comparison
 */
export function verifySessionId(signed: string): string {
	const [sessionId, hmac] = signed.split(".");
	if (!sessionId || !hmac) {
		throw new Error("Invalid session format");
	}

	const secret = getSessionSecret();
	const expectedHmac = crypto.createHmac("sha256", secret).update(sessionId).digest("hex");

	if (hmac.length !== expectedHmac.length ||
		!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
		throw new Error("Session signature invalid");
	}

	return sessionId;
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: { expires_at: Date }): boolean {
	return new Date() > session.expires_at;
}

/**
 * Get remaining TTL in milliseconds
 */
export function getSessionTTL(session: { expires_at: Date }): number {
	// Handle both Date objects (from PostgreSQL) and Unix timestamps (legacy)
	const expiresAtMs = session.expires_at.getTime();
	const remaining = expiresAtMs - Date.now();
	return Math.max(0, remaining);
}
