/**
 * Worker Manager
 *
 * Initializes and manages all async job workers
 * - Sets up PROCESS_PAYMENT worker
 * - Sets up PROCESS_WEBHOOK worker
 * - Sets up SYNC_LICENSE worker
 * - Sets up PROCESS_REFUND worker
 * - Sets up SYNC_PLAN worker
 */

import { createLogger } from "@nube-auth/shared";
import { createServer } from "node:http";
import type { Worker } from "bullmq";
import { setupProcessPaymentWorker } from "./process-payment.js";
import { setupProcessWebhookWorker } from "./process-webhook.js";
import { setupSyncLicenseWorker } from "./sync-license.js";
import { startProcessRefundWorker } from "./process-refund.js";
import { setupSyncPlanWorker } from "./sync-plan-worker.js";
import { startWebhookRescueCron } from "./webhook-rescue-cron.js";

const log = createLogger("worker-manager");

let workers: Worker<any>[] = [];
let webhookRescueTimer: NodeJS.Timeout | null = null;

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
		const refundWorker = startProcessRefundWorker();
		const syncPlanWorker = await setupSyncPlanWorker();

		workers = [paymentWorker, webhookWorker, licenseWorker, refundWorker, syncPlanWorker];
		webhookRescueTimer = startWebhookRescueCron();

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

		if (webhookRescueTimer) {
			clearInterval(webhookRescueTimer);
			webhookRescueTimer = null;
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

/**
 * Service bootstrap
 * Starts all workers when this entrypoint runs.
 */
async function main(): Promise<void> {
	try {
		await initializeWorkers();

		// Minimal HTTP server so Railway health checks and nginx proxy have an endpoint
		const port = Number(process.env.PORT ?? 8080);
		const server = createServer((req, res) => {
			if (req.url === "/health" || req.url === "/") {
				const body = JSON.stringify({ service: "workers", status: "ok", timestamp: new Date().toISOString() });
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(body);
			} else {
				res.writeHead(404);
				res.end();
			}
		});
		server.listen(port, () => {
			log.info({ port }, "Workers health server running");
		});

		log.info("Workers service is running");
	} catch (error) {
		log.error(
			{ error: (error as Error).message },
			"Workers service failed to start",
		);
		process.exit(1);
	}
}

void main();

process.on("SIGINT", async () => {
	await shutdownWorkers();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	await shutdownWorkers();
	process.exit(0);
});
