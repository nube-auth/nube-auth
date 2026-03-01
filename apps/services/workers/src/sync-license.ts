/**
 * License Sync Worker
 *
 * Ensures a license record exists for a completed purchase.
 * This is an idempotent fallback — the webhook flow (createPurchaseRecords)
 * already creates licenses on payment success. This worker handles:
 * - Retry after transient failures
 * - Manual re-sync from admin actions
 * - Edge cases where webhook processing partially succeeded
 */

import { createLogger, serializeError } from "@proofa/shared";
import type { Worker } from "bullmq";
import { QueueClient } from "@proofa/queue";
import { getDb, eq, purchases, plans, licenses } from "@proofa/db";
import { prices as pricesTable } from "@proofa/db/schema";
import { licenseQueries } from "@proofa/db";

const log = createLogger("sync-license-worker");

export interface SyncLicenseJobData {
	type: "SYNC_LICENSE";
	purchaseId: number;
	appId: number;
	subjectType: string;
	subjectId: number;
	timestamp: number;
}

export async function setupSyncLicenseWorker(): Promise<Worker<SyncLicenseJobData>> {
	const { Worker: BullWorker } = await import("bullmq");
	const queueClient = new QueueClient();
	const queue = queueClient.getQueue("SYNC_LICENSE");

	// Dynamically import licenseManager to avoid circular dependencies
	const { licenseManager } = await import(
		"../../core/src/billing/services/license-manager.js"
	);

	return new BullWorker<SyncLicenseJobData>(
		"SYNC_LICENSE",
		async (job) => {
			const { purchaseId, appId, subjectType, subjectId } = job.data;

			log.info(
				{ jobId: job.id, purchaseId, appId, subjectType, subjectId },
				"Syncing license for purchase",
			);

			const db = getDb();

			// 1. Look up the purchase
			const purchase = await db.query.purchases.findFirst({
				where: eq(purchases.id, purchaseId),
				columns: { id: true, price_id: true, status: true },
			});

			if (!purchase) {
				log.error({ purchaseId }, "Purchase not found for license sync");
				throw new Error(`Purchase not found: ${purchaseId}`);
			}

			if (purchase.status !== "completed") {
				log.warn(
					{ purchaseId, status: purchase.status },
					"Skipping license sync — purchase not completed",
				);
				return { success: true, skipped: true, reason: "purchase_not_completed" };
			}

			// 2. Get the price to find the plan and duration
			const price = purchase.price_id
				? await db.query.prices.findFirst({
						where: eq(pricesTable.id, purchase.price_id),
						columns: { id: true, plan_id: true, duration_days: true },
					})
				: null;

			if (!price) {
				log.error({ purchaseId, priceId: purchase.price_id }, "Price not found for purchase");
				throw new Error(`Price not found for purchase: ${purchaseId}`);
			}

			// 3. Calculate expiry
			const validUntil = price.duration_days
				? new Date(Date.now() + price.duration_days * 24 * 60 * 60 * 1000)
				: null; // null = lifetime license

			// 4. Check if license already exists (idempotent)
			const existingLicense = await licenseQueries.findByUserAndApp(db, subjectId, appId);

			if (existingLicense && existingLicense.status === "active" && existingLicense.plan_id === price.plan_id) {
				log.info(
					{ purchaseId, licenseId: existingLicense.public_id },
					"License already active and up-to-date, skipping",
				);
				return { success: true, skipped: true, reason: "already_synced" };
			}

			// 5. Create or update license via licenseManager
			const license = await licenseManager.createLicense({
				userId: subjectId,
				appId,
				planId: price.plan_id,
				validUntil,
				metadata: { purchaseId, syncedAt: new Date().toISOString() },
			});

			log.info(
				{
					purchaseId,
					licenseId: license.public_id,
					planId: price.plan_id,
					validUntil,
				},
				"License synced successfully",
			);

			return { success: true, licenseId: license.public_id };
		},
		{
			connection: queue.client as any,
			concurrency: 5,
		},
	);
}
