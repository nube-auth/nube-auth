import { parseSessionCookie } from "@nube-auth/auth";
import { sessionStore } from "@nube-auth/cache";
import crypto from "node:crypto";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { loggers } from "../utils/logger";
import { ADMIN_SESSION_COOKIE, CSRF_TOKEN_COOKIE, USER_SESSION_COOKIE } from "../utils/cookieNames";

/**
 * CSRF protection middleware
 * Validates CSRF token on state-changing requests (POST, PUT, PATCH, DELETE)
 */
export const csrfProtection = createMiddleware(async (c: Context, next) => {
	// Only check CSRF for state-changing methods
	const method = c.req.method;
	if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
		return next();
	}

	// Get CSRF token from header
	const csrfTokenHeader = c.req.header("X-Nube-CSRF-Token");

	if (!csrfTokenHeader) {
		loggers.auth.warn({ path: c.req.path, method }, "CSRF token missing from header");
		return c.json({ error: "CSRF token required" }, 403);
	}

	// Get CSRF token from cookie
	const csrfTokenCookie = getCookie(c, CSRF_TOKEN_COOKIE);

	if (!csrfTokenCookie) {
		loggers.auth.warn({ path: c.req.path, method }, "CSRF token cookie not found");
		return c.json({ error: "CSRF token invalid" }, 403);
	}

	// Verify tokens match using constant-time comparison to prevent timing attacks
	const headerBuf = Buffer.from(csrfTokenHeader);
	const cookieBuf = Buffer.from(csrfTokenCookie);
	const tokensMatch = headerBuf.length === cookieBuf.length &&
		crypto.timingSafeEqual(headerBuf, cookieBuf);

	if (!tokensMatch) {
		loggers.auth.warn(
			{
				path: c.req.path,
				method,
				headerPreview: csrfTokenHeader.substring(0, 8),
				cookiePreview: csrfTokenCookie.substring(0, 8),
			},
			"CSRF token mismatch",
		);
		return c.json({ error: "CSRF token mismatch" }, 403);
	}

	// Get session cookie to verify CSRF token is associated with session
	const isAdminRoute = c.req.path.startsWith("/v1/admin");
	const sessionCookieName = isAdminRoute ? ADMIN_SESSION_COOKIE : USER_SESSION_COOKIE;
	const sessionCookie = getCookie(c, sessionCookieName);

	if (!sessionCookie) {
		loggers.auth.warn({ path: c.req.path }, "Session cookie not found during CSRF validation");
		return c.json({ error: "Unauthorized" }, 401);
	}

	// Parse session ID and verify CSRF token matches what's stored in session
	const sessionId = parseSessionCookie(sessionCookie);
	if (!sessionId) {
		loggers.auth.warn("Failed to parse session cookie during CSRF validation");
		return c.json({ error: "Invalid session" }, 401);
	}

	const session = await sessionStore.getAppSession(sessionId);
	if (!session) {
		loggers.auth.warn({ sessionId: `${sessionId.substring(0, 8)}...` }, "Session not found during CSRF validation");
		return c.json({ error: "Session not found" }, 401);
	}

	// Verify CSRF token matches what's stored in session
	const storedCsrfToken = session.metadata?.["csrfToken"] as string | undefined;
	if (!storedCsrfToken || storedCsrfToken !== csrfTokenHeader) {
		loggers.auth.warn(
			{
				sessionId: `${sessionId.substring(0, 8)}...`,
				hasStoredToken: !!storedCsrfToken,
			},
			"CSRF token does not match session",
		);
		return c.json({ error: "CSRF token invalid" }, 403);
	}

	loggers.auth.info({ path: c.req.path, method }, "CSRF token validated successfully");
	return next();
});
