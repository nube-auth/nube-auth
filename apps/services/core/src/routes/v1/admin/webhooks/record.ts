import { appQueries, appWebhookQueries, getDb, outboundWebhookLogQueries, sealSecret } from "@nube-auth/db";
import { id, idPatterns, serializeError } from "@nube-auth/shared";
import { UnsafeOutboundUrlError } from "@nube-auth/shared/outbound-url";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { requiredParam } from "../../../../utils/route-param.js";

import {
	CreateWebhookSchema,
	formatWebhook,
	generateSecret,
	log,
	MAX_WEBHOOKS_PER_APP,
	parseWebhookUrl,
	SUPPORTED_EVENTS,
	UpdateWebhookSchema,
} from "./shared.js";

const recordRoutes = new Hono();

/**
 * GET /health — aggregate delivery health for the last 7 days
 * (must come before /:webhookId to avoid route collision)
 */
recordRoutes.get("/health", async (c: Context) => {
	try {
		const appId = requiredParam(c, "appId");
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
recordRoutes.get("/", async (c: Context) => {
	try {
		const appId = requiredParam(c, "appId");
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
 * Returns the signing secret exactly once. The secret is stored for delivery signing.
 */
recordRoutes.post("/", async (c: Context) => {
	try {
		const appId = requiredParam(c, "appId");
		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const body = await c.req.json();
		const validated = CreateWebhookSchema.parse(body);
		const url = await parseWebhookUrl(validated.url);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const existing = await appWebhookQueries.findAllByAppId(db, app.id);
		if (existing.length >= MAX_WEBHOOKS_PER_APP) {
			return c.json({ error: `An app can have at most ${MAX_WEBHOOKS_PER_APP} webhook endpoints` }, 409);
		}

		const secret = generateSecret();

		const webhook = await appWebhookQueries.create(db, {
			public_id: id.appWebhook(),
			app_id: app.id,
			url,
			secret_enc: sealSecret(secret),
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
		if (error instanceof UnsafeOutboundUrlError) {
			return c.json({ error: error.message }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Create webhook error");
		return c.json({ error: "Failed to create webhook" }, 500);
	}
});

/**
 * PATCH /:webhookId — update a webhook endpoint
 */
recordRoutes.patch("/:webhookId", async (c: Context) => {
	try {
		const appId = requiredParam(c, "appId");
		const webhookId = requiredParam(c, "webhookId");

		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const body = await c.req.json();
		const validated = UpdateWebhookSchema.parse(body);
		const url = validated.url != null ? await parseWebhookUrl(validated.url) : undefined;

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const webhook = await appWebhookQueries.findByPublicId(db, webhookId);
		if (!webhook || webhook.app_id !== app.id) return c.json({ error: "Webhook not found" }, 404);

		const updated = await appWebhookQueries.update(db, webhook.id, {
			...(url != null ? { url } : {}),
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
		if (error instanceof UnsafeOutboundUrlError) {
			return c.json({ error: error.message }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Update webhook error");
		return c.json({ error: "Failed to update webhook" }, 500);
	}
});

/**
 * DELETE /:webhookId — deactivate a webhook endpoint
 */
recordRoutes.delete("/:webhookId", async (c: Context) => {
	try {
		const appId = requiredParam(c, "appId");
		const webhookId = requiredParam(c, "webhookId");

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
recordRoutes.post("/:webhookId/rotate-secret", async (c: Context) => {
	try {
		const appId = requiredParam(c, "appId");
		const webhookId = requiredParam(c, "webhookId");

		if (!appId || !idPatterns.app.test(appId)) return c.json({ error: "Invalid appId" }, 400);

		const db = getDb();
		const app = await appQueries.findByPublicId(db, appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const webhook = await appWebhookQueries.findByPublicId(db, webhookId);
		if (!webhook || webhook.app_id !== app.id) return c.json({ error: "Webhook not found" }, 404);

		const newSecret = generateSecret();
		await appWebhookQueries.update(db, webhook.id, { secret_enc: sealSecret(newSecret) });

		log.info({ webhookId: webhook.public_id }, "Webhook secret rotated");

		return c.json({ webhookId: webhook.public_id, secret: newSecret });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Rotate webhook secret error");
		return c.json({ error: "Failed to rotate webhook secret" }, 500);
	}
});

export { recordRoutes };
