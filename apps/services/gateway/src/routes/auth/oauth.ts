import crypto from "node:crypto";
import { createSessionCookie, pingpong } from "@nube-auth/auth";
import { cache, sessionStore } from "@nube-auth/cache";
import { type SessionEntitlements, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
	ADMIN_SESSION_TTL,
	CHECKOUT_EXCHANGE_CODE_TTL,
	CSRF_TOKEN_BYTES,
	EXCHANGE_CODE_TTL,
	SESSION_ID_BYTES,
	SESSION_TTL,
} from "../../config/constants";
import { env } from "../../config/env";
import {
	ADMIN_SESSION_COOKIE,
	CSRF_TOKEN_COOKIE,
	OAUTH_NONCE_COOKIE,
	USER_SESSION_COOKIE,
} from "../../utils/cookieNames";

import { inferAudience, log, safeAttrBoolean, safeAttrNumber, safeAttrString } from "./shared";

const oauthRoutes = new Hono();

/**
 * GET /v1/auth/start
 * Start OAuth flow - proxies to Core (S2S), which redirects to the OAuth provider.
 * Core registers Gateway's callback URL with the provider so Core never needs to be public.
 */
oauthRoutes.get("/start", async (c: Context) => {
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

	// CSRF nonce: bind the state to this specific browser session.
	// A random nonce is stored in a short-lived HttpOnly cookie and mirrored in
	// the encoded state. On callback, both values must match — this proves the
	// browser that started the flow is the one completing it.
	const csrfNonce = crypto.randomBytes(16).toString("hex");
	const secureCookies = env.NODE_ENV === "production" || env.GATEWAY_PUBLIC_URL?.startsWith("https://");
	const cookieDomain = env.COOKIE_DOMAIN;
	setCookie(c, OAUTH_NONCE_COOKIE, csrfNonce, {
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

	// Optional billing params from the SDK client. When price_id is present, the
	// callback will create a checkout session after auth and redirect there instead
	// of going straight to returnTo. promo_code is pre-applied to that checkout.
	const priceId = c.req.query("price_id");
	const promoCode = c.req.query("promo_code");

	// Encode state as JSON to preserve returnTo, audience, and app context
	const statePayload: Record<string, string> = { returnTo, audience, csrfNonce };
	if (appId) statePayload["appId"] = appId;
	if (deviceId) statePayload["deviceId"] = deviceId;
	if (codeChallenge) {
		statePayload["codeChallenge"] = codeChallenge;
		statePayload["codeChallengeMethod"] = "S256"; // always S256 — enforced above
	}
	if (priceId) {
		statePayload["priceId"] = priceId;
	}
	if (promoCode) {
		statePayload["promoCode"] = promoCode;
	}
	const stateData = JSON.stringify(statePayload);
	const encodedState = Buffer.from(stateData)
		.toString("base64")
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
	if (audience === "app" && appId) coreAuthUrl.searchParams.set("return_to", returnTo);
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
		if (
			(response.status === 301 ||
				response.status === 302 ||
				response.status === 307 ||
				response.status === 308) &&
			location
		) {
			return c.redirect(location, response.status as 301 | 302 | 307 | 308);
		}

		const body = await response.text();
		if (response.status === 400 || response.status === 403) {
			try {
				const parsed = JSON.parse(body) as { error?: string };
				if (
					parsed.error === "Unknown app_id" ||
					parsed.error === "app_id is required when audience is 'app'" ||
					parsed.error === "return_to URI is not registered for this app_id" ||
					parsed.error === "No redirect URIs registered for this app. Configure them in the NubeAuth admin."
				) {
					return c.json({ error: parsed.error }, response.status);
				}
			} catch {
				// Core did not return the redirect-allowlist error shape.
			}
		}
		log.error({ status: response.status, body }, "Core auth start returned non-redirect");
		return c.json({ error: "Failed to start auth" }, 500);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Auth start proxy error");
		return c.json({ error: "Failed to start auth" }, 500);
	}
});

/**
 * GET /v1/auth/callback/:provider
 * OAuth provider redirects the browser here (not to Core directly).
 * Gateway proxies the request to Core S2S, which processes the OAuth code,
 * creates a session, and redirects back through Gateway's /callback.
 */
oauthRoutes.get("/callback/:provider", async (c: Context) => {
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
		if (
			(response.status === 301 ||
				response.status === 302 ||
				response.status === 307 ||
				response.status === 308) &&
			location
		) {
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
oauthRoutes.get("/callback", async (c: Context) => {
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
	let statePromoCode: string | undefined;
	try {
		log.debug({ rawState: state }, "Decoding state parameter");
		// Decode URL-safe base64 back to standard base64
		const standardBase64 = state.replace(/-/g, "+").replace(/_/g, "/").replace(/\./g, "=");
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
			promoCode?: string;
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
		statePromoCode = stateData.promoCode;
		log.info(
			{
				decodedState,
				stateData,
				returnTo,
				audience,
				rawState: state,
			},
			"Parsed state successfully",
		);
	} catch (parseError) {
		// Fallback for old-style state (just a path string)
		returnTo = state;
		audience = inferAudience(c);
		log.warn(
			{
				rawState: state,
				parseError: parseError instanceof Error ? parseError.message : String(parseError),
				fallbackAudience: audience,
				fallbackReturnTo: returnTo,
			},
			"Failed to parse state, using fallback",
		);
	}

	// CSRF nonce verification: the nonce set in the /start cookie must match
	// the nonce embedded in the state. Skip for legacy state (no nonce in state).
	// Also clears the nonce cookie regardless of outcome to prevent reuse.
	const nonceCookie = getCookie(c, OAUTH_NONCE_COOKIE);
	const cookieDomainCb = env.COOKIE_DOMAIN;
	const secureCookiesCb = env.NODE_ENV === "production" || env.GATEWAY_PUBLIC_URL?.startsWith("https://");
	// Always clear the nonce cookie (single-use)
	setCookie(c, OAUTH_NONCE_COOKIE, "", {
		httpOnly: true,
		secure: secureCookiesCb,
		sameSite: "Lax",
		path: "/",
		maxAge: 0,
		...(cookieDomainCb && cookieDomainCb !== "localhost" ? { domain: cookieDomainCb } : {}),
	});
	if (stateCsrfNonce) {
		if (!nonceCookie || nonceCookie !== stateCsrfNonce) {
			log.warn(
				{ audience, hasNonceCookie: !!nonceCookie },
				"OAuth CSRF nonce mismatch — possible CSRF or replay",
			);
			const dashboardUrl =
				audience === "admin"
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
		const dashboardUrl =
			audience === "admin"
				? (env.ADMIN_DASHBOARD_URL ?? "http://localhost:5174")
				: (env.USER_DASHBOARD_URL ?? "http://localhost:5173");
		return c.redirect(`${dashboardUrl}/login?error=${encodeURIComponent(error)}`);
	}

	if (!code) {
		if (audience === "app") {
			return c.redirect(`${returnTo}?error=missing_code`);
		}
		const dashboardUrl =
			audience === "admin"
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
				...(audience === "admin" ? { audience: "admin" } : {}),
			},
		});

		if (!response.ok()) {
			// v1.4.0+: response.data is auto-parsed JSON
			const errorData = response.data || {};
			log.error(
				{
					status: response.status,
					errorData,
					sessionId: code ? `${code.substring(0, 8)}...` : undefined,
					audience,
					err: serializeError(new Error(`Exchange failed: ${JSON.stringify(errorData)}`)),
				},
				"Code exchange failed",
			);
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
			entitlements?: SessionEntitlements;
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
			const ipAddress =
				c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
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
							"X-Nube-User-Id": data.userId,
							"X-Nube-Session-Id": code,
						},
						body: {
							appId: stateAppId,
							userId: data.userId,
							priceId: statePriceId,
							customerEmail: data.email,
							successUrl: `${returnTo}?code=${exchangeCode}&upgraded=true`,
							cancelUrl: `${returnTo}?error=payment_cancelled`,
							metadata: { source: "oauth_checkout" },
							...(statePromoCode && { promoCode: statePromoCode }),
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
						{
							userId: data.userId,
							priceId: statePriceId,
							status: checkoutResponse.status,
							body: checkoutResponse.data,
						},
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
		const ipAddress =
			c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
		const userAgent = c.req.header("user-agent") || "unknown";

		const entitlements: SessionEntitlements =
			audience === "admin" ? (data.entitlements ?? {}) : { identity: { role: "user" } };

		await sessionStore.setAppSession(
			gatewaySessionId,
			data.userId,
			appId,
			ttlSeconds,
			{
				coreSessionId: code, // Store Core session in metadata
				csrfToken, // Store CSRF token for validation
				sessionType: audience, // Track session type for security
				createdAt: Date.now(), // Track creation time for inactivity checks
				lastActivityAt: Date.now(), // Track last activity
				ipAddress, // IP address for location/security tracking
				userAgent, // Browser/device info
			},
			entitlements,
		);

		// Create signed cookie with domain for cross-subdomain access
		const cookieDomain = env.COOKIE_DOMAIN; // e.g., ".nubeauth.com" or "localhost"
		const secureCookies =
			env.NODE_ENV === "production" ||
			(env.GATEWAY_PUBLIC_URL ? env.GATEWAY_PUBLIC_URL.startsWith("https://") : false);

		// For localhost: DON'T set domain (host-only cookie works across ports)
		// For production: set domain=.nubeauth.com for subdomain sharing
		const cookieOptions =
			cookieDomain && cookieDomain !== "localhost"
				? { domain: cookieDomain, secure: secureCookies, maxAge: ttlSeconds }
				: { secure: secureCookies, maxAge: ttlSeconds };

		const { value, attributes } = createSessionCookie(gatewaySessionId, cookieOptions);

		const httpOnly = safeAttrBoolean(attributes["httpOnly"]);
		const secure = safeAttrBoolean(attributes["secure"]);
		const sameSite = safeAttrString(attributes["sameSite"]) as "Strict" | "Lax" | "None";
		const path = safeAttrString(attributes["path"]);
		const domain = attributes["domain"] ? safeAttrString(attributes["domain"]) : undefined;
		const maxAge = safeAttrNumber(attributes["maxAge"]);

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
		setCookie(c, CSRF_TOKEN_COOKIE, csrfToken, {
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

		log.info(
			{
				audience,
				appId,
				cookieName,
				dashboardUrl,
				returnTo,
				redirectUrl,
				hasCsrfToken: true,
			},
			"Login successful, redirecting",
		);
		return c.redirect(redirectUrl);
	} catch (error) {
		log.error(
			{ err: serializeError(error as Error), stack: error instanceof Error ? error.stack : undefined },
			"Auth callback error:",
		);
		const audience = inferAudience(c);
		const dashboardUrl =
			audience === "admin"
				? (env.ADMIN_DASHBOARD_URL ?? "http://localhost:5174")
				: (env.USER_DASHBOARD_URL ?? "http://localhost:5173");
		return c.redirect(`${dashboardUrl}/login?error=internal_error`);
	}
});

export { oauthRoutes };
