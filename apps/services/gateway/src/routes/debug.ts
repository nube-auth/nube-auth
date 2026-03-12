/**
 * Debug Routes
 * Only for development - helps troubleshoot authentication issues
 */

import { createLogger } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { sessionStore } from "@nube-auth/cache";
import { parseSessionCookie } from "@nube-auth/auth";

const log = createLogger("debug-routes");

export const debugRoutes = new Hono();

/**
 * GET /v1/debug/cookies
 * Show all cookies received in request
 */
debugRoutes.get("/cookies", (c: Context) => {
	const cookieHeader = c.req.header("cookie") || "";
	const cookies: Record<string, string> = {};

	// Parse cookie header
	cookieHeader.split(";").forEach((cookie) => {
		const [name, value] = cookie.trim().split("=");
		if (name && value) {
			cookies[name] = value;
		}
	});

	// Also try to get specific cookies with getCookie
	const adminSession = getCookie(c, "nube_admin_session");
	const userSession = getCookie(c, "nube_user_session");
	const csrfToken = getCookie(c, "nube_csrf_token");

	return c.json({
		"Cookie header": cookieHeader,
		"Parsed cookies": cookies,
		"Admin session cookie": adminSession ? `${adminSession.substring(0, 20)}...` : null,
		"User session cookie": userSession ? `${userSession.substring(0, 20)}...` : null,
		"CSRF token cookie": csrfToken ? `${csrfToken.substring(0, 20)}...` : null,
		"Request headers": {
			host: c.req.header("host"),
			origin: c.req.header("origin"),
			referer: c.req.header("referer"),
			"user-agent": c.req.header("user-agent"),
		},
	});
});

/**
 * GET /v1/debug/auth-status
 * Check if user is authenticated and what data is available
 */
debugRoutes.get("/auth-status", async (c: Context) => {
	const auth = c.get("auth");

	if (!auth) {
		return c.json(
			{
				authenticated: false,
				message: "No auth context - try logging in",
			},
			401,
		);
	}

	return c.json({
		authenticated: true,
		userId: auth.userId,
		email: auth.email,
		name: auth.name,
		sessionId: `${auth.sessionId.substring(0, 8)}...`,
		coreSessionId: `${auth.coreSessionId.substring(0, 8)}...`,
	});
});

/**
 * POST /v1/debug/session-check
 * Debug a specific session by manually parsing and checking Redis
 * Body: { sessionCookie: "session.signature" }
 */
debugRoutes.post("/session-check", async (c: Context) => {
	try {
		const body = await c.req.json();
		const sessionCookie = body.sessionCookie as string | undefined;

		if (!sessionCookie) {
			return c.json(
				{
					error: "No sessionCookie provided in request body",
					example: { sessionCookie: "d558d86b5e2c753358c1d23aad3b76bc5f63ce0536941926183faad4d2159b83.f5021ec8bc9561f1511a7bd8536a32671360d2459d9ce2b5afabce946939ce3b" },
				},
				400,
			);
		}

		// Step 1: Parse the cookie signature
		log.info({ cookiePreview: `${sessionCookie.substring(0, 20)}...` }, "Parsing session cookie");
		const sessionId = parseSessionCookie(sessionCookie);

		if (!sessionId) {
			return c.json({
				error: "Failed to parse session cookie",
				details: "Cookie signature validation failed - cookie may be corrupted or from a different session secret",
				cookie: `${sessionCookie.substring(0, 20)}...`,
			});
		}

		// Step 2: Check if session exists in Redis
		log.info({ sessionId: `${sessionId.substring(0, 8)}...` }, "Looking up app session in Redis");
		const appSession = await sessionStore.getAppSession(sessionId);

		if (!appSession) {
			return c.json({
				error: "App session not found in Redis",
				details: "Session was parsed successfully but doesn't exist in Redis - may be expired or never created",
				parsed: {
					sessionId: `${sessionId.substring(0, 8)}...`,
					cookieLength: sessionCookie.length,
				},
			});
		}

		// Step 3: Check Core session ID in metadata
		const coreSessionId = appSession.metadata?.["coreSessionId"] as string | undefined;

		if (!coreSessionId) {
			return c.json({
				error: "Core session ID not in metadata",
				details: "App session exists but has no coreSessionId - session may be corrupted",
				appSession: {
					userId: appSession.userId,
					appId: appSession.appId,
					metadata: appSession.metadata,
				},
			});
		}

		// Step 4: Try to exchange the Core session
		log.info({ coreSessionId: `${coreSessionId.substring(0, 8)}...` }, "Attempting Core session exchange");
		const { coreClient } = await import("../lib/core-client");
		const coreSession = await coreClient.exchangeSession(coreSessionId);

		if (!coreSession) {
			return c.json({
				error: "Core session exchange failed",
				details: "Core returned null when exchanging session - session may be expired in Core database or Core service is unreachable",
				coreSessionId: `${coreSessionId.substring(0, 8)}...`,
			});
		}

		// Step 5: Return all debug info
		return c.json({
			status: "Session validation successful",
			parsed: {
				sessionId: `${sessionId.substring(0, 8)}...`,
				cookieLength: sessionCookie.length,
			},
			appSession: {
				userId: appSession.userId,
				appId: appSession.appId,
				metadata: appSession.metadata,
			},
			coreSession: {
				userId: coreSession.userId,
				email: coreSession.email,
				name: coreSession.name,
			},
		});
	} catch (error) {
		log.error({ error: error instanceof Error ? error.message : String(error) }, "Session check error");
		return c.json(
			{
				error: "Session check failed",
				message: error instanceof Error ? error.message : String(error),
			},
			500,
		);
	}
});

/**
 * GET /v1/debug/test-getcookie
 * Test getCookie function behavior
 */
debugRoutes.get("/test-getcookie", (c: Context) => {
	const rawCookieHeader = c.req.header("cookie") || "";
	
	// Try to get with getCookie
	const adminSessionFromGetCookie = getCookie(c, "nube_admin_session");
	const userSessionFromGetCookie = getCookie(c, "nube_user_session");
	
	// Manual parsing
	const cookies: Record<string, string> = {};
	rawCookieHeader.split(";").forEach((cookie) => {
		const [name, value] = cookie.trim().split("=");
		if (name && value) {
			cookies[name] = value;
		}
	});
	
	return c.json({
		rawCookieHeader: `${rawCookieHeader.substring(0, 100)}...`,
		getCookieResults: {
			adminSession: adminSessionFromGetCookie ? `${adminSessionFromGetCookie.substring(0, 20)}...` : null,
			userSession: userSessionFromGetCookie ? `${userSessionFromGetCookie.substring(0, 20)}...` : null,
		},
		manualParsing: {
			nube_admin_session: cookies["nube_admin_session"] ? `${cookies["nube_admin_session"].substring(0, 20)}...` : null,
			nube_user_session: cookies["nube_user_session"] ? `${cookies["nube_user_session"].substring(0, 20)}...` : null,
		},
	});
});
