/**
 * Admin Webhook Routes
 *
 * Manage outbound webhook endpoints for an app.
 *
 * Mounted at: /v1/admin/apps/:appId/webhooks
 *
 * Endpoints:
 *   GET    /                        — list all webhook endpoints + health summary
 *   POST   /                        — register a new endpoint (returns secret once)
 *   PATCH  /:webhookId              — update url / events / description / active state
 *   DELETE /:webhookId              — soft-delete (deactivate) endpoint
 *   POST   /:webhookId/rotate-secret — regenerate HMAC signing secret
 *   POST   /:webhookId/test         — send a test event payload directly to the endpoint
 *   GET    /:webhookId/logs         — recent delivery log for a specific endpoint
 *   GET    /health                  — aggregate health stats for all app webhooks (last 7 days)
 */

import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { appQueries, appWebhookQueries, getDb, outboundWebhookLogQueries } from "@nube-auth/db";
import { createLogger, id, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { enqueueOutboundWebhook } from "../../../billing/queue.js";

const log = createLogger("admin-webhook-routes");

export const SUPPORTED_EVENTS = [
	"user.registered",
	"user.updated",
	"user.deleted",
	"session.created",
	"session.revoked",
	"session.expired",
	"session.all_revoked",
	"license.created",
	"license.upgraded",
	"license.downgraded",
	"license.canceled",
	"license.expired",
	"license.renewed",
	"license.reactivated",
	"license.trial_started",
	"license.trial_ended",
	"plan.created",
	"plan.updated",
	"plan.deleted",
	"subscription.created",
	"subscription.renewed",
	"subscription.canceled",
	"subscription.payment_failed",
	"subscription.refunded",
	"subscription.resumed",
	"oauth.connected",
	"oauth.disconnected",
] as const;

const CreateWebhookSchema = z.object({
	url: z.string().url().max(2048),
	events: z
		.array(z.string())
		.min(1)
		.refine((events) => events.every((e) => SUPPORTED_EVENTS.includes(e as any) || e === "*"), {
			message: "One or more unsupported event names",
		}),
	description: z.string().max(255).optional(),
});

const UpdateWebhookSchema = z.object({
	url: z.string().url().max(2048).optional(),
	events: z
		.array(z.string())
		.min(1)
		.refine((events) => events.every((e) => SUPPORTED_EVENTS.includes(e as any) || e === "*"), {
			message: "One or more unsupported event names",
		})
		.optional(),
	description: z.string().max(255).nullable().optional(),
	isActive: z.boolean().optional(),
});

function generateSecret(): string {
	return randomBytes(32).toString("hex");
}

function formatWebhook(
	wh: {
		id: number;
		public_id: string;
		url: string;
		events: unknown;
		description: string | null;
		is_active: boolean;
		created_at: Date;
		updated_at: Date;
	},
	secret?: string,
) {
	return {
		webhookId: wh.public_id,
		url: wh.url,
		events: wh.events as string[],
		description: wh.description,
		isActive: wh.is_active,
		createdAt: wh.created_at.toISOString(),
		updatedAt: wh.updated_at.toISOString(),
		...(secret != null ? { secret } : {}),
	};
}

export const webhooksRouter = new Hono();

/**
 * GET /health — aggregate delivery health for the last 7 days
 * (must come before /:webhookId to avoid route collision)
 */
webhooksRouter.get("/health", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		const stats = await outboundWebhookLogQueries.getHealthStats(db, app.id, since);

		return c.json({ health: { ...stats, window: "7d" } });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get webhook health error");
		return c.json({ error: "Failed to get webhook health" }, 500);
	}
});

/**
 * GET / — list all webhook endpoints for an app
 */
webhooksRouter.get("/", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const webhooks = await appWebhookQueries.findAllByAppId(db, app.id);

		return c.json({
			webhooks: webhooks.map((wh) => formatWebhook(wh)),
			total: webhooks.length,
			supportedEvents: SUPPORTED_EVENTS,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "List webhooks error");
		return c.json({ error: "Failed to list webhooks" }, 500);
	}
});

/**
 * POST / — register a new webhook endpoint
 * Returns the signing secret exactly once — it is not stored in readable form.
 */
webhooksRouter.post("/", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const body = await c.req.json();
		const validated = CreateWebhookSchema.parse(body);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const secret = generateSecret();

		const webhook = await appWebhookQueries.create(db, {
			public_id: id.appWebhook(),
			app_id: app.id,
			url: validated.url,
			secret,
			events: validated.events,
			description: validated.description ?? null,
			is_active: true,
		});

		log.info({ webhookId: webhook.public_id, appId: app.public_id }, "Webhook endpoint registered");

		// Return secret once — caller must store it, it won't be returned again
		return c.json({ webhook: formatWebhook(webhook, secret) }, 201);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json({ error: "Validation error", details: error.issues }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Create webhook error");
		return c.json({ error: "Failed to create webhook" }, 500);
	}
});

/**
 * PATCH /:webhookId — update a webhook endpoint
 */
webhooksRouter.patch("/:webhookId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const webhookId = c.req.param("webhookId");

		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const body = await c.req.json();
		const validated = UpdateWebhookSchema.parse(body);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const webhook = await appWebhookQueries.findByPublicId(db, webhookId);
		if (!webhook || webhook.app_id !== app.id) return c.json({ error: "Webhook not found" }, 404);

		const updated = await appWebhookQueries.update(db, webhook.id, {
			...(validated.url != null ? { url: validated.url } : {}),
			...(validated.events != null ? { events: validated.events } : {}),
			...(validated.description !== undefined ? { description: validated.description } : {}),
			...(validated.isActive != null ? { is_active: validated.isActive } : {}),
		});

		if (!updated) return c.json({ error: "Failed to update webhook" }, 500);

		log.info({ webhookId: updated.public_id }, "Webhook endpoint updated");

		return c.json({ webhook: formatWebhook(updated) });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json({ error: "Validation error", details: error.issues }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Update webhook error");
		return c.json({ error: "Failed to update webhook" }, 500);
	}
});

/**
 * DELETE /:webhookId — deactivate a webhook endpoint
 */
webhooksRouter.delete("/:webhookId", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const webhookId = c.req.param("webhookId");

		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const webhook = await appWebhookQueries.findByPublicId(db, webhookId);
		if (!webhook || webhook.app_id !== app.id) return c.json({ error: "Webhook not found" }, 404);

		await appWebhookQueries.deactivate(db, webhook.id);

		log.info({ webhookId: webhook.public_id }, "Webhook endpoint deactivated");

		return c.json({ message: "Webhook deactivated", webhookId: webhook.public_id });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Delete webhook error");
		return c.json({ error: "Failed to delete webhook" }, 500);
	}
});

/**
 * POST /:webhookId/rotate-secret — generate a new HMAC signing secret
 * Returns the new secret exactly once.
 */
webhooksRouter.post("/:webhookId/rotate-secret", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const webhookId = c.req.param("webhookId");

		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const webhook = await appWebhookQueries.findByPublicId(db, webhookId);
		if (!webhook || webhook.app_id !== app.id) return c.json({ error: "Webhook not found" }, 404);

		const newSecret = generateSecret();
		await appWebhookQueries.update(db, webhook.id, { secret: newSecret });

		log.info({ webhookId: webhook.public_id }, "Webhook secret rotated");

		return c.json({ webhookId: webhook.public_id, secret: newSecret });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Rotate webhook secret error");
		return c.json({ error: "Failed to rotate webhook secret" }, 500);
	}
});

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
webhooksRouter.post("/:webhookId/test", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const webhookId = c.req.param("webhookId");

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
		if (!webhook.secret) return c.json({ error: "Webhook has no signing secret" }, 422);

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
		const signature = `sha256=${createHmac("sha256", webhook.secret).update(bodyStr).digest("hex")}`;

		const start = Date.now();
		let responseStatus: number | null = null;
		let responseBody: string | null = null;
		let success = false;
		let errorMessage: string | null = null;

		try {
			const res = await fetch(webhook.url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Nube-Signature": signature,
					"X-Nube-Event": event,
					"X-Nube-Delivery": deliveryId,
				},
				body: bodyStr,
				signal: AbortSignal.timeout(10_000),
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
webhooksRouter.post("/:webhookId/logs/:logId/resend", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const webhookId = c.req.param("webhookId");
		const logId = c.req.param("logId");

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

/**
 * GET /:webhookId/logs — recent delivery logs for a specific endpoint
 */
webhooksRouter.get("/:webhookId/logs", async (c: Context) => {
	try {
		const appId = c.req.param("appId");
		const webhookId = c.req.param("webhookId");
		const limitParam = c.req.query("limit");
		const limit = Math.min(Number(limitParam ?? 50), 200);

		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const webhook = await appWebhookQueries.findByPublicId(db, webhookId);
		if (!webhook || webhook.app_id !== app.id) return c.json({ error: "Webhook not found" }, 404);

		const logs = await outboundWebhookLogQueries.findByWebhookId(db, webhook.id, limit);

		return c.json({
			logs: logs.map((entry) => ({
				logId: entry.public_id,
				event: entry.event,
				status: entry.status,
				responseStatus: entry.response_status,
				durationMs: entry.duration_ms,
				attempt: entry.attempt,
				errorMessage: entry.error_message,
				createdAt: entry.created_at.toISOString(),
			})),
			total: logs.length,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Get webhook logs error");
		return c.json({ error: "Failed to get webhook logs" }, 500);
	}
});
