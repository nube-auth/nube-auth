/**
 * Payment Processing Worker
 *
 * Handles async payment processing for checkout sessions
 * - Confirms payment with provider
 * - Creates payment transaction record
 * - Completes purchase
 * - Enqueues license sync job
 */

import { createLogger, serializeError } from "@proofa/shared";
import type { Worker } from "bullmq";
import { getQueueClient } from "@proofa/queue";
import { getDb } from "@proofa/db";
import { payment_provider_configs } from "@proofa/db/schema";
import { eq } from "@proofa/db";

const log = createLogger("process-payment-worker");

export interface ProcessPaymentJobData {
	purchaseId: number;
	providerSessionId: string;
}

export async function setupProcessPaymentWorker(): Promise<Worker<ProcessPaymentJobData>> {
	const { Worker: BullWorker } = await import("bullmq");
	const redisConnection = getQueueClient();
	return new BullWorker<ProcessPaymentJobData>(
		"PROCESS_PAYMENT",
		async (job) => {
			try {
				log.info(
					{ jobId: job.id, data: job.data },
					"Processing payment",
				);

				const { purchaseId, providerSessionId } = job.data;
				const db = getDb();

			// Get purchase details via dynamic import
			const { PurchasesService } = await import("@proofa/core/billing");
				const purchase = await PurchasesService.getPurchase(purchaseId);
				if (!purchase) {
					log.error({ purchaseId }, "Purchase not found");
					throw new Error(`Purchase ${purchaseId} not found`);
				}

				// Get provider config
				const providerConfig = await db
					.select()
					.from(payment_provider_configs)
					.where(eq(payment_provider_configs.id, purchase.providerConfigId))
					.then((rows) => rows[0]);

				if (!providerConfig) {
					log.error(
						{ purchaseId, providerConfigId: purchase.providerConfigId },
						"Provider config not found",
					);
					throw new Error("Provider config not found");
				}

				// Parse credentials
				let credentials = {};
				try {
					credentials = JSON.parse(providerConfig.credentials);
				} catch (e) {
					log.warn("Failed to parse provider credentials");
				}

			// Initialize adapter via dynamic import
			const { ProviderAdapterFactory } = await import("@proofa/core/billing");
			const adapterConfig = {
				provider: providerConfig.provider as "stripe" | "lemon_squeezy",
				environment: providerConfig.environment as "test" | "live",
				credentials,
				webhookSecret: providerConfig.webhook_secret || undefined,
			};

			const adapter = await ProviderAdapterFactory.createAdapter(
				adapterConfig,
			);

				// Get session from provider
				const session = await adapter.getSession(providerSessionId);
				if (!session) {
					log.error({ providerSessionId }, "Session not found from provider");
					throw new Error("Session not found from provider");
				}

				// Check if payment is complete
				if (session.status !== "complete") {
					log.info(
						{ purchaseId, status: session.status },
						"Payment not yet complete",
					);
					// Retry job
					throw new Error(
						`Payment not complete, status: ${session.status}`,
					);
				}

				// Get transaction details
				const transaction = await adapter.getTransaction(providerSessionId);
				if (!transaction) {
					log.error({ providerSessionId }, "Transaction not found");
					throw new Error("Transaction not found");
				}

				// Complete purchase
				await PurchasesService.completePurchase(
					purchaseId,
					transaction.transactionId,
				);

				log.info(
					{
						purchaseId,
						transactionId: transaction.transactionId,
					},
					"Payment processed successfully",
				);

			// Enqueue license sync job via dynamic import
			try {
				const { enqueueLicenseSync } = await import("@proofa/core/billing");
				await enqueueLicenseSync(purchaseId, purchase.appId, purchase.subjectType, purchase.subjectId);
			} catch (queueError) {
				log.warn(
					{ err: serializeError(queueError as Error) },
					"Failed to enqueue license sync, will retry",
				);
				throw queueError;
			}
				return { success: true, purchaseId };
			} catch (error) {
				log.error(
					{ err: serializeError(error as Error), jobId: job.id },
					"Payment processing failed",
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
