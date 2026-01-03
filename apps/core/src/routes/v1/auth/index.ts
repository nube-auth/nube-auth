import { GitHubOAuthAdapter, GoogleOAuthAdapter } from "@proofa/auth";
import { cache } from "@proofa/cache";
import {
	appQueries,
	getDb,
	identityQueries,
	invitationQueries,
	licenseQueries,
	planQueries,
	projectInvitationQueries,
	projectMemberQueries,
	sessionQueries,
	userQueries,
} from "@proofa/db";
import { createId, idPatterns, type PlanSettings } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { env } from "../../../config/env";

const router = new Hono();

// OAuth state storage helpers using Redis
const OAUTH_STATE_PREFIX = "oauth:state:";
const OAUTH_STATE_TTL = 600; // 10 minutes

interface OAuthStateData {
	redirectUri: string;
	provider: string;
	appId?: string;
	inviteCode?: string;
	invite?: string; // Project team invitation code
	gatewayState?: string; // Preserve Gateway's original state
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

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function ensureLicenseForApp(db: ReturnType<typeof getDb>, userId: number, appPublicId?: string): Promise<void> {
	if (!appPublicId) return;

	try {
		const app = await appQueries.findByPublicId(db, appPublicId);
		if (!app) return;

		// Type-safe access to plan_settings JSONB field
		const planSettings = app.plan_settings as unknown as PlanSettings;
		if (planSettings?.licensingRequired === false) return;

		const existing = await licenseQueries.findByUserAndApp(db, userId, app.id);
		if (existing) return;

		if (!planSettings?.defaultPlanId) {
			console.warn({ appId: appPublicId }, "Auto-license skipped: defaultPlanId not set in plan_settings");
			return;
		}

		const plan = await planQueries.findById(db, planSettings.defaultPlanId);
		if (!plan || plan.app_id !== app.id || plan.status !== "active" || plan.deleted_at) {
			console.warn(
				{ appId: appPublicId, planId: planSettings.defaultPlanId },
				"Auto-license skipped: default plan invalid or inactive",
			);
			return;
		}

		const now = new Date();
		let validUntil: Date | null = null;

		if (plan.trial_enabled && plan.trial_days) {
			validUntil = new Date(now.getTime() + plan.trial_days * ONE_DAY_MS);
		} else if (plan.duration_days) {
			validUntil = new Date(now.getTime() + plan.duration_days * ONE_DAY_MS);
		}

		await licenseQueries.create(db, {
			public_id: createId("license"),
			user_id: userId,
			app_id: app.id,
			plan_id: plan.id,
			status: "active",
			valid_until: validUntil,
			created_at: now,
			updated_at: now,
		});
	} catch (licenseError) {
		console.error({ appId: appPublicId, err: licenseError }, "Auto-license creation failed");
	}
}

/**
 * GET /v1/auth/start
 * Start OAuth flow - redirects to provider
 */
router.get("/start", async (c: Context) => {
	const provider = c.req.query("provider") as "google" | "github" | undefined;
	const redirectUri = c.req.query("redirect_uri") as string | undefined;
	const appId = c.req.query("app_id") as string | undefined;
	const inviteCode = c.req.query("invite_code") as string | undefined;
	const invite = c.req.query("invite") as string | undefined; // Project team invitation code
	const gatewayState = c.req.query("state") as string | undefined; // Gateway's state

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
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
			});
		} else {
			adapter = new GitHubOAuthAdapter({
				clientId: env.GITHUB_CLIENT_ID ?? "",
				clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
			});
		}

		// Generate state for CSRF protection and to store redirect info
		const oauthState = createId("authCode");

		// Store the redirect_uri, provider, optional app_id/invite_code, and Gateway's state in Redis
		await setOAuthState(oauthState, {
			redirectUri,
			provider,
			...(appId && { appId }),
			...(inviteCode && { inviteCode }),
			...(invite && { invite }),
			...(gatewayState && { gatewayState }),
		});

		// Core's own callback URL - Google will redirect here
		const coreCallbackUrl = `${env.CORE_PUBLIC_URL}/v1/auth/callback/${provider}`;

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
		const expiresAt = new Date(Date.now() + env.CORE_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

		let adapter;
		if (provider === "google") {
			adapter = new GoogleOAuthAdapter({
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
			});
		} else {
			adapter = new GitHubOAuthAdapter({
				clientId: env.GITHUB_CLIENT_ID ?? "",
				clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
			});
		}

		// Core's callback URL that was used for OAuth
		const coreCallbackUrl = `${env.CORE_PUBLIC_URL}/v1/auth/callback/${provider}`;

		const token = await adapter.exchangeCodeForTokens(code, coreCallbackUrl);
		const profile = await adapter.fetchUserProfile(token.accessToken);

		// Find existing identity
		const existingIdentity = await identityQueries.findByProviderUserId(db, provider, profile.id);

		let userId = existingIdentity?.user_id;
		let _isNewUser = false;

		if (!userId) {
			// Create new user
			const userData = {
				public_id: createId("user"),
				primary_email: profile.email,
				primary_email_verified: true, // OAuth providers verify email addresses
				name: profile.name,
				avatar_url: profile.picture || null,
				// created_at and updated_at auto-set by .defaultNow() in schema
			};
			const newUser = await userQueries.create(db, userData);
			userId = newUser.id;
			_isNewUser = true;
			// Create identity
			const identityData = {
				public_id: createId("identity"),
				user_id: userId,
				provider,
				provider_user_id: profile.id,
				email: profile.email,
				email_verified: true, // OAuth providers verify email addresses
				// created_at auto-set by .defaultNow() in schema
			};
			await identityQueries.create(db, identityData);

			// Check for and consume pending app invitations
			if (storedState.appId) {
				try {
					const app = await appQueries.findByPublicId(db, storedState.appId);
					if (app) {
						// Find pending invitations for this email and app
						const pendingInvitations = await invitationQueries.findPendingByEmailAndApp(
							db,
							profile.email.toLowerCase(),
							app.id,
						);

						for (const invitation of pendingInvitations) {
							// Mark invitation as consumed
							await invitationQueries.markConsumed(db, invitation.id, userId);

							// Grant license if specified in invitation
							if (invitation.plan_id) {
								const plan = await planQueries.findById(db, invitation.plan_id);
								if (plan) {
									const now = new Date();
									let validUntil = null;
									if (invitation.license_duration_days) {
										validUntil = new Date(
											now.getTime() + invitation.license_duration_days * 24 * 60 * 60 * 1000,
										);
									}

									// Create license
									await licenseQueries.create(db, {
										public_id: createId("license"),
										user_id: userId,
										app_id: app.id,
										plan_id: plan.id,
										status: "active",
										activated_at: now,
										valid_until: validUntil,
										created_at: now,
									});
								}
							}
						}
					}
				} catch (invitationError) {
					console.error("Error processing app invitations:", invitationError);
					// Don't fail signup if invitation processing fails
				}
			}

			// Check for and consume pending project invitations
			try {
				// First check if there's a specific project invitation code passed
				if (storedState.invite) {
					const projectInvitation = await projectInvitationQueries.findByPublicId(db, storedState.invite);
					if (projectInvitation && projectInvitation.email.toLowerCase() === profile.email.toLowerCase()) {
						// Check if user is not already a member
						const existingMember = await projectMemberQueries.findByProjectAndUser(
							db,
							projectInvitation.project_id,
							userId,
						);

						if (!existingMember || existingMember.length === 0) {
							// Create project member entry
							await projectMemberQueries.create(db, {
								public_id: createId("projectMember"),
								project_id: projectInvitation.project_id,
								user_id: userId,
								role: projectInvitation.role || "member",
							});
						}

						// Mark project invitation as accepted
						await projectInvitationQueries.update(db, projectInvitation.id, {
							status: "accepted",
							accepted_by_user_id: userId,
							accepted_at: new Date(),
						});
					}
				} else {
					// Fallback: look up by email if no specific invitation code was passed
					const pendingProjectInvitations = await projectInvitationQueries.findByEmail(
						db,
						profile.email.toLowerCase(),
					);

					for (const projectInvitation of pendingProjectInvitations) {
						// Check if user is not already a member
						const existingMember = await projectMemberQueries.findByProjectAndUser(
							db,
							projectInvitation.project_id,
							userId,
						);

						if (!existingMember || existingMember.length === 0) {
							// Create project member entry
							await projectMemberQueries.create(db, {
								public_id: createId("projectMember"),
								project_id: projectInvitation.project_id,
								user_id: userId,
								role: projectInvitation.role || "member",
							});
						}

						// Mark project invitation as accepted
						await projectInvitationQueries.update(db, projectInvitation.id, {
							status: "accepted",
							accepted_by_user_id: userId,
							accepted_at: new Date(),
						});
					}
				}
			} catch (projectInvitationError) {
				console.error("Error processing project invitations:", projectInvitationError);
				// Don't fail signup if invitation processing fails
			}
		} else {
			await userQueries.findById(db, userId);
		}

		// Auto-provision license for the app on first login (if app_id provided)
		await ensureLicenseForApp(db, userId, storedState.appId);

		// Create core session
		const sessionData = {
			public_id: createId("session"),
			user_id: userId,
			// created_at and last_seen_at will be set automatically by .defaultNow() in schema
			expires_at: expiresAt,
		};
		const session = await sessionQueries.create(db, sessionData);

		// Redirect to Gateway callback with session ID as code
		const redirectUrl = new URL(storedState.redirectUri);
		redirectUrl.searchParams.set("code", session.public_id);
		// Pass back Gateway's original state, not Core's internal state
		if (storedState.gatewayState) {
			redirectUrl.searchParams.set("state", storedState.gatewayState);
		}

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
		const now = new Date();

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

		// Implement rolling TTL: extend session if last_seen_at is older than threshold
		const refreshThresholdMs = env.SESSION_REFRESH_THRESHOLD_HOURS * 60 * 60 * 1000;
		const timeSinceLastSeen = now.getTime() - new Date(session.last_seen_at).getTime();

		let updatedExpiresAt = session.expires_at;

		if (timeSinceLastSeen > refreshThresholdMs) {
			// Extend session expiry (rolling TTL)
			updatedExpiresAt = new Date(now.getTime() + env.CORE_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

			// Update both last_seen_at and expires_at
			await sessionQueries.updateLastSeenAndExpiry(db, session.id, now, updatedExpiresAt);
		}

		return c.json({
			userId: user.public_id,
			email: user.primary_email,
			name: user.name,
			picture: user.avatar_url,
			expiresAt: updatedExpiresAt,
		});
	} catch (error) {
		console.error("Auth exchange error:", error);
		return c.json({ error: "Failed to exchange session" }, 500);
	}
});

export const authRoutes = router;
