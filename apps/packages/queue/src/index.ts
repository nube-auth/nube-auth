/**
 * @nube-auth/queue
 * BullMQ-based queue management for background jobs
 * Future-ready for RabbitMQ migration
 */

import { QueueClient as QueueClientClass } from "./client";
import type { AllJobData, QueueName } from "./types";

// Global queue instance
let queueInstance: QueueClientClass | null = null;

/**
 * Get or initialize the global queue client instance
 */
export function getQueueClient(): QueueClientClass {
	if (!queueInstance) {
		queueInstance = new QueueClientClass();
	}
	return queueInstance;
}

/**
 * Get a queue by name
 */
export function getQueue<T extends AllJobData = AllJobData>(queueName: QueueName | string) {
	return getQueueClient().getQueue<T>(queueName);
}

// Re-export BullMQ types for convenience
export type { Job, Queue, Worker } from "bullmq";
export {
	QueueClient,
	QueueManager,
	WorkerClient,
} from "./client";
export {
	DEFAULT_REDIS_CONFIG,
	DEFAULT_WORKER_OPTIONS,
	HEALTH_CHECK_CONFIG,
	JOB_EVENTS,
	JOB_PRIORITY,
	JOB_RETRY_CONFIG,
	JOB_TIMEOUT_CONFIG,
	QUEUE_DEFAULT_OPTIONS,
	QUEUE_NAMES,
	WORKER_EVENTS,
} from "./constants";
export type { EnqueueEmailOptions } from "./email";
// Email enqueuer
export { enqueueEmail } from "./email";
export type {
	EmailJobHandler,
	PaymentJobHandler,
	WebhookJobHandler,
} from "./jobs";
export {
	EmailJobHandlers,
	JobUtils,
	PaymentJobHandlers,
	WebhookJobHandlers,
} from "./jobs";
export type {
	AllJobData,
	AsyncTaskJobData,
	BaseJobData,
	CleanupJob,
	EmailJobData,
	ExportDataJob,
	GenerateReportJob,
	HandleRefundJob,
	JobResult,
	NotificationJobData,
	PaymentJobData,
	ProcessPaymentJob,
	ProcessWebhookJob,
	QueueConnectionOptions,
	ReconcilePaymentJob,
	RetryWebhookJob,
	SendBatchEmailJob,
	SendEmailJob,
	SendNotificationJob,
	SyncLicenseJob,
	WebhookJobData,
	WorkerOptions,
} from "./types";
// Export enums and QueueName value (not type)
export {
	AsyncTaskType,
	EmailJobType,
	NotificationJobType,
	PaymentJobType,
	QueueName,
	WebhookJobType,
} from "./types";
