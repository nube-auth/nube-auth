import { createSessionCookie, parseSessionCookie } from "@proofa/auth";
import { sessionStore } from "@proofa/redis";
import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { coreClient } from "../lib/core-client";
import { getEnv } from "../config/env";

export const authRoutes = new Hono();

/**
 * GET /v1/auth/start
 * Start OAuth flow - redirects to Core which then redirects to OAuth provider
 */
authRoutes.get("/start", async (c: Context) => {
	const provider = c.req.query("provider") || "google";
	const returnTo = c.req.query("return_to") || "/";
	const env = getEnv();

	// Gateway's callback URL - Core will redirect here after OAuth
	const gatewayCallbackUrl = `${process.env.GATEWAY_PUBLIC_URL || "http://localhost:3004"}/v1/auth/callback`;

	// Build Core auth start URL
	const coreAuthUrl = new URL(`${env.CORE_URL}/v1/auth/start`);
	coreAuthUrl.searchParams.set("provider", provider);
	coreAuthUrl.searchParams.set("redirect_uri", gatewayCallbackUrl);
	coreAuthUrl.searchParams.set("state", returnTo); // Pass return_to as state

	return c.redirect(coreAuthUrl.toString());
});

/**
 * GET /v1/auth/callback
 * OAuth callback from Core - receives auth code and exchanges it for session
 */
authRoutes.get("/callback", async (c: Context) => {
	const code = c.req.query("code");
	const state = c.req.query("state") || "/"; // return_to URL
	const error = c.req.query("error");

	if (error) {
		console.error("OAuth error:", error);
		// Redirect to dashboard with error
		const dashboardUrl = process.env.USER_DASHBOARD_URL || "http://localhost:5173";
		return c.redirect(`${dashboardUrl}/login?error=${encodeURIComponent(error)}`);
	}

	if (!code) {
		const dashboardUrl = process.env.USER_DASHBOARD_URL || "http://localhost:5173";
		return c.redirect(`${dashboardUrl}/login?error=missing_code`);
	}

	try {
		const env = getEnv();

		// Exchange session ID with Core (S2S call)
		// Note: Core's callback sends the session ID as "code" parameter
		const response = await fetch(`${env.CORE_URL}/v1/auth/exchange`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Proofa-Service-Token": env.CORE_S2S_TOKEN,
			},
			body: JSON.stringify({
				sessionId: code, // Core passes session ID as "code" param
			}),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error("Code exchange failed:", response.status, errorData);
			const dashboardUrl = process.env.USER_DASHBOARD_URL || "http://localhost:5173";
			return c.redirect(`${dashboardUrl}/login?error=exchange_failed`);
		}

		const data = (await response.json()) as {
			userId: string;
			email?: string;
			name?: string;
		};

		// Store app session in Redis (7-day TTL for now)
		// Note: "code" is actually the session ID from Core
		const sessionId = code;
		const ttlSeconds = 7 * 24 * 60 * 60; // 7 days
		await sessionStore.setAppSession(sessionId, data.userId, "user-dashboard", ttlSeconds);

		// Create signed cookie with domain for cross-subdomain access
		const cookieDomain = process.env.COOKIE_DOMAIN; // e.g., ".proofa.sh"
		const { name, value, attributes } = createSessionCookie(sessionId, {
			domain: cookieDomain,
		});

		// Set cookie
		setCookie(c, name, value, {
			httpOnly: attributes.httpOnly as boolean,
			secure: attributes.secure as boolean,
			sameSite: attributes.sameSite as "Strict" | "Lax" | "None",
			path: attributes.path as string,
			domain: attributes.domain as string | undefined,
		});

		// Redirect to user dashboard (or the return_to URL)
		const dashboardUrl = process.env.USER_DASHBOARD_URL || "http://localhost:5173";
		const redirectUrl = state.startsWith("/") ? `${dashboardUrl}${state}` : dashboardUrl;
		return c.redirect(redirectUrl);
	} catch (error) {
		console.error("Auth callback error:", error);
		const dashboardUrl = process.env.USER_DASHBOARD_URL || "http://localhost:5173";
		return c.redirect(`${dashboardUrl}/login?error=internal_error`);
	}
});

/**
 * POST /v1/auth/login
 * Exchange Core session for Gateway app session (legacy/manual)
 */
authRoutes.post("/login", async (c: Context) => {
	try {
		const { coreSessionId } = (await c.req.json()) as { coreSessionId?: string };

		if (!coreSessionId) {
			return c.json({ error: "Core session ID required" }, 400);
		}

		// Get user info from Core
		const user = await coreClient.exchangeSession(coreSessionId);

		if (!user) {
			return c.json({ error: "Invalid session" }, 401);
		}

		// Store app session in Redis (7-day TTL for now)
		const ttlSeconds = 7 * 24 * 60 * 60; // 7 days
		await sessionStore.setAppSession(coreSessionId, user.userId, "gateway", ttlSeconds);

		// Create signed cookie
		const { name, value, attributes } = createSessionCookie(coreSessionId);

		// Set cookie
		setCookie(c, name, value, {
			httpOnly: attributes.httpOnly as boolean,
			secure: attributes.secure as boolean,
			sameSite: attributes.sameSite as "Strict" | "Lax" | "None",
			path: attributes.path as string,
		});

		return c.json({
			message: "Logged in successfully",
			user: {
				id: user.userId,
				email: user.email,
				name: user.name,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		return c.json({ error: "Failed to login" }, 500);
	}
});

/**
 * POST /v1/auth/logout
 * Logout and clear session
 */
authRoutes.post("/logout", async (c: Context) => {
	try {
		// Clear session cookie
		setCookie(c, "proofa_session", "", {
			httpOnly: true,
			secure: true,
			sameSite: "Lax",
			path: "/",
			maxAge: 0, // Clear cookie
		});

		return c.json({ message: "Logged out successfully" });
	} catch (error) {
		console.error("Logout error:", error);
		return c.json({ error: "Failed to logout" }, 500);
	}
});

/**
 * GET /v1/auth/status
 * Check if user is logged in
 */
authRoutes.get("/status", async (c: Context) => {
	try {
		const cookie = getCookie(c, "proofa_session");

		if (!cookie) {
			return c.json({ loggedIn: false });
		}

		try {
			const sessionId = parseSessionCookie(cookie);
			if (!sessionId) {
				return c.json({ loggedIn: false });
			}

			const appSession = await sessionStore.getAppSession(sessionId);

			if (!appSession) {
				return c.json({ loggedIn: false });
			}

			// Get user info from Core
			const user = await coreClient.exchangeSession(sessionId);

			if (!user) {
				return c.json({ loggedIn: false });
			}

			return c.json({
				loggedIn: true,
				user: {
					id: user.userId,
					email: user.email,
					name: user.name,
				},
			});
		} catch {
			return c.json({ loggedIn: false });
		}
	} catch (error) {
		console.error("Status check error:", error);
		return c.json({ loggedIn: false });
	}
});
