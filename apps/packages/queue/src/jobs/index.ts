/**
 * Job handlers and utilities
 * Type-safe job processing with common patterns
 */

import { Job } from "bullmq";
import {
	PaymentJobType,
	WebhookJobType,
	EmailJobType,
	PaymentJobData,
	WebhookJobData,
	EmailJobData,
	JobResult,
} from "../types";

/**
 * Payment job handler types
 */
export type PaymentJobHandler<T extends PaymentJobData> = (
	job: Job<T>
) => Promise<JobResult>;

/**
 * Webhook job handler types
 */
export type WebhookJobHandler<T extends WebhookJobData> = (
	job: Job<T>
) => Promise<JobResult>;

/**
 * Email job handler types
 */
export type EmailJobHandler<T extends EmailJobData> = (
	job: Job<T>
) => Promise<JobResult>;

/**
 * Common job utilities
 */
export class JobUtils {
	/**
	 * Create successful job result
	 */
	static success(message?: string, data?: any): JobResult {
		return {
			success: true,
			message: message ?? undefined,
			data: data ?? undefined,
		};
	}

	/**
	 * Create failed job result
	 */
	static failure(error: string, message?: string): JobResult {
		return {
			success: false,
			message: message ?? undefined,
			error,
		};
	}

	/**
	 * Update job progress
	 */
	static async updateProgress(job: Job, progress: number): Promise<void> {
		await job.updateProgress(progress);
	}

	/**
	 * Log job message
	 */
	static async log(job: Job, message: string): Promise<void> {
		console.log(`[Job ${job.id}] ${message}`);
	}

	/**
	 * Add job metadata
	 */
	static addMetadata(job: Job, _key: string, _value: any): void {
		if (!job.data.requestId) {
			job.data.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		}
	}
}

/**
 * Payment job handlers registry
 */
export const PaymentJobHandlers = {
	[PaymentJobType.PROCESS_PAYMENT]: "processPayment",
	[PaymentJobType.RECONCILE_PAYMENT]: "reconcilePayment",
	[PaymentJobType.HANDLE_REFUND]: "handleRefund",
	[PaymentJobType.SYNC_LICENSE]: "syncLicense",
} as const;

/**
 * Webhook job handlers registry
 */
export const WebhookJobHandlers = {
	[WebhookJobType.PROCESS_WEBHOOK]: "processWebhook",
	[WebhookJobType.RETRY_WEBHOOK]: "retryWebhook",
} as const;

/**
 * Email job handlers registry
 */
export const EmailJobHandlers = {
	[EmailJobType.SEND_EMAIL]: "sendEmail",
	[EmailJobType.SEND_BATCH]: "sendBatch",
} as const;
