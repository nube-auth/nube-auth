import crypto from "node:crypto";
import { createSessionCookie, parseSessionCookie } from "@proofa/auth";
import { sessionStore } from "@proofa/cache";
import { getDb, sessionQueries } from "@proofa/db";
import { createLogger, GatewayLoginRequestSchema, serializeError } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { CSRF_TOKEN_BYTES, SESSION_ID_BYTES, SESSION_TTL } from "../config/constants";
import { env } from "../config/env";
import { coreClient } from "../lib/core-client";
import { pingpong } from "../lib/pingpong";
import { sessionService } from "../services/sessionService";

const log = createLogger("auth-routes");

export const authRoutes = new Hono();

const USER_SESSION_COOKIE = "proofa_user_session";
const ADMIN_SESSION_COOKIE = "proofa_admin_session";
const LEGACY_SESSION_COOKIE = "proofa_session";

/**
 * Safely extract string values from cookie attributes
 * Handles cases where attributes might be typed as string | string[]
 */
function safeAttrString(value: unknown): string {
	if (typeof value === "string") return value;
	if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") return value[0];
	return String(value);
}

function safeAttrBoolean(value: unknown): boolean {
	return value === true || value === "true";
}

function safeAttrNumber(value: unknown): number | undefined {
	if (typeof value === "number") return value;
	if (typeof value === "string") return parseInt(value, 10);
	if (Array.isArray(value) && value.length > 0) return safeAttrNumber(value[0]);
	return undefined;
}

function safeParseUrl(value: string | undefined): URL | null {
	if (!value) return null;
	try {
		return new URL(value);
	} catch {
		return null;
	}
}

function inferAudience(c: Context): "user" | "admin" {
	const audience = c.req.query("audience");
	if (audience === "admin") return "admin";
	if (audience === "user") return "user";

	const originOrReferer = c.req.header("origin") || c.req.header("referer") || "";
	const requestHost = safeParseUrl(originOrReferer)?.host || "";

	const adminHost = safeParseUrl(env.ADMIN_DASHBOARD_URL)?.host || "";
	const userHost = safeParseUrl(env.USER_DASHBOARD_URL)?.host || "";

	if (adminHost && requestHost === adminHost) return "admin";
	if (userHost && requestHost === userHost) return "user";

	// Fallback heuristics for hosted environments
	if (requestHost.includes("manage.proofa.") || requestHost.includes("admin.proofa.")) return "admin";
	return "user";
}

/**
 * GET /v1/auth/start
 * Start OAuth flow - redirects to Core which then redirects to OAuth provider
 */
authRoutes.get("/start", async (c: Context) => {
	const provider = c.req.query("provider") || "google";
	const returnTo = c.req.query("return_to") || "/";
	const appId = c.req.query("app_id");
	const inviteCode = c.req.query("invite_code");
	const invite = c.req.query("invite"); // Project team invitation code
	const audience = c.req.query("audience") || inferAudience(c);

	// Gateway's callback URL - Core will redirect here after OAuth
	const gatewayCallbackUrl = `${env.GATEWAY_PUBLIC_URL ?? "http://localhost:3004"}/v1/auth/callback`;

	// Encode state as JSON to preserve both returnTo and audience
	const stateData = JSON.stringify({ returnTo, audience });
	// Use URL-safe base64 encoding (replace +/= with -_. to avoid URL encoding issues)
	const encodedState = Buffer.from(stateData).toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, ".");

	// Build Core auth start URL
	const coreAuthUrl = new URL(`${env.CORE_URL}/v1/auth/start`);
	coreAuthUrl.searchParams.set("provider", provider);
	coreAuthUrl.searchParams.set("redirect_uri", gatewayCallbackUrl);
	coreAuthUrl.searchParams.set("state", encodedState);
	if (appId) coreAuthUrl.searchParams.set("app_id", appId);
	if (inviteCode) coreAuthUrl.searchParams.set("invite_code", inviteCode);
	if (invite) coreAuthUrl.searchParams.set("invite", invite); // Pass project team invitation code

	return c.redirect(coreAuthUrl.toString());
});

/**
 * GET /v1/auth/callback
 * OAuth callback from Core - receives auth code and exchanges it for session
 */
authRoutes.get("/callback", async (c: Context) => {
	const code = c.req.query("code");
	const state = c.req.query("state") || "/"; // return_to URL or encoded state
	const error = c.req.query("error");

	// Parse state to extract returnTo and audience
	let returnTo = "/";
	let audience: "user" | "admin" = "user";
	try {
		log.debug({ rawState: state }, "Decoding state parameter");
		// Decode URL-safe base64 back to standard base64
		const standardBase64 = state
			.replace(/-/g, "+")
			.replace(/_/g, "/")
			.replace(/\./g, "=");
		const decodedState = Buffer.from(standardBase64, "base64").toString("utf-8");
		const stateData = JSON.parse(decodedState) as { returnTo?: string; audience?: "user" | "admin" };
		returnTo = stateData.returnTo || "/";
		audience = stateData.audience || "user";
		log.info({ 
			decodedState, 
			stateData, 
			returnTo, 
			audience,
			rawState: state 
		}, "Parsed state successfully");
	} catch (parseError) {
		// Fallback for old-style state (just a path string)
		returnTo = state;
		audience = inferAudience(c);
		log.warn({ 
			rawState: state, 
			parseError: parseError instanceof Error ? parseError.message : String(parseError),
			fallbackAudience: audience,
			fallbackReturnTo: returnTo
		}, "Failed to parse state, using fallback");
	}

	if (error) {
		log.error({ err: serializeError(new Error(error)) }, "OAuth error:");
		// Redirect to dashboard with error
		const dashboardUrl = audience === "admin"
			? (env.ADMIN_DASHBOARD_URL ?? "http://localhost:5174")
			: (env.USER_DASHBOARD_URL ?? "http://localhost:5173");
		return c.redirect(`${dashboardUrl}/login?error=${encodeURIComponent(error)}`);
	}

	if (!code) {
		const dashboardUrl = audience === "admin"
			? (env.ADMIN_DASHBOARD_URL ?? "http://localhost:5174")
			: (env.USER_DASHBOARD_URL ?? "http://localhost:5173");
		return c.redirect(`${dashboardUrl}/login?error=missing_code`);
	}

	try {

		// Exchange session ID with Core (S2S call)
		// Note: Core's callback sends the session ID as "code" parameter
		const response = await pingpong(`${env.CORE_URL}/v1/auth/exchange`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Proofa-Service-Token": env.CORE_S2S_TOKEN,
			},
			body: {
				sessionId: code, // Core passes session ID as "code" param
			},
		});

		if (!response.ok()) {
			// v1.4.0+: response.data is auto-parsed JSON
			const errorData = response.data || {};
			log.error({ 
				status: response.status,
				errorData, 
				sessionId: code ? code.substring(0, 8) + "..." : undefined,
				audience,
				err: serializeError(new Error(`Exchange failed: ${JSON.stringify(errorData)}`))
			}, "Code exchange failed");
			const dashboardUrl =
				audience === "admin"
					? (env.ADMIN_DASHBOARD_URL ?? "http://localhost:5174")
					: (env.USER_DASHBOARD_URL ?? "http://localhost:5173");
			return c.redirect(`${dashboardUrl}/login?error=exchange_failed`);
		}

		// v1.4.0+: response.data is auto-parsed JSON
		const data = response.data as {
			userId: string;
			email?: string;
			name?: string;
		};

		// Generate NEW session ID for Gateway (session fixation protection)
		// Don't reuse the Core's session ID
		const gatewaySessionId = crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
		const csrfToken = crypto.randomBytes(CSRF_TOKEN_BYTES).toString("hex"); // Generate CSRF token
		const ttlSeconds = SESSION_TTL;

		// Store app session in Redis with Gateway session ID
		// Store Core session ID and CSRF token in metadata
		const appId = audience === "admin" ? "admin-dashboard" : "user-dashboard";
		await sessionStore.setAppSession(gatewaySessionId, data.userId, appId, ttlSeconds, {
			coreSessionId: code, // Store Core session in metadata
			csrfToken, // Store CSRF token for validation
		});

		// Create signed cookie with domain for cross-subdomain access
		const cookieDomain = env.COOKIE_DOMAIN; // e.g., ".proofa.sh"
		const secureCookies =
			env.NODE_ENV === "production" || (env.GATEWAY_PUBLIC_URL ? env.GATEWAY_PUBLIC_URL.startsWith("https://") : false);
		const { value, attributes } = createSessionCookie(
			gatewaySessionId,
			cookieDomain ? { domain: cookieDomain, secure: secureCookies } : { secure: secureCookies },
		);

		const httpOnly = safeAttrBoolean(attributes['httpOnly']);
		const secure = safeAttrBoolean(attributes['secure']);
		const sameSite = safeAttrString(attributes['sameSite']) as "Strict" | "Lax" | "None";
		const path = safeAttrString(attributes['path']);
		const domain = attributes['domain'] ? safeAttrString(attributes['domain']) : undefined;
		const maxAge = safeAttrNumber(attributes['maxAge']);

		// Set appropriate cookie based on audience
		const cookieName = audience === "admin" ? ADMIN_SESSION_COOKIE : USER_SESSION_COOKIE;
		setCookie(c, cookieName, value, {
			httpOnly,
			secure,
			sameSite,
			path,
			...(domain ? { domain } : {}),
			...(maxAge !== undefined ? { maxAge } : {}),
		});

		// Set CSRF token cookie (NOT httpOnly so JavaScript can read it)
		setCookie(c, "proofa_csrf_token", csrfToken, {
			httpOnly: false, // Must be readable by JavaScript
			secure,
			sameSite,
			path,
			...(domain ? { domain } : {}),
			...(maxAge !== undefined ? { maxAge } : {}),
		});

		// Redirect to appropriate dashboard
		const dashboardUrl =
			audience === "admin"
				? (env.ADMIN_DASHBOARD_URL ?? "http://localhost:5174")
				: (env.USER_DASHBOARD_URL ?? "http://localhost:5173");
		const redirectUrl = returnTo.startsWith("/") ? `${dashboardUrl}${returnTo}` : dashboardUrl;

		log.info({ 
			audience, 
			appId, 
			cookieName, 
			dashboardUrl, 
			returnTo,
			redirectUrl,
			hasCsrfToken: true 
		}, "Login successful, redirecting");
		return c.redirect(redirectUrl);
	} catch (error) {
		log.error({ err: serializeError(error as Error), stack: error instanceof Error ? error.stack : undefined }, "Auth callback error:");
		const audience = inferAudience(c);
		const dashboardUrl =
			audience === "admin"
				? (env.ADMIN_DASHBOARD_URL ?? "http://localhost:5174")
				: (env.USER_DASHBOARD_URL ?? "http://localhost:5173");
		return c.redirect(`${dashboardUrl}/login?error=internal_error`);
	}
});

/**
 * POST /v1/auth/login
 * Exchange Core session for Gateway app session (legacy/manual)
 */
authRoutes.post("/login", async (c: Context) => {
	try {
		const body = await c.req.json();
		const validatedData = GatewayLoginRequestSchema.parse(body);
		const { coreSessionId, audience } = validatedData;

		// Get user info from Core
		const user = await coreClient.exchangeSession(coreSessionId);

		if (!user) {
			return c.json({ error: "Invalid session" }, 401);
		}

		// Generate NEW session ID for Gateway (session fixation protection)
		const gatewaySessionId = crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
		const csrfToken = crypto.randomBytes(CSRF_TOKEN_BYTES).toString("hex"); // Generate CSRF token
		const ttlSeconds = SESSION_TTL;
		const resolvedAudience = audience === "admin" ? "admin" : "user";

		// Store app session with Gateway session ID and CSRF token
		await sessionStore.setAppSession(
			gatewaySessionId,
			user.userId,
			resolvedAudience === "admin" ? "admin-dashboard" : "user-dashboard",
			ttlSeconds,
			{
				coreSessionId, // Store Core session in metadata
				csrfToken, // Store CSRF token for validation
			},
		);

		// Create signed cookie with Gateway session ID
		const cookieDomain = env.COOKIE_DOMAIN; // e.g., ".proofa.sh"
		const secureCookies =
			env.NODE_ENV === "production" || (env.GATEWAY_PUBLIC_URL ? env.GATEWAY_PUBLIC_URL.startsWith("https://") : false);
		const { value, attributes } = createSessionCookie(
			gatewaySessionId,
			cookieDomain ? { domain: cookieDomain, secure: secureCookies } : { secure: secureCookies },
		);

		const httpOnly = safeAttrBoolean(attributes['httpOnly']);
		const secure = safeAttrBoolean(attributes['secure']);
		const sameSite = safeAttrString(attributes['sameSite']) as "Strict" | "Lax" | "None";
		const path = safeAttrString(attributes['path']);
		const domain = attributes['domain'] ? safeAttrString(attributes['domain']) : undefined;
		const maxAge = safeAttrNumber(attributes['maxAge']);
		const cookieName = resolvedAudience === "admin" ? ADMIN_SESSION_COOKIE : USER_SESSION_COOKIE;

		// Set session cookie
		setCookie(c, cookieName, value, {
			httpOnly,
			secure,
			sameSite,
			path,
			...(domain ? { domain } : {}),
			...(maxAge !== undefined ? { maxAge } : {}),
		});

		// Set CSRF token cookie (NOT httpOnly so JavaScript can read it)
		setCookie(c, "proofa_csrf_token", csrfToken, {
			httpOnly: false, // Must be readable by JavaScript
			secure,
			sameSite,
			path,
			...(domain ? { domain } : {}),
			...(maxAge !== undefined ? { maxAge } : {}),
		});

		return c.json({
			message: "Logged in successfully",
			user: {
				id: user.userId,
				email: user.email,
				name: user.name,
			},
			csrfToken, // Return CSRF token in response for client-side storage as backup
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Login error:");
		return c.json({ error: "Failed to login" }, 500);
	}
});

/**
 * POST /v1/auth/logout
 * Logout and clear session
 */
authRoutes.post("/logout", async (c: Context) => {
	try {
		const isProduction = env.NODE_ENV === "production";
		const audience = inferAudience(c);
		const cookieDomain = env.COOKIE_DOMAIN;

		log.info(
			{
				audience,
				isProduction,
				cookieDomain,
			},
			"Logout request received",
		);

		// Check which session cookie actually exists (admin or user)
		const adminCookie = getCookie(c, ADMIN_SESSION_COOKIE);
		const userCookie = getCookie(c, USER_SESSION_COOKIE);

		// Determine actual cookie name and value based on what exists
		let cookieName: string;
		let sessionCookie: string | undefined;

		if (adminCookie) {
			cookieName = ADMIN_SESSION_COOKIE;
			sessionCookie = adminCookie;
			log.info("Found admin session cookie, will delete admin session");
		} else if (userCookie) {
			cookieName = USER_SESSION_COOKIE;
			sessionCookie = userCookie;
			log.info("Found user session cookie, will delete user session");
		} else {
			// Neither cookie exists, try to clear based on inferred audience
			cookieName = audience === "admin" ? ADMIN_SESSION_COOKIE : USER_SESSION_COOKIE;
			sessionCookie = undefined;
			log.warn({ inferredAudience: audience }, "No session cookie found, will clear based on inferred audience");
		}

		log.info(
			{
				cookieName,
				hasSessionCookie: !!sessionCookie,
				sessionCookiePreview: sessionCookie ? `${sessionCookie.substring(0, 8)}...` : null,
			},
			"Session cookie info",
		);

		// Parse the signed cookie to get the actual session ID
		if (sessionCookie) {
			try {
				const sessionId = parseSessionCookie(sessionCookie);
				if (sessionId) {
					log.info(
						{
							sessionId: `${sessionId.substring(0, 8)}...`,
							cookieName,
							audience,
						},
						"Starting session deletion",
					);

					// Verify session exists before deletion
					const appSessionBefore = await sessionStore.getAppSession(sessionId);
					log.info(
						{
							sessionExists: !!appSessionBefore,
							userId: appSessionBefore?.userId,
							appId: appSessionBefore?.appId,
						},
						"App session before deletion",
					);

					// Get Core session ID to revoke database session
					const coreSessionId = appSessionBefore?.metadata?.['coreSessionId'] as string | undefined;
					// Delete from all three stores:
					// 1. Delete from sessionService (gateway:session:xxx)
					await sessionService.deleteSession(sessionId);
					log.info({ sessionId: `${sessionId.substring(0, 8)}...` }, "Gateway session deleted from Redis");

					// 2. Delete from sessionStore (session:app:xxx) - this is what auth middleware checks!
					await sessionStore.revokeAppSession(sessionId);
					log.info({ sessionId: `${sessionId.substring(0, 8)}...` }, "App session deleted from Redis");

					// 3. Revoke Core database session
					if (coreSessionId) {
						try {
							const db = getDb();
							const dbSession = await sessionQueries.findByPublicId(db, coreSessionId);
							if (dbSession) {
								await sessionQueries.revoke(db, dbSession.id);
								log.info(
									{ coreSessionId: `${coreSessionId.substring(0, 8)}...` },
									"Core database session revoked",
								);
							} else {
								log.warn(
									{ coreSessionId: `${coreSessionId.substring(0, 8)}...` },
									"Core database session not found",
								);
							}
						} catch (dbError) {
							log.error(
								{ err: serializeError(dbError as Error) },
								"Failed to revoke Core database session",
							);
						}
					} else {
						log.warn("No Core session ID found in metadata");
					}

					// Verify deletion was successful
					const appSessionAfter = await sessionStore.getAppSession(sessionId);
					log.info(
						{
							sessionStillExists: !!appSessionAfter,
							deletionSuccessful: !appSessionAfter,
						},
						"App session after deletion verification",
					);

					if (appSessionAfter) {
						log.error(
							{ sessionId: `${sessionId.substring(0, 8)}...` },
							"ERROR: App session still exists after deletion!",
						);
					}
				} else {
					log.warn("Failed to parse session cookie");
				}
			} catch (parseError) {
				log.error({ err: serializeError(parseError as Error) }, "Error parsing session cookie");
			}
		} else {
			log.warn("No session cookie found");
		}

		// Clear the session cookie - must match EXACT attributes used when cookie was set
		// In development, cookies are set with secure:true even on localhost (Chrome allows this)
		// So we must clear with the SAME attributes

		// Clear with domain (if set)
		if (cookieDomain) {
			setCookie(c, cookieName, "", {
				httpOnly: true,
				secure: true, // Must match how it was set
				sameSite: "Lax",
				path: "/",
				domain: cookieDomain,
				maxAge: 0,
			});
			log.info({ cookieName, domain: cookieDomain, secure: true }, "Clearing cookie with domain");
		}

		// Always clear without domain too (for localhost)
		setCookie(c, cookieName, "", {
			httpOnly: true,
			secure: true, // Must match how it was set (Chrome allows secure on localhost)
			sameSite: "Lax",
			path: "/",
			maxAge: 0,
		});
		log.info({ cookieName, secure: true }, "Clearing cookie without domain");

		// Also try clearing with secure: false for older browsers
		setCookie(c, cookieName, "", {
			httpOnly: true,
			secure: false,
			sameSite: "Lax",
			path: "/",
			maxAge: 0,
		});
		log.info({ cookieName, secure: false }, "Clearing cookie with secure:false");

		// Clear CSRF token cookie
		if (cookieDomain) {
			setCookie(c, "proofa_csrf_token", "", {
				httpOnly: false,
				secure: true,
				sameSite: "Lax",
				path: "/",
				domain: cookieDomain,
				maxAge: 0,
			});
		}
		setCookie(c, "proofa_csrf_token", "", {
			httpOnly: false,
			secure: true,
			sameSite: "Lax",
			path: "/",
			maxAge: 0,
		});
		setCookie(c, "proofa_csrf_token", "", {
			httpOnly: false,
			secure: false,
			sameSite: "Lax",
			path: "/",
			maxAge: 0,
		});
		log.info("CSRF token cookie cleared");

		// Back-compat: clear legacy cookie when logging out of user session.
		if (audience === "user") {
			// Try all combinations for legacy cookie too
			if (cookieDomain) {
				setCookie(c, LEGACY_SESSION_COOKIE, "", {
					httpOnly: true,
					secure: true,
					sameSite: "Lax",
					path: "/",
					domain: cookieDomain,
					maxAge: 0,
				});
			}
			setCookie(c, LEGACY_SESSION_COOKIE, "", {
				httpOnly: true,
				secure: true,
				sameSite: "Lax",
				path: "/",
				maxAge: 0,
			});
			setCookie(c, LEGACY_SESSION_COOKIE, "", {
				httpOnly: true,
				secure: false,
				sameSite: "Lax",
				path: "/",
				maxAge: 0,
			});
			log.info("Legacy cookie cleared");
		}

		return c.json({ message: "Logged out successfully" });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Logout error:");
		return c.json({ error: "Failed to logout" }, 500);
	}
});

/**
 * GET /v1/auth/status
 * Check if user is logged in
 */
authRoutes.get("/status", async (c: Context) => {
	try {
		const audience = inferAudience(c);
		const adminCookie = getCookie(c, ADMIN_SESSION_COOKIE);
		const userCookie = getCookie(c, USER_SESSION_COOKIE);

		const cookiesToTry: Array<string> = [];
		if (audience === "admin") {
			if (adminCookie) cookiesToTry.push(adminCookie);
			if (userCookie) cookiesToTry.push(userCookie);
		} else {
			if (userCookie) cookiesToTry.push(userCookie);
			if (adminCookie) cookiesToTry.push(adminCookie);
		}

		if (cookiesToTry.length === 0) {
			return c.json({ loggedIn: false });
		}

		for (const cookie of cookiesToTry) {
			const sessionId = parseSessionCookie(cookie);
			if (!sessionId) continue;

			const appSession = await sessionStore.getAppSession(sessionId);
			if (!appSession) continue;

			const coreSessionId = appSession.metadata?.["coreSessionId"] as string | undefined;
			if (!coreSessionId) continue;

			const user = await coreClient.exchangeSession(coreSessionId);
			if (!user) continue;

			return c.json({
				loggedIn: true,
				user: {
					id: user.userId,
					email: user.email,
					name: user.name,
				},
			});
		}

		return c.json({ loggedIn: false });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Status check error:");
		return c.json({ loggedIn: false });
	}
});

/**
 * GET /v1/auth/sessions
 * List all active sessions for the current user
 */
authRoutes.get("/sessions", async (c: Context) => {
	try {
		const adminCookie = getCookie(c, ADMIN_SESSION_COOKIE);
		const userCookie = getCookie(c, USER_SESSION_COOKIE);

		const cookiesToCheck: Array<{ cookie: string; cookieName: string }> = [];
		if (adminCookie) cookiesToCheck.push({ cookie: adminCookie, cookieName: ADMIN_SESSION_COOKIE });
		if (userCookie) cookiesToCheck.push({ cookie: userCookie, cookieName: USER_SESSION_COOKIE });

		if (cookiesToCheck.length === 0) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		let currentUserId: string | undefined;
		const activeSessions = [];

		// Get current user ID and collect all their sessions
		for (const { cookie, cookieName: _cookieName } of cookiesToCheck) {
			const sessionId = parseSessionCookie(cookie);
			if (!sessionId) continue;

			const appSession = await sessionStore.getAppSession(sessionId);
			if (!appSession) continue;

			const coreSessionId = appSession.metadata?.["coreSessionId"] as string | undefined;
			if (!coreSessionId) continue;

			const user = await coreClient.exchangeSession(coreSessionId);
			if (!user) continue;

			currentUserId = user.userId;
			break; // Found valid session, get user ID
		}

		if (!currentUserId) {
			return c.json({ error: "Invalid session" }, 401);
		}

		// Get all sessions for this user
		const userSessions = await sessionStore.getUserSessions(currentUserId);

		for (const session of userSessions) {
			const sessionData = session.sessionData;
			activeSessions.push({
				id: session.id,
				appId: sessionData.appId,
				createdAt: (sessionData.metadata?.["createdAt"] as string) || new Date().toISOString(),
				lastActivity: (sessionData.metadata?.["lastActivity"] as string) || new Date().toISOString(),
				isCurrentSession: session.id === parseSessionCookie(userCookie || adminCookie || ""),
			});
		}

		return c.json({
			sessions: activeSessions.sort(
				(a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
			),
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Sessions list error:");
		return c.json({ error: "Failed to list sessions" }, 500);
	}
});

/**
 * DELETE /v1/auth/sessions/:sessionId
 * Revoke a specific session by ID
 */
authRoutes.delete("/sessions/:sessionId", async (c: Context) => {
	try {
		const sessionIdToRevoke = c.req.param("sessionId");
		const adminCookie = getCookie(c, ADMIN_SESSION_COOKIE);
		const userCookie = getCookie(c, USER_SESSION_COOKIE);

		const cookiesToCheck: Array<string> = [];
		if (adminCookie) cookiesToCheck.push(adminCookie);
		if (userCookie) cookiesToCheck.push(userCookie);

		if (cookiesToCheck.length === 0) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		let currentUserId: string | undefined;
		let currentSessionId: string | undefined;

		// Get current user ID to ensure they can only revoke their own sessions
		for (const cookie of cookiesToCheck) {
			const parsedSessionId = parseSessionCookie(cookie);
			if (!parsedSessionId) continue;

			const appSession = await sessionStore.getAppSession(parsedSessionId);
			if (!appSession) continue;

			const coreSessionId = appSession.metadata?.["coreSessionId"] as string | undefined;
			if (!coreSessionId) continue;

			const user = await coreClient.exchangeSession(coreSessionId);
			if (!user) continue;

			currentUserId = user.userId;
			currentSessionId = parsedSessionId;
			break;
		}

		if (!currentUserId) {
			return c.json({ error: "Invalid session" }, 401);
		}

		// Verify the session to revoke belongs to the current user
		const sessionToRevoke = await sessionStore.getAppSession(sessionIdToRevoke);
		if (!sessionToRevoke) {
			return c.json({ error: "Session not found" }, 404);
		}

		if (sessionToRevoke.userId !== currentUserId) {
			return c.json({ error: "Cannot revoke other users' sessions" }, 403);
		}

		// Prevent revoking current session via this endpoint (use /logout instead)
		if (sessionIdToRevoke === currentSessionId) {
			return c.json(
				{ error: "Use /logout endpoint to revoke current session" },
				400,
			);
		}

		// Revoke the session
		await sessionStore.revokeAppSession(sessionIdToRevoke);

		log.info(
			{
				userId: currentUserId,
				revokedSessionId: `${sessionIdToRevoke.substring(0, 8)}...`,
			},
			"Session revoked by user",
		);

		return c.json({ message: "Session revoked successfully" });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Session revocation error:");
		return c.json({ error: "Failed to revoke session" }, 500);
	}
});
