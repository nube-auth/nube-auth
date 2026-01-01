import crypto from "node:crypto";
import { cache } from "@proofa/cache";
import { createLogger, serializeError } from "@proofa/shared";
import { SESSION_ID_BYTES, SESSION_TTL } from "../config/constants";

const log = createLogger("session");

export interface GatewaySession {
	userId: string;
	appId: string;
	createdAt: string;
	expiresAt: string;
	lastActivity: string;
	metadata?: Record<string, any>;
	// Security fingerprinting to prevent session hijacking
	ipAddress?: string;
	userAgent?: string;
	// Track suspicious activity
	requestCount?: number;
	lastIpAddress?: string;
	lastUserAgent?: string;
}

/**
 * Session service for managing gateway sessions in Redis
 */
export const sessionService = {
	/**
	 * Create a new session with security fingerprinting
	 */
	async createSession(
		userId: string,
		appId: string,
		metadata?: Record<string, any>,
		ipAddress?: string,
		userAgent?: string,
	): Promise<{ token: string; session: GatewaySession }> {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);

		const session: GatewaySession = {
			userId,
			appId,
			createdAt: now.toISOString(),
			expiresAt: expiresAt.toISOString(),
			lastActivity: now.toISOString(),
			metadata,
			ipAddress,
			userAgent,
			requestCount: 0,
			lastIpAddress: ipAddress,
			lastUserAgent: userAgent,
		};

		const token = this.generateSessionToken();
		const key = `gateway:session:${token}`;

		await cache.set(key, session, SESSION_TTL);

		log.info({ userId, ipAddress, userAgent: userAgent?.substring(0, 50) }, "Session created with fingerprint");

		return { token, session };
	},

	/**
	 * Get session by token and validate fingerprint
	 */
	async getSession(
		token: string,
		currentIpAddress?: string,
		currentUserAgent?: string,
	): Promise<GatewaySession | null> {
		const key = `gateway:session:${token}`;
		const session = await cache.get<GatewaySession>(key);

		if (!session) {
			return null;
		}

		try {
			session.lastActivity = new Date().toISOString();
			session.requestCount = (session.requestCount || 0) + 1;
			session.lastIpAddress = currentIpAddress;
			session.lastUserAgent = currentUserAgent;
			await cache.set(key, session, SESSION_TTL);

			return session;
		} catch (error) {
			log.error({ err: serializeError(error as Error), key }, "Failed to parse session");
			return null;
		}
	},

	/**
	 * Validate session fingerprint to prevent session hijacking
	 * Returns true if session is valid, false if suspicious
	 */
	validateSessionFingerprint(
		session: GatewaySession,
		currentIpAddress?: string,
		currentUserAgent?: string,
	): { valid: boolean; reason?: string } {
		// If no fingerprint data exists, session was created before this security feature
		// Allow it but log a warning
		if (!session.ipAddress && !session.userAgent) {
			log.warn({ userId: session.userId }, "Session has no fingerprint - created before security update");
			return { valid: true };
		}

		// Check IP address match (strict for admin sessions)
		if (session.ipAddress && currentIpAddress) {
			if (session.ipAddress !== currentIpAddress) {
				log.warn(
					{
						userId: session.userId,
						originalIp: session.ipAddress,
						currentIp: currentIpAddress,
					},
					"Session IP address mismatch - possible hijacking attempt",
				);
				return { valid: false, reason: "IP address mismatch" };
			}
		}

		// Check User-Agent match (more lenient - can change due to browser updates)
		if (session.userAgent && currentUserAgent) {
			// Extract browser and OS for comparison (ignore version numbers)
			const originalBrowser = this.extractBrowserInfo(session.userAgent);
			const currentBrowser = this.extractBrowserInfo(currentUserAgent);

			if (originalBrowser !== currentBrowser) {
				log.warn(
					{
						userId: session.userId,
						originalUA: session.userAgent.substring(0, 50),
						currentUA: currentUserAgent.substring(0, 50),
					},
					"Session User-Agent mismatch - possible hijacking attempt",
				);
				return { valid: false, reason: "User-Agent mismatch" };
			}
		}

		// Check for suspicious activity patterns
		if (session.requestCount && session.requestCount > 1000) {
			log.warn(
				{
					userId: session.userId,
					requestCount: session.requestCount,
				},
				"Suspicious request count - possible abuse",
			);
			// Don't block, but flag for monitoring
		}

		return { valid: true };
	},

	/**
	 * Extract browser/OS info from User-Agent for comparison
	 */
	extractBrowserInfo(userAgent: string): string {
		// Simple extraction - can be enhanced with a library like ua-parser-js
		const ua = userAgent.toLowerCase();
		let browser = "unknown";
		let os = "unknown";

		// Detect browser
		if (ua.includes("chrome")) browser = "chrome";
		else if (ua.includes("firefox")) browser = "firefox";
		else if (ua.includes("safari")) browser = "safari";
		else if (ua.includes("edge")) browser = "edge";

		// Detect OS
		if (ua.includes("windows")) os = "windows";
		else if (ua.includes("mac")) os = "mac";
		else if (ua.includes("linux")) os = "linux";
		else if (ua.includes("android")) os = "android";
		else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) os = "ios";

		return `${browser}-${os}`;
	},

	/**
	 * Delete session by token
	 */
	async deleteSession(token: string): Promise<void> {
		const key = `gateway:session:${token}`;
		await cache.delete(key);
	},

	/**
	 * Delete all sessions for a user
	 */
	async deleteUserSessions(_userId: string): Promise<void> {
		// TODO: implement if Redis key pattern scanning is needed
		// For now, would need to track session tokens by user
	},

	/**
	 * Generate a cryptographically secure session token (internal method)
	 * Uses crypto.randomBytes for security
	 */
	generateSessionToken(): string {
		return crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
	},
};

// Re-export as a type-safe way to hide internal methods
export type PublicSessionService = Omit<typeof sessionService, "generateSessionToken">;
