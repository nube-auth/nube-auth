import { parseSessionCookie } from "@proofa/auth";
import { cache, sessionStore } from "@proofa/cache";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { env } from "../config/env";
import { coreClient } from "../lib/core-client";
import { loggers, serializeError } from "../utils/logger";
import { SESSION_TTL } from "../config/constants";

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
}

/**
 * Middleware to extract and validate session cookie
 */
export const authMiddleware = createMiddleware(async (c: Context, next) => {
	// Skip auth for public routes
	const publicRoutes = ["/health", "/v1/auth/login", "/v1/auth/logout", "/v1/debug"];
	if (publicRoutes.includes(c.req.path) || c.req.path.startsWith("/v1/auth") || c.req.path.startsWith("/v1/debug")) {
		return next();
	}

	const isAdminRoute = c.req.path.startsWith("/v1/admin");
	const cookieName = isAdminRoute ? ADMIN_SESSION_COOKIE : USER_SESSION_COOKIE;
	const cookieValue = getCookie(c, cookieName);

	loggers.auth.info(
		{
			path: c.req.path,
			isAdminRoute,
			cookieName,
			hasCookie: !!cookieValue,
			allCookies: c.req.header("cookie"),
			cookiePreview: cookieValue ? `${cookieValue.substring(0, 8)}...` : null,
		},
		"Auth middleware validating request",
	);

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
		loggers.auth.debug({ cookiePreview: cookieValue ? `${cookieValue.substring(0, 20)}...` : null }, "Attempting to parse session cookie");
		const sessionId = parseSessionCookie(cookieValue);

		if (!sessionId) {
			loggers.auth.error({ 
				cookieValue: cookieValue ? `${cookieValue.substring(0, 20)}...` : null,
				cookieLength: cookieValue?.length 
			}, "Failed to parse session cookie - returning 401");
			return c.json({ error: "Invalid session" }, 401);
		}

		loggers.auth.info(
			{
				sessionId: `${sessionId.substring(0, 8)}...`,
				cookieLength: cookieValue.length,
				hasDot: cookieValue.includes('.'),
			},
			"Cookie parsed successfully, checking app session in Redis",
		);

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

		loggers.auth.info(
			{
				sessionId: `${sessionId.substring(0, 8)}...`,
				userId: appSession.userId,
				appId: appSession.appId,
				metadataKeys: appSession.metadata ? Object.keys(appSession.metadata) : [],
			},
			"App session found, checking Core session",
		);

		// Get Core session ID from metadata (stored during login)
		const coreSessionId = appSession.metadata?.["coreSessionId"] as string | undefined;
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

		// Refresh gateway session TTL on access (rolling TTL for app session)
		loggers.auth.debug({ sessionId: `${sessionId.substring(0, 8)}...` }, "Refreshing session TTL");
		await cache.expire(`session:app:${sessionId}`, SESSION_TTL);

		// Get user info from Core using Core session ID
		loggers.auth.debug({ coreSessionId: `${coreSessionId.substring(0, 8)}...` }, "Exchanging Core session for user info");
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

		loggers.auth.info(
			{
				userId: coreSession.userId,
				email: coreSession.email,
			},
			"Auth successful",
		);

		// Store auth context in Hono context
		const auth: AuthContext = {
			userId: coreSession.userId,
			email: coreSession.email,
			name: coreSession.name,
			sessionId,
			appSessionId: sessionId,
			coreSessionId,
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
 */
export const s2sAuthMiddleware = createMiddleware(async (c: Context, next) => {
	const token = c.req.header("X-S2S-Token");
	const expectedToken = env.X_PROOFA_SERVICE_TOKEN;

	if (!token || !expectedToken || token !== expectedToken) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	return next();
});
