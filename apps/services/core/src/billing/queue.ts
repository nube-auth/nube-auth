/**
 * Queue Job Enqueuers for Billing Operations
 */

import { getQueue } from "@nube-auth/queue";
import { createLogger } from "@nube-auth/shared";

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
	/** public_id of the specific payment_provider_config to use for verification (CFG0...) */
	providerConfigPublicId?: string;
	ipAddress: string;
	webhookLogId?: number;
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

export interface SyncPlanJobData {
	planId: string;
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
	ipAddress: string,
	webhookLogId?: number,
	providerConfigPublicId?: string,
): Promise<void> {
	const queue = getQueue<any>("billing");
	const jobData: ProcessWebhookJobData = {
		provider,
		rawBody,
		signature,
		ipAddress,
		...(webhookLogId != null ? { webhookLogId } : {}),
		...(providerConfigPublicId ? { providerConfigPublicId } : {}),
	};

	await queue.add("process-webhook", jobData as any, {
		...(webhookLogId != null ? { jobId: `process-webhook-log-${webhookLogId}` } : {}),
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

/**
 * Enqueue plan sync to payment providers
 *
 * Uses a dedicated "sync-plan" queue so it doesn't compete with the
 * process-webhook worker (which also listens on "billing" and silently
 * consumes unrecognised jobs without processing them).
 */
export async function enqueuePlanSync(data: SyncPlanJobData): Promise<void> {
	const queue = getQueue<any>("sync-plan");
	await queue.add("sync-plan-to-providers", data as any, {
		attempts: 5,
		backoff: {
			type: "exponential",
			delay: 5000,
		},
	});
	log.info({ planId: data.planId }, "Plan sync job enqueued");
}

export interface DispatchOutboundWebhookJobData {
	/** Internal app ID (integer) — used for DB lookups inside the worker */
	appId: number;
	event: string;
	payload: Record<string, unknown>;
}

/**
 * Enqueue an outbound webhook dispatch.
 * Fire-and-forget: callers should not await errors from this function —
 * the queue provides retry / backoff automatically.
 */
export async function enqueueOutboundWebhook(data: DispatchOutboundWebhookJobData): Promise<void> {
	const queue = getQueue<any>("outbound-webhooks");
	await queue.add("dispatch-outbound-webhook", data as any, {
		attempts: 5,
		backoff: {
			type: "exponential",
			delay: 3000,
		},
	});
	log.info({ appId: data.appId, event: data.event }, "Outbound webhook dispatch job enqueued");
}
