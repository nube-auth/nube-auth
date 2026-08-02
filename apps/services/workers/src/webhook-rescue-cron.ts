/**
 * Webhook Rescue Cron
 *
 * Periodically scans webhook logs for retryable stuck records and
 * re-enqueues them to the billing queue for processing.
 */

import { and, asc, eq, getDb, inArray, lte, sql, webhook_logs } from "@nube-auth/db";
import { QueueClient } from "@nube-auth/queue";
import { createLogger, serializeError } from "@nube-auth/shared";

const log = createLogger("webhook-rescue-cron");

const RESCUE_INTERVAL_MS = Number(process.env["WEBHOOK_RESCUE_INTERVAL_MS"] || 600_000);
const RESCUE_STALE_MS = Number(process.env["WEBHOOK_RESCUE_STALE_MS"] || 1_800_000);
const RESCUE_BATCH_SIZE = Number(process.env["WEBHOOK_RESCUE_BATCH_SIZE"] || 25);
const RESCUE_MAX_RETRIES = Number(process.env["WEBHOOK_RESCUE_MAX_RETRIES"] || 5);

const RETRYABLE_STATUSES = ["not_started", "picked", "failed", "skipped"] as const;

interface RescueCandidate {
	id: number;
	provider: string;
	request_body: unknown;
	signature: string | null;
	ip_address: string | null;
	status: string;
	notes: string | null;
	retry_count: number;
}

export function startWebhookRescueCron(): NodeJS.Timeout {
	log.info(
		{
			intervalMs: RESCUE_INTERVAL_MS,
			staleMs: RESCUE_STALE_MS,
			batchSize: RESCUE_BATCH_SIZE,
			maxRetries: RESCUE_MAX_RETRIES,
		},
		"Starting webhook rescue cron",
	);

	const timer = setInterval(() => {
		void rescueWebhookLogs();
	}, RESCUE_INTERVAL_MS);

	// Allow process to exit cleanly if this is the only active handle.
	timer.unref();

	return timer;
}

async function rescueWebhookLogs(): Promise<void> {
	const db = getDb();
	const staleBefore = new Date(Date.now() - RESCUE_STALE_MS);

	try {
		const candidates = await db
			.select({
				id: webhook_logs.id,
				provider: webhook_logs.provider,
				request_body: webhook_logs.request_body,
				signature: webhook_logs.signature,
				ip_address: webhook_logs.ip_address,
				status: webhook_logs.status,
				notes: webhook_logs.notes,
				retry_count: webhook_logs.retry_count,
			})
			.from(webhook_logs)
			.where(
				and(
					inArray(webhook_logs.status, [...RETRYABLE_STATUSES]),
					lte(webhook_logs.updated_at, staleBefore),
					lte(webhook_logs.retry_count, RESCUE_MAX_RETRIES - 1),
				),
			)
			.orderBy(asc(webhook_logs.updated_at))
			.limit(RESCUE_BATCH_SIZE);

		const filtered = candidates.filter(isRetryableCandidate);
		if (filtered.length === 0) {
			return;
		}

		const queueClient = new QueueClient();
		const queue = queueClient.getQueue<any>("billing");
		let rescuedCount = 0;

		for (const candidate of filtered) {
			const rawBody = toRawBody(candidate.request_body);
			if (!candidate.signature || !rawBody) {
				await db
					.update(webhook_logs)
					.set({
						status: "failed",
						error_message: "Rescue cron skipped: missing signature or body",
						updated_at: new Date(),
					})
					.where(eq(webhook_logs.id, candidate.id));
				continue;
			}

			await queue.add(
				"process-webhook",
				{
					provider: candidate.provider,
					rawBody,
					signature: candidate.signature,
					ipAddress: candidate.ip_address || "unknown",
					webhookLogId: candidate.id,
				},
				{
					jobId: `process-webhook-log-${candidate.id}`,
					attempts: 3,
					backoff: {
						type: "exponential",
						delay: 2000,
					},
				},
			);

			await db
				.update(webhook_logs)
				.set({
					status: "not_started",
					retry_count: sql`${webhook_logs.retry_count} + 1`,
					last_retry_at: new Date(),
					notes: "Auto requeued by webhook rescue cron",
					updated_at: new Date(),
				})
				.where(eq(webhook_logs.id, candidate.id));

			rescuedCount += 1;
		}

		log.info({ rescuedCount, scannedCount: candidates.length }, "Webhook rescue cron re-enqueued stuck webhooks");
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Webhook rescue cron run failed");
	}
}

function isRetryableCandidate(candidate: RescueCandidate): boolean {
	if (candidate.status !== "skipped") return true;

	const note = (candidate.notes || "").toLowerCase();
	if (note.includes("duplicate event skipped")) return false;
	if (note.includes("no payment details extracted")) return false;

	return true;
}

function toRawBody(body: unknown): string {
	if (typeof body === "string") return body;

	if (body && typeof body === "object") {
		const maybeRaw = (body as Record<string, unknown>)["rawBody"];
		if (typeof maybeRaw === "string" && maybeRaw.length > 0) {
			return maybeRaw;
		}
	}

	try {
		return JSON.stringify(body ?? {});
	} catch {
		return "";
	}
}
