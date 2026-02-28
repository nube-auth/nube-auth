/**
 * Checkout Routes
 *
 * Handles payment checkout session creation using provider routing
 */

import { getDb, prices, plans, eq, and } from "@proofa/db";
import { createLogger, serializeError } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { createProviderAdapter } from "../../../billing/adapters/index.js";
import { selectProvider } from "../../../billing/services/provider-selector.js";
import { decryptString } from "../../../utils/encryption.js";

const log = createLogger("checkout-routes");

export const checkoutRoutes = new Hono();

const CheckoutRequestSchema = z.object({
	appId: z.string(),
	planId: z.string(), // Proofa plan public_id (PLAN0...)
	interval: z.enum(["month", "year"]), // Billing interval
	customerId: z.string().optional(),
	customerEmail: z.string().email(),
	quantity: z.number().int().positive().optional().default(1),
	successUrl: z.string().url(),
	cancelUrl: z.string().url(),
	metadata: z.record(z.string(), z.string()).optional(),
	trialPeriodDays: z.number().int().positive().optional(),
	promoCode: z.string().optional(),
});

/**
 * POST /v1/billing/checkout
 * Create checkout session using routing rules and plan-based pricing
 */
checkoutRoutes.post("/", async (c: Context) => {
	try {
		const body = await c.req.json();
		const validated = CheckoutRequestSchema.parse(body);

		const db = getDb();

		// Verify plan exists and is active
		const plan = await db.query.plans.findFirst({
			where: and(eq(plans.public_id, validated.planId), eq(plans.is_active, true)),
			columns: { id: true, public_id: true, name: true, app_id: true },
		});

		if (!plan) {
			log.warn({ planId: validated.planId }, "Plan not found or inactive");
			return c.json({ error: "Invalid plan ID" }, 400);
		}

		// Select provider based on routing rules
		const providerConfig = await selectProvider(plan.app_id, {
			country: c.req.header("cf-ipcountry") || undefined,
			currency: (validated.metadata?.["currency"] as string | undefined) || undefined,
		});

		if (!providerConfig) {
			log.error({ appId: validated.appId }, "No payment provider configured");
			return c.json({ error: "No payment provider configured for this app" }, 400);
		}

		// Lookup active price for this plan + interval + provider
		const priceMapping = await db.query.prices.findFirst({
			where: and(
				eq(prices.plan_id, plan.id),
				eq(prices.interval, validated.interval),
				eq(prices.is_active, true),
				eq(prices.external_provider, providerConfig.provider)
			),
			columns: {
				external_price_id: true,
				amount_cents: true,
				billing_type: true,
			},
		});

		if (!priceMapping) {
			log.error(
				{
					planId: validated.planId,
					providerId: providerConfig.id,
					interval: validated.interval,
				},
				"Price mapping not found for plan/provider/interval"
			);
			return c.json(
				{
					error: "Price not available for selected plan and billing interval",
					details: "Plan may not be synced to this payment provider yet",
				},
				400
			);
		}

		// Decrypt credentials
		let decryptedCredentials: unknown;
		try {
			const credentialsJson = decryptString(providerConfig.credentials);
			decryptedCredentials = JSON.parse(credentialsJson);
		} catch (error) {
			log.error(
				{ err: serializeError(error as Error), providerId: providerConfig.id },
				"Failed to decrypt provider credentials"
			);
			return c.json({ error: "Provider configuration error" }, 500);
		}

		// Create adapter
		const adapter = createProviderAdapter(providerConfig.provider, decryptedCredentials);

		// Create checkout session with provider price ID
		const session = await adapter.createCheckout({
			customerId: validated.customerId || "",
			customerEmail: validated.customerEmail,
			productId: priceMapping.external_price_id || "", // Use provider's price ID
			...(validated.quantity && { quantity: validated.quantity }),
			successUrl: validated.successUrl,
			cancelUrl: validated.cancelUrl,
			metadata: {
				...validated.metadata,
				proofa_plan_id: plan.public_id,
				proofa_interval: validated.interval,
			},
			...(validated.trialPeriodDays && { trialPeriodDays: validated.trialPeriodDays }),
			mode: priceMapping.billing_type === "recurring" ? "subscription" : "payment",
			...(validated.promoCode && { promoCode: validated.promoCode }),
		});

		log.info(
			{
				appId: validated.appId,
				planId: validated.planId,
				interval: validated.interval,
				provider: providerConfig.provider,
				sessionId: session.sessionId,
				amountCents: priceMapping.amount_cents,
			},
			"Checkout session created"
		);

		return c.json({
			success: true,
			checkoutUrl: session.checkoutUrl,
			sessionId: session.sessionId,
			provider: providerConfig.provider,
			planName: plan.name,
			amountCents: priceMapping.amount_cents,
			interval: validated.interval,
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
