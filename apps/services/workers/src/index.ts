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

import { createLogger, serializeError } from "@nube-auth/shared";
import { createServer } from "node:http";
import { QueueClient } from "@nube-auth/queue";
import type { Worker } from "bullmq";
import { setupProcessPaymentWorker } from "./process-payment.js";
import { setupProcessWebhookWorker } from "./process-webhook.js";
import { setupSyncLicenseWorker } from "./sync-license.js";
import { startProcessRefundWorker } from "./process-refund.js";
import { setupSyncPlanWorker } from "./sync-plan-worker.js";
import { setupDispatchOutboundWebhookWorker } from "./dispatch-outbound-webhook-worker.js";
import { startWebhookRescueCron } from "./webhook-rescue-cron.js";

const log = createLogger("worker-manager");

let workers: Worker<any>[] = [];
let webhookRescueTimer: NodeJS.Timeout | null = null;
let healthQueueClient: QueueClient | null = null;

/**
 * Initialize all workers
 */
export async function initializeWorkers(): Promise<void> {
	try {
		log.info("Initializing workers...");

		// Shared Redis client used for health checks
		healthQueueClient = new QueueClient();

		// Verify Redis connectivity before starting workers.
		// This is informational — BullMQ handles reconnection internally,
		// so a failed ping at startup is a warning, not a fatal error.
		const redisReady = await healthQueueClient.ping();
		if (!redisReady) {
			log.warn("Redis not reachable at startup — workers will retry via BullMQ reconnection");
		} else {
			log.info("Redis connection verified");
		}

		// Setup workers
		const paymentWorker = await setupProcessPaymentWorker();
		const webhookWorker = await setupProcessWebhookWorker();
		const licenseWorker = await setupSyncLicenseWorker();
		const refundWorker = startProcessRefundWorker();
		const syncPlanWorker = await setupSyncPlanWorker();
		const outboundWebhookWorker = await setupDispatchOutboundWebhookWorker();

		workers = [paymentWorker, webhookWorker, licenseWorker, refundWorker, syncPlanWorker, outboundWebhookWorker];
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
				{
					err: serializeError(err as Error),
				},
				"Worker encountered error",
			);
		});
		});
	} catch (error) {
		log.error(
			{ err: error, error: (error as Error).message || String(error) },
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
	// Start health server immediately so Railway health checks pass during init
	const port = Number(process.env["PORT"] ?? 8080);
	let initialized = false;
	let initError: Error | null = null;

	const server = createServer(async (req, res) => {
		if (req.url === "/health") {
			if (!initialized) {
				const body = JSON.stringify({
					service: "workers",
					status: initError ? "error" : "starting",
					workers: 0,
					timestamp: new Date().toISOString(),
				});
				res.writeHead(initError ? 503 : 200, { "Content-Type": "application/json" });
				res.end(body);
				return;
			}
			const redisOk = healthQueueClient ? await healthQueueClient.ping() : false;
			const body = JSON.stringify({
				service: "workers",
				status: redisOk ? "ok" : "degraded",
				redis: redisOk ? "ok" : "unreachable",
				workers: workers.length,
				timestamp: new Date().toISOString(),
			});
			res.writeHead(redisOk ? 200 : 503, { "Content-Type": "application/json" });
			res.end(body);
		} else {
			res.writeHead(404);
			res.end();
		}
	});

	server.listen(port, () => {
		log.info({ port }, "Workers health server running");
	});

	try {
		await initializeWorkers();
		initialized = true;
		log.info("Workers service is running");
	} catch (error) {
		initError = error as Error;
		log.error(
			{ err: serializeError(error as Error) },
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
