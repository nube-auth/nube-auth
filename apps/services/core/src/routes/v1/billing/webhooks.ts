/**
 * Webhook Routes
 *
 * Handles webhook events from payment providers
 * - POST /v1/billing/webhooks/:provider - Receive webhook events
 */

import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { enqueueWebhookProcessing } from "../../../billing/queue.js";
import { WebhookLoggingService } from "../../../billing/services/webhook-logging.js";
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
		// For Dodo: pack Standard Webhooks headers (webhook-id, webhook-signature, webhook-timestamp) as JSON
		let signature: string;
		if (provider === "dodo") {
			signature = JSON.stringify({
				"webhook-id": c.req.header("webhook-id") ?? "",
				"webhook-signature": c.req.header("webhook-signature") ?? "",
				"webhook-timestamp": c.req.header("webhook-timestamp") ?? "",
			});
		} else {
			signature = c.req.header("stripe-signature") || // Stripe
				c.req.header("x-signature") || // LemonSqueezy
				c.req.header("x-webhook-signature") || // Generic
				c.req.header("paddle-signature") || // Paddle
				"";
		}

		if (!signature || signature === '{"webhook-id":"","webhook-signature":"","webhook-timestamp":""}') {
			log.warn({ provider }, "Webhook received without signature");
			return c.json({ error: "Missing signature" }, 400);
		}

		const rawBody = await c.req.text();
		const parsedBody = safeParseWebhookBody(rawBody);
		const eventType = extractEventType(provider, parsedBody);

		// Get client IP address for logging and fraud detection
		const ipAddress = getClientIp(c);
		const requestHeaders = Object.fromEntries(c.req.raw.headers.entries());

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

		// Extract the provider's canonical event ID at ingress so the unique
		// (provider, event_id) constraint in webhook_logs can deduplicate replays.
		// For Dodo, the Standard Webhooks spec uses the webhook-id header as the canonical ID.
		const dodoEventId = provider === "dodo" ? c.req.header("webhook-id") : null;
		const eventId = dodoEventId ?? extractEventId(provider, parsedBody);

		// Store every incoming webhook first for full ingress audit trail.
		const webhookLogId = await WebhookLoggingService.createWebhookLog({
			provider: normalizedProvider,
			eventType,
			eventId: eventId ?? undefined,
			requestBody: parsedBody,
			requestHeaders,
			signature,
			ipAddress,
			metadata: {
				stage: "ingress",
				routeProvider: provider,
			},
		});

		// Enqueue webhook processing (async)
		await enqueueWebhookProcessing(
			normalizedProvider,
			rawBody,
			signature,
			ipAddress,
			webhookLogId > 0 ? webhookLogId : undefined,
		);

		log.info(
			{
				provider: normalizedProvider,
				ipAddress,
				webhookLogId,
			},
			"Webhook queued for processing",
		);

		// Return 200 immediately to acknowledge receipt
		return c.json({ success: true, message: "Webhook received and queued" }, 200);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Webhook processing error");
		// Return 500 so providers know to retry — a 200 would silently swallow the failure
		return c.json({ error: "Processing error" }, 500);
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

function safeParseWebhookBody(rawBody: string): unknown {
	try {
		return JSON.parse(rawBody);
	} catch {
		return { rawBody };
	}
}

function extractEventType(provider: string, payload: unknown): string {
	if (!payload || typeof payload !== "object") {
		return `${provider}.incoming`;
	}

	const body = payload as Record<string, unknown>;

	if (provider === "dodo" || provider === "stripe" || provider === "paddle") {
		if (typeof body["type"] === "string") return body["type"];
	}

	if (provider === "lemon_squeezy" || provider === "lemon-squeezy" || provider === "lemonsqueezy") {
		if (typeof body["meta"] === "object" && body["meta"] != null) {
			const meta = body["meta"] as Record<string, unknown>;
			if (typeof meta["event_name"] === "string") return meta["event_name"];
		}
	}

	return `${provider}.incoming`;
}

/**
 * Extract the provider's canonical event ID from the payload.
 * Used at ingress to populate webhook_logs.event_id so the unique
 * (provider, event_id) constraint can prevent duplicate processing.
 */
function extractEventId(provider: string, payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	const body = payload as Record<string, unknown>;

	// Stripe: top-level "id" field (e.g. "evt_xxx")
	if (provider === "stripe") {
		if (typeof body["id"] === "string") return body["id"];
	}

	// Dodo: top-level "id" field — prefer header webhook-id but we don't have it here;
	// fall back to body id if available
	if (provider === "dodo") {
		if (typeof body["id"] === "string") return body["id"];
	}

	// LemonSqueezy: meta.webhook_id
	if (provider === "lemon_squeezy" || provider === "lemon-squeezy" || provider === "lemonsqueezy") {
		if (typeof body["meta"] === "object" && body["meta"] != null) {
			const meta = body["meta"] as Record<string, unknown>;
			if (typeof meta["webhook_id"] === "string") return meta["webhook_id"];
		}
	}

	return null;
}
