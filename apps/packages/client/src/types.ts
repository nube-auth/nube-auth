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
	| "oauth.disconnected"
	| "subscription.created"
	| "subscription.renewed"
	| "subscription.canceled"
	| "subscription.payment_failed"
	| "subscription.refunded"
	| "subscription.resumed";

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

export interface WebhookSubscriptionCreatedData {
	subscriptionId: string;
	licenseId: string;
	appId: string;
	userId: string;
	planId: string;
	status: string;
	billingInterval: string | null;
	billingPeriodStart: string | null;
	billingPeriodEnd: string | null;
	nextBillingDate: string | null;
	transactionId: string | null;
	amountCents: number;
	currency: string;
}

export interface WebhookSubscriptionRenewedData {
	subscriptionId: string;
	licenseId: string;
	appId: string;
	userId: string;
	planId: string;
	status: string;
	billingInterval: string | null;
	billingPeriodStart: string | null;
	billingPeriodEnd: string | null;
	nextBillingDate: string | null;
	transactionId: string | null;
	amountCents: number;
	currency: string;
}

export interface WebhookSubscriptionCanceledData {
	subscriptionId: string | null;
	licenseId: string | null;
	userId: string | null;
	status: string;
	/** When true the subscription stays active until the end of the billing period. */
	cancelAtPeriodEnd?: boolean;
	canceledAt: string;
	/** ISO-8601 date until which the user retains access (when cancelAtPeriodEnd is true). */
	accessUntil?: string | null;
	/** Why the subscription was canceled, e.g. "user_canceled" or "provider_webhook". */
	reason: string;
	/** Payment provider that originated the cancellation (when triggered via webhook). */
	provider?: string;
}

export interface WebhookSubscriptionPaymentFailedData {
	subscriptionId: string | null;
	licenseId: string;
	status: string;
	/** Payment provider name. */
	provider: string;
	failedAt: string;
	/** ISO-8601 end of the grace period before the subscription is suspended. */
	gracePeriodEnd: string;
	amountCents: number;
	currency: string;
}

export interface WebhookSubscriptionRefundedData {
	subscriptionId: string | null;
	licenseId: string;
	status: string;
	/** Payment provider name. */
	provider: string;
	refundedAt: string;
	amountCents: number;
	currency: string;
	transactionId: string | null;
}

export interface WebhookSubscriptionResumedData {
	subscriptionId: string;
	licenseId: string | null;
	userId: string;
	status: string;
	resumedAt: string;
	/** What triggered the resume: "user_action" or "admin". */
	source: string;
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
	"subscription.created": WebhookSubscriptionCreatedData;
	"subscription.renewed": WebhookSubscriptionRenewedData;
	"subscription.canceled": WebhookSubscriptionCanceledData;
	"subscription.payment_failed": WebhookSubscriptionPaymentFailedData;
	"subscription.refunded": WebhookSubscriptionRefundedData;
	"subscription.resumed": WebhookSubscriptionResumedData;
}

// ---------------------------------------------------------------------------
// Payment / Checkout
// ---------------------------------------------------------------------------

/**
 * Options for creating a payment checkout session.
 * Requires an authenticated user session (cookie or Bearer token) and
 * should be called from a backend — never expose `successUrl`/`cancelUrl`
 * construction to untrusted clients.
 */
export interface CreateCheckoutOptions {
	/**
	 * Public price ID (PRICE0...) from the NubeAuth app catalog.
	 * Encodes the plan, billing interval, provider, and currency — no
	 * additional routing parameters are needed.
	 */
	priceId: string;
	/**
	 * Public user ID (USER0...) of the user being checked out.
	 * Obtained from the authenticated session.
	 */
	userId: string;
	/**
	 * Email address to pre-fill on the provider checkout page.
	 */
	customerEmail: string;
	/**
	 * URL to redirect to after a successful payment.
	 * Must be an absolute HTTPS URL (or a custom scheme for native apps).
	 */
	successUrl: string;
	/**
	 * URL to redirect to when the user cancels / closes the checkout.
	 */
	cancelUrl: string;
	/**
	 * App public ID (APP0...). Falls back to the `appId` set in client config.
	 */
	appId?: string;
	/**
	 * Provider-side customer ID if you already have one (e.g. Stripe customer_id).
	 * Leave undefined to let NubeAuth create a new customer automatically.
	 */
	customerId?: string;
	/** Number of units to purchase. Defaults to 1. */
	quantity?: number;
	/**
	 * Nube Auth promo code string (e.g. "LAUNCH50").
	 * Will be validated and mapped to the provider coupon automatically.
	 */
	promoCode?: string;
	/** Arbitrary key/value metadata forwarded to the provider and stored on the purchase. */
	metadata?: Record<string, string>;
}

/** Response from `payment.createCheckout()`. */
export interface CheckoutSession {
	/** Always `true` on success (errors throw `NubeAuthError`). */
	success: boolean;
	/**
	 * Redirect the user to this URL to complete payment.
	 * For web apps: `window.location.href = checkoutUrl`.
	 * For native apps: open in system browser.
	 */
	checkoutUrl: string;
	/** Provider-specific session identifier (e.g. Stripe `cs_...`). */
	sessionId: string;
	/** Payment provider name, e.g. `"stripe"` or `"dodo"`. */
	provider: string;
	/** Human-readable plan name, e.g. `"Pro"`. */
	planName: string;
	/** Price in the smallest currency unit (e.g. cents). */
	amountCents: number;
	/** Billing interval: `"month"`, `"year"`, or `"one_time"`. */
	interval: string;
}

/** Options for validating a promo code before initiating checkout. */
export interface ValidatePromoOptions {
	/** The promo code string entered by the user, e.g. `"LAUNCH50"`. */
	code: string;
	/** Public price ID the promo is being applied to. */
	priceId: string;
	/** App public ID. Falls back to the `appId` set in client config. */
	appId?: string;
}

/** Result of `payment.validatePromoCode()`. */
export type ValidatePromoResult =
	| {
			valid: false;
			/**
			 * Machine-readable reason:
			 * `"code_not_found"` | `"promotion_inactive"` | `"promotion_expired"` |
			 * `"code_inactive"` | `"code_exhausted"` | `"promotion_max_redemptions_reached"` |
			 * `"plan_not_eligible"` | `"interval_not_eligible"` | `"existing_customer"` |
			 * `"already_redeemed"` | `"user_required"` | `"invalid_input"`
			 */
			reason: string;
	  }
	| {
			valid: true;
			/** Discount amount in smallest currency unit (e.g. cents). */
			discountCents: number;
			/** Final price after discount, in smallest currency unit. */
			adjustedTotal: number;
			promotion: {
				name: string;
				/** `"percent"` or `"fixed"`. */
				discountType: string;
				/** Percentage (0–100) for `"percent"`, or flat amount in cents for `"fixed"`. */
				discountValue: number;
			};
	  };

// ---------------------------------------------------------------------------
// S2S — server-to-server user provisioning
// ---------------------------------------------------------------------------

/** Options for `users.provision()`. */
export interface ProvisionUserOptions {
	/** Primary email address of the user to provision. */
	email: string;
	/** Display name (optional). */
	name?: string;
	/** Avatar URL (optional). */
	avatarUrl?: string;
}

/** Result of `users.provision()`. */
export interface ProvisionUserResult {
	/** NubeAuth public user ID (USER0...). */
	userId: string;
}
