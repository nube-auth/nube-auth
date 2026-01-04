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
	const publicRoutes = ["/health", "/v1/auth/login", "/v1/auth/logout"];
	if (publicRoutes.includes(c.req.path) || c.req.path.startsWith("/v1/auth")) {
		return next();
	}

	const isAdminRoute = c.req.path.startsWith("/v1/admin");
	const cookieName = isAdminRoute ? ADMIN_SESSION_COOKIE : USER_SESSION_COOKIE;
	const cookieValue = getCookie(c, cookieName);

	loggers.auth.info(
		{
			path: c.req.path,
			cookieName,
			hasCookie: !!cookieValue,
			cookiePreview: cookieValue ? `${cookieValue.substring(0, 8)}...` : null,
		},
		"Auth middleware validating request",
	);

	if (!cookieValue) {
		loggers.auth.warn({ path: c.req.path }, "No cookie found - returning 401");
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		// Parse and verify signed session cookie
		const sessionId = parseSessionCookie(cookieValue);

		if (!sessionId) {
			loggers.auth.warn("Failed to parse session cookie - returning 401");
			return c.json({ error: "Invalid session" }, 401);
		}

		loggers.auth.info(
			{
				sessionId: `${sessionId.substring(0, 8)}...`,
			},
			"Checking app session in Redis",
		);

		// Check if app session exists in Redis
		const appSession = await sessionStore.getAppSession(sessionId);

		if (!appSession) {
			loggers.auth.warn(
				{
					sessionId: `${sessionId.substring(0, 8)}...`,
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
			},
			"App session found, checking Core session",
		);

		// Get Core session ID from metadata (stored during login)
		const coreSessionId = appSession.metadata?.coreSessionId as string | undefined;
		if (!coreSessionId) {
			loggers.auth.warn("Core session ID not found in metadata");
			return c.json({ error: "Core session not found" }, 401);
		}

		// Refresh gateway session TTL on access (rolling TTL for app session)
		await cache.expire(`session:app:${sessionId}`, SESSION_TTL);

		// Get user info from Core using Core session ID
		const coreSession = await coreClient.exchangeSession(coreSessionId);

		if (!coreSession) {
			loggers.auth.warn({ coreSessionId: `${coreSessionId.substring(0, 8)}...` }, "Core session invalid");
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
