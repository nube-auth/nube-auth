import { GitHubOAuthAdapter, GoogleOAuthAdapter } from "@proofa/auth";
import { getDb, identityQueries, sessionQueries, userQueries } from "@proofa/db";
import { cache } from "@proofa/redis";
import { createId, idPatterns } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";

const router = new Hono();

// OAuth state storage helpers using Redis
const OAUTH_STATE_PREFIX = "oauth:state:";
const OAUTH_STATE_TTL = 600; // 10 minutes

interface OAuthStateData {
	redirectUri: string;
	provider: string;
}

async function setOAuthState(state: string, data: OAuthStateData): Promise<void> {
	await cache.set(`${OAUTH_STATE_PREFIX}${state}`, data, OAUTH_STATE_TTL);
}

async function getOAuthState(state: string): Promise<OAuthStateData | null> {
	return cache.get<OAuthStateData>(`${OAUTH_STATE_PREFIX}${state}`);
}

async function deleteOAuthState(state: string): Promise<void> {
	await cache.delete(`${OAUTH_STATE_PREFIX}${state}`);
}

/**
 * GET /v1/auth/start
 * Start OAuth flow - redirects to provider
 */
router.get("/start", async (c: Context) => {
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
				clientId: process.env.GOOGLE_CLIENT_ID || "",
				clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
			});
		} else {
			adapter = new GitHubOAuthAdapter({
				clientId: process.env.GITHUB_CLIENT_ID || "",
				clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
			});
		}

		// Generate state for CSRF protection and to store redirect info
		const oauthState = createId("authCode");

		// Store the redirect_uri and provider in Redis for when Google calls back
		await setOAuthState(oauthState, {
			redirectUri,
			provider,
		});

		// Core's own callback URL - Google will redirect here
		const coreCallbackUrl = `${process.env.CORE_PUBLIC_URL || "http://localhost:3003"}/v1/auth/callback/${provider}`;

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
router.get("/callback/:provider", async (c: Context) => {
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
		const storedState = state ? await getOAuthState(state) : null;
		if (storedState) {
			await deleteOAuthState(state!);
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

	// Retrieve stored state from Redis
	const storedState = await getOAuthState(state);
	if (!storedState) {
		return c.json({ error: "Invalid or expired state" }, 400);
	}

	// Verify provider matches
	if (storedState.provider !== provider) {
		return c.json({ error: "Provider mismatch" }, 400);
	}

	// Clean up state from Redis
	await deleteOAuthState(state);

	try {
		const db = getDb();
		const now = Math.floor(Date.now() / 1000);

		let adapter;
		if (provider === "google") {
			adapter = new GoogleOAuthAdapter({
				clientId: process.env.GOOGLE_CLIENT_ID || "",
				clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
			});
		} else {
			adapter = new GitHubOAuthAdapter({
				clientId: process.env.GITHUB_CLIENT_ID || "",
				clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
			});
		}

		// Core's callback URL that was used for OAuth
		const coreCallbackUrl = `${process.env.CORE_PUBLIC_URL || "http://localhost:3003"}/v1/auth/callback/${provider}`;

		const token = await adapter.exchangeCodeForTokens(code, coreCallbackUrl);
		const profile = await adapter.fetchUserProfile(token.accessToken);

		// Find existing identity
		const existingIdentity = await identityQueries.findByProviderUserId(db, provider, profile.id);

		let userId = existingIdentity?.user_id;
		let userPublicId: string;

		if (!userId) {
			// Create new user
			const newUser = await userQueries.create(db, {
				public_id: createId("user"),
				primary_email: profile.email,
				name: profile.name,
				avatar_url: profile.picture || null,
				created_at: now,
				updated_at: now,
			});
			userId = newUser.id;
			userPublicId = newUser.public_id;

			// Create identity
			await identityQueries.create(db, {
				public_id: createId("identity"),
				user_id: userId,
				provider,
				provider_user_id: profile.id,
				email: profile.email,
				created_at: now,
			});
		} else {
			const user = await userQueries.findById(db, userId);
			userPublicId = user?.public_id || createId("user");
		}

		// Create core session
		const sessionData = {
			public_id: createId("session"),
			user_id: userId,
			created_at: now,
			last_seen_at: now,
			expires_at: now + 7 * 24 * 60 * 60, // 7 days
		};

		const session = await sessionQueries.create(db, sessionData);

		// Redirect to Gateway callback with session ID as code
		const redirectUrl = new URL(storedState.redirectUri);
		redirectUrl.searchParams.set("code", session.public_id);
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
 * Exchange session token for user info
 */
router.post("/exchange", async (c: Context) => {
	const { sessionId } = await c.req.json();

	if (!sessionId || !idPatterns.session.test(sessionId)) {
		return c.json({ error: "Invalid session" }, 400);
	}

	try {
		const db = getDb();
		const now = Math.floor(Date.now() / 1000);

		const session = await sessionQueries.findByPublicId(db, sessionId);

		if (!session) {
			return c.json({ error: "Session not found" }, 404);
		}

		if (session.expires_at < now) {
			return c.json({ error: "Session expired" }, 401);
		}

		const user = await userQueries.findById(db, session.user_id);

		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		return c.json({
			userId: user.public_id,
			email: user.primary_email,
			name: user.name,
			picture: user.avatar_url,
			expiresAt: session.expires_at,
		});
	} catch (error) {
		console.error("Auth exchange error:", error);
		return c.json({ error: "Failed to exchange session" }, 500);
	}
});

export const authRoutes = router;
