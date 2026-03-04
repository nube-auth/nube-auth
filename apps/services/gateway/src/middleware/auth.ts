import { parseSessionCookie } from "@proofa/auth";
import { cache, sessionStore } from "@proofa/cache";
import type { SessionEntitlements } from "@proofa/shared";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { env } from "../config/env";
import { coreClient } from "../lib/core-client";
import { loggers, serializeError } from "../utils/logger";
import { SESSION_TTL, ADMIN_INACTIVITY_TIMEOUT } from "../config/constants";

const USER_SESSION_COOKIE = "proofa_user_session";
const ADMIN_SESSION_COOKIE = "proofa_admin_session";

/**
 * Auth context with user and session info
 */
export interface AuthContext {
	userId: string;
	email: string;
	name: string;
	sessionId: string;
	appSessionId?: string;
	coreSessionId: string;
	entitlements: SessionEntitlements;
}

/**
 * Middleware to extract and validate session cookie
 */
export const authMiddleware = createMiddleware(async (c: Context, next) => {
	// Skip auth for public routes
	const publicRoutes = ["/health", "/v1/auth/login", "/v1/auth/logout", "/v1/debug"];
	if (
		publicRoutes.includes(c.req.path) ||
		c.req.path.startsWith("/v1/auth") ||
		c.req.path.startsWith("/v1/debug") ||
		c.req.path.startsWith("/v1/payment/webhooks/")
	) {
		return next();
	}

	const isAdminRoute = c.req.path.startsWith("/v1/admin");
	const cookieName = isAdminRoute ? ADMIN_SESSION_COOKIE : USER_SESSION_COOKIE;
	const cookieValue = getCookie(c, cookieName);

	if (!cookieValue) {
		loggers.auth.warn({ 
			path: c.req.path,
			cookieName,
			allCookies: c.req.header("cookie") || "none",
			isAdminRoute 
		}, "No cookie found - returning 401");
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		// Parse and verify signed session cookie
		const sessionId = parseSessionCookie(cookieValue);

		if (!sessionId) {
			loggers.auth.error({ 
				cookieValue: cookieValue ? `${cookieValue.substring(0, 20)}...` : null,
				cookieLength: cookieValue?.length 
			}, "Failed to parse session cookie - returning 401");
			return c.json({ error: "Invalid session" }, 401);
		}

		// Check if app session exists in Redis
		const appSession = await sessionStore.getAppSession(sessionId);

		if (!appSession) {
			loggers.auth.error(
				{
					sessionId: `${sessionId.substring(0, 8)}...`,
					message: "Session exists in cookie but not found in Redis - may be expired or invalid"
				},
				"App session not found in Redis - returning 401",
			);
			return c.json({ error: "Session not found" }, 401);
		}

		// Get session metadata
		const coreSessionId = appSession.metadata?.["coreSessionId"] as string | undefined;
		const sessionType = appSession.metadata?.["sessionType"] as string | undefined;
		const lastActivityAt = appSession.metadata?.["lastActivityAt"] as number | undefined;

		if (!coreSessionId) {
			loggers.auth.error(
				{
					sessionId: `${sessionId.substring(0, 8)}...`,
					metadata: appSession.metadata,
					message: "Core session ID missing from metadata"
				},
				"Core session ID not found in metadata - returning 401",
			);
			return c.json({ error: "Core session not found" }, 401);
		}

		// Admin-specific security: Check inactivity timeout (disabled in development)
		if (isAdminRoute && sessionType === "admin" && lastActivityAt && !env.IS_DEVELOPMENT) {
			const inactiveSeconds = (Date.now() - lastActivityAt) / 1000;
			if (inactiveSeconds > ADMIN_INACTIVITY_TIMEOUT) {
				loggers.auth.warn(
					{
						sessionId: `${sessionId.substring(0, 8)}...`,
						inactiveSeconds,
						threshold: ADMIN_INACTIVITY_TIMEOUT,
					},
					"Admin session exceeded inactivity timeout - forcing re-auth",
				);
				// Clear the expired admin session
				await sessionStore.revokeAppSession(sessionId);
				return c.json({ error: "Admin session expired due to inactivity", code: "ADMIN_INACTIVITY_TIMEOUT" }, 401);
			}

			// Update last activity timestamp for admin sessions
			await sessionStore.setAppSession(sessionId, appSession.userId, appSession.appId, ADMIN_INACTIVITY_TIMEOUT, {
				...appSession.metadata,
				lastActivityAt: Date.now(),
			}, appSession.entitlements);
		}

		// Refresh gateway session TTL on access (rolling TTL for app session)
		const ttl = isAdminRoute && sessionType === "admin" ? ADMIN_INACTIVITY_TIMEOUT : SESSION_TTL;
		await cache.expire(`session:app:${sessionId}`, ttl);

		// Get user info from Core using Core session ID
		const coreSession = await coreClient.exchangeSession(coreSessionId);

		if (!coreSession) {
			loggers.auth.error(
				{
					coreSessionId: `${coreSessionId.substring(0, 8)}...`,
					message: "Core session exchange returned null"
				},
				"Core session invalid - returning 401",
			);
			return c.json({ error: "Invalid session" }, 401);
		}

		// Store auth context in Hono context
		const auth: AuthContext = {
			userId: coreSession.userId,
			email: coreSession.email,
			name: coreSession.name,
			sessionId,
			appSessionId: sessionId,
			coreSessionId,
			entitlements: appSession.entitlements ?? {},
		};

		c.set("auth", auth);
		return next();
	} catch (error) {
		loggers.auth.error({ err: serializeError(error as Error) }, "Auth middleware error");
		return c.json({ error: "Unauthorized" }, 401);
	}
});

/**
 * Get auth context from request
 */
export function getAuth(c: Context): AuthContext {
	const auth = c.get("auth");
	if (!auth) {
		throw new Error("Auth context not found");
	}
	return auth as AuthContext;
}

/**
 * S2S token validation middleware for internal requests
 * Uses constant-time comparison to prevent timing attacks
 */
export const s2sAuthMiddleware = createMiddleware(async (c: Context, next) => {
	const token = c.req.header("X-Proofa-S2S-Token");
	const expectedToken = env.X_PROOFA_SERVICE_TOKEN;

	if (!token || !expectedToken || token.length !== expectedToken.length) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { timingSafeEqual } = await import("node:crypto");
	if (!timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	return next();
});
