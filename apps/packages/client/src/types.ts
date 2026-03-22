export interface NubeAuthClientConfig {
	gatewayUrl: string;
	/**
         * App public ID (required for subscription and app-OAuth queries).
         */
        appId?: string | undefined;
        /**
         * S2S token for backend service-to-service authentication.
         * Sent as X-Nube-Service-Token header. Leave undefined for browser/app auth.
         */
        s2sToken?: string | undefined;
        /**
         * Session token obtained via the app OAuth flow (POST /v1/auth/token).
         * When set, all requests include "Authorization: Bearer <sessionToken>".
         * Use this for native apps, CLI tools, and browser extensions.
         * Leave undefined for web browser apps (which use cookies instead).
         */
        sessionToken?: string | undefined;
        /**
         * Called when any authenticated request receives a 401 response.
         * Use this to trigger re-authentication without wrapping every call in
         * a try/catch for 401. The original NubeAuthError is still thrown after
         * the callback returns.
         */
        onSessionExpired?: (() => void) | undefined;
}

// ---------------------------------------------------------------------------
// App OAuth (audience=app) — native app / CLI / browser extension flow
// ---------------------------------------------------------------------------

/**
 * Return value of `client.app.buildOAuthUrl()`. Always includes PKCE parameters.
 * Store `codeVerifier` securely; pass it to `client.app.exchangeCode()` later.
 */
export interface PkceOAuthStart {
        /** Full URL to open in the system browser. */
        url: string;
        /**
         * PKCE code verifier. Keep this secret — it is the proof that the same
         * party that started the flow is completing it.
         * Pass it to `exchangeCode(code, { codeVerifier })` after receiving the callback.
         */
        codeVerifier: string;
}

/**
 * Options for building the OAuth start URL (audience=app).
 */
export interface OAuthStartOptions {
        /**
         * App public ID registered in NubeAuth admin.
         * Optional when the client was constructed with `appId` in config —
         * this value takes precedence if provided.
         */
        appId?: string | undefined;
        /**
         * Where to deliver the one-time exchange code after OAuth.
         * For native apps use a custom URL scheme: "myapp://auth"
         * For websites use an absolute HTTPS URL: "https://myapp.com/auth/callback"
         */
        returnTo: string;
        /**
         * Optional stable device identifier (e.g. hardware UUID on macOS).
         * Used for per-device session metadata and audit logs.
         */
        deviceId?: string | undefined;
        /**
         * Plan public ID to trigger a payment checkout after OAuth.
         * When set, NubeAuth initiates a subscription checkout after the user
         * authenticates and redirects to `returnTo` on success.
         * Leave undefined for a plain authenticate-only flow.
         */
        planId?: string | undefined;
        /**
         * Billing interval for the checkout. Defaults to "month".
         * Only relevant when `planId` is set.
         */
        billingInterval?: "month" | "year" | undefined;
}

/**
 * Result from POST /v1/auth/token (exchange code → session token).
 */
export interface TokenExchangeResult {
        /** Opaque Bearer token. Store securely (Keychain, credential store). */
        sessionToken: string;
        /** Public user ID. */
        userId: string;
        /** App public ID the session belongs to. */
        appId: string;
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

/**
 * Subscription status returned by GET /v1/me/subscription.
 * Works for all session types (cookie or Bearer token).
 */
export interface SubscriptionStatus {
        /** True when the user has an active, trialing, or past-due subscription. */
        hasActivePlan: boolean;
        /** Plan slug (e.g. "power", "free"). Null when no active plan. */
        planSlug: string | null;
        /** Subscription status string (active | trialing | past_due | canceled | ...). */
        status: string | null;
        /** Billing interval: "month" or "year". */
        billingInterval: string | null;
        /** ISO-8601 string of the current billing period end. Null for lifetime/free. */
        periodEnd: string | null;
}

export interface User {
	id: string;
	email: string;
	name: string | null;
	createdAt: string;
	avatar_url?: string | null;
	emailVerified?: boolean;
}

export interface AuthStatus {
	loggedIn: boolean;
	user?: User;
}

export interface Session {
	id: string;
	createdAt: string | number;
	expiresAt: string;
	isCurrent?: boolean;
	// Device/location info
	ipAddress?: string | null;
	userAgent?: string | null;
	country?: string | null; // ISO 3166-1 alpha-2 country code
}

export interface License {
	public_id: string;
	app_id: string;
	plan: string;
	status: "active" | "expired" | "canceled" | "suspended";
	valid_from: number;
	valid_until: number | null;
	entitlements?: Record<string, unknown>;
}

export interface Subscription {
	public_id: string;
	status: "active" | "canceled" | "past_due" | "trialing";
	billing_interval: string;
	current_period_start: string;
	current_period_end: string | null;
	cancel_at_period_end: boolean;
	amount_cents: number;
	currency: string;
}

export interface UpdateProfileData {
	name?: string;
	avatar_url?: string;
}

export interface ApiError {
	ok: false;
	error: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	};
}
