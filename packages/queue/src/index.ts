/**
 * @proofa/queue
 * BullMQ-based queue management for background jobs
 * Future-ready for RabbitMQ migration
 */

export {
	QueueClient,
	WorkerClient,
	QueueManager,
} from "./client";

export type {
	BaseJobData,
	ProcessPaymentJob,
	ReconcilePaymentJob,
	HandleRefundJob,
	SyncLicenseJob,
	PaymentJobData,
	ProcessWebhookJob,
	RetryWebhookJob,
	WebhookJobData,
	SendEmailJob,
	SendBatchEmailJob,
	EmailJobData,
	SendNotificationJob,
	NotificationJobData,
	GenerateReportJob,
	ExportDataJob,
	CleanupJob,
	AsyncTaskJobData,
	AllJobData,
	JobResult,
	WorkerOptions,
	QueueConnectionOptions,
} from "./types";

// Export enums and QueueName value (not type)
export {
	QueueName,
	PaymentJobType,
	WebhookJobType,
	EmailJobType,
	NotificationJobType,
	AsyncTaskType,
} from "./types";

export {
	DEFAULT_REDIS_CONFIG,
	JOB_RETRY_CONFIG,
	JOB_TIMEOUT_CONFIG,
	JOB_PRIORITY,
	DEFAULT_WORKER_OPTIONS,
	QUEUE_DEFAULT_OPTIONS,
	JOB_EVENTS,
	WORKER_EVENTS,
	QUEUE_NAMES,
	HEALTH_CHECK_CONFIG,
} from "./constants";

export {
	JobUtils,
	PaymentJobHandlers,
	WebhookJobHandlers,
	EmailJobHandlers,
} from "./jobs";

export type {
	PaymentJobHandler,
	WebhookJobHandler,
	EmailJobHandler,
} from "./jobs";

// Re-export BullMQ types for convenience
export type { Queue, Worker, Job } from "bullmq";
