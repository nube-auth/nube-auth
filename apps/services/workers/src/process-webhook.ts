/**
 * Webhook Processing Worker
 *
 * Handles async webhook event processing
 */

import { createLogger, serializeError } from "@proofa/shared";
import type { Worker } from "bullmq";
import { QueueClient } from "@proofa/queue";

const log = createLogger("process-webhook-worker");

export interface ProcessWebhookJobData {
	provider: string;
	rawBody: string;
	signature: string;
	providerConfigId?: number;
	ipAddress: string;
	webhookLogId?: number;
}

export async function setupProcessWebhookWorker(): Promise<Worker<ProcessWebhookJobData>> {
	const { Worker: BullWorker } = await import("bullmq");
	const queueClient = new QueueClient();
	const queue = queueClient.getQueue("billing");

	// Dynamically import webhook handler to avoid circular dependencies
	const { processWebhook } = await import("@proofa/core/billing/services/webhook-handler");  
	const { WebhookLoggingService } = await import("@proofa/core/billing/services/webhook-logging");

	return new BullWorker<ProcessWebhookJobData>(
		"billing",
		async (job) => {
			if (job.name !== "process-webhook") {
				return; // Skip non-webhook jobs
			}

			try {
				if (job.data.webhookLogId != null) {
					await WebhookLoggingService.markPicked(job.data.webhookLogId);
				}

				log.info(
					{
						jobId: job.id,
						provider: job.data.provider,
						ipAddress: job.data.ipAddress,
						webhookLogId: job.data.webhookLogId,
					},
					"Processing webhook"
				);

				const success = await processWebhook({
					provider: job.data.provider,
					rawBody: job.data.rawBody,
					signature: job.data.signature,
					...(job.data.webhookLogId != null ? { webhookLogId: job.data.webhookLogId } : {}),
					...(job.data.providerConfigId != null ? { providerConfigId: job.data.providerConfigId } : {}),
				});

				if (!success) {
					throw new Error("Webhook processing returned false");
				}

				log.info(
					{
						jobId: job.id,
						provider: job.data.provider,
					},
					"Webhook processed successfully"
				);

				return { success: true };
			} catch (error) {
				log.error(
					{
						err: serializeError(error as Error),
						jobId: job.id,
						provider: job.data.provider,
					},
					"Webhook processing failed"
				);
				throw error;
			}
		},
		{
			connection: queue.client as any,
			concurrency: 5,
		}
	);
}
