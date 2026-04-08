/**
 * Outbound Webhook Dispatcher Worker
 *
 * Listens on the "outbound-webhooks" queue for "dispatch-outbound-webhook" jobs.
 */

import { createLogger, serializeError } from "@nube-auth/shared";
import type { Worker } from "bullmq";
import { QueueClient } from "@nube-auth/queue";

const log = createLogger("dispatch-outbound-webhook-worker");

export async function setupDispatchOutboundWebhookWorker(): Promise<Worker> {
	const { Worker: BullWorker } = await import("bullmq");
	const queueClient = new QueueClient();

	const { dispatchOutboundWebhook } = await import("./dispatch-outbound-webhook.js");

	return new BullWorker(
		"outbound-webhooks",
		async (job) => {
			try {
				log.info({ jobId: job.id, event: job.data.event, appId: job.data.appId }, "Processing outbound webhook dispatch");
				await dispatchOutboundWebhook(job.data, job.attemptsMade + 1);
				log.info({ jobId: job.id, event: job.data.event }, "Outbound webhook dispatch completed");
			} catch (error) {
				log.error(
					{ err: serializeError(error as Error), jobId: job.id, event: job.data.event },
					"Outbound webhook dispatch job failed",
				);
				throw error;
			}
		},
		{
			connection: queueClient.getConnectionOptions(),
			concurrency: 10,
		},
	);
}
