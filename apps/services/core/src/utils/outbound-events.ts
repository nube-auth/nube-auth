/**
 * Outbound Webhook Event Dispatcher
 *
 * Fires a fire-and-forget outbound webhook event for an app.
 * Callers should not await errors from this — the queue worker
 * handles retries and delivery logging automatically.
 */

import type { Database } from "@nube-auth/db";
import { appQueries } from "@nube-auth/db";
import { createLogger, serializeError, id } from "@nube-auth/shared";
import { enqueueOutboundWebhook } from "../billing/queue.js";

const log = createLogger("outbound-events");

/**
 * Fire an outbound webhook event for an app.
 *
 * @param db - Database client (used to resolve publicId for the envelope)
 * @param appId - Internal integer app ID
 * @param event - Event name e.g. "user.registered"
 * @param data - Event-specific payload (will be wrapped in a standard envelope)
 */
export async function fireWebhookEvent(
	db: Database,
	appId: number,
	event: string,
	data: Record<string, unknown>,
): Promise<void> {
	const app = await appQueries.findByInternalId_(db, appId);
	if (!app) return;

	const payload: Record<string, unknown> = {
		id: id.outboundWebhookLog(),
		event,
		appId: app.public_id,
		timestamp: new Date().toISOString(),
		data,
	};

	enqueueOutboundWebhook({ appId, event, payload }).catch((err: unknown) => {
		log.error({ err: serializeError(err as Error), event, appId }, "Failed to enqueue outbound webhook event");
	});
}
