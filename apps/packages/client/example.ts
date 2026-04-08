/**
 * @nube-auth/client — usage examples
 *
 * Run individual functions to explore the API against a local dev environment:
 *   npx tsx example.ts
 */

import {
	NubeAuthClient,
	NubeAuthError,
	verifyWebhookSignature,
} from "./src/index";
import type {
	WebhookEnvelope,
	WebhookEventName,
} from "./src/index";

// ---------------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------------

/** Web / browser apps — cookies are sent automatically */
const webClient = new NubeAuthClient({
	gatewayUrl: process.env.NUBE_GATEWAY_URL ?? "http://localhost:3004",
	appId: process.env.NUBE_APP_ID ?? "APP0abc123",
	onSessionExpired: () => console.log("[auth] session expired — redirect to login"),
});

/** Native app or CLI — pass a Bearer session token obtained via OAuth */
const nativeClient = new NubeAuthClient({
	gatewayUrl: process.env.NUBE_GATEWAY_URL ?? "http://localhost:3004",
	appId: process.env.NUBE_APP_ID ?? "APP0abc123",
	sessionToken: process.env.NUBE_SESSION_TOKEN,
});

/** Server-side backend — reads plans, creates checkouts, calls catalog */
const serverClient = new NubeAuthClient({
	gatewayUrl: process.env.NUBE_GATEWAY_URL ?? "http://localhost:3004",
	appId: process.env.NUBE_APP_ID ?? "APP0abc123",
	appSecret: process.env.NUBE_APP_SECRET,
	sessionToken: process.env.NUBE_SESSION_TOKEN, // user session from request context
});

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

async function exampleAuth() {
	const { loggedIn, user } = await webClient.auth.checkStatus();
	console.log("Logged in:", loggedIn);
	if (user) console.log("User ID:", user.id, "Email:", user.email);

	// Sign out
	await webClient.auth.logout();
	console.log("Signed out");
}

// ---------------------------------------------------------------------------
// App OAuth flow — native apps, CLIs, browser extensions
// ---------------------------------------------------------------------------

async function exampleOAuth() {
	// Step 1 — build the OAuth URL (runs on the client, opens a browser window)
	const { url, codeVerifier } = await nativeClient.app.buildOAuthUrl({
		returnTo: "myapp://auth",        // custom scheme for native apps
		// returnTo: "https://app.example.com/auth/callback",  // for web
		priceId: "PRICE0abc123",         // optional: trigger checkout after login
		deviceId: "device-hardware-uuid", // optional: per-device audit trail
	});

	console.log("Open in browser:", url);
	// In a real app: open `url` in the system browser, then intercept the redirect

	// Step 2 — after redirect, exchange the one-time code for a session token
	const oneTimeCode = "code-from-redirect-query-param";
	const { sessionToken, userId, appId } = await nativeClient.app.exchangeCode(oneTimeCode, {
		codeVerifier,
	});

	console.log("Session token obtained for user:", userId, "app:", appId);

	// Step 3 — construct an authenticated client for all subsequent calls
	const authedClient = new NubeAuthClient({
		gatewayUrl: process.env.NUBE_GATEWAY_URL ?? "http://localhost:3004",
		appId,
		sessionToken,
	});

	const user = await authedClient.me.get();
	console.log("Authenticated as:", user.email);
}

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

async function exampleProfile() {
	const user = await webClient.me.get();
	console.log("Profile:", user);
	// { id, email, name, createdAt, avatar_url, emailVerified }

	const updated = await webClient.me.update({
		name: "Alice Smith",
		avatar_url: "https://example.com/avatar.jpg",
	});
	console.log("Updated name:", updated.name);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

async function exampleSessions() {
	const { sessions } = await webClient.sessions.list();
	console.log(`${sessions.length} active session(s)`);

	for (const s of sessions) {
		console.log(
			s.isCurrent ? "[current]" : "        ",
			s.id,
			s.ipAddress ?? "unknown IP",
			"expires", new Date(s.expiresAt).toLocaleString(),
		);
	}

	// Revoke a specific session
	const toRevoke = sessions.find((s) => !s.isCurrent);
	if (toRevoke) {
		await webClient.sessions.delete(toRevoke.id);
		console.log("Revoked session:", toRevoke.id);
	}

	// Sign out everywhere
	await webClient.sessions.deleteAll();
	console.log("All sessions revoked");
}

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------

async function exampleLicense() {
	const active = await webClient.license.isActive();
	console.log("License active:", active);

	if (active) {
		const license = await webClient.license.getDetails();
		console.log("Plan:", license.plan);
		console.log("Status:", license.status);
		console.log("Valid until:", license.valid_until ? new Date(license.valid_until * 1000) : "lifetime");
		console.log("Entitlements:", license.entitlements);
	}
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

async function exampleSubscription() {
	const sub = await webClient.subscription.getDetails();
	console.log("Has active plan:", sub.hasActivePlan);

	if (sub.hasActivePlan) {
		console.log("Plan:", sub.planSlug, "— status:", sub.status);
		console.log("Interval:", sub.billingInterval);
		console.log("Renews:", sub.periodEnd ? new Date(sub.periodEnd).toLocaleDateString() : "N/A");

		// Cancel at end of billing period
		await webClient.subscription.cancel("too_expensive");
		console.log("Cancellation scheduled");

		// Change your mind
		await webClient.subscription.resume();
		console.log("Cancellation reversed");
	}
}

// ---------------------------------------------------------------------------
// App catalog — fetch plans and prices (server-side, requires appSecret)
// ---------------------------------------------------------------------------

async function exampleAppCatalog() {
	const { plans } = await serverClient.appCatalog.getPlans();
	console.log(`${plans.length} plan(s):`);

	for (const plan of plans) {
		console.log(`\n  ${plan.name} (${plan.slug})`);
		console.log("  Features:", plan.features.join(", "));

		const { prices } = await serverClient.appCatalog.getPrices(plan.planId);
		for (const price of prices) {
			const amount = (price.amountCents / 100).toFixed(2);
			const label = price.billingType === "recurring"
				? `$${amount} / ${price.interval}`
				: `$${amount} one-time`;
			console.log(`    ${label} [${price.priceId}]`);
			if (price.trialEnabled) console.log(`    Free trial: ${price.trialDays} days`);
		}
	}
}

// ---------------------------------------------------------------------------
// Payment — create checkout session (server-side)
// ---------------------------------------------------------------------------

async function exampleCreateCheckout() {
	// Fetch available prices first
	const { plans } = await serverClient.appCatalog.getPlans();
	const { prices } = await serverClient.appCatalog.getPrices(plans[0]!.planId);
	const price = prices.find((p) => p.interval === "month") ?? prices[0]!;

	// Create a checkout session — redirect the user to session.checkoutUrl
	const session = await serverClient.payment.createCheckout({
		priceId: price.priceId,
		userId: "USER0def456",                    // from the authenticated session
		customerEmail: "alice@example.com",
		successUrl: "https://myapp.com/billing/success?session_id={CHECKOUT_SESSION_ID}",
		cancelUrl: "https://myapp.com/billing",
		promoCode: "LAUNCH50",                    // optional
		metadata: { referral: "homepage" },       // optional, stored on the purchase
	});

	console.log("Checkout URL:", session.checkoutUrl);
	console.log("Provider:", session.provider);
	console.log("Plan:", session.planName);
	console.log("Amount:", `${(session.amountCents / 100).toFixed(2)} / ${session.interval}`);
	// In a real app: redirect(session.checkoutUrl)
}

// ---------------------------------------------------------------------------
// Payment — validate promo code (can be called from browser)
// ---------------------------------------------------------------------------

async function exampleValidatePromoCode() {
	const result = await webClient.payment.validatePromoCode({
		code: "LAUNCH50",
		priceId: "PRICE0abc123",
	});

	if (result.valid) {
		const discount = (result.discountCents / 100).toFixed(2);
		const total = (result.adjustedTotal / 100).toFixed(2);
		console.log(`${result.promotion.name}: -$${discount} — you pay $${total}`);
	} else {
		console.log("Promo code rejected:", result.reason);
		// reason: 'code_not_found' | 'promotion_expired' | 'plan_not_eligible'
		//         | 'code_exhausted' | 'already_redeemed' | 'existing_customer' | ...
	}
}

// ---------------------------------------------------------------------------
// Webhooks — signature verification
// ---------------------------------------------------------------------------

async function exampleVerifySignature() {
	// Simulated incoming webhook (normally comes from an HTTP request)
	const payload = JSON.stringify({
		id: "delivery-uuid",
		event: "license.upgraded",
		appId: "APP0abc123",
		timestamp: new Date().toISOString(),
		data: { licenseId: "LIC0abc", userId: "USER0def", fromPlan: "Starter", toPlan: "Pro", upgradedAt: new Date().toISOString() },
	});
	const secret = "whsec_your_signing_secret";

	// Generate a test signature (mimics what the server sends)
	const { createHmac } = await import("node:crypto");
	const sig = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

	const valid = await verifyWebhookSignature({
		rawBody: payload,   // string or Uint8Array — MUST be the raw bytes before JSON.parse
		signature: sig,
		secret,
	});

	console.log("Signature valid:", valid); // true

	// Tampered payload returns false, never throws
	const tampered = await verifyWebhookSignature({
		rawBody: payload + " ",
		signature: sig,
		secret,
	});
	console.log("Tampered payload valid:", tampered); // false
}

// ---------------------------------------------------------------------------
// Webhooks — typed event handling
// ---------------------------------------------------------------------------

/**
 * Narrowed handler: TypeScript infers the exact `data` shape from `E`.
 * No type assertion needed — `envelope.data` is fully typed.
 */
type WebhookHandler<E extends WebhookEventName> = (envelope: WebhookEnvelope<E>) => Promise<void>;

const onLicenseUpgraded: WebhookHandler<"license.upgraded"> = async (envelope) => {
	// envelope.data is WebhookLicenseUpgradedData — fully typed
	console.log(`User ${envelope.data.userId} upgraded from ${envelope.data.fromPlan} → ${envelope.data.toPlan}`);
};

const onUserRegistered: WebhookHandler<"user.registered"> = async (envelope) => {
	console.log(`New user: ${envelope.data.email} (${envelope.data.userId})`);
	// Send a welcome email, provision resources, etc.
};

const onLicenseCanceled: WebhookHandler<"license.canceled"> = async (envelope) => {
	console.log(`License canceled — access ends at: ${new Date(envelope.data.endsAt).toLocaleDateString()}`);
};

/** Dispatcher — routes a raw envelope to the right handler */
async function exampleDispatchWebhookEvent(raw: unknown) {
	const envelope = raw as WebhookEnvelope;

	switch (envelope.event) {
		case "license.upgraded":  return onLicenseUpgraded(envelope as WebhookEnvelope<"license.upgraded">);
		case "user.registered":   return onUserRegistered(envelope as WebhookEnvelope<"user.registered">);
		case "license.canceled":  return onLicenseCanceled(envelope as WebhookEnvelope<"license.canceled">);
		default:
			console.log(`Unhandled event: ${envelope.event}`);
	}
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

async function exampleErrorHandling() {
	try {
		await webClient.me.get();
	} catch (error) {
		if (error instanceof NubeAuthError) {
			console.error("API error:", {
				code: error.code,      // machine-readable, e.g. 'UNAUTHORIZED'
				status: error.status,  // HTTP status code
				message: error.message,
			});

			switch (error.status) {
				case 401:
					console.log("Session expired — redirect to login");
					break;
				case 403:
					console.log("Insufficient permissions");
					break;
				case 404:
					console.log("Resource not found");
					break;
				default:
					console.log("Unexpected error");
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Run all examples (skips if env vars are not set)
// ---------------------------------------------------------------------------

(async () => {
	const examples: [string, () => Promise<void>][] = [
		["auth", exampleAuth],
		["oauth", exampleOAuth],
		["profile", exampleProfile],
		["sessions", exampleSessions],
		["license", exampleLicense],
		["subscription", exampleSubscription],
		["appCatalog", exampleAppCatalog],
		["createCheckout", exampleCreateCheckout],
		["validatePromoCode", exampleValidatePromoCode],
		["verifySignature", exampleVerifySignature],
		["webhookEvents", async () => exampleDispatchWebhookEvent({
			id: "abc", event: "user.registered", appId: "APP0abc", timestamp: new Date().toISOString(),
			data: { userId: "USER0xyz", email: "bob@example.com", name: "Bob", createdAt: new Date().toISOString() },
		})],
		["errorHandling", exampleErrorHandling],
	];

	const target = process.argv[2]; // run a specific example: npx tsx example.ts auth

	for (const [name, fn] of examples) {
		if (target && name !== target) continue;
		console.log(`\n${"─".repeat(60)}`);
		console.log(`Example: ${name}`);
		console.log("─".repeat(60));
		await fn().catch((e) => console.error(`[${name}]`, (e as Error).message));
	}
})();
