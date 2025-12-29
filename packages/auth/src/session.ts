import * as crypto from "node:crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret-change-in-production";

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
			maxAge: 7 * 24 * 60 * 60, // 7 days
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
	const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(sessionId).digest("hex");
	return `${sessionId}.${hmac}`;
}

/**
 * Verify signed session ID
 */
export function verifySessionId(signed: string): string {
	const [sessionId, hmac] = signed.split(".");
	if (!sessionId || !hmac) {
		throw new Error("Invalid session format");
	}

	const expectedHmac = crypto.createHmac("sha256", SESSION_SECRET).update(sessionId).digest("hex");

	if (hmac !== expectedHmac) {
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
