/**
 * Checkout Routes
 *
 * Handles payment checkout session creation driven by a specific price record.
 * The caller passes a priceId (PRICE0...) which already encodes plan, provider,
 * interval, and currency — no routing logic is needed here.
 */

import { getDb, prices, plans, payment_provider_configs, appQueries, priceQueries, purchases, userQueries, eq, and } from "@nube-auth/db";
import { createLogger, id, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { createProviderAdapter } from "../../../billing/adapters/index.js";
import { decryptString } from "../../../utils/encryption.js";

const log = createLogger("checkout-routes");

export const checkoutRoutes = new Hono();

const CheckoutRequestSchema = z.object({
	appId: z.string(),
	userId: z.string(),   // Nube Auth user public_id (USER0...)
	priceId: z.string(),  // Nube Auth price public_id (PRICE0...)
	customerId: z.string().optional(),
	customerEmail: z.string().email(),
	quantity: z.number().int().positive().optional().default(1),
	successUrl: z.string().url(),
	cancelUrl: z.string().url(),
	metadata: z.record(z.string(), z.string()).optional(),
	promoCode: z.string().optional(),
});

/**
 * POST /v1/billing/checkout
 * Create a checkout session for a specific price.
 *
 * The priceId already encodes the plan, billing interval, provider, and
 * currency — no routing rules are evaluated. The provider config is looked
 * up directly from the price's external_provider field.
 */
checkoutRoutes.post("/", async (c: Context) => {
	try {
		const body = await c.req.json();
		const validated = CheckoutRequestSchema.parse(body);

		const db = getDb();

		// Resolve price — this is the single source of truth for the checkout
		const price = await priceQueries.findByPublicId(db, validated.priceId);

		if (!price || !price.is_active) {
			log.warn({ priceId: validated.priceId }, "Price not found or inactive");
			return c.json({ error: "Invalid price ID" }, 400);
		}

		if (!price.external_provider || !price.external_price_id) {
			log.error({ priceId: validated.priceId }, "Price has no provider mapping");
			return c.json(
				{
					error: "Price not synced to a payment provider",
					details: "Sync the plan to a provider in the NubeAuth admin before accepting payments",
				},
				400,
			);
		}

		// Get plan for name and public_id (used in response + webhook metadata)
		const plan = await db.query.plans.findFirst({
			where: eq(plans.id, price.plan_id),
			columns: { public_id: true, name: true },
		});

		if (!plan) {
			log.error({ planId: price.plan_id }, "Plan referenced by price not found");
			return c.json({ error: "Plan not found" }, 500);
		}

		// Resolve app → project_id, then find the active provider config
		const app = await appQueries.findById(db, price.app_id);

		if (!app) {
			log.error({ appId: price.app_id }, "App referenced by price not found");
			return c.json({ error: "App not found" }, 500);
		}

		const [providerConfig] = await db
			.select()
			.from(payment_provider_configs)
			.where(
				and(
					eq(payment_provider_configs.project_id, app.project_id),
					eq(payment_provider_configs.provider, price.external_provider),
					eq(payment_provider_configs.is_active, true),
				),
			)
			.limit(1);

		if (!providerConfig) {
			log.error(
				{ priceId: validated.priceId, provider: price.external_provider },
				"No active provider config found for price's provider",
			);
			return c.json({ error: "No active payment provider configuration found" }, 400);
		}

		// Decrypt credentials
		let decryptedCredentials: unknown;
		try {
			const credentialsJson = decryptString(providerConfig.credentials);
			decryptedCredentials = JSON.parse(credentialsJson);
		} catch (error) {
			log.error(
				{ err: serializeError(error as Error), providerId: providerConfig.id },
				"Failed to decrypt provider credentials",
			);
			return c.json({ error: "Provider configuration error" }, 500);
		}

		// Add environment field for Dodo (convert "test"/"production" to "test_mode"/"live_mode")
		if (providerConfig.provider === "dodo" && providerConfig.environment) {
			(decryptedCredentials as any).environment = providerConfig.environment === "production" ? "live_mode" : "test_mode";
			(decryptedCredentials as any).webhookSecret = providerConfig.webhook_secret || (decryptedCredentials as any).webhookSecret;
		}

		const adapter = createProviderAdapter(providerConfig.provider, decryptedCredentials);

		// Use trial settings from the price record
		const trialPeriodDays = price.trial_enabled && price.trial_days ? price.trial_days : undefined;
		const interval = price.interval ?? "one_time";

		// Generate the pending purchase public_id before creating the checkout session
		// so we can embed it in the provider metadata. The webhook will use this to
		// update the existing pending record instead of creating a duplicate.
		let pendingPurchasePublicId: string | undefined;
		const user = await userQueries.findByPublicId(db, validated.userId);
		if (user) {
			pendingPurchasePublicId = id.request();
		}

		const session = await adapter.createCheckout({
			customerId: validated.customerId || "",
			customerEmail: validated.customerEmail,
			productId: price.external_price_id,
			...(validated.quantity && { quantity: validated.quantity }),
			successUrl: validated.successUrl,
			cancelUrl: validated.cancelUrl,
			metadata: {
				...validated.metadata,
				appId: validated.appId,
				userId: validated.userId,
				planId: plan.public_id,
				priceId: price.public_id,
				interval,
				...(pendingPurchasePublicId && { purchaseId: pendingPurchasePublicId }),
			},
			...(trialPeriodDays && { trialPeriodDays }),
			mode: price.billing_type === "recurring" ? "subscription" : "payment",
			...(validated.promoCode && { promoCode: validated.promoCode }),
		});

		log.info(
			{
				appId: validated.appId,
				priceId: validated.priceId,
				planId: plan.public_id,
				interval,
				provider: providerConfig.provider,
				sessionId: session.sessionId,
				amountCents: price.amount_cents,
			},
			"Checkout session created",
		);

		// Persist a pending purchase record so there is always a DB trace of the payment,
		// even if the provider webhook is delayed, fails to deliver, or arrives out of order.
		if (user && pendingPurchasePublicId) {
			try {
				await db.insert(purchases).values({
					public_id: pendingPurchasePublicId,
					app_id: app.id,
					subject_type: "user",
					subject_id: user.id,
					price_id: price.id,
					provider_config_id: providerConfig.id,
					provider_session_id: session.sessionId,
					status: "pending",
				});
				log.info({ sessionId: session.sessionId, userId: validated.userId, purchaseId: pendingPurchasePublicId }, "Pending purchase record created");
			} catch (purchaseError) {
				// Non-fatal: the webhook will still create the final record; log and continue
				log.error({ err: serializeError(purchaseError as Error), sessionId: session.sessionId }, "Failed to create pending purchase record");
			}
		} else {
			log.warn({ userId: validated.userId, sessionId: session.sessionId }, "User not found — pending purchase not recorded");
		}

		return c.json({
			success: true,
			checkoutUrl: session.checkoutUrl,
			sessionId: session.sessionId,
			provider: providerConfig.provider,
			planName: plan.name,
			amountCents: price.amount_cents,
			interval,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			log.warn({ errors: error.issues }, "Invalid checkout request");
			return c.json({ error: "Invalid request", details: error.issues }, 400);
		}

		log.error({ err: serializeError(error as Error) }, "Checkout creation failed");
		return c.json({ error: "Failed to create checkout session" }, 500);
	}
});
