/**
 * License Sync Worker
 *
 * Handles async license synchronization after purchase completion
 * - Updates user's app license based on purchased plan
 * - Sets license expiration date
 * - Notifies user of license activation
 *
 * Note: This is a placeholder for Phase 2 integration with license system
 */

import { createLogger, serializeError } from "@proofa/shared";
import type { Worker } from "bullmq";
import { getQueueClient } from "@proofa/queue";
import { getDb } from "@proofa/db";

const log = createLogger("sync-license-worker");

export interface SyncLicenseJobData {
	purchaseId: number;
	appId: number;
	subjectType: string;
	subjectId: number;
}

export async function setupSyncLicenseWorker(): Promise<Worker<SyncLicenseJobData>> {
	const { Worker: BullWorker } = await import("bullmq");
	const redisConnection = getQueueClient();
	return new BullWorker<SyncLicenseJobData>(
		"SYNC_LICENSE",
		async (job) => {
			try {
				log.info(
					{
						jobId: job.id,
						purchaseId: job.data.purchaseId,
						appId: job.data.appId,
					},
					"Syncing license",
				);

				const { purchaseId, appId, subjectType, subjectId } = job.data;
				const db = getDb();

			// Get purchase with related plan/price info via dynamic import
			const { PurchasesService } = await import("@proofa/core/billing");
				const purchase = await PurchasesService.getPurchase(purchaseId);
				if (!purchase) {
					log.error({ purchaseId }, "Purchase not found");
					throw new Error(`Purchase ${purchaseId} not found`);
				}

				// TODO: Phase 2 - Integrate with actual license system
				// This is a placeholder that just logs the sync
				// When implemented, this should:
				// 1. Query the plan_provider_prices to get plan details
				// 2. Query the plans table to get plan duration/tier
				// 3. Calculate license expiration date
				// 4. Update or create user license record
				// 5. Notify user via email/webhook of license activation

				log.info(
					{
						purchaseId,
						appId,
						subjectType,
						subjectId,
					},
					"License sync (Phase 2 integration pending)",
				);

				// For now, just return success
				// Real implementation will interact with license system
				return {
					success: true,
					purchaseId,
					message: "License sync scheduled for Phase 2 implementation",
				};
			} catch (error) {
				log.error(
					{
						err: serializeError(error as Error),
						jobId: job.id,
						purchaseId: job.data.purchaseId,
					},
					"License sync failed",
				);
				throw error;
			}
		},
		{
			connection: redisConnection,
			concurrency: 5,
		},
	);
}
