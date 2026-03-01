/**
 * Sync Plan to Providers Worker
 *
 * Listens on the "billing" queue for "sync-plan-to-providers" jobs
 * and delegates to the sync-plan handler.
 */

import { createLogger, serializeError } from "@proofa/shared";
import type { Worker } from "bullmq";
import { QueueClient } from "@proofa/queue";

const log = createLogger("sync-plan-worker-setup");

export async function setupSyncPlanWorker(): Promise<Worker> {
	const { Worker: BullWorker } = await import("bullmq");
	const queueClient = new QueueClient();
	const queue = queueClient.getQueue("billing");

	// Dynamically import to avoid circular dependencies
	const { syncPlanToProviders } = await import("./sync-plan-to-providers.js");

	return new BullWorker(
		"billing",
		async (job) => {
			if (job.name !== "sync-plan-to-providers") {
				return; // Skip non-sync-plan jobs
			}

			try {
				log.info(
					{ jobId: job.id, planId: job.data.planId },
					"Processing sync-plan-to-providers job",
				);

				const result = await syncPlanToProviders(job.data);

				log.info(
					{
						jobId: job.id,
						planId: job.data.planId,
						success: result.success,
						syncedCount: result.synced.length,
						failedCount: result.failed.length,
					},
					"Sync-plan job completed",
				);

				return result;
			} catch (error) {
				log.error(
					{
						err: serializeError(error as Error),
						jobId: job.id,
						planId: job.data.planId,
					},
					"Sync-plan job failed",
				);
				throw error;
			}
		},
		{
			connection: queue.client as any,
			concurrency: 3,
		},
	);
}
