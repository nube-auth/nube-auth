/**
 * Payment Processing Worker (No-op)
 *
 * Webhooks are the source of truth for payment confirmation.
 * The webhook handler (process-webhook → webhook-processor → createPurchaseRecords)
 * handles all purchase/license/transaction creation when a payment succeeds.
 *
 * This worker exists only as a dead-letter consumer to prevent unprocessed
 * jobs from accumulating in the PROCESS_PAYMENT queue.
 */

import { QueueClient } from "@nube-auth/queue";
import { createLogger } from "@nube-auth/shared";
import type { Worker } from "bullmq";

const log = createLogger("process-payment-worker");

export interface ProcessPaymentJobData {
	type: "PROCESS_PAYMENT";
	purchaseId: number;
	providerSessionId: string;
	timestamp: number;
}

export async function setupProcessPaymentWorker(): Promise<Worker<ProcessPaymentJobData>> {
	const { Worker: BullWorker } = await import("bullmq");
	const queueClient = new QueueClient();
	return new BullWorker<ProcessPaymentJobData>(
		"PROCESS_PAYMENT",
		async (job) => {
			// No-op: Webhooks handle payment confirmation and license creation.
			// See webhook-processor.ts → createPurchaseRecords() for the real flow.
			log.info(
				{ jobId: job.id, purchaseId: job.data.purchaseId },
				"Payment job acknowledged (no-op — webhooks are source of truth)",
			);
			return { success: true, purchaseId: job.data.purchaseId };
		},
		{
			connection: queueClient.getConnectionOptions(),
			concurrency: 5,
		},
	);
}
