import { GitHubOAuthAdapter, GoogleOAuthAdapter } from "@proofa/auth";
import { getDb, identityQueries, sessionQueries, userQueries } from "@proofa/db";
import { createId, idPatterns } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";

const router = new Hono();

/**
 * GET /v1/auth/start
 * Start OAuth flow
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

		const authUrl = adapter.getAuthorizationUrl(createId("state"), redirectUri);

		return c.json({ authUrl });
	} catch (error) {
		console.error("Auth start error:", error);
		return c.json({ error: "Failed to start auth" }, 500);
	}
});

/**
 * GET /v1/auth/callback/:provider
 * OAuth callback handler
 */
router.get("/callback/:provider", async (c: Context) => {
	const provider = c.req.param("provider") as "google" | "github" | undefined;
	const code = c.req.query("code") as string | undefined;

	if (!provider || !["google", "github"].includes(provider)) {
		return c.json({ error: "Invalid provider" }, 400);
	}

	if (!code) {
		return c.json({ error: "Missing code" }, 400);
	}

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

		const token = await adapter.exchangeCodeForTokens(code, process.env.CALLBACK_URL || "");

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
				picture_url: profile.picture || null,
				created_at: now,
				updated_at: now,
			});
			userId = newUser.id;
			userPublicId = newUser.public_id;

			// Create identity
			await identityQueries.create(db, {
				user_id: userId,
				provider,
				provider_user_id: profile.id,
				email: profile.email,
				profile_data: JSON.stringify(profile),
				created_at: now,
			});
		} else {
			const user = await userQueries.findById(db, userId);
			userPublicId = user?.public_id || createId("user");
		}

		// Create core session
		const sessionData = {
			user_id: userId,
			identity_id: existingIdentity?.id,
			app_id: null,
			public_id: createId("session"),
			expires_at: now + 7 * 24 * 60 * 60, // 7 days
			created_at: now,
			updated_at: now,
		};

		const session = await sessionQueries.create(db, sessionData);

		return c.json({
			sessionId: session.public_id,
			userId: userPublicId,
			email: profile.email,
			createdUser: !existingIdentity,
		});
	} catch (error) {
		console.error("Auth callback error:", error);
		return c.json({ error: "Failed to complete auth" }, 500);
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
			picture: user.picture_url,
			expiresAt: session.expires_at,
		});
	} catch (error) {
		console.error("Auth exchange error:", error);
		return c.json({ error: "Failed to exchange session" }, 500);
	}
});

export const authRoutes = router;
