/**
 * Webhook Routes
 *
 * Handles webhook events from payment providers
 * - POST /v1/billing/webhooks/:provider - Receive webhook events
 */

import { createLogger, serializeError } from "@proofa/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { enqueueWebhookProcessing } from "../../../billing/queue.js";
import { rateLimitMiddleware } from "../../../middleware/rateLimit.js";

const log = createLogger("webhook-routes");

export const webhookRoutes = new Hono();

// Apply rate limiting to webhook endpoints
// Allow 100 webhooks per minute per IP to prevent abuse
webhookRoutes.use(
	"/*",
	rateLimitMiddleware({
		maxRequests: 100,
		windowSeconds: 60,
		keyPrefix: "rate-limit:webhooks",
	}),
);

/**
 * POST /v1/billing/webhooks/:provider
 * Receive webhook from payment provider
 */
webhookRoutes.post("/:provider", async (c: Context) => {
	try {
		const provider = c.req.param("provider");
		
		// Get signature from various header formats used by different providers
		const signature = c.req.header("stripe-signature") || // Stripe
			c.req.header("x-signature") || // LemonSqueezy
			c.req.header("x-webhook-signature") || // Generic
			c.req.header("paddle-signature") || // Paddle
			"";

		if (!signature) {
			log.warn({ provider }, "Webhook received without signature");
			return c.json({ error: "Missing signature" }, 400);
		}

		const rawBody = await c.req.text();

		// Get client IP address for logging and fraud detection
		const ipAddress = getClientIp(c);

		// Validate provider
		const validProviders = ["stripe", "lemon_squeezy", "lemon-squeezy", "lemonsqueezy", "dodo", "paddle"];
		if (!validProviders.includes(provider)) {
			log.warn({ provider }, "Invalid provider in webhook");
			return c.json({ error: "Invalid provider" }, 400);
		}

		// Normalize provider name
		let normalizedProvider: "stripe" | "lemon_squeezy" | "dodo" | "paddle";
		if (provider === "lemon-squeezy" || provider === "lemonsqueezy") {
			normalizedProvider = "lemon_squeezy";
		} else {
			normalizedProvider = provider as "stripe" | "lemon_squeezy" | "dodo" | "paddle";
		}

		// Enqueue webhook processing (async)
		// Use providerConfigId = 0 as placeholder; webhook handler will verify and route
		await enqueueWebhookProcessing(
			normalizedProvider,
			rawBody,
			signature,
			0, // Will be determined during webhook processing
			ipAddress,
		);

		log.info(
			{
				provider: normalizedProvider,
				ipAddress,
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

/**
 * Get client IP address from request headers
 */
function getClientIp(c: Context): string {
	// Cloudflare
	const cfConnectingIp = c.req.header("cf-connecting-ip");
	if (cfConnectingIp) return cfConnectingIp;

	// Standard forwarded headers
	const xForwardedFor = c.req.header("x-forwarded-for");
	if (xForwardedFor) {
		const firstIp = xForwardedFor.split(",")[0];
		return firstIp ? firstIp.trim() : "unknown";
	}

	// Other common headers
	const xRealIp = c.req.header("x-real-ip");
	if (xRealIp) return xRealIp;

	return "unknown";
}
