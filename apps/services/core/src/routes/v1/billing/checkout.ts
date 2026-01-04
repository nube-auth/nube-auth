/**
 * Checkout Routes
 *
 * Handles checkout session creation and retrieval
 * - POST /v1/billing/checkout/session - Create new checkout
 * - GET /v1/billing/checkout/session/:id - Get checkout details
 */

import { createLogger, serializeError } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { getDb, eq } from "@proofa/db";
import {
	payment_provider_configs,
	plan_provider_prices,
	plans,
} from "@proofa/db/schema";
import {
	ProviderAdapterFactory,
	PurchasesService,
	type ProviderAdapterConfig,
} from "../../../billing/index.js";
import { enqueuePaymentProcessing } from "../../../billing/queue.js";
import { env } from "../../../config/env.js";

const log = createLogger("checkout-routes");

export const checkoutRoutes = new Hono();

/**
 * POST /v1/billing/checkout/session
 * Create a new checkout session
 * Body: { appId, planProvidePriceId, userId, promotionCodeId? }
 * Note: In production, userId should come from authenticated session
 */
checkoutRoutes.post("/session", async (c: Context) => {
	try {
		const body = await c.req.json<{
			appId: string;
			planProvidePriceId: string;
			userId?: number;
			promotionCodeId?: string;
		}>();

		// TODO: Replace with actual session authentication
		// For Phase 1, userId can be passed in body for testing
		const userId = body.userId || 1;

		const db = getDb();

		// Validate plan_provider_price
		const planPrice = await db
			.select()
			.from(plan_provider_prices)
			.where(eq(plan_provider_prices.id, parseInt(body.planProvidePriceId, 10)))
			.then((rows) => rows[0]);

		if (!planPrice) {
			return c.json({ error: "Plan not found" }, 404);
		}

		// Get plan details
		const plan = await db
			.select()
			.from(plans)
			.where(eq(plans.id, planPrice.plan_id))
			.then((rows) => rows[0]);

		if (!plan) {
			return c.json({ error: "Plan not found" }, 404);
		}

		// Get default payment provider for app
		const providerConfig = await db
			.select()
			.from(payment_provider_configs)
			.where(
				eq(
					payment_provider_configs.app_id,
					parseInt(body.appId, 10),
				),
			)
			.then((rows) => rows[0]);

		if (!providerConfig || !providerConfig.is_active) {
			return c.json({ error: "Payment provider not configured for app" }, 500);
		}

		// Create purchase record
		const purchase = await PurchasesService.createPurchase({
			appId: parseInt(body.appId, 10),
			subjectType: "user",
			subjectId: userId,
			planProvidePriceId: parseInt(body.planProvidePriceId, 10),
			providerConfigId: providerConfig.id,
			promotionCodeId: body.promotionCodeId ? parseInt(body.promotionCodeId, 10) : undefined,
			providerSessionId: "",
		});

		// Decrypt provider credentials
		let credentials = {};
		try {
			credentials = JSON.parse(providerConfig.credentials);
		} catch {
			log.warn("Failed to parse provider credentials");
		}

		// Initialize provider adapter
		const adapterConfig: ProviderAdapterConfig = {
			provider: providerConfig.provider as "stripe" | "lemon_squeezy",
			environment: providerConfig.environment as "test" | "live",
			credentials,
			webhookSecret: providerConfig.webhook_secret || undefined,
		};

		const adapter = await ProviderAdapterFactory.createAdapter(adapterConfig);

		// Create checkout session
		const checkoutSession = await adapter.createCheckoutSession(
			plan.name,
			planPrice.amount_cents,
			planPrice.currency,
			{
				userId,
				appId: parseInt(body.appId, 10),
				planProvidePriceId: parseInt(body.planProvidePriceId, 10),
				purchaseId: purchase.id,
				...(body.promotionCodeId && { promotionCodeId: parseInt(body.promotionCodeId, 10) }),
			},
			{
				successUrl: `${env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
				cancelUrl: `${env.FRONTEND_URL}/checkout/cancel`,
			},
		);

		log.info(
			{
				purchaseId: purchase.id,
				sessionId: checkoutSession.providerSessionId,
				provider: providerConfig.provider,
			},
			"Checkout session created",
		);

		// Enqueue payment processing job
		await enqueuePaymentProcessing(
			purchase.id,
			checkoutSession.providerSessionId,
		);

		return c.json({
			checkoutUrl: checkoutSession.url,
			sessionId: checkoutSession.providerSessionId,
			purchaseId: purchase.publicId,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Checkout creation failed");
		return c.json({ error: "Failed to create checkout session" }, 500);
	}
});

/**
 * GET /v1/billing/checkout/session/:sessionId
 * Get checkout session details and status
 */
checkoutRoutes.get("/session/:sessionId", async (c: Context) => {
	try {
		const sessionId = c.req.param("sessionId");

		const db = getDb();

		// Get purchase by provider session ID
		const purchase = await PurchasesService.getPurchaseByProviderSession(sessionId);

		if (!purchase) {
			return c.json({ error: "Session not found" }, 404);
		}

		// Get provider config
		const providerConfig = await db
			.select()
			.from(payment_provider_configs)
			.where(eq(payment_provider_configs.id, purchase.providerConfigId))
			.then((rows) => rows[0]);

		if (!providerConfig) {
			return c.json({ error: "Provider configuration not found" }, 500);
		}

		// Decrypt provider credentials
		let credentials = {};
		try {
			credentials = JSON.parse(providerConfig.credentials);
		} catch {
			log.warn("Failed to parse provider credentials");
		}

		// Initialize adapter and get session details
		const adapterConfig: ProviderAdapterConfig = {
			provider: providerConfig.provider as "stripe" | "lemon_squeezy",
			environment: providerConfig.environment as "test" | "live",
			credentials,
			webhookSecret: providerConfig.webhook_secret || undefined,
		};

		const adapter = await ProviderAdapterFactory.createAdapter(adapterConfig);
		const session = await adapter.getSession(sessionId);

		if (!session) {
			return c.json({ error: "Session not found from provider" }, 404);
		}

		return c.json({
			sessionId: session.providerSessionId,
			status: purchase.status,
			url: session.url,
			expiresAt: session.expiresAt?.toISOString(),
			purchase: {
				id: purchase.publicId,
				subjectType: purchase.subjectType,
				subjectId: purchase.subjectId,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to get checkout session");
		return c.json({ error: "Failed to get checkout session" }, 500);
	}
});
