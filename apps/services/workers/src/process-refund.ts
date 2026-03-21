/**
 * Process Refund Worker
 *
 * Async worker for processing refund requests
 * - Validates refund eligibility
 * - Creates refund with payment provider
 * - Updates purchase status
 * - Revokes license if full refund
 */

import { Worker, type Job } from "bullmq";
import { QueueClient } from "@nube-auth/queue";
import { createLogger, serializeError } from "@nube-auth/shared";
import { getDb, eq, and, purchases, payment_transactions } from "@nube-auth/db";
import { payment_provider_configs } from "@nube-auth/db/schema";
import { createProviderAdapter } from "@nube-auth/core/billing/adapters/index";
import { decryptString } from "@nube-auth/core/utils/encryption";

const log = createLogger("process-refund-worker");

export interface ProcessRefundJobData {
	purchaseId: number;
	refundAmount?: number; // Amount in cents, undefined = full refund
}

async function processRefundJob(job: Job<ProcessRefundJobData>): Promise<void> {
	const { purchaseId, refundAmount } = job.data;

	log.info(
		{
			jobId: job.id,
			purchaseId,
			refundAmount,
			isFullRefund: !refundAmount,
		},
		"Processing refund job",
	);

	const db = getDb();

	try {
		// 1. Fetch purchase
		const purchase = await db
			.select()
			.from(purchases)
			.where(eq(purchases.id, purchaseId))
			.then((rows) => rows[0]);

		if (!purchase) {
			throw new Error(`Purchase not found: ${purchaseId}`);
		}

		// 2. Validate purchase status
		if (purchase.status !== "completed") {
			throw new Error(
				`Cannot refund purchase with status: ${purchase.status}`,
			);
		}

		if (!purchase.payment_transaction_id) {
			throw new Error(
				`Purchase ${purchaseId} has no associated payment transaction`,
			);
		}

		// 3. Check if already refunded
		const existingRefund = await db
			.select()
			.from(payment_transactions)
			.where(
				and(
					eq(payment_transactions.purchase_id, purchaseId),
					eq(payment_transactions.type, "refund"),
				),
			)
			.then((rows) => rows[0]);

		if (existingRefund) {
			log.warn(
				{ purchaseId, existingRefundId: existingRefund.id },
				"Purchase already has a refund",
			);
			return; // Already processed, skip
		}

		// 4. Fetch original transaction
		const originalTx = await db
			.select()
			.from(payment_transactions)
			.where(eq(payment_transactions.id, purchase.payment_transaction_id))
			.then((rows) => rows[0]);

		if (!originalTx) {
			throw new Error(
				`Payment transaction not found: ${purchase.payment_transaction_id}`,
			);
		}

		// 5. Validate refund amount
		const finalRefundAmount = refundAmount || originalTx.amount_cents;

		if (finalRefundAmount > originalTx.amount_cents) {
			throw new Error(
				`Refund amount (${finalRefundAmount}) exceeds original (${originalTx.amount_cents})`,
			);
		}

		log.info(
			{
				jobId: job.id,
				purchaseId,
				originalAmount: originalTx.amount_cents,
				refundAmount: finalRefundAmount,
			},
			"Refund validated, processing with provider",
		);

		// 6. Call payment provider to issue refund
		const providerConfig = await db
			.select()
			.from(payment_provider_configs)
			.where(eq(payment_provider_configs.id, originalTx.provider_config_id))
			.then((rows) => rows[0]);

		if (!providerConfig) {
			throw new Error(
				`Provider config not found: ${originalTx.provider_config_id}`,
			);
		}

		let credentials: unknown;
		try {
			const credentialsJson = decryptString(providerConfig.credentials);
			credentials = JSON.parse(credentialsJson);
		} catch (error) {
			log.error(
				{ err: serializeError(error as Error), providerConfigId: providerConfig.id },
				"Failed to decrypt provider credentials",
			);
			throw new Error("Failed to decrypt provider credentials");
		}

		if (providerConfig.provider === "dodo" && providerConfig.environment) {
			(credentials as any).environment = providerConfig.environment === "production" ? "live_mode" : "test_mode";
			(credentials as any).webhookSecret = providerConfig.webhook_secret || (credentials as any).webhookSecret;
		}

		const adapter = createProviderAdapter(providerConfig.provider, credentials);

		const isPartialRefund = finalRefundAmount !== originalTx.amount_cents;
		const refundResult = await adapter.createRefund({
			paymentId: originalTx.provider_transaction_id,
			...(isPartialRefund ? { amount: finalRefundAmount } : {}),
			reason: "customer_request",
		});

		log.info(
			{
				purchaseId,
				providerRefundId: refundResult.refundId,
				refundStatus: refundResult.status,
				refundAmount: refundResult.amount,
			},
			"Provider refund issued",
		);

		// 7. Update purchase status if full refund
		if (finalRefundAmount === originalTx.amount_cents) {
			await db
				.update(purchases)
				.set({
					status: "failed", // Mark as failed after full refund
					updated_at: new Date(),
				})
				.where(eq(purchases.id, purchaseId));
		}

		log.info(
			{
				jobId: job.id,
				purchaseId,
			},
			"Refund processed successfully",
		);

		return;
	} catch (error) {
		log.error(
			{
				err: serializeError(error as Error),
				jobId: job.id,
				purchaseId,
			},
			"Failed to process refund",
		);
		throw error; // Re-throw to trigger retry
	}
}

/**
 * Start the refund processing worker
 */
export function startProcessRefundWorker(): Worker {
	log.info("Starting PROCESS_REFUND worker");

	const queueClient = new QueueClient();

	const worker = new Worker("PROCESS_REFUND", processRefundJob, {
		connection: queueClient.getConnectionOptions(),
		concurrency: 5, // Process up to 5 refunds concurrently
		limiter: {
			max: 10, // Max 10 jobs
			duration: 1000, // Per second (rate limiting)
		},
	});

	worker.on("completed", (job) => {
		log.info(
			{
				jobId: job.id,
				purchaseId: job.data.purchaseId,
			},
			"Refund job completed",
		);
	});

	worker.on("failed", (job, err) => {
		log.error(
			{
				err,
				jobId: job?.id,
				purchaseId: job?.data.purchaseId,
				attempts: job?.attemptsMade,
			},
			"Refund job failed",
		);
	});

	worker.on("error", (err) => {
		log.error({ err }, "Refund worker error");
	});

	return worker;
}
