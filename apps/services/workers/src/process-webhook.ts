/**
 * Webhook Processing Worker
 *
 * Handles async webhook event processing
 * - Verifies webhook signature
 * - Routes to provider-specific handler
 * - Creates payment transactions
 * - Updates purchase status
 */

import { createLogger, serializeError } from "@proofa/shared";
import type { Worker } from "bullmq";
import { getQueueClient } from "@proofa/queue";

const log = createLogger("process-webhook-worker");

export interface ProcessWebhookJobData {
	provider: "stripe" | "lemon_squeezy" | "paddle";
	rawBody: string;
	signature: string;
	providerConfigId: number;
}

export async function setupProcessWebhookWorker(): Promise<Worker<ProcessWebhookJobData>> {
	const { Worker: BullWorker } = await import("bullmq");
	const redisConnection = getQueueClient();
	return new BullWorker<ProcessWebhookJobData>(
		"PROCESS_WEBHOOK",
		async (job) => {
			try {
				log.info(
					{
						jobId: job.id,
						provider: job.data.provider,
						configId: job.data.providerConfigId,
					},
					"Processing webhook",
				);

				const { provider, rawBody, signature, providerConfigId } = job.data;

			// Handle webhook via dynamic import
			const { WebhookHandler } = await import("@proofa/core/billing");
			const result = await WebhookHandler.handleWebhook(
				provider,
				rawBody,
				signature,
			);

				log.info(
					{
						provider,
						configId: providerConfigId,
						eventType: result?.eventType,
					},
					"Webhook processed successfully",
				);

				return { success: true, provider, eventType: result?.eventType };
			} catch (error) {
				log.error(
					{
						err: serializeError(error as Error),
						jobId: job.id,
						provider: job.data.provider,
					},
					"Webhook processing failed",
				);
				throw error;
			}
		},
		{
			connection: redisConnection,
			concurrency: 10,
		},
	);
}
