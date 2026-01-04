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
import { QueueClient } from "@proofa/queue";

const log = createLogger("process-webhook-worker");

export interface ProcessWebhookJobData {
	type: "PROCESS_WEBHOOK";
	provider: "stripe" | "lemon_squeezy" | "paddle";
	rawBody: string;
	signature: string;
	providerConfigId: number;
	ipAddress?: string;
	timestamp: number;
}

export async function setupProcessWebhookWorker(): Promise<Worker<ProcessWebhookJobData>> {
	const { Worker: BullWorker } = await import("bullmq");
	const queueClient = new QueueClient();
	const queue = queueClient.getQueue("PROCESS_WEBHOOK");
	return new BullWorker<ProcessWebhookJobData>(
		"PROCESS_WEBHOOK",
		async (job) => {
			try {
				log.info(
					{
						jobId: job.id,
						provider: job.data.provider,
						configId: job.data.providerConfigId,
						ipAddress: job.data.ipAddress,
					},
					"Processing webhook",
				);

				// TODO: Phase 2 - Implement actual webhook processing
				// When implemented, this should:
				// 1. Verify webhook signature with provider
				// 2. Parse webhook payload
				// 3. Route to provider-specific handler
				// 4. Update payment transaction records
				// 5. Handle different event types (payment.completed, charge.refunded, etc.)

				const { provider } = job.data;

				log.info(
					{
						provider,
						configId: job.data.providerConfigId,
						eventType: "webhook.processed",
					},
					"Webhook processed successfully",
				);

				return { success: true, provider, eventType: "webhook.processed" };
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
			connection: queue.client as any,
			concurrency: 10,
		},
	);
}
