/**
 * Webhook Routes
 *
 * Handles webhook events from payment providers
 * - POST /v1/billing/webhooks/:provider - Receive webhook events
 */

import { createLogger, serializeError } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { WebhookHandler } from "../../../billing/services/webhook-handler.js";
import { enqueueWebhookProcessing } from "../../../billing/queue.js";

const log = createLogger("webhook-routes");

export const webhookRoutes = new Hono();

/**
 * POST /v1/billing/webhooks/:provider
 * Receive webhook from payment provider
 */
webhookRoutes.post("/:provider", async (c: Context) => {
	try {
		const provider = c.req.param("provider");
		const signature = c.req.header("stripe-signature") ||
			c.req.header("x-signature") ||
			c.req.header("x-webhook-signature") || "";

		if (!signature) {
			log.warn({ provider }, "Webhook received without signature");
			return c.json({ error: "Missing signature" }, 400);
		}

		const rawBody = await c.req.text();

		// Validate provider
		const validProviders = ["stripe", "lemon_squeezy", "lemon-squeezy"];
		if (!validProviders.includes(provider)) {
			log.warn({ provider }, "Invalid provider in webhook");
			return c.json({ error: "Invalid provider" }, 400);
		}

		// Normalize provider name
		const normalizedProvider =
			provider === "lemon-squeezy" ? "lemon_squeezy" : (provider as "stripe" | "lemon_squeezy");

		// Enqueue webhook processing (async)
		// Use providerConfigId = 0 as placeholder; webhook handler will verify and route
		await enqueueWebhookProcessing(
			normalizedProvider,
			rawBody,
			signature,
			0, // Will be determined during webhook processing
		);

		log.info(
			{
				provider: normalizedProvider,
			},
			"Webhook queued for processing",
		);

		// Return 200 immediately to acknowledge receipt
		return c.json({ success: true, message: "Webhook received and queued" }, 200);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Webhook processing error");
		// Return 200 to acknowledge receipt (don't retry on errors)
		return c.json({ error: "Processing error" }, 200);
	}
});
