import crypto from "node:crypto";
import { createSessionCookie, parseSessionCookie } from "@nube-auth/auth";
import { cache, sessionStore } from "@nube-auth/cache";
import { GatewayLoginRequestSchema, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { ADMIN_SESSION_TTL, CSRF_TOKEN_BYTES, SESSION_ID_BYTES, SESSION_TTL } from "../../config/constants";
import { env } from "../../config/env";
import { coreClient } from "../../lib/core-client";
import { sessionService } from "../../services/sessionService";
import {
	ADMIN_SESSION_COOKIE,
	CSRF_TOKEN_COOKIE,
	LEGACY_SESSION_COOKIE,
	USER_SESSION_COOKIE,
} from "../../utils/cookieNames";

import { inferAudience, log, safeAttrBoolean, safeAttrNumber, safeAttrString } from "./shared";

const loginRoutes = new Hono();

/**
 * POST /v1/auth/login
 * Exchange Core session for Gateway app session (legacy/manual)
 */
loginRoutes.post("/login", async (c: Context) => {
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
		const resolvedAudience = audience === "admin" ? "admin" : "user";
		const ttlSeconds = resolvedAudience === "admin" ? ADMIN_SESSION_TTL : SESSION_TTL;
		// Capture IP address and user-agent for session tracking
		const ipAddress =
			c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
		const userAgent = c.req.header("user-agent") || "unknown";

		// Store app session with Gateway session ID and CSRF token
		await sessionStore.setAppSession(
			gatewaySessionId,
			user.userId,
			resolvedAudience === "admin" ? "admin-dashboard" : "user-dashboard",
			ttlSeconds,
			{
				coreSessionId, // Store Core session in metadata
				csrfToken, // Store CSRF token for validation
				createdAt: Date.now(), // Track creation time
				lastActivityAt: Date.now(), // Track last activity
				ipAddress, // IP address for location/security tracking
				userAgent, // Browser/device info
			},
		);

		// Create signed cookie with Gateway session ID
		const cookieDomain = env.COOKIE_DOMAIN; // e.g., ".nubeauth.com"
		const secureCookies =
			env.NODE_ENV === "production" ||
			(env.GATEWAY_PUBLIC_URL ? env.GATEWAY_PUBLIC_URL.startsWith("https://") : false);
		const { value, attributes } = createSessionCookie(
			gatewaySessionId,
			cookieDomain
				? { domain: cookieDomain, secure: secureCookies, maxAge: ttlSeconds }
				: { secure: secureCookies, maxAge: ttlSeconds },
		);

		const httpOnly = safeAttrBoolean(attributes["httpOnly"]);
		const secure = safeAttrBoolean(attributes["secure"]);
		const sameSite = safeAttrString(attributes["sameSite"]) as "Strict" | "Lax" | "None";
		const path = safeAttrString(attributes["path"]);
		const domain = attributes["domain"] ? safeAttrString(attributes["domain"]) : undefined;
		const maxAge = safeAttrNumber(attributes["maxAge"]);
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
		setCookie(c, CSRF_TOKEN_COOKIE, csrfToken, {
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
loginRoutes.post("/logout", async (c: Context) => {
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

		// Parse the signed cookie to get the actual session ID
		if (sessionCookie) {
			try {
				const sessionId = parseSessionCookie(sessionCookie);
				if (sessionId) {
					// Verify session exists before deletion
					const appSessionBefore = await sessionStore.getAppSession(sessionId);

					// Get Core session ID to revoke database session
					const coreSessionId = appSessionBefore?.metadata?.["coreSessionId"] as string | undefined;
					// Delete from all three stores:
					// 1. Delete from sessionService (gateway:session:xxx)
					await sessionService.deleteSession(sessionId);

					// 2. Delete from sessionStore (session:app:xxx) - this is what auth middleware checks!
					await sessionStore.revokeAppSession(sessionId);

					if (coreSessionId) {
						try {
							await coreClient.revokeSession(coreSessionId);
						} catch (revokeError) {
							log.error(
								{ err: serializeError(revokeError as Error) },
								"Failed to revoke Core database session",
							);
						}
					}

					// Verify deletion was successful
					const appSessionAfter = await sessionStore.getAppSession(sessionId);

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
			setCookie(c, CSRF_TOKEN_COOKIE, "", {
				httpOnly: false,
				secure: true,
				sameSite: "Lax",
				path: "/",
				domain: cookieDomain,
				maxAge: 0,
			});
		}
		setCookie(c, CSRF_TOKEN_COOKIE, "", {
			httpOnly: false,
			secure: true,
			sameSite: "Lax",
			path: "/",
			maxAge: 0,
		});
		setCookie(c, CSRF_TOKEN_COOKIE, "", {
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
 * POST /v1/auth/token
 *
 * Exchange the short-lived one-time code (delivered via ?code= in the OAuth
 * callback redirect) for the real session token.
 *
 * The code is single-use: the first successful exchange deletes it from Redis
 * so replaying the same code always returns 400.
 *
 * Body:  { code: string, app_id: string }
 * Returns: { sessionToken: string, userId: string, appId: string }
 */
loginRoutes.post("/token", async (c: Context) => {
	try {
		const body = await c.req.json<{ code?: string; app_id?: string; code_verifier?: string }>();
		const { code, app_id, code_verifier } = body;

		if (!code || !app_id) {
			return c.json({ error: "code and app_id are required" }, 400);
		}

		const exchangeKey = `exchange:${code}`;
		// Atomic GETDEL — single Redis round-trip; prevents replay even under concurrent requests
		const exchangeData = await cache.getAndDelete<{
			sessionToken: string;
			appId: string;
			codeChallenge?: string;
			codeChallengeMethod?: string;
		}>(exchangeKey);

		if (!exchangeData) {
			return c.json({ error: "invalid_or_expired_code" }, 400);
		}

		if (exchangeData.appId !== app_id) {
			log.warn({ claimed_app_id: app_id, actual_app_id: exchangeData.appId }, "Token exchange app_id mismatch");
			return c.json({ error: "invalid_or_expired_code" }, 400);
		}

		// PKCE S256 verification — enforced when the flow included a code_challenge.
		// Non-S256 methods are rejected (never silently skipped).
		if (exchangeData.codeChallenge) {
			if (!code_verifier) {
				log.warn({ appId: app_id }, "PKCE code_verifier missing but challenge is present");
				return c.json({ error: "code_verifier_required" }, 400);
			}
			const method = exchangeData.codeChallengeMethod ?? "S256";
			if (method !== "S256") {
				// Should never happen (rejected at /start), but defend in depth
				log.warn({ appId: app_id, method }, "Unsupported PKCE method in stored challenge");
				return c.json({ error: "unsupported_code_challenge_method" }, 400);
			}
			const computed = crypto.createHash("sha256").update(code_verifier).digest("base64url");
			if (computed !== exchangeData.codeChallenge) {
				log.warn({ appId: app_id }, "PKCE verification failed — code_verifier does not match challenge");
				return c.json({ error: "invalid_code_verifier" }, 400);
			}
		}

		// Resolve the userId from the stored session.
		const session = await sessionStore.getAppSession(exchangeData.sessionToken);
		if (!session) {
			log.error(
				{ sessionToken: `${exchangeData.sessionToken.substring(0, 8)}...` },
				"Session not found after code exchange",
			);
			return c.json({ error: "session_not_found" }, 500);
		}

		log.info({ userId: session.userId, appId: exchangeData.appId }, "Token exchange successful");
		return c.json({
			sessionToken: exchangeData.sessionToken,
			userId: session.userId,
			appId: exchangeData.appId,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Token exchange error");
		return c.json({ error: "internal_error" }, 500);
	}
});

export { loginRoutes };
