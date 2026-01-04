/**
 * Queue Job Enqueuers
 *
 * Helper functions to enqueue jobs for async processing
 * - enqueuePaymentProcessing: Queue payment confirmation
 * - enqueueWebhookProcessing: Queue webhook event processing
 * - enqueueLicenseSync: Queue license synchronization
 */

import { getQueueClient } from "@proofa/queue";

// Job data types (duplicated from workers service to avoid circular deps)
export interface ProcessPaymentJobData {
	purchaseId: number;
	providerSessionId: string;
}

export interface ProcessWebhookJobData {
	provider: "stripe" | "lemon_squeezy" | "paddle";
	rawBody: string;
	signature: string;
	providerConfigId: number;
}

export interface SyncLicenseJobData {
	purchaseId: number;
	appId: number;
	subjectType: string;
	subjectId: number;
}

export async function enqueuePaymentProcessing(
	purchaseId: number,
	providerSessionId: string,
): Promise<void> {
	const jobData: ProcessPaymentJobData = {
		purchaseId,
		providerSessionId,
	};

	// Dynamic import to avoid build issues with bullmq
	const { Queue: BullQueue } = await import("bullmq");
	const queue = new BullQueue("PROCESS_PAYMENT", {
		connection: getQueueClient(),
	});

	await queue.add("process", jobData, {
		delay: 5000, // Wait 5 seconds before processing (allow provider to settle)
		attempts: 3,
	});

	await queue.close();
}

/**
 * Enqueue webhook processing job
 * Called when webhook is received from payment provider
 */
export async function enqueueWebhookProcessing(
	provider: "stripe" | "lemon_squeezy" | "paddle",
	rawBody: string,
	signature: string,
	providerConfigId: number,
): Promise<void> {
	const jobData: ProcessWebhookJobData = {
		provider,
		rawBody,
		signature,
		providerConfigId,
	};

	// Dynamic import to avoid build issues with bullmq
	const { Queue: BullQueue } = await import("bullmq");
	const queue = new BullQueue("PROCESS_WEBHOOK", {
		connection: getQueueClient(),
	});

	await queue.add("process", jobData, {
		attempts: 5,
		priority: 10, // High priority for webhooks
	});

	await queue.close();
}

/**
 * Enqueue license sync job
 * Called after purchase is completed
 */
export async function enqueueLicenseSync(
	purchaseId: number,
	appId: number,
	subjectType: string,
	subjectId: number,
): Promise<void> {
	const jobData: SyncLicenseJobData = {
		purchaseId,
		appId,
		subjectType,
		subjectId,
	};

	// Dynamic import to avoid build issues with bullmq
	const { Queue: BullQueue } = await import("bullmq");
	const queue = new BullQueue("SYNC_LICENSE", {
		connection: getQueueClient(),
	});

	await queue.add("process", jobData, {
		delay: 2000, // Wait 2 seconds before syncing
		attempts: 3,
	});

	await queue.close();
}
