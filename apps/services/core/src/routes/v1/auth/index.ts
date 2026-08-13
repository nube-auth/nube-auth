import { GitHubOAuthAdapter, GoogleOAuthAdapter } from "@nube-auth/auth";
import { cache } from "@nube-auth/cache";
import {
	appQueries,
	appUserQueries,
	getDb,
	identityQueries,
	invitationQueries,
	licenseQueries,
	planQueries,
	projectInvitationQueries,
	projectMemberQueries,
	sessionQueries,
	userQueries,
} from "@nube-auth/db";
import { createId, createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { env } from "../../../config/env";
import { getClientCountry, getClientIp } from "../../../middleware/rateLimit";
import { ensureLicenseForApp } from "../../../utils/license";
import { fireWebhookEvent } from "../../../utils/outbound-events.js";
import { enqueueSignupEmails } from "../../../utils/signup-email.js";

const log = createLogger("auth-routes");
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
	oauthCallbackBase?: string; // Base URL used for the OAuth provider redirect_uri
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
	const appId = c.req.query("app_id") as string | undefined;
	const inviteCode = c.req.query("invite_code") as string | undefined;
	const invite = c.req.query("invite") as string | undefined; // Project team invitation code
	const gatewayState = c.req.query("state") as string | undefined; // Gateway's state
	const oauthCallbackBase = c.req.query("oauth_callback_base") as string | undefined; // Gateway public URL for provider redirect

	if (!provider || !["google", "github"].includes(provider)) {
		return c.json({ error: "Invalid provider" }, 400);
	}

	if (!redirectUri) {
		return c.json({ error: "Missing redirect_uri" }, 400);
	}

	// Validate redirect_uri against allowed origins
	try {
		const redirectUrl = new URL(redirectUri);
		const redirectOrigin = redirectUrl.origin;
		const isAllowed = env.ALLOWED_REDIRECT_ORIGINS.some((allowed) => redirectOrigin === allowed);

		if (!isAllowed) {
			// If an app is specified, also check the app's own redirect URIs
			let appAllowed = false;
			if (appId) {
				const db = getDb();
				const app = await appQueries.findByPublicId(db, appId);
				const rawUris = (app?.security_settings as Record<string, unknown> | null)?.["redirectUris"] as
					| string[]
					| undefined;
				const normalizeUri = (uri: string) => {
					try {
						return new URL(uri).href;
					} catch {
						return uri;
					}
				};
				const appRedirectUris = rawUris?.map(normalizeUri);
				const normalizedRedirectUri = normalizeUri(redirectUri);
				appAllowed = appRedirectUris?.includes(normalizedRedirectUri) ?? false;
			}
			if (!appAllowed) {
				log.warn({ redirectUri, appId }, "Invalid redirect_uri - not in allowlist");
				return c.json({ error: "Invalid redirect_uri" }, 400);
			}
		}
	} catch {
		log.warn({ redirectUri }, "Invalid redirect_uri format");
		return c.json({ error: "Invalid redirect_uri" }, 400);
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
			...(oauthCallbackBase && { oauthCallbackBase }),
		});

		// Use the gateway's public URL if provided (so core stays internal), otherwise fall back to CORE_PUBLIC_URL
		const callbackBase = oauthCallbackBase ?? env.CORE_PUBLIC_URL;
		const coreCallbackUrl = `${callbackBase}/v1/auth/callback/${provider}`;

		const authUrl = adapter.getAuthorizationUrl(oauthState, coreCallbackUrl);

		// Redirect to OAuth provider
		return c.redirect(authUrl);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Auth start error");
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
		log.error({ error }, "OAuth error from provider");
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
		const expiresAt = new Date(Date.now() + env.CORE_SESSION_TTL_SECONDS * 1000);

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

		// Reconstruct the callback URL that was registered with the OAuth provider
		const storedCallbackBase = storedState.oauthCallbackBase ?? env.CORE_PUBLIC_URL;
		const coreCallbackUrl = `${storedCallbackBase}/v1/auth/callback/${provider}`;

		log.debug({ provider, codePreview: code?.substring(0, 8) }, "Exchanging OAuth code for tokens");
		const token = await adapter.exchangeCodeForTokens(code, coreCallbackUrl);

		log.debug({ provider, hasIdToken: !!(token as any).idToken }, "Fetching user profile");
		// For OpenID Connect (Google), prefer idToken; fallback to accessToken for other providers
		const tokenForProfile = (token as any).idToken || token.accessToken;
		const profile = await adapter.fetchUserProfile(tokenForProfile);
		log.debug({ email: profile.email, providerId: profile.id }, "User profile fetched");

		// Find existing identity
		const existingIdentity = await identityQueries.findByProviderUserId(db, provider, profile.id);

		let userId = existingIdentity?.user_id;
		const isNewUser = !userId;
		const isNewOAuthConnection = isNewUser; // new identity is always created for new users

		if (!userId) {
			log.debug({ email: profile.email, provider }, "Creating new user");
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
			log.debug({ userId, email: profile.email }, "User created");

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
			log.debug({ userId, provider }, "Identity created");

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
								const plan = await planQueries.findByInternalId_(db, invitation.plan_id);
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

										valid_until: validUntil,
										created_at: now,
									});
								}
							}
						}
					}
				} catch (invitationError) {
					log.error(
						{ err: serializeError(invitationError as Error), appId: storedState.appId },
						"Error processing app invitations",
					);
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
				log.error(
					{ err: serializeError(projectInvitationError as Error), invite: storedState.invite },
					"Error processing project invitations",
				);
				// Don't fail signup if invitation processing fails
			}
		} else {
			log.debug({ userId }, "User already exists, fetching user data");
			await userQueries.findByInternalId_(db, userId);
		}

		// Auto-provision license for the app on first login (if app_id provided)
		await ensureLicenseForApp(db, userId, storedState.appId);

		// Resolve app internal id — needed for session TTL lookup and app_users upsert
		let appInternalId: number | undefined;
		let resolvedAppName: string | undefined;
		if (storedState.appId) {
			const resolvedApp = await appQueries.findByPublicId(db, storedState.appId);
			appInternalId = resolvedApp?.id;
			resolvedAppName = resolvedApp?.name;
		}

		// Upsert persistent app_users record — survives session deletion and captures
		// every user who has authenticated with the app, regardless of licence status.
		if (appInternalId !== undefined) {
			try {
				await appUserQueries.upsert(db, appInternalId, userId);
			} catch (appUserError) {
				// Non-fatal: log and continue, session creation should not fail
				log.error(
					{ err: serializeError(appUserError as Error), appId: storedState.appId },
					"Failed to upsert app_user",
				);
			}
		}

		// Capture IP address, user-agent, and location for session tracking
		const ipAddress = getClientIp(c);
		const userAgent = c.req.header("user-agent") || null;
		const country = getClientCountry(c);

		// Create core session
		log.debug({ userId }, "Creating session");
		const sessionData = {
			public_id: createId("session"),
			user_id: userId,
			// created_at and last_seen_at will be set automatically by .defaultNow() in schema
			expires_at: expiresAt,
			ip_address: ipAddress,
			user_agent: userAgent,
			country: country,
			...(appInternalId !== undefined && { app_id: appInternalId }),
		};
		const session = await sessionQueries.create(db, sessionData);
		log.info({ userId, sessionPublicId: session.public_id.substring(0, 8) }, "Session created successfully");

		// First-signup emails: Nube Auth account welcome + app-specific signup
		if (isNewUser) {
			const user = await userQueries.findByInternalId_(db, userId);
			if (user) {
				enqueueSignupEmails({
					email: user.primary_email ?? "",
					userName: user.name || user.primary_email?.split("@")[0] || "",
					appName: resolvedAppName,
				});
			}
		}

		// Fire outbound webhook events (fire-and-forget)
		if (appInternalId !== undefined) {
			const user = await userQueries.findByInternalId_(db, userId);
			if (user) {
				if (isNewUser) {
					await fireWebhookEvent(db, appInternalId, "user.registered", {
						userId: user.public_id,
						email: user.primary_email,
						name: user.name,
					});
				}
				if (isNewOAuthConnection) {
					await fireWebhookEvent(db, appInternalId, "oauth.connected", {
						userId: user.public_id,
						provider,
					});
				}
				await fireWebhookEvent(db, appInternalId, "session.created", {
					userId: user.public_id,
					sessionId: session.public_id,
				});
			}
		}

		// Redirect to Gateway callback with session ID as code
		const redirectUrl = new URL(storedState.redirectUri);
		redirectUrl.searchParams.set("code", session.public_id);
		// Pass back Gateway's original state, not Core's internal state
		if (storedState.gatewayState) {
			redirectUrl.searchParams.set("state", storedState.gatewayState);
		}

		log.info({ redirectUri: storedState.redirectUri, provider }, "Redirecting to Gateway callback");
		return c.redirect(redirectUrl.toString());
	} catch (error) {
		log.error(
			{ err: serializeError(error as Error), provider, stack: error instanceof Error ? error.stack : undefined },
			"Auth callback error",
		);
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
	try {
		const { sessionId } = await c.req.json();

		if (!sessionId || !idPatterns.session.test(sessionId)) {
			log.warn(
				{ sessionId, isValid: sessionId ? idPatterns.session.test(sessionId) : false },
				"Invalid session format",
			);
			return c.json({ error: "Invalid session" }, 400);
		}

		const db = getDb();
		const now = new Date();

		const session = await sessionQueries.findByPublicId(db, sessionId);

		if (!session) {
			log.warn({ sessionId: `${sessionId.substring(0, 8)}...` }, "Session not found");
			return c.json({ error: "Session not found" }, 404);
		}

		if (session.expires_at < now) {
			log.warn({ sessionId: `${sessionId.substring(0, 8)}...` }, "Session expired");
			return c.json({ error: "Session expired" }, 401);
		}

		if (session.revoked_at) {
			log.warn({ sessionId: `${sessionId.substring(0, 8)}...` }, "Session has been revoked");
			return c.json({ error: "Session revoked" }, 401);
		}

		const user = await userQueries.findByInternalId_(db, session.user_id);

		if (!user) {
			log.warn({ userId: session.user_id }, "User not found");
			return c.json({ error: "User not found" }, 404);
		}

		// Get per-app session TTL from app's security settings
		let sessionTtlSeconds = env.CORE_SESSION_TTL_SECONDS; // Default fallback
		if (session.app_id) {
			const app = await appQueries.findByInternalId_(db, session.app_id);
			if (app?.security_settings) {
				const securitySettings = app.security_settings as any;
				const sessionTtlDays = securitySettings.sessionTtlDays;
				if (typeof sessionTtlDays === "number" && sessionTtlDays > 0) {
					sessionTtlSeconds = sessionTtlDays * 24 * 60 * 60; // Convert days to seconds
				}
			}
		}

		// Implement rolling TTL: extend session if last_seen_at is older than threshold
		const refreshThresholdMs = env.SESSION_REFRESH_THRESHOLD_SECONDS * 1000;
		const timeSinceLastSeen = now.getTime() - new Date(session.last_seen_at).getTime();

		let updatedExpiresAt = session.expires_at;

		if (timeSinceLastSeen > refreshThresholdMs) {
			// Extend session expiry (rolling TTL) using per-app TTL
			updatedExpiresAt = new Date(now.getTime() + sessionTtlSeconds * 1000);

			// Update both last_seen_at and expires_at
			await sessionQueries.updateLastSeenAndExpiry(db, session.id, now, updatedExpiresAt);
		}

		log.debug(
			{ userId: user.public_id, sessionId: `${sessionId.substring(0, 8)}...` },
			"Session exchange successful",
		);
		return c.json({
			userId: user.public_id,
			email: user.primary_email,
			name: user.name,
			picture: user.avatar_url,
			expiresAt: updatedExpiresAt,
			sessionTtlSeconds, // Return TTL so Gateway knows how long to cache
		});
	} catch (error) {
		log.error(
			{ err: serializeError(error as Error), stack: error instanceof Error ? error.stack : undefined },
			"Auth exchange error",
		);
		return c.json({ error: "Failed to exchange session" }, 500);
	}
});

export const authRoutes = router;
