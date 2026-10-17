import { createHmac, randomUUID } from "node:crypto";
import { appQueries, appWebhookQueries, getDb, openSecret, outboundWebhookLogQueries } from "@nube-auth/db";
import { id, idPatterns, serializeError } from "@nube-auth/shared";
import { postOutboundWebhook } from "@nube-auth/shared/outbound-url";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { enqueueOutboundWebhook } from "../../../../billing/queue.js";
import { env } from "../../../../config/env.js";
import { requiredParam } from "../../../../utils/route-param.js";

import { log, SUPPORTED_EVENTS } from "./shared.js";

const deliveryRoutes = new Hono();

/** Sample payloads for each supported event type */
const TEST_PAYLOADS: Record<string, Record<string, unknown>> = {
	"user.registered": {
		userId: "USER0abc123xyz",
		email: "alice@example.com",
		name: "Alice Smith",
		createdAt: new Date().toISOString(),
	},
	"user.updated": {
		userId: "USER0abc123xyz",
		email: "alice@example.com",
		name: "Alice Smith",
		updatedAt: new Date().toISOString(),
		changes: ["name"],
	},
	"user.deleted": {
		userId: "USER0abc123xyz",
		email: "alice@example.com",
		deletedAt: new Date().toISOString(),
	},
	"session.created": {
		sessionId: "SES0abc123xyz",
		userId: "USER0abc123xyz",
		ipAddress: "203.0.113.42",
		userAgent: "Mozilla/5.0 (Test Event)",
		createdAt: new Date().toISOString(),
	},
	"session.revoked": {
		sessionId: "SES0abc123xyz",
		userId: "USER0abc123xyz",
		revokedAt: new Date().toISOString(),
		reason: "user_request",
	},
	"session.expired": {
		sessionId: "SES0abc123xyz",
		userId: "USER0abc123xyz",
		expiredAt: new Date().toISOString(),
	},
	"session.all_revoked": {
		userId: "USER0abc123xyz",
		revokedAt: new Date().toISOString(),
		sessionCount: 3,
	},
	"license.created": {
		licenseId: "LIC0abc123xyz",
		userId: "USER0abc123xyz",
		planId: "PLN0abc123xyz",
		planName: "Pro",
		status: "active",
		createdAt: new Date().toISOString(),
	},
	"license.upgraded": {
		licenseId: "LIC0abc123xyz",
		userId: "USER0abc123xyz",
		fromPlan: "Starter",
		toPlan: "Pro",
		upgradedAt: new Date().toISOString(),
	},
	"license.downgraded": {
		licenseId: "LIC0abc123xyz",
		userId: "USER0abc123xyz",
		fromPlan: "Pro",
		toPlan: "Starter",
		downgradedAt: new Date().toISOString(),
	},
	"license.canceled": {
		licenseId: "LIC0abc123xyz",
		userId: "USER0abc123xyz",
		planName: "Pro",
		canceledAt: new Date().toISOString(),
		endsAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
	},
	"license.expired": {
		licenseId: "LIC0abc123xyz",
		userId: "USER0abc123xyz",
		planName: "Pro",
		expiredAt: new Date().toISOString(),
	},
	"license.renewed": {
		licenseId: "LIC0abc123xyz",
		userId: "USER0abc123xyz",
		planName: "Pro",
		renewedAt: new Date().toISOString(),
		nextRenewalAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
	},
	"license.reactivated": {
		licenseId: "LIC0abc123xyz",
		userId: "USER0abc123xyz",
		planName: "Pro",
		reactivatedAt: new Date().toISOString(),
	},
	"license.trial_started": {
		licenseId: "LIC0abc123xyz",
		userId: "USER0abc123xyz",
		planName: "Pro",
		trialStartedAt: new Date().toISOString(),
		trialEndsAt: new Date(Date.now() + 14 * 86400_000).toISOString(),
	},
	"license.trial_ended": {
		licenseId: "LIC0abc123xyz",
		userId: "USER0abc123xyz",
		planName: "Pro",
		trialEndedAt: new Date().toISOString(),
		converted: false,
	},
	"plan.created": {
		planId: "PLN0abc123xyz",
		name: "Pro",
		price: 2900,
		currency: "USD",
		interval: "month",
		createdAt: new Date().toISOString(),
	},
	"plan.updated": {
		planId: "PLN0abc123xyz",
		name: "Pro",
		updatedAt: new Date().toISOString(),
		changes: ["price"],
	},
	"plan.deleted": {
		planId: "PLN0abc123xyz",
		name: "Pro",
		deletedAt: new Date().toISOString(),
	},
	"subscription.created": {
		subscriptionId: "SUB0abc123xyz",
		licenseId: "LIC0abc123xyz",
		userId: "USER0abc123xyz",
		status: "active",
		billingPeriodEnd: new Date(Date.now() + 30 * 86400_000).toISOString(),
		createdAt: new Date().toISOString(),
	},
	"subscription.renewed": {
		subscriptionId: "SUB0abc123xyz",
		licenseId: "LIC0abc123xyz",
		status: "active",
		billingPeriodEnd: new Date(Date.now() + 30 * 86400_000).toISOString(),
		renewedAt: new Date().toISOString(),
	},
	"subscription.canceled": {
		subscriptionId: "SUB0abc123xyz",
		licenseId: "LIC0abc123xyz",
		status: "canceled",
		canceledAt: new Date().toISOString(),
		cancelAtPeriodEnd: true,
	},
	"subscription.payment_failed": {
		subscriptionId: "SUB0abc123xyz",
		licenseId: "LIC0abc123xyz",
		status: "past_due",
		failedAt: new Date().toISOString(),
		gracePeriodEnd: new Date(Date.now() + 7 * 86400_000).toISOString(),
	},
	"subscription.refunded": {
		subscriptionId: "SUB0abc123xyz",
		licenseId: "LIC0abc123xyz",
		status: "refunded",
		refundedAt: new Date().toISOString(),
	},
	"subscription.resumed": {
		subscriptionId: "SUB0abc123xyz",
		licenseId: "LIC0abc123xyz",
		status: "active",
		resumedAt: new Date().toISOString(),
	},
	"oauth.connected": {
		userId: "USER0abc123xyz",
		provider: "github",
		providerUserId: "12345678",
		connectedAt: new Date().toISOString(),
	},
	"oauth.disconnected": {
		userId: "USER0abc123xyz",
		provider: "github",
		disconnectedAt: new Date().toISOString(),
	},
};

const TestEventSchema = z.object({
	event: z.enum(SUPPORTED_EVENTS),
});

/**
 * POST /:webhookId/test — send a test delivery immediately (synchronous, bypasses queue)
 */
deliveryRoutes.post("/:webhookId/test", async (c: Context) => {
	try {
		const appId = requiredParam(c, "appId");
		const webhookId = requiredParam(c, "webhookId");

		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const body = await c.req.json().catch(() => null);
		const parsed = TestEventSchema.safeParse(body);
		if (!parsed.success) return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);

		const { event } = parsed.data;

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const webhook = await appWebhookQueries.findByPublicId(db, webhookId);
		if (!webhook || webhook.app_id !== app.id) return c.json({ error: "Webhook not found" }, 404);
		if (!webhook.secret_enc) return c.json({ error: "Webhook has no signing secret" }, 422);
		const signingSecret = openSecret(webhook.secret_enc);

		const deliveryId = randomUUID();
		const sampleData = TEST_PAYLOADS[event] ?? {};
		const payload = {
			id: deliveryId,
			event,
			appId,
			timestamp: new Date().toISOString(),
			test: true,
			data: sampleData,
		};

		const bodyStr = JSON.stringify(payload);
		const signature = `sha256=${createHmac("sha256", signingSecret).update(bodyStr).digest("hex")}`;

		const start = Date.now();
		let responseStatus: number | null = null;
		let responseBody: string | null = null;
		let success = false;
		let errorMessage: string | null = null;

		try {
			const res = await postOutboundWebhook(webhook.url, {
				headers: {
					"Content-Type": "application/json",
					"X-Nube-Signature": signature,
					"X-Nube-Event": event,
					"X-Nube-Delivery": deliveryId,
				},
				body: bodyStr,
				timeoutMs: 10_000,
				allowInsecureHttp: env.IS_DEVELOPMENT,
			});
			responseStatus = res.status;
			responseBody = (await res.text()).slice(0, 1024);
			success = res.status >= 200 && res.status < 300;
		} catch (fetchError) {
			errorMessage = (fetchError as Error).message ?? "Network error";
		}

		const durationMs = Date.now() - start;

		await outboundWebhookLogQueries.create(db, {
			public_id: id.webhookLog(),
			webhook_id: webhook.id,
			app_id: app.id,
			event,
			payload,
			response_status: responseStatus,
			response_body: responseBody,
			status: success ? "success" : "failed",
			attempt: 0,
			duration_ms: durationMs,
			error_message: errorMessage,
		});

		return c.json({
			success,
			event,
			durationMs,
			responseStatus,
			deliveryId,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Send test webhook event error");
		return c.json({ error: "Failed to send test event" }, 500);
	}
});

/**
 * POST /:webhookId/logs/:logId/resend — re-enqueue a specific delivery
 */
deliveryRoutes.post("/:webhookId/logs/:logId/resend", async (c: Context) => {
	try {
		const appId = requiredParam(c, "appId");
		const webhookId = requiredParam(c, "webhookId");
		const logId = requiredParam(c, "logId");

		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const webhook = await appWebhookQueries.findByPublicId(db, webhookId);
		if (!webhook || webhook.app_id !== app.id) return c.json({ error: "Webhook not found" }, 404);
		if (!webhook.is_active) return c.json({ error: "Webhook endpoint is disabled" }, 422);

		const entry = await outboundWebhookLogQueries.findByPublicId(db, logId);
		if (!entry || entry.webhook_id !== webhook.id) return c.json({ error: "Log entry not found" }, 404);

		await enqueueOutboundWebhook({
			appId: app.id,
			event: entry.event,
			payload: entry.payload as Record<string, unknown>,
		});

		log.info({ logId, webhookId, appId }, "Outbound webhook re-enqueued for resend");
		return c.json({ queued: true });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Resend webhook error");
		return c.json({ error: "Failed to resend webhook" }, 500);
	}
});

export { deliveryRoutes };
