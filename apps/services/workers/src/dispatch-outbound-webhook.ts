/**
 * Outbound Webhook Dispatcher
 *
 * For each job:
 *   1. Load all active webhook registrations for the app
 *   2. Filter to those subscribed to the event (or "*")
 *   3. For each matching endpoint: HMAC-sign the payload, POST it, log the result
 *
 * BullMQ handles retries (up to 5 attempts, exponential backoff).
 * The attempt number from the job is written to the log row so operators
 * can see retry history.
 */

import { createHmac, randomUUID } from "node:crypto";
import { createLogger, serializeError, id } from "@nube-auth/shared";
import { appWebhookQueries, outboundWebhookLogQueries, getDb } from "@nube-auth/db";

const log = createLogger("dispatch-outbound-webhook");

/** Maximum bytes of response body we keep in the log */
const MAX_RESPONSE_BODY_BYTES = 1024;
/** HTTP request timeout in ms */
const REQUEST_TIMEOUT_MS = 10_000;

export interface DispatchOutboundWebhookJobData {
	appId: number;
	event: string;
	payload: Record<string, unknown>;
}

/**
 * Sign the request body with HMAC-SHA256 and return the hex digest.
 */
function signPayload(secret: string, body: string): string {
	return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * POST a webhook payload to a single endpoint and return the HTTP status + body.
 * Throws on network errors or timeouts.
 */
async function postWebhook(
	url: string,
	body: string,
	signature: string,
	event: string,
): Promise<{ status: number; responseBody: string; durationMs: number }> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	const start = Date.now();

	try {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Nube-Signature": `sha256=${signature}`,
				"X-Nube-Event": event,
				"X-Nube-Delivery": randomUUID(),
			},
			body,
			signal: controller.signal,
		});

		const durationMs = Date.now() - start;
		const text = await res.text();
		return {
			status: res.status,
			responseBody: text.slice(0, MAX_RESPONSE_BODY_BYTES),
			durationMs,
		};
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Main handler — called by the BullMQ worker for each job.
 */
export async function dispatchOutboundWebhook(data: DispatchOutboundWebhookJobData, attempt: number): Promise<void> {
	const { appId, event, payload } = data;
	const db = getDb();

	const webhooks = await appWebhookQueries.findActiveByAppId(db, appId);
	if (webhooks.length === 0) return;

	const body = JSON.stringify(payload);

	const deliveries = webhooks.filter((wh) => {
		const subscribed = wh.events as string[];
		return subscribed.includes("*") || subscribed.includes(event);
	});

	if (deliveries.length === 0) return;

	const results = await Promise.all(
		deliveries.map(async (wh) => {
			const logPublicId = id.outboundWebhookLog();
			let logStatus: "success" | "failed" = "failed";
			let responseStatus: number | null = null;
			let responseBody: string | null = null;
			let durationMs: number | null = null;
			let errorMessage: string | null = null;

			try {
				const signature = signPayload(wh.secret, body);
				const result = await postWebhook(wh.url, body, signature, event);
				responseStatus = result.status;
				responseBody = result.responseBody;
				durationMs = result.durationMs;

				if (result.status >= 200 && result.status < 300) {
					logStatus = "success";
					log.info({ webhookId: wh.public_id, event, status: result.status }, "Outbound webhook delivered");
				} else {
					log.warn(
						{ webhookId: wh.public_id, event, status: result.status },
						"Outbound webhook received non-2xx response",
					);
					// Throw so BullMQ retries the job
					throw new Error(`Non-2xx response: ${result.status}`);
				}
			} catch (error) {
				const isAbort = (error as Error).name === "AbortError";
				errorMessage = isAbort
					? `Request timed out after ${REQUEST_TIMEOUT_MS}ms`
					: (error as Error).message.slice(0, 500);
				log.error(
					{ err: serializeError(error as Error), webhookId: wh.public_id, event },
					"Outbound webhook delivery failed",
				);
			}

			await outboundWebhookLogQueries.create(db, {
				public_id: logPublicId,
				webhook_id: wh.id,
				app_id: appId,
				event,
				payload,
				response_status: responseStatus ?? undefined,
				response_body: responseBody ?? undefined,
				status: logStatus,
				attempt,
				duration_ms: durationMs ?? undefined,
				error_message: errorMessage ?? undefined,
			});

			return logStatus === "success";
		}),
	);

	const failedCount = results.filter((ok) => !ok).length;
	if (failedCount > 0) {
		throw new Error(`Outbound webhook dispatch failed for ${failedCount}/${deliveries.length} endpoint(s)`);
	}
}
