/**
 * Sync Plan to Providers Worker
 *
 * Listens on the dedicated "sync-plan" queue for "sync-plan-to-providers" jobs
 * and delegates to the sync-plan handler.
 *
 * Uses a separate queue (not "billing") to avoid competing with the
 * process-webhook worker, which also listens on "billing" and would silently
 * consume and discard sync jobs without processing them.
 */

import { QueueClient } from "@nube-auth/queue";
import { createLogger, serializeError } from "@nube-auth/shared";
import type { Worker } from "bullmq";

const log = createLogger("sync-plan-worker-setup");

export async function setupSyncPlanWorker(): Promise<Worker> {
	const { Worker: BullWorker } = await import("bullmq");
	const queueClient = new QueueClient();

	// Dynamically import to avoid circular dependencies
	const { syncPlanToProviders } = await import("./sync-plan-to-providers.js");

	return new BullWorker(
		"sync-plan",
		async (job) => {
			try {
				log.info({ jobId: job.id, planId: job.data.planId }, "Processing sync-plan-to-providers job");

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
			connection: queueClient.getConnectionOptions(),
			concurrency: 3,
		},
	);
}
