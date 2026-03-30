import crypto from "node:crypto";
import { createSessionCookie, parseSessionCookie } from "@nube-auth/auth";
import { cache, sessionStore } from "@nube-auth/cache";
import { getDb, sessionQueries, userQueries, projectMemberQueries, projectQueries, appQueries } from "@nube-auth/db";
import { createLogger, GatewayLoginRequestSchema, serializeError, type SessionEntitlements } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { CSRF_TOKEN_BYTES, SESSION_ID_BYTES, SESSION_TTL, ADMIN_SESSION_TTL, EXCHANGE_CODE_TTL, CHECKOUT_EXCHANGE_CODE_TTL } from "../config/constants";
import { env } from "../config/env";
import { coreClient } from "../lib/core-client";
import { pingpong } from "@nube-auth/auth";
import { sessionService } from "../services/sessionService";

const log = createLogger("auth-routes");

export const authRoutes = new Hono();

const USER_SESSION_COOKIE = "nube_user_session";
const ADMIN_SESSION_COOKIE = "nube_admin_session";
const LEGACY_SESSION_COOKIE = "nube_session";

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
	if (requestHost.includes("manage.nube-auth.") || requestHost.includes("admin.nube-auth.")) return "admin";
	return "user";
}

/**
 * GET /v1/auth/start
 * Start OAuth flow - proxies to Core (S2S), which redirects to the OAuth provider.
 * Core registers Gateway's callback URL with the provider so Core never needs to be public.
 */
authRoutes.get("/start", async (c: Context) => {
	const provider = c.req.query("provider") || "google";
	const returnTo = c.req.query("return_to") || "/";
	const appId = c.req.query("app_id");
	const deviceId = c.req.query("device_id"); // macOS native app: IOPlatformUUID
	const inviteCode = c.req.query("invite_code");
	const invite = c.req.query("invite"); // Project team invitation code
	const audience = c.req.query("audience") || inferAudience(c);

	// OAuth provider will redirect back to Gateway (not Core directly)
	const gatewayCallbackUrl = `${env.GATEWAY_PUBLIC_URL}/v1/auth/callback`;

	// audience=app requires app_id to scope the session and validate the redirect allowlist
	if (audience === "app" && !appId) {
		return c.json({ error: "app_id is required when audience is 'app'" }, 400);
	}

	// Validate return_to against the app's registered redirect URIs (security_settings.redirectUris).
	// This prevents exchange codes being delivered to unregistered URIs.
	// If redirectUris is empty (not yet configured) we allow any return_to so existing apps
	// are not broken — apps should populate the allowlist in the NubeAuth admin.
	let appSessionTtlSeconds: number | undefined;
	if (audience === "app" && appId) {
		try {
			const db = getDb();
			const app = await appQueries.findByPublicId(db, appId);
			if (!app) {
				return c.json({ error: "Unknown app_id" }, 400);
			}
		const securitySettings = app.security_settings as { redirectUris?: string[]; sessionTtlDays?: number } | null;
		const normalizeUri = (uri: string) => { try { return new URL(uri).href; } catch { return uri; } };
		const registeredUris: string[] = (securitySettings?.redirectUris ?? []).map(normalizeUri);
		const normalizedReturnTo = normalizeUri(returnTo);
		if (registeredUris.length === 0) {
			// In production an empty allowlist is a misconfiguration — reject to prevent open redirect.
			// In development allow any URI so local apps work before configuration is complete.
			if (process.env["NODE_ENV"] === "production") {
				log.warn({ returnTo, appId }, "No redirect URIs registered for app — rejecting in production");
				return c.json({ error: "No redirect URIs registered for this app. Configure them in the NubeAuth admin." }, 403);
			}
		} else if (!registeredUris.includes(normalizedReturnTo)) {
			log.warn({ returnTo, registeredUris, appId }, "return_to not in registered redirect URIs");
			return c.json({ error: "return_to URI is not registered for this app_id" }, 400);
		}
			// Per-app TTL: prefer security_settings.sessionTtlDays; fall back to SESSION_TTL constant.
			if (securitySettings?.sessionTtlDays && securitySettings.sessionTtlDays > 0) {
				appSessionTtlSeconds = securitySettings.sessionTtlDays * 24 * 60 * 60;
			}
		} catch (lookupError) {
			log.error({ err: serializeError(lookupError as Error), appId }, "Failed to validate return_to against redirect URI allowlist");
			return c.json({ error: "Failed to start auth" }, 500);
		}
	}

	// CSRF nonce: bind the state to this specific browser session.
	// A random nonce is stored in a short-lived HttpOnly cookie and mirrored in
	// the encoded state. On callback, both values must match — this proves the
	// browser that started the flow is the one completing it.
	const csrfNonce = crypto.randomBytes(16).toString("hex");
	const secureCookies = env.NODE_ENV === "production" || env.GATEWAY_PUBLIC_URL?.startsWith("https://");
	const cookieDomain = env.COOKIE_DOMAIN;
	setCookie(c, "nube_oauth_nonce", csrfNonce, {
		httpOnly: true,
		secure: secureCookies,
		sameSite: "Lax",
		path: "/",
		maxAge: 300, // 5 minutes — enough for any OAuth flow
		...(cookieDomain && cookieDomain !== "localhost" ? { domain: cookieDomain } : {}),
	});

	// Accept PKCE challenge from the SDK client (audience=app) and round-trip it
	// through the encoded state so it's available when Gateway issues the exchange code.
	const codeChallenge = c.req.query("code_challenge");
	const codeChallengeMethod = c.req.query("code_challenge_method");

	// Only S256 is accepted — reject plain and unknown methods to prevent downgrade attacks
	if (codeChallenge && codeChallengeMethod && codeChallengeMethod !== "S256") {
		return c.json({ error: "unsupported_code_challenge_method", message: "Only S256 is supported" }, 400);
	}

	// Optional billing param from the SDK client. When present, the callback
	// will create a checkout session after auth and redirect there instead of
	// going straight to returnTo.
	const priceId = c.req.query("price_id");

	// Encode state as JSON to preserve returnTo, audience, and app context
	const statePayload: Record<string, string> = { returnTo, audience, csrfNonce };
	if (appId) statePayload["appId"] = appId;
	if (deviceId) statePayload["deviceId"] = deviceId;
	if (codeChallenge) {
		statePayload["codeChallenge"] = codeChallenge;
		statePayload["codeChallengeMethod"] = "S256"; // always S256 — enforced above
	}
	if (appSessionTtlSeconds !== undefined) {
		statePayload["sessionTtlSeconds"] = String(appSessionTtlSeconds);
	}
	if (priceId) {
		statePayload["priceId"] = priceId;
	}
	const stateData = JSON.stringify(statePayload);
	const encodedState = Buffer.from(stateData).toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, ".");

	// Build Core auth start URL - called S2S, Core returns a redirect to the OAuth provider
	const coreAuthUrl = new URL(`${env.CORE_URL}/v1/auth/start`);
	coreAuthUrl.searchParams.set("provider", provider);
	coreAuthUrl.searchParams.set("redirect_uri", gatewayCallbackUrl);
	coreAuthUrl.searchParams.set("state", encodedState);
	// Tell core to use Gateway's public URL as the OAuth provider callback (so core stays internal)
	coreAuthUrl.searchParams.set("oauth_callback_base", env.GATEWAY_PUBLIC_URL);
	if (appId) coreAuthUrl.searchParams.set("app_id", appId);
	if (inviteCode) coreAuthUrl.searchParams.set("invite_code", inviteCode);
	if (invite) coreAuthUrl.searchParams.set("invite", invite);

	try {
		// Forward to Core S2S - do NOT follow the redirect; extract the Location header
		// and redirect the browser there directly (OAuth provider URL).
		const response = await fetch(coreAuthUrl.toString(), {
			method: "GET",
			redirect: "manual",
			headers: {
				"X-Nube-S2S-Token": env.S2S_SECRET,
				"X-Forwarded-For": c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "",
				"CF-Connecting-IP": c.req.header("cf-connecting-ip") || "",
				"CF-IPCountry": c.req.header("cf-ipcountry") || "",
			},
		});

		const location = response.headers.get("location");
		if ((response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) && location) {
			return c.redirect(location, response.status as 301 | 302 | 307 | 308);
		}

		// Core returned an error response
		const body = await response.text();
		log.error({ status: response.status, body }, "Core auth start returned non-redirect");
		return c.json({ error: "Failed to start auth" }, 500);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Auth start proxy error");
		return c.json({ error: "Failed to start auth" }, 500);
	}
});

/**
 * Build session entitlements for a user based on audience type.
 * Admin: project memberships with roles and app resources.
 * User: basic identity entitlement.
 */
async function buildEntitlements(userPublicId: string, audience: "user" | "admin"): Promise<SessionEntitlements> {
	if (audience === "user") {
		return { identity: { role: "user" } };
	}

	// Admin: build entitlements from project memberships
	const db = getDb();
	const user = await userQueries.findByPublicId(db, userPublicId);
	if (!user) {
		return {};
	}

	const memberships = await projectMemberQueries.findByUserId(db, user.id);
	const entitlements: SessionEntitlements = {};

	for (const membership of memberships) {
		// Get project public_id
		const project = await projectQueries.findById(db, membership.project_id);
		if (!project) continue;

		// Get apps for this project
		const projectApps = await appQueries.findByProjectId(db, membership.project_id);
		const appPublicIds = projectApps.map((a) => a.public_id);

		entitlements[project.public_id] = {
			role: membership.role,
			resources: appPublicIds,
		};
	}

	return entitlements;
}

/**
 * GET /v1/auth/callback/:provider
 * OAuth provider redirects the browser here (not to Core directly).
 * Gateway proxies the request to Core S2S, which processes the OAuth code,
 * creates a session, and redirects back through Gateway's /callback.
 */
authRoutes.get("/callback/:provider", async (c: Context) => {
	const provider = c.req.param("provider");
	const queryString = new URL(c.req.url).search;

	const coreCallbackUrl = `${env.CORE_URL}/v1/auth/callback/${provider}${queryString}`;

	try {
		const response = await fetch(coreCallbackUrl, {
			method: "GET",
			redirect: "manual",
			headers: {
				"X-Nube-S2S-Token": env.S2S_SECRET,
				"X-Forwarded-For": c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "",
				"CF-Connecting-IP": c.req.header("cf-connecting-ip") || "",
				"CF-IPCountry": c.req.header("cf-ipcountry") || "",
				"User-Agent": c.req.header("user-agent") || "",
			},
		});

		const location = response.headers.get("location");
		if ((response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) && location) {
			return c.redirect(location, response.status as 301 | 302 | 307 | 308);
		}

		// Core returned an error
		const body = await response.text();
		log.error({ status: response.status, body, provider }, "Core auth callback returned non-redirect");
		return c.json({ error: "Auth callback failed" }, 500);
	} catch (error) {
		log.error({ err: serializeError(error as Error), provider }, "Auth callback proxy error");
		return c.json({ error: "Auth callback failed" }, 500);
	}
});

/**
 * GET /v1/auth/callback
 * OAuth callback from Core - receives auth code and exchanges it for session
 */
authRoutes.get("/callback", async (c: Context) => {
	const code = c.req.query("code");
	const state = c.req.query("state") || "/"; // return_to URL or encoded state
	const error = c.req.query("error");

	// Parse state to extract returnTo, audience and native-app context
	let returnTo = "/";
	let audience: "user" | "admin" | "app" = "user";
	let stateAppId: string | undefined;
	let stateDeviceId: string | undefined;
	let stateCsrfNonce: string | undefined;
	let stateCodeChallenge: string | undefined;
	let stateCodeChallengeMethod: string | undefined;
	let stateSessionTtlSeconds: number | undefined;
	let statePriceId: string | undefined;
	try {
		log.debug({ rawState: state }, "Decoding state parameter");
		// Decode URL-safe base64 back to standard base64
		const standardBase64 = state
			.replace(/-/g, "+")
			.replace(/_/g, "/")
			.replace(/\./g, "=");
		const decodedState = Buffer.from(standardBase64, "base64").toString("utf-8");
		const stateData = JSON.parse(decodedState) as {
			returnTo?: string;
			audience?: "user" | "admin" | "app";
			appId?: string;
			deviceId?: string;
			csrfNonce?: string;
			codeChallenge?: string;
			codeChallengeMethod?: string;
			sessionTtlSeconds?: string;
			priceId?: string;
		};
		returnTo = stateData.returnTo || "/";
		audience = stateData.audience || "user";
		stateAppId = stateData.appId;
		stateDeviceId = stateData.deviceId;
		stateCsrfNonce = stateData.csrfNonce;
		stateCodeChallenge = stateData.codeChallenge;
		stateCodeChallengeMethod = stateData.codeChallengeMethod ?? "S256";
		stateSessionTtlSeconds = stateData.sessionTtlSeconds ? parseInt(stateData.sessionTtlSeconds, 10) : undefined;
		statePriceId = stateData.priceId;
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

	// CSRF nonce verification: the nonce set in the /start cookie must match
	// the nonce embedded in the state. Skip for legacy state (no nonce in state).
	// Also clears the nonce cookie regardless of outcome to prevent reuse.
	const nonceCookie = getCookie(c, "nube_oauth_nonce");
	const cookieDomainCb = env.COOKIE_DOMAIN;
	const secureCookiesCb = env.NODE_ENV === "production" || env.GATEWAY_PUBLIC_URL?.startsWith("https://");
	// Always clear the nonce cookie (single-use)
	setCookie(c, "nube_oauth_nonce", "", {
		httpOnly: true,
		secure: secureCookiesCb,
		sameSite: "Lax",
		path: "/",
		maxAge: 0,
		...(cookieDomainCb && cookieDomainCb !== "localhost" ? { domain: cookieDomainCb } : {}),
	});
	if (stateCsrfNonce) {
		if (!nonceCookie || nonceCookie !== stateCsrfNonce) {
			log.warn({ audience, hasNonceCookie: !!nonceCookie }, "OAuth CSRF nonce mismatch — possible CSRF or replay");
			const dashboardUrl = audience === "admin"
				? (env.ADMIN_DASHBOARD_URL ?? "http://localhost:5174")
				: (env.USER_DASHBOARD_URL ?? "http://localhost:5173");
			if (audience === "app") return c.redirect(`${returnTo}?error=invalid_state`);
			return c.redirect(`${dashboardUrl}/login?error=invalid_state`);
		}
	}

	if (error) {
		log.error({ err: serializeError(new Error(error)) }, "OAuth error:");
		if (audience === "app") {
			return c.redirect(`${returnTo}?error=${encodeURIComponent(error)}`);
		}
		// Redirect to dashboard with error
		const dashboardUrl = audience === "admin"
			? (env.ADMIN_DASHBOARD_URL ?? "http://localhost:5174")
			: (env.USER_DASHBOARD_URL ?? "http://localhost:5173");
		return c.redirect(`${dashboardUrl}/login?error=${encodeURIComponent(error)}`);
	}

	if (!code) {
		if (audience === "app") {
			return c.redirect(`${returnTo}?error=missing_code`);
		}
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
				"X-Nube-S2S-Token": env.S2S_SECRET,
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
				sessionId: code ? `${code.substring(0, 8)}...` : undefined,
				audience,
				err: serializeError(new Error(`Exchange failed: ${JSON.stringify(errorData)}`))
			}, "Code exchange failed");
			if (audience === "app") {
				return c.redirect(`${returnTo}?error=exchange_failed`);
			}
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
			sessionTtlSeconds?: number;
		};

		// -----------------------------------------------------------------------
		// App client branch — no cookies, deliver opaque sessionToken to return_to.
		// The client stores the token and uses it as Bearer for all subsequent
		// API calls (license check, user info, billing, etc.).
		// NubeAuth has no knowledge of the calling app's domain logic.
		// -----------------------------------------------------------------------
		if (audience === "app") {
			if (!stateAppId) {
				log.error({ audience }, "App OAuth callback missing appId in state");
				return c.redirect(`${returnTo}?error=missing_app_id`);
			}

			const appSessionToken = crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
			const ipAddress = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
				c.req.header("x-real-ip") ||
				"unknown";
			const userAgent = c.req.header("user-agent") || "unknown";
// TTL precedence: Core per-session > per-app security_settings default > global SESSION_TTL
			let ttlSeconds = stateSessionTtlSeconds ?? SESSION_TTL;
			if (data.sessionTtlSeconds && data.sessionTtlSeconds > 0) {
				ttlSeconds = data.sessionTtlSeconds;
			}

			await sessionStore.setAppSession(appSessionToken, data.userId, stateAppId, ttlSeconds, {
				coreSessionId: code,
				sessionType: "app",
				createdAt: Date.now(),
				lastActivityAt: Date.now(),
				ipAddress,
				userAgent,
				...(stateDeviceId ? { deviceId: stateDeviceId } : {}),
			});

			// Issue a single-use exchange code. When a priceId is present we use a
			// longer TTL so the code survives while the user completes checkout at
			// the payment provider (which can take several minutes).
			const hasPlanCheckout = !!statePriceId;
			const exchangeCode = crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
			await cache.set(
				`exchange:${exchangeCode}`,
				{
					sessionToken: appSessionToken,
					appId: stateAppId,
					...(stateCodeChallenge
						? { codeChallenge: stateCodeChallenge, codeChallengeMethod: stateCodeChallengeMethod ?? "S256" }
						: {}),
				},
				hasPlanCheckout ? CHECKOUT_EXCHANGE_CODE_TTL : EXCHANGE_CODE_TTL,
			);

			// Combined OAuth+checkout flow: create a checkout session on Core and
			// redirect the user to the payment provider. The exchange code is
			// embedded in the successUrl so the app receives it after payment.
			if (hasPlanCheckout) {
				try {
					const checkoutResponse = await pingpong(`${env.CORE_URL}/v1/billing/checkout`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-Nube-S2S-Token": env.S2S_SECRET,
						},
						body: {
							appId: stateAppId,
							userId: data.userId,
							priceId: statePriceId,
							customerEmail: data.email,
							successUrl: `${returnTo}?code=${exchangeCode}&upgraded=true`,
							cancelUrl: `${returnTo}?error=payment_cancelled`,
							metadata: { source: "oauth_checkout" },
						},
					});

					if (checkoutResponse.ok()) {
						const checkoutData = checkoutResponse.data as { checkoutUrl?: string };
						if (checkoutData.checkoutUrl) {
							log.info(
								{ userId: data.userId, appId: stateAppId, priceId: statePriceId },
								"OAuth+checkout: redirecting to payment provider",
							);
							return c.redirect(checkoutData.checkoutUrl);
						}
					}

					log.warn(
						{ userId: data.userId, priceId: statePriceId, status: checkoutResponse.status, body: checkoutResponse.data },
						"Checkout creation failed — falling back to direct returnTo",
					);
				} catch (checkoutError) {
					log.error(
						{ err: serializeError(checkoutError as Error), userId: data.userId },
						"Checkout error — falling back to direct returnTo",
					);
				}
			}

			log.info({ userId: data.userId, appId: stateAppId }, "App OAuth complete — delivering exchange code");
			return c.redirect(`${returnTo}?code=${exchangeCode}`);
		}

		// Generate NEW session ID for Gateway (session fixation protection)
		// Don't reuse the Core's session ID
		const gatewaySessionId = crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
		const csrfToken = crypto.randomBytes(CSRF_TOKEN_BYTES).toString("hex"); // Generate CSRF token
		
		// Use per-app TTL from Core if available, fallback to audience-based TTL
		let ttlSeconds = audience === "admin" ? ADMIN_SESSION_TTL : SESSION_TTL;
		if (data.sessionTtlSeconds && data.sessionTtlSeconds > 0) {
			ttlSeconds = data.sessionTtlSeconds;
		}

		// Store app session in Redis with Gateway session ID
		// Store Core session ID and CSRF token in metadata
		const appId = audience === "admin" ? "admin-dashboard" : "user-dashboard";
		
		// Capture IP address and user-agent for session tracking
		const ipAddress = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || 
			c.req.header("x-real-ip") || 
			"unknown";
		const userAgent = c.req.header("user-agent") || "unknown";

		// Build session entitlements based on audience
		const entitlements = await buildEntitlements(data.userId, audience);
		
		await sessionStore.setAppSession(gatewaySessionId, data.userId, appId, ttlSeconds, {
			coreSessionId: code, // Store Core session in metadata
			csrfToken, // Store CSRF token for validation
			sessionType: audience, // Track session type for security
			createdAt: Date.now(), // Track creation time for inactivity checks
			lastActivityAt: Date.now(), // Track last activity
			ipAddress, // IP address for location/security tracking
			userAgent, // Browser/device info
		}, entitlements);

		// Create signed cookie with domain for cross-subdomain access
		const cookieDomain = env.COOKIE_DOMAIN; // e.g., ".nubeauth.com" or "localhost"
		const secureCookies =
			env.NODE_ENV === "production" || (env.GATEWAY_PUBLIC_URL ? env.GATEWAY_PUBLIC_URL.startsWith("https://") : false);
		
		// For localhost: DON'T set domain (host-only cookie works across ports)
		// For production: set domain=.nubeauth.com for subdomain sharing
		const cookieOptions = cookieDomain && cookieDomain !== "localhost"
			? { domain: cookieDomain, secure: secureCookies, maxAge: ttlSeconds }
			: { secure: secureCookies, maxAge: ttlSeconds };
		
		const { value, attributes } = createSessionCookie(
			gatewaySessionId,
			cookieOptions,
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
		setCookie(c, "nube_csrf_token", csrfToken, {
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
		const resolvedAudience = audience === "admin" ? "admin" : "user";
		const ttlSeconds = resolvedAudience === "admin" ? ADMIN_SESSION_TTL : SESSION_TTL;
		// Capture IP address and user-agent for session tracking
		const ipAddress = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || 
			c.req.header("x-real-ip") || 
			"unknown";
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
			env.NODE_ENV === "production" || (env.GATEWAY_PUBLIC_URL ? env.GATEWAY_PUBLIC_URL.startsWith("https://") : false);
		const { value, attributes } = createSessionCookie(
			gatewaySessionId,
			cookieDomain ? { domain: cookieDomain, secure: secureCookies, maxAge: ttlSeconds } : { secure: secureCookies, maxAge: ttlSeconds },
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
		setCookie(c, "nube_csrf_token", csrfToken, {
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

		// Parse the signed cookie to get the actual session ID
		if (sessionCookie) {
			try {
				const sessionId = parseSessionCookie(sessionCookie);
				if (sessionId) {
					// Verify session exists before deletion
					const appSessionBefore = await sessionStore.getAppSession(sessionId);

					// Get Core session ID to revoke database session
					const coreSessionId = appSessionBefore?.metadata?.['coreSessionId'] as string | undefined;
					// Delete from all three stores:
					// 1. Delete from sessionService (gateway:session:xxx)
					await sessionService.deleteSession(sessionId);

					// 2. Delete from sessionStore (session:app:xxx) - this is what auth middleware checks!
					await sessionStore.revokeAppSession(sessionId);

					// 3. Revoke Core database session
					if (coreSessionId) {
						try {
							const db = getDb();
							const dbSession = await sessionQueries.findByPublicId(db, coreSessionId);
							if (dbSession) {
								await sessionQueries.revoke(db, dbSession.id);
							}
						} catch (dbError) {
							log.error(
								{ err: serializeError(dbError as Error) },
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
			setCookie(c, "nube_csrf_token", "", {
				httpOnly: false,
				secure: true,
				sameSite: "Lax",
				path: "/",
				domain: cookieDomain,
				maxAge: 0,
			});
		}
		setCookie(c, "nube_csrf_token", "", {
			httpOnly: false,
			secure: true,
			sameSite: "Lax",
			path: "/",
			maxAge: 0,
		});
		setCookie(c, "nube_csrf_token", "", {
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
 * 
 * SECURITY: Only validates the cookie matching the requested audience.
 * - audience=admin: Only checks admin cookie, returns 401 if missing/invalid
 * - audience=user: Only checks user cookie, returns 401 if missing/invalid
 */
authRoutes.get("/status", async (c: Context) => {
	try {
		const audience = inferAudience(c);
		
		// CRITICAL: Only check the cookie for the requested audience
		const cookieName = audience === "admin" ? ADMIN_SESSION_COOKIE : USER_SESSION_COOKIE;
		const cookie = getCookie(c, cookieName);

		// Return 401 if the appropriate cookie doesn't exist
		if (!cookie) {
			log.debug({ audience, cookieName }, "No session cookie for audience");
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		// Validate the session
		const sessionId = parseSessionCookie(cookie);
		if (!sessionId) {
			log.warn({ audience, cookieName }, "Invalid session cookie format");
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		const appSession = await sessionStore.getAppSession(sessionId);
		if (!appSession) {
			log.warn({ audience, sessionId: `${sessionId.substring(0, 8)}...` }, "Session not found in store");
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		const coreSessionId = appSession.metadata?.["coreSessionId"] as string | undefined;
		if (!coreSessionId) {
			log.warn({ audience, sessionId: `${sessionId.substring(0, 8)}...` }, "Core session ID missing");
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		// Verify session type matches audience
		const sessionType = appSession.metadata?.["sessionType"] as string | undefined;
		if (sessionType && sessionType !== audience) {
			log.warn({ 
				audience, 
				sessionType,
				sessionId: `${sessionId.substring(0, 8)}...` 
			}, "Session type mismatch with audience");
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		const user = await coreClient.exchangeSession(coreSessionId);
		if (!user) {
			log.warn({ audience, coreSessionId: `${coreSessionId.substring(0, 8)}...` }, "Core session invalid");
			return c.json({ error: "Unauthorized", loggedIn: false }, 401);
		}

		return c.json({
			loggedIn: true,
			user: {
				id: user.userId,
				email: user.email,
				name: user.name,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Status check error");
		return c.json({ error: "Unauthorized", loggedIn: false }, 401);
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
			const metadata = sessionData.metadata || {};
			activeSessions.push({
				id: session.id,
				appId: sessionData.appId,
				createdAt: (metadata["createdAt"] as number) || Date.now(),
				lastActivity: (metadata["lastActivityAt"] as number) || Date.now(),
				isCurrentSession: session.id === parseSessionCookie(userCookie || adminCookie || ""),
				// Device/location info
				ipAddress: (metadata["ipAddress"] as string) || null,
				userAgent: (metadata["userAgent"] as string) || null,
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
authRoutes.post("/token", async (c: Context) => {
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
			log.error({ sessionToken: `${exchangeData.sessionToken.substring(0, 8)}...` }, "Session not found after code exchange");
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
