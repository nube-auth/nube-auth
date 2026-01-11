/**
 * Queue Job Enqueuers for Billing Operations
 */

import { getQueue } from "@proofa/queue";
import { createLogger } from "@proofa/shared";

const log = createLogger("billing-queue");

export interface ProcessPaymentJobData {
	transactionId: string;
	amount: number;
	currency: string;
}

export interface ProcessWebhookJobData {
	provider: string;
	rawBody: string;
	signature: string;
	providerConfigId?: number;
	ipAddress: string;
}

export interface SyncLicenseJobData {
	licenseId: string;
	action: "activate" | "deactivate" | "sync";
}

export interface ProcessRefundJobData {
	transactionId: string;
	amount: number;
	reason: string;
}

/**
 * Enqueue payment processing
 */
export async function enqueuePaymentProcessing(data: ProcessPaymentJobData): Promise<void> {
	const queue = getQueue<any>("billing");
	await queue.add("process-payment", data as any, {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 2000,
		},
	});
	log.info({ transactionId: data.transactionId }, "Payment processing job enqueued");
}

/**
 * Enqueue webhook processing
 */
export async function enqueueWebhookProcessing(
	provider: string,
	rawBody: string,
	signature: string,
	providerConfigId: number,
	ipAddress: string
): Promise<void> {
	const queue = getQueue<any>("billing");
	const jobData: ProcessWebhookJobData = {
		provider,
		rawBody,
		signature,
		providerConfigId,
		ipAddress,
	};

	await queue.add("process-webhook", jobData as any, {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 2000,
		},
	});

	log.info({ provider, ipAddress }, "Webhook processing job enqueued");
}

/**
 * Enqueue license sync
 */
export async function enqueueLicenseSync(data: SyncLicenseJobData): Promise<void> {
	const queue = getQueue<any>("billing");
	await queue.add("sync-license", data as any, {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 2000,
		},
	});
	log.info({ licenseId: data.licenseId, action: data.action }, "License sync job enqueued");
}

/**
 * Enqueue refund processing
 */
export async function enqueueRefundProcessing(data: ProcessRefundJobData): Promise<void> {
	const queue = getQueue<any>("billing");
	await queue.add("process-refund", data as any, {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 2000,
		},
	});
	log.info({ transactionId: data.transactionId }, "Refund processing job enqueued");
}
