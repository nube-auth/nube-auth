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
	providerConfigId: number;
	ipAddress: string;
}

export async function setupProcessWebhookWorker(): Promise<Worker<ProcessWebhookJobData>> {
	const { Worker: BullWorker } = await import("bullmq");
	const queueClient = new QueueClient();
	const queue = queueClient.getQueue("billing");

	// Dynamically import webhook handler to avoid circular dependencies
	const { processWebhook } = await import("../../core/src/billing/services/webhook-handler.js");

	return new BullWorker<ProcessWebhookJobData>(
		"billing",
		async (job) => {
			if (job.name !== "process-webhook") {
				return; // Skip non-webhook jobs
			}

			try {
				log.info(
					{
						jobId: job.id,
						provider: job.data.provider,
						ipAddress: job.data.ipAddress,
					},
					"Processing webhook"
				);

				const success = await processWebhook({
					provider: job.data.provider,
					rawBody: job.data.rawBody,
					signature: job.data.signature,
					providerConfigId: job.data.providerConfigId,
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
