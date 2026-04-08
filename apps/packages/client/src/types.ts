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
        /**
         * App client secret (the `clientSecret` from `app_tokens`, shown once in the
         * NubeAuth dashboard). When set, `appCatalog` calls include
         * `Authorization: Bearer <appSecret>` and bypass user-session auth.
         * Use this for server-side calls from your backend (e.g. fetching plans).
         * Never expose in browser code.
         */
        appSecret?: string | undefined;
}

// ---------------------------------------------------------------------------
// App Catalog — plan + pricing data (server-to-server, no user session needed)
// ---------------------------------------------------------------------------

/**
 * A plan returned by GET /v1/app/:appId/plans.
 * Contains capability/feature data only — no pricing.
 */
export interface Plan {
        /** Public plan ID (PLAN0...). */
        planId: string;
        /** Human-readable name, e.g. "Starter". */
        name: string;
        /** URL-safe slug, e.g. "starter". */
        slug: string;
        description: string | null;
        /** Marketing feature bullet strings defined in the NubeAuth dashboard. */
        features: string[];
        /** Ascending sort order for display. */
        displayOrder: number;
}

/**
 * A price attached to a plan, returned by GET /v1/app/:appId/plans/:planId/prices.
 * Provider-internal fields (external_price_id, external_provider) are excluded.
 */
export interface Price {
        /** Public price ID (PRICE0...). */
        priceId: string;
        /** "recurring" or "one_time". */
        billingType: string;
        /** "month" | "year" | null (null for one_time). */
        interval: string | null;
        /** Price in the smallest currency unit (cents). 999 = $9.99. */
        amountCents: number;
        /** ISO 4217 lowercase currency code, e.g. "usd". */
        currency: string;
        trialEnabled: boolean;
        /** Number of trial days, or null if no trial. */
        trialDays: number | null;
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
         * Price public ID (PRICE0...) to trigger a payment checkout after OAuth.
         * When set, NubeAuth creates a checkout session immediately after the user
         * authenticates and redirects to the payment provider. On success the
         * provider redirects back to `returnTo` with `?code=<exchange-code>`.
         *
         * Obtain the priceId from your pricing page by listing prices via the
         * NubeAuth API. Each price already encodes the plan, interval, provider,
         * and currency — no additional billing params are needed.
         *
         * Leave undefined for a plain authenticate-only flow.
         */
        priceId?: string | undefined;
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

// ---------------------------------------------------------------------------
// Webhook event types
// ---------------------------------------------------------------------------

/** All event names that can be delivered to webhook endpoints. */
export type WebhookEventName =
	| "user.registered"
	| "user.updated"
	| "user.deleted"
	| "session.created"
	| "session.revoked"
	| "session.expired"
	| "session.all_revoked"
	| "license.created"
	| "license.upgraded"
	| "license.downgraded"
	| "license.canceled"
	| "license.expired"
	| "license.renewed"
	| "license.reactivated"
	| "license.trial_started"
	| "license.trial_ended"
	| "plan.created"
	| "plan.updated"
	| "plan.deleted"
	| "oauth.connected"
	| "oauth.disconnected";

/** Outer envelope wrapping every webhook delivery. */
export interface WebhookEnvelope<E extends WebhookEventName = WebhookEventName> {
	/** Unique delivery ID (UUID). Matches the `X-Nube-Delivery` header. */
	id: string;
	/** The event name. Matches the `X-Nube-Event` header. */
	event: E;
	/** Public app ID the event originated from. */
	appId: string;
	/** ISO-8601 timestamp when the event was fired. */
	timestamp: string;
	/** Present and `true` on test deliveries sent from the dashboard. */
	test?: boolean;
	/** Event-specific payload. */
	data: WebhookEventData[E];
}

// ---------------------------------------------------------------------------
// Per-event payload shapes
// ---------------------------------------------------------------------------

export interface WebhookUserRegisteredData {
	userId: string;
	email: string;
	name: string | null;
	createdAt: string;
}

export interface WebhookUserUpdatedData {
	userId: string;
	email: string;
	name: string | null;
	updatedAt: string;
	/** Fields that were changed, e.g. ["name", "avatar_url"]. */
	changes: string[];
}

export interface WebhookUserDeletedData {
	userId: string;
	email: string;
	deletedAt: string;
}

export interface WebhookSessionCreatedData {
	sessionId: string;
	userId: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string;
}

export interface WebhookSessionRevokedData {
	sessionId: string;
	userId: string;
	revokedAt: string;
	/** Why the session was revoked, e.g. "user_request" | "admin" | "password_change". */
	reason: string;
}

export interface WebhookSessionExpiredData {
	sessionId: string;
	userId: string;
	expiredAt: string;
}

export interface WebhookSessionAllRevokedData {
	userId: string;
	revokedAt: string;
	/** Number of sessions that were revoked. */
	sessionCount: number;
}

export interface WebhookLicenseCreatedData {
	licenseId: string;
	userId: string;
	planId: string;
	planName: string;
	status: string;
	createdAt: string;
}

export interface WebhookLicenseUpgradedData {
	licenseId: string;
	userId: string;
	fromPlan: string;
	toPlan: string;
	upgradedAt: string;
}

export interface WebhookLicenseDowngradedData {
	licenseId: string;
	userId: string;
	fromPlan: string;
	toPlan: string;
	downgradedAt: string;
}

export interface WebhookLicenseCanceledData {
	licenseId: string;
	userId: string;
	planName: string;
	canceledAt: string;
	/** When the license actually stops being active (end of billing period). */
	endsAt: string;
}

export interface WebhookLicenseExpiredData {
	licenseId: string;
	userId: string;
	planName: string;
	expiredAt: string;
}

export interface WebhookLicenseRenewedData {
	licenseId: string;
	userId: string;
	planName: string;
	renewedAt: string;
	nextRenewalAt: string;
}

export interface WebhookLicenseReactivatedData {
	licenseId: string;
	userId: string;
	planName: string;
	reactivatedAt: string;
}

export interface WebhookLicenseTrialStartedData {
	licenseId: string;
	userId: string;
	planName: string;
	trialStartedAt: string;
	trialEndsAt: string;
}

export interface WebhookLicenseTrialEndedData {
	licenseId: string;
	userId: string;
	planName: string;
	trialEndedAt: string;
	/** Whether the user converted to a paid plan. */
	converted: boolean;
}

export interface WebhookPlanCreatedData {
	planId: string;
	name: string;
	/** Price in smallest currency unit (e.g. cents). */
	price: number;
	currency: string;
	interval: string;
	createdAt: string;
}

export interface WebhookPlanUpdatedData {
	planId: string;
	name: string;
	updatedAt: string;
	changes: string[];
}

export interface WebhookPlanDeletedData {
	planId: string;
	name: string;
	deletedAt: string;
}

export interface WebhookOAuthConnectedData {
	userId: string;
	provider: string;
	providerUserId: string;
	connectedAt: string;
}

export interface WebhookOAuthDisconnectedData {
	userId: string;
	provider: string;
	disconnectedAt: string;
}

/**
 * Maps every `WebhookEventName` to its corresponding payload interface.
 * Used to type the `data` field of `WebhookEnvelope<E>` generically.
 */
export interface WebhookEventData {
	"user.registered": WebhookUserRegisteredData;
	"user.updated": WebhookUserUpdatedData;
	"user.deleted": WebhookUserDeletedData;
	"session.created": WebhookSessionCreatedData;
	"session.revoked": WebhookSessionRevokedData;
	"session.expired": WebhookSessionExpiredData;
	"session.all_revoked": WebhookSessionAllRevokedData;
	"license.created": WebhookLicenseCreatedData;
	"license.upgraded": WebhookLicenseUpgradedData;
	"license.downgraded": WebhookLicenseDowngradedData;
	"license.canceled": WebhookLicenseCanceledData;
	"license.expired": WebhookLicenseExpiredData;
	"license.renewed": WebhookLicenseRenewedData;
	"license.reactivated": WebhookLicenseReactivatedData;
	"license.trial_started": WebhookLicenseTrialStartedData;
	"license.trial_ended": WebhookLicenseTrialEndedData;
	"plan.created": WebhookPlanCreatedData;
	"plan.updated": WebhookPlanUpdatedData;
	"plan.deleted": WebhookPlanDeletedData;
	"oauth.connected": WebhookOAuthConnectedData;
	"oauth.disconnected": WebhookOAuthDisconnectedData;
}
