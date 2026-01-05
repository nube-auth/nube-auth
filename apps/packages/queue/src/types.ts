/**
 * Queue types and job definitions
 * Type-safe job specifications for all background tasks
 */

/**
 * Queue names for different job types
 */
export enum QueueName {
	PAYMENTS = "payments",
	WEBHOOKS = "webhooks",
	EMAILS = "emails",
	NOTIFICATIONS = "notifications",
	ASYNC_TASKS = "async-tasks",
}

/**
 * Base job data structure
 */
export interface BaseJobData {
	requestId?: string;
	userId?: number;
	appId?: number;
	timestamp: number;
	retryCount?: number;
}

/**
 * Payment related jobs
 */
export enum PaymentJobType {
	PROCESS_PAYMENT = "process_payment",
	RECONCILE_PAYMENT = "reconcile_payment",
	HANDLE_REFUND = "handle_refund",
	SYNC_LICENSE = "sync_license",
}

export interface ProcessPaymentJob extends BaseJobData {
	type: PaymentJobType.PROCESS_PAYMENT;
	purchaseId: number;
	planProviderPriceId: number;
	providerConfigId: number;
	promotionCodeId?: number;
}

export interface ReconcilePaymentJob extends BaseJobData {
	type: PaymentJobType.RECONCILE_PAYMENT;
	paymentTransactionId: number;
	purchaseId: number;
	providerTransactionId: string;
}

export interface HandleRefundJob extends BaseJobData {
	type: PaymentJobType.HANDLE_REFUND;
	paymentTransactionId: number;
	reason: string;
}

export interface SyncLicenseJob extends BaseJobData {
	type: PaymentJobType.SYNC_LICENSE;
	licenseId: number;
	action: "create" | "update" | "extend" | "revoke";
}

export type PaymentJobData =
	| ProcessPaymentJob
	| ReconcilePaymentJob
	| HandleRefundJob
	| SyncLicenseJob;

/**
 * Webhook related jobs
 */
export enum WebhookJobType {
	PROCESS_WEBHOOK = "process_webhook",
	RETRY_WEBHOOK = "retry_webhook",
}

export interface ProcessWebhookJob extends BaseJobData {
	type: WebhookJobType.PROCESS_WEBHOOK;
	webhookLogId: number;
	provider: "stripe" | "lemonsqueezy" | "dodo";
	eventType: string;
	eventId: string;
}

export interface RetryWebhookJob extends BaseJobData {
	type: WebhookJobType.RETRY_WEBHOOK;
	webhookLogId: number;
	retryAttempt: number;
}

export type WebhookJobData = ProcessWebhookJob | RetryWebhookJob;

/**
 * Email related jobs
 */
export enum EmailJobType {
	SEND_EMAIL = "send_email",
	SEND_BATCH = "send_batch",
}

export interface SendEmailJob extends BaseJobData {
	type: EmailJobType.SEND_EMAIL;
	to: string;
	templateId: string;
	data: Record<string, any>;
}

export interface SendBatchEmailJob extends BaseJobData {
	type: EmailJobType.SEND_BATCH;
	emailIds: number[];
}

export type EmailJobData = SendEmailJob | SendBatchEmailJob;

/**
 * Notification related jobs
 */
export enum NotificationJobType {
	SEND_NOTIFICATION = "send_notification",
}

export interface SendNotificationJob extends BaseJobData {
	type: NotificationJobType.SEND_NOTIFICATION;
	userId: number;
	title: string;
	message: string;
	actionUrl?: string;
}

export type NotificationJobData = SendNotificationJob;

/**
 * Generic async task jobs
 */
export enum AsyncTaskType {
	GENERATE_REPORT = "generate_report",
	EXPORT_DATA = "export_data",
	CLEANUP = "cleanup",
}

export interface GenerateReportJob extends BaseJobData {
	type: AsyncTaskType.GENERATE_REPORT;
	reportType: string;
	params: Record<string, any>;
}

export interface ExportDataJob extends BaseJobData {
	type: AsyncTaskType.EXPORT_DATA;
	dataType: string;
	filters?: Record<string, any>;
}

export interface CleanupJob extends BaseJobData {
	type: AsyncTaskType.CLEANUP;
	targetType: string;
	olderThanDays: number;
}

export type AsyncTaskJobData = GenerateReportJob | ExportDataJob | CleanupJob;

/**
 * Union type for all possible job data
 */
export type AllJobData =
	| PaymentJobData
	| WebhookJobData
	| EmailJobData
	| NotificationJobData
	| AsyncTaskJobData;

/**
 * Job result types
 */
export interface JobResult {
	success: boolean;
	message?: string | undefined;
	data?: any;
	error?: string | undefined;
}

/**
 * Worker options
 */
export interface WorkerOptions {
	concurrency?: number;
	autorun?: boolean;
	settings?: {
		lockDuration?: number;
		lockRenewTime?: number;
		maxStalledCount?: number;
		maxStalledInterval?: number;
		retryProcessDelay?: number;
	};
}

/**
 * Queue connection options
 */
export interface QueueConnectionOptions {
	host: string;
	port: number;
	password?: string;
	db?: number;
	username?: string;
	lazyConnect?: boolean;
	maxRetriesPerRequest?: number | null;
	enableReadyCheck?: boolean;
	enableOfflineQueue?: boolean;
}
