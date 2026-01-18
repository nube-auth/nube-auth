/**
 * Webhook Handler Service
 * 
 * Processes payment provider webhooks and creates database records
 */

import { getDb, paymentProviderConfigQueries } from "@proofa/db";
import { createLogger, serializeError } from "@proofa/shared";
import { createProviderAdapter } from "../adapters/index.js";
import { decryptString } from "../../utils/encryption.js";
import { processWebhookEvent } from "./webhook-processor.js";

const log = createLogger("webhook-handler");

interface WebhookProcessingParams {
	provider: string;
	rawBody: string;
	signature: string;
	providerConfigId?: number;
}

/**
 * Process webhook from payment provider
 */
export async function processWebhook(params: WebhookProcessingParams): Promise<boolean> {
	try {
		const db = getDb();

		// Get provider config
		let providerConfig;
		if (params.providerConfigId) {
			providerConfig = await paymentProviderConfigQueries.findById(db, params.providerConfigId);
		} else {
			return false;
		}

		if (!providerConfig) {
			log.error({ provider: params.provider }, "No provider configuration found");
			return false;
		}

		// Decrypt credentials
		let decryptedCredentials: unknown;
		try {
			const credentialsJson = decryptString(providerConfig.credentials);
			decryptedCredentials = JSON.parse(credentialsJson);
		} catch (error) {
			log.error(
				{ err: serializeError(error as Error), providerId: providerConfig.id },
				"Failed to decrypt provider credentials"
			);
			return false;
		}

		// Create adapter
		const adapter = createProviderAdapter(providerConfig.provider, decryptedCredentials);

		// Verify webhook
		const event = await adapter.verifyWebhook(params.signature, params.rawBody);
		if (!event) {
			log.warn({ provider: params.provider }, "Webhook verification failed");
			return false;
		}

		log.info({ eventType: event.type, eventId: event.id }, "Webhook verified");

		// Extract payment details
		const paymentDetails = await adapter.extractPaymentDetails(event);
		if (!paymentDetails) {
			log.debug({ eventType: event.type }, "No payment details to extract");
			return true; // Not an error, just not a payment event
		}

		// Process webhook event (handles all event types including cancellations, failures, refunds)
		await processWebhookEvent({
			paymentDetails,
			providerConfigId: providerConfig.id,
			provider: providerConfig.provider,
			eventType: event.type,
		});

		log.info(
			{
				eventType: event.type,
				transactionId: paymentDetails.transactionId,
				status: paymentDetails.status,
			},
			"Webhook event processed successfully"
		);

		return true;
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
