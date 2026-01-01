import { GitHubOAuthAdapter, GoogleOAuthAdapter } from "@proofa/auth";
import { getDb, identityQueries, sessionQueries, userQueries } from "@proofa/db";
import { id, idPatterns } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";

export const authRoutes = new Hono();

// In-memory store for OAuth state (in production, use Redis)
const oauthStateStore = new Map<string, { redirectUri: string; provider: string; expiresAt: number }>();

// Cleanup expired states periodically
setInterval(() => {
	const now = Date.now();
	for (const [key, value] of oauthStateStore.entries()) {
		if (value.expiresAt < now) {
			oauthStateStore.delete(key);
		}
	}
}, 60000); // Every minute

/**
 * GET /v1/auth/start
 * Start OAuth flow - redirects to provider
 */
authRoutes.get("/start", async (c: Context) => {
	const provider = c.req.query("provider") as "google" | "github" | undefined;
	const redirectUri = c.req.query("redirect_uri") as string | undefined;

	if (!provider || !["google", "github"].includes(provider)) {
		return c.json({ error: "Invalid provider" }, 400);
	}

	if (!redirectUri) {
		return c.json({ error: "Missing redirect_uri" }, 400);
	}

	try {
		let adapter;
		if (provider === "google") {
			adapter = new GoogleOAuthAdapter({
				clientId: process.env["GOOGLE_CLIENT_ID"] ?? "",
				clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
			});
		} else {
			adapter = new GitHubOAuthAdapter({
				clientId: process.env["GITHUB_CLIENT_ID"] ?? "",
				clientSecret: process.env["GITHUB_CLIENT_SECRET"] ?? "",
			});
		}

		// Generate state for CSRF protection and to store redirect info
		const oauthState = id.authCode();

		// Store the redirect_uri and provider for when Google calls back
		oauthStateStore.set(oauthState, {
			redirectUri,
			provider,
			expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
		});

		// Core's own callback URL - Google will redirect here
		const coreCallbackUrl = `${process.env["CORE_PUBLIC_URL"] ?? "http://localhost:3003"}/v1/auth/callback/${provider}`;

		const authUrl = adapter.getAuthorizationUrl(oauthState, coreCallbackUrl);

		// Redirect to OAuth provider
		return c.redirect(authUrl);
	} catch (error) {
		console.error("Auth start error:", error);
		return c.json({ error: "Failed to start auth" }, 500);
	}
});

/**
 * GET /v1/auth/callback/:provider
 * OAuth callback handler - receives code from provider, creates session, redirects to Gateway
 */
authRoutes.get("/callback/:provider", async (c: Context) => {
	const provider = c.req.param("provider") as "google" | "github" | undefined;
	const code = c.req.query("code") as string | undefined;
	const state = c.req.query("state") as string | undefined;
	const error = c.req.query("error") as string | undefined;

	if (!provider || !["google", "github"].includes(provider)) {
		return c.json({ error: "Invalid provider" }, 400);
	}

	// Check for OAuth error
	if (error) {
		console.error("OAuth error from provider:", error);
		// Try to get redirect URI from state to redirect back with error
		const storedState = state ? oauthStateStore.get(state) : null;
		if (storedState) {
			oauthStateStore.delete(state!);
			const redirectUrl = new URL(storedState.redirectUri);
			redirectUrl.searchParams.set("error", error);
			return c.redirect(redirectUrl.toString());
		}
		return c.json({ error: `OAuth error: ${error}` }, 400);
	}

	if (!code) {
		return c.json({ error: "Missing code" }, 400);
	}

	if (!state) {
		return c.json({ error: "Missing state" }, 400);
	}

	// Retrieve stored state
	const storedState = oauthStateStore.get(state);
	if (!storedState) {
		return c.json({ error: "Invalid or expired state" }, 400);
	}

	// Verify provider matches
	if (storedState.provider !== provider) {
		return c.json({ error: "Provider mismatch" }, 400);
	}

	// Clean up state
	oauthStateStore.delete(state);

	try {
		const db = getDb();

		let adapter;
		if (provider === "google") {
			adapter = new GoogleOAuthAdapter({
				clientId: process.env["GOOGLE_CLIENT_ID"] ?? "",
				clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
			});
		} else {
			adapter = new GitHubOAuthAdapter({
				clientId: process.env["GITHUB_CLIENT_ID"] ?? "",
				clientSecret: process.env["GITHUB_CLIENT_SECRET"] ?? "",
			});
		}

		// Core's callback URL that was used for OAuth
		const coreCallbackUrl = `${process.env["CORE_PUBLIC_URL"] ?? "http://localhost:3003"}/v1/auth/callback/${provider}`;

		const profile = await adapter.exchangeToken(code, coreCallbackUrl);

		// Find existing identity
		const existingIdentity = await identityQueries.findByProviderUserId(db, provider, profile.id);

		let userId = existingIdentity?.user_id;

		if (!userId) {
			// Create new user
			const newUser = await userQueries.create(db, {
				public_id: id.user(),
				primary_email: profile.email,
				name: profile.name,
				avatar_url: profile.avatar_url || null,
				created_at: new Date(),
				updated_at: new Date(),
			});
			userId = newUser.id;

			// Create identity
			await identityQueries.create(db, {
				public_id: id.identity(),
				user_id: userId,
				provider,
				provider_user_id: profile.id,
				email: profile.email,
				created_at: new Date(),
			});
		}

		// Create core session
		const sessionData = {
			public_id: id.session(),
			user_id: userId,
			created_at: new Date(),
			last_seen_at: new Date(),
			expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		};

		const session = await sessionQueries.create(db, sessionData);

		// Redirect to Gateway callback with auth code
		const redirectUrl = new URL(storedState.redirectUri);
		redirectUrl.searchParams.set("code", session.public_id); // Using session ID as code for now
		redirectUrl.searchParams.set("state", state);

		return c.redirect(redirectUrl.toString());
	} catch (error) {
		console.error("Auth callback error:", error);
		// Redirect back with error
		const redirectUrl = new URL(storedState.redirectUri);
		redirectUrl.searchParams.set("error", "auth_failed");
		return c.redirect(redirectUrl.toString());
	}
});

/**
 * POST /v1/auth/exchange
 * Exchange auth code (session ID) for user info - S2S call from Gateway
 */
authRoutes.post("/exchange", async (c: Context) => {
	const body = await c.req.json();
	const { code, sessionId } = body;

	// Accept either 'code' or 'sessionId' for backwards compatibility
	const sessionIdToUse = code || sessionId;

	if (!sessionIdToUse || !idPatterns.session.test(sessionIdToUse)) {
		return c.json({ error: "Invalid session/code" }, 400);
	}

	try {
		const db = getDb();
		const session = await sessionQueries.findByPublicId(db, sessionIdToUse);

		if (!session) {
			return c.json({ error: "Session not found" }, 404);
		}

		const now = new Date();
		if (session.expires_at < now) {
			return c.json({ error: "Session expired" }, 401);
		}

		const user = await userQueries.findById(db, session.user_id);

		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		return c.json({
			sessionId: session.public_id,
			userId: user.public_id,
			email: user.primary_email,
			name: user.name,
			expiresAt: session.expires_at,
		});
	} catch (error) {
		console.error("Auth exchange error:", error);
		return c.json({ error: "Failed to exchange session" }, 500);
	}
});
