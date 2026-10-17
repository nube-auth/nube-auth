import { appQueries, appWebhookQueries, getDb, outboundWebhookLogQueries } from "@nube-auth/db";
import { idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { requiredParam } from "../../../../utils/route-param.js";

import { log } from "./shared.js";

const logRoutes = new Hono();

/**
 * GET /:webhookId/logs — recent delivery logs for a specific endpoint
 */
logRoutes.get("/:webhookId/logs", async (c: Context) => {
	try {
		const appId = requiredParam(c, "appId");
		const webhookId = requiredParam(c, "webhookId");
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

export { logRoutes };
