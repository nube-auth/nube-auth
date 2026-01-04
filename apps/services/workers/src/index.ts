/**
 * Worker Manager
 *
 * Initializes and manages all async job workers
 * - Sets up PROCESS_PAYMENT worker
 * - Sets up PROCESS_WEBHOOK worker
 * - Sets up SYNC_LICENSE worker
 */

import { createLogger } from "@proofa/shared";
import type { Worker } from "bullmq";
import { setupProcessPaymentWorker } from "./process-payment.js";
import { setupProcessWebhookWorker } from "./process-webhook.js";
import { setupSyncLicenseWorker } from "./sync-license.js";

const log = createLogger("worker-manager");

let workers: Worker<any>[] = [];

/**
 * Initialize all workers
 */
export async function initializeWorkers(): Promise<void> {
	try {
		log.info("Initializing workers...");

		// Setup workers
		const paymentWorker = await setupProcessPaymentWorker();
		const webhookWorker = await setupProcessWebhookWorker();
		const licenseWorker = await setupSyncLicenseWorker();

		workers = [paymentWorker, webhookWorker, licenseWorker];

		log.info(
			{ workerCount: workers.length },
			"Workers initialized successfully",
		);

		// Handle worker errors
		workers.forEach((worker) => {
			worker.on("failed", (job, err) => {
				log.error(
					{
						jobId: job?.id,
						jobName: job?.name,
						error: err.message,
					},
					"Worker job failed",
				);
			});

			worker.on("error", (err) => {
				log.error(
					{ error: err.message },
					"Worker encountered error",
				);
			});
		});
	} catch (error) {
		log.error(
			{ error: (error as Error).message },
			"Failed to initialize workers",
		);
		throw error;
	}
}

/**
 * Gracefully shutdown all workers
 */
export async function shutdownWorkers(): Promise<void> {
	try {
		log.info("Shutting down workers...");

		for (const worker of workers) {
			await worker.close();
		}

		log.info("Workers shut down successfully");
	} catch (error) {
		log.error(
			{ error: (error as Error).message },
			"Error during worker shutdown",
		);
	}
}

/**
 * Get all active workers
 */
export function getWorkers(): Worker[] {
	return workers;
}
