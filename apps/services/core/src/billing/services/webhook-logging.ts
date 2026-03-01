/**
 * Webhook Logging Service
 *
 * Logs webhook events for debugging, idempotency, and audit trail.
 */

import { getDb, eq, and, webhook_logs } from "@proofa/db";
import { createLogger, serializeError, id } from "@proofa/shared";

const log = createLogger("webhook-logging");

interface CreateWebhookLogParams {
	provider: string;
	eventType: string;
	eventId?: string;
	requestBody: unknown;
	requestHeaders?: unknown;
	signature?: string;
	ipAddress?: string;
	metadata?: Record<string, unknown>;
}

interface MarkCompletedParams {
	paymentTransactionId?: number;
	licenseId?: number;
	responseStatus?: number;
	responseBody?: unknown;
}

export class WebhookLoggingService {
	static async createWebhookLog(params: CreateWebhookLogParams): Promise<number> {
		try {
			const db = getDb();
			const [record] = await db
				.insert(webhook_logs)
				.values({
					public_id: id.auditLog(),
					provider: params.provider,
					event_type: params.eventType,
					event_id: params.eventId ?? null,
					request_body: params.requestBody,
					request_headers: params.requestHeaders ?? null,
					signature: params.signature ?? null,
					ip_address: params.ipAddress ?? null,
					status: "not_started",
					metadata: params.metadata ?? null,
				})
				.returning({ id: webhook_logs.id });

			return record?.id ?? 0;
		} catch (error) {
			log.error({ err: serializeError(error as Error) }, "Failed to create webhook log");
			return 0;
		}
	}

	static async isEventProcessed(provider: string, eventId: string): Promise<boolean> {
		if (!eventId) return false;

		try {
			const db = getDb();
			const existing = await db.query.webhook_logs.findFirst({
				where: and(
					eq(webhook_logs.provider, provider),
					eq(webhook_logs.event_id, eventId),
					eq(webhook_logs.status, "completed"),
				),
				columns: { id: true },
			});

			return !!existing;
		} catch (error) {
			log.error({ err: serializeError(error as Error) }, "Failed to check event idempotency");
			return false;
		}
	}

	static async markProcessingStarted(webhookLogId: number): Promise<boolean> {
		if (!webhookLogId) return true;

		try {
			const db = getDb();
			await db
				.update(webhook_logs)
				.set({
					status: "processing",
					processing_started_at: new Date(),
					updated_at: new Date(),
				})
				.where(eq(webhook_logs.id, webhookLogId));
			return true;
		} catch (error) {
			log.error({ err: serializeError(error as Error) }, "Failed to mark processing started");
			return false;
		}
	}

	static async markProcessingCompleted(webhookLogId: number, params?: MarkCompletedParams): Promise<boolean> {
		if (!webhookLogId) return true;

		try {
			const db = getDb();
			const now = new Date();
			await db
				.update(webhook_logs)
				.set({
					status: "completed",
					processing_completed_at: now,
					payment_transaction_id: params?.paymentTransactionId ?? null,
					license_id: params?.licenseId ?? null,
					response_status: params?.responseStatus ?? null,
					response_body: params?.responseBody ?? null,
					updated_at: now,
				})
				.where(eq(webhook_logs.id, webhookLogId));
			return true;
		} catch (error) {
			log.error({ err: serializeError(error as Error) }, "Failed to mark processing completed");
			return false;
		}
	}

	static async markProcessingFailed(webhookLogId: number, errorMessage: string, errorStack?: string): Promise<boolean> {
		if (!webhookLogId) return true;

		try {
			const db = getDb();
			await db
				.update(webhook_logs)
				.set({
					status: "failed",
					processing_completed_at: new Date(),
					error_message: errorMessage,
					error_stack: errorStack ?? null,
					updated_at: new Date(),
				})
				.where(eq(webhook_logs.id, webhookLogId));
			return true;
		} catch (error) {
			log.error({ err: serializeError(error as Error) }, "Failed to mark processing failed");
			return false;
		}
	}
}
