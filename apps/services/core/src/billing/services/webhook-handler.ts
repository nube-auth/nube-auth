/**
 * Webhook Handler Service
 * 
 * Processes payment provider webhooks and creates database records.
 * Iterates through all active provider configs for the given provider
 * and attempts verification with each until one succeeds.
 */

import { getDb, paymentProviderConfigQueries } from "@proofa/db";
import { createLogger, serializeError } from "@proofa/shared";
import { createProviderAdapter } from "../adapters/index.js";
import { decryptString } from "../../utils/encryption.js";
import { processWebhookEvent } from "./webhook-processor.js";
import { WebhookLoggingService } from "./webhook-logging.js";

const log = createLogger("webhook-handler");

interface WebhookProcessingParams {
	provider: string;
	rawBody: string;
	signature: string;
	providerConfigId?: number;
	ipAddress?: string;
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

		// Collect candidate configs to try
		let configs: Awaited<ReturnType<typeof paymentProviderConfigQueries.findActiveByProvider>>;

		if (params.providerConfigId != null && params.providerConfigId > 0) {
			// Specific config requested
			const config = await paymentProviderConfigQueries.findById(db, params.providerConfigId);
			configs = config ? [config] : [];
		} else {
			// Find all active configs for this provider
			configs = await paymentProviderConfigQueries.findActiveByProvider(db, params.provider);
		}

		if (configs.length === 0) {
			log.error({ provider: params.provider }, "No active provider configurations found");
			return false;
		}

		// Try each config until one successfully verifies the webhook
		for (const providerConfig of configs) {
			let decryptedCredentials: unknown;
			try {
				const credentialsJson = decryptString(providerConfig.credentials);
				decryptedCredentials = JSON.parse(credentialsJson);
			} catch (error) {
				log.warn(
					{ err: serializeError(error as Error), configId: providerConfig.public_id },
					"Failed to decrypt credentials, skipping config"
				);
				continue;
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

			log.info({ eventType: event.type, eventId: event.id, configId: providerConfig.public_id }, "Webhook verified");

			// Idempotency check — skip if already processed
			if (event.id) {
				const alreadyProcessed = await WebhookLoggingService.isEventProcessed(params.provider, event.id);
				if (alreadyProcessed) {
					log.info({ eventId: event.id, provider: params.provider }, "Webhook event already processed, skipping");
					return true;
				}
			}

			// Create webhook log entry
			const webhookLogId = await WebhookLoggingService.createWebhookLog({
				provider: params.provider,
				eventType: event.type,
				eventId: event.id,
				requestBody: params.rawBody,
				signature: params.signature,
				...(params.ipAddress != null ? { ipAddress: params.ipAddress } : {}),
			});

			await WebhookLoggingService.markProcessingStarted(webhookLogId);

			// Extract payment details
			const paymentDetails = await adapter.extractPaymentDetails(event);
			if (!paymentDetails) {
				log.debug({ eventType: event.type }, "No payment details to extract");
				await WebhookLoggingService.markProcessingCompleted(webhookLogId);
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

				await WebhookLoggingService.markProcessingCompleted(webhookLogId);
			} catch (error) {
				await WebhookLoggingService.markProcessingFailed(
					webhookLogId,
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
				"Webhook event processed successfully"
			);

			return true;
		}

		// None of the configs verified the webhook
		log.warn(
			{ provider: params.provider, configCount: configs.length },
			"Webhook verification failed for all provider configs"
		);
		return false;
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Webhook processing failed");
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
