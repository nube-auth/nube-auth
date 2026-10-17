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
import { Hono } from "hono";
import { deliveryRoutes } from "./delivery.js";
import { logRoutes } from "./logs.js";
import { recordRoutes } from "./record.js";

export const webhooksRouter = new Hono();

webhooksRouter.route("/", recordRoutes);
webhooksRouter.route("/", deliveryRoutes);
webhooksRouter.route("/", logRoutes);
