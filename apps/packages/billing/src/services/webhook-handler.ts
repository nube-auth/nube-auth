/**
 * Webhook Handler Service
 *
 * Processes payment provider webhooks and creates database records.
 * Iterates through all active provider configs for the given provider
 * and attempts verification with each until one succeeds.
 */

import { getDb, paymentProviderConfigQueries } from "@nube-auth/db";
import { createLogger, serializeError } from "@nube-auth/shared";
import { createProviderAdapter } from "../adapters/index.js";
import { decryptProviderCredentials } from "../encryption.js";
import { WebhookLoggingService } from "./webhook-logging.js";
import { processWebhookEvent } from "./webhook-processor.js";

const log = createLogger("webhook-handler");

interface WebhookProcessingParams {
	provider: string;
	rawBody: string;
	signature: string;
	providerConfigId?: number;
	/** public_id of the specific payment_provider_config (CFG0...) — takes priority over providerConfigId */
	providerConfigPublicId?: string;
	ipAddress?: string;
	webhookLogId?: number;
}

/**
 * Process webhook from payment provider.
 * If providerConfigId is provided and valid, use that specific config.
 * Otherwise, iterate through all active configs for the provider
 * and try verification with each one.
 */
export async function processWebhook(params: WebhookProcessingParams): Promise<boolean> {
	try {
		const db = getDb();
		const webhookLogId = params.webhookLogId;

		// Collect candidate configs to try
		let configs: Awaited<ReturnType<typeof paymentProviderConfigQueries.findActiveByProvider>>;

		if (params.providerConfigPublicId) {
			// Specific config requested by public_id (from scoped webhook URL)
			const config = await paymentProviderConfigQueries.findByPublicId(db, params.providerConfigPublicId);
			configs = config ? [config] : [];
		} else if (params.providerConfigId != null && params.providerConfigId > 0) {
			// Specific config requested by internal id (legacy path)
			const config = await paymentProviderConfigQueries.findByInternalId_(db, params.providerConfigId);
			configs = config ? [config] : [];
		} else {
			// Find all active configs for this provider
			configs = await paymentProviderConfigQueries.findActiveByProvider(db, params.provider);
		}

		if (configs.length === 0) {
			log.error({ provider: params.provider }, "No active provider configurations found");
			await WebhookLoggingService.markProcessingFailed(
				webhookLogId ?? 0,
				"No active provider configurations found",
			);
			return false;
		}

		// Try each config until one successfully verifies the webhook
		for (const providerConfig of configs) {
			let decryptedCredentials: unknown;
			try {
				decryptedCredentials = decryptProviderCredentials(providerConfig);
			} catch (error) {
				if (providerConfig.provider === "dodo" && providerConfig.webhook_secret) {
					// Dodo verification uses webhook secret only; allow verification to proceed
					// even if encrypted API credentials are stale/corrupted.
					decryptedCredentials = {
						apiKey: "webhook-verification-only",
						webhookSecret: providerConfig.webhook_secret,
						environment: providerConfig.environment === "production" ? "live_mode" : "test_mode",
					};
					log.warn(
						{ configId: providerConfig.public_id },
						"Failed to decrypt credentials, using Dodo webhook secret fallback",
					);
				} else {
					log.warn(
						{ err: serializeError(error as Error), configId: providerConfig.public_id },
						"Failed to decrypt credentials, skipping config",
					);
					continue;
				}
			}

			// Add environment field for Dodo
			if (providerConfig.provider === "dodo" && providerConfig.environment) {
				(decryptedCredentials as any).environment =
					providerConfig.environment === "production" ? "live_mode" : "test_mode";
				(decryptedCredentials as any).webhookSecret =
					providerConfig.webhook_secret || (decryptedCredentials as any).webhookSecret;
			}

			const adapter = createProviderAdapter(providerConfig.provider, decryptedCredentials);

			// Attempt webhook verification
			let event;
			try {
				event = await adapter.verifyWebhook(params.signature, params.rawBody);
			} catch {
				// Verification failed for this config — try next one
				continue;
			}

			if (!event) {
				continue;
			}

			log.info(
				{ eventType: event.type, eventId: event.id, configId: providerConfig.public_id },
				"Webhook verified",
			);

			await WebhookLoggingService.markProcessingStarted(webhookLogId ?? 0, {
				eventType: event.type,
				eventId: event.id,
				metadata: {
					stage: "verified",
					providerConfigId: providerConfig.public_id,
				},
			});

			// Idempotency check — skip if already processed
			if (event.id) {
				const alreadyProcessed = await WebhookLoggingService.isEventProcessed(params.provider, event.id);
				if (alreadyProcessed) {
					log.info(
						{ eventId: event.id, provider: params.provider },
						"Webhook event already processed, skipping",
					);
					await WebhookLoggingService.markSkipped(webhookLogId ?? 0, `Duplicate event skipped: ${event.id}`);
					return true;
				}
			}

			// Extract payment details
			const paymentDetails = await adapter.extractPaymentDetails(event);
			if (!paymentDetails) {
				log.debug({ eventType: event.type }, "No payment details to extract");
				await WebhookLoggingService.markSkipped(
					webhookLogId ?? 0,
					`No payment details extracted for event type: ${event.type}`,
				);
				return true; // Not an error, just not a payment event
			}

			try {
				// Process webhook event
				await processWebhookEvent({
					paymentDetails,
					providerConfigId: providerConfig.id,
					provider: providerConfig.provider,
					eventType: event.type,
				});

				await WebhookLoggingService.markProcessingCompleted(webhookLogId ?? 0);
			} catch (error) {
				await WebhookLoggingService.markProcessingFailed(
					webhookLogId ?? 0,
					(error as Error).message,
					(error as Error).stack,
				);
				throw error;
			}

			log.info(
				{
					eventType: event.type,
					transactionId: paymentDetails.transactionId,
					status: paymentDetails.status,
				},
				"Webhook event processed successfully",
			);

			return true;
		}

		// None of the configs verified the webhook
		log.warn(
			{ provider: params.provider, configCount: configs.length },
			"Webhook verification failed for all provider configs",
		);
		await WebhookLoggingService.markSignatureFailed(
			webhookLogId ?? 0,
			"Webhook verification failed for all provider configs",
		);
		return false;
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Webhook processing failed");
		await WebhookLoggingService.markProcessingFailed(
			params.webhookLogId ?? 0,
			(error as Error).message,
			(error as Error).stack,
		);
		return false;
	}
}

/**
 * Legacy class for backward compatibility
 */
export class WebhookHandler {
	static async process(params: WebhookProcessingParams): Promise<{ success: boolean }> {
		const success = await processWebhook(params);
		return { success };
	}
}
