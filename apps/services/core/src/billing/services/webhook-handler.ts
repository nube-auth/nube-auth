/**
 * Webhook Handler Service
 *
 * Processes and routes webhook events from payment providers
 */

import { createLogger } from "@proofa/shared";
import { getDb, eq } from "@proofa/db";
import {
	payment_provider_configs,
	payment_transactions,
} from "@proofa/db/schema";
import {
	ProviderAdapterFactory,
	PurchasesService,
	type PaymentProviderType,
	type ProviderAdapterConfig,
	type VerifiedWebhookPayload,
} from "../index.js";

const log = createLogger("webhook-handler");

/**
 * Webhook handler for processing provider payment events
 */
export class WebhookHandler {
	/**
	 * Process webhook from payment provider
	 */
	static async handleWebhook(
		provider: PaymentProviderType,
		rawBody: string,
		signature: string,
	): Promise<{
		success: boolean;
		transactionId?: string;
		error?: string;
	}> {
		try {
			// Get provider config from app
			// In production, you might want to try multiple configs per provider
			// For Phase 1, we'll use the first active config found

			const db = getDb();
			const providerConfig = await db
				.select()
				.from(payment_provider_configs)
				.where(eq(payment_provider_configs.provider, provider))
				.then((rows) => rows[0]);

			if (!providerConfig) {
				log.warn({ provider }, "Provider config not found for webhook");
				return {
					success: false,
					error: "Provider not configured",
				};
			}

			// Initialize adapter
			let credentials = {};
			try {
				credentials = JSON.parse(providerConfig.credentials);
			} catch {
				log.warn("Failed to parse provider credentials");
			}

			const adapterConfig: ProviderAdapterConfig = {
				provider,
				environment: providerConfig.environment as "test" | "live",
				credentials,
				webhookSecret: providerConfig.webhook_secret || undefined,
			};

			const adapter = await ProviderAdapterFactory.createAdapter(adapterConfig);

			// Verify webhook signature and get payload
			const payload = await adapter.verifyWebhook(rawBody, signature);

			if (!payload) {
				log.warn({ provider }, "Webhook signature verification failed");
				return {
					success: false,
					error: "Invalid signature",
				};
			}

			// Process webhook based on event type
			const result = await this.processWebhookPayload(
				provider,
				payload,
				providerConfig.id,
			);

			return result;
		} catch (error) {
			log.error({ err: error as Error, provider }, "Webhook processing error");
			return {
				success: false,
				error: (error as Error).message,
			};
		}
	}

	/**
	 * Process verified webhook payload
	 */
	private static async processWebhookPayload(
		provider: PaymentProviderType,
		payload: VerifiedWebhookPayload,
		providerConfigId: number,
	): Promise<{
		success: boolean;
		transactionId?: string;
		error?: string;
	}> {
		const db = getDb();
		const eventType = payload.event.type;

		try {
			switch (provider) {
				case "stripe": {
					return this.handleStripeWebhook(payload, providerConfigId);
				}

				case "lemon_squeezy": {
					return this.handleLemonSqueezyWebhook(payload, providerConfigId);
				}

				default:
					log.warn({ provider, eventType }, "Unknown provider webhook");
					return {
						success: false,
						error: "Unknown provider",
					};
			}
		} catch (error) {
			log.error(
				{ err: error as Error, provider, eventType },
				"Failed to process webhook payload",
			);
			return {
				success: false,
				error: (error as Error).message,
			};
		}
	}

	/**
	 * Handle Stripe webhook events
	 */
	private static async handleStripeWebhook(
		payload: VerifiedWebhookPayload,
		providerConfigId: number,
	): Promise<{
		success: boolean;
		transactionId?: string;
		error?: string;
	}> {
		const db = getDb();
		const eventType = payload.event.type;

		switch (eventType) {
			case "checkout.session.completed": {
				const sessionId = payload.providerSessionId;
				if (!sessionId) {
					return {
						success: false,
						error: "No session ID in payload",
					};
				}

				// Get purchase by provider session
				const purchase =
					await PurchasesService.getPurchaseByProviderSession(sessionId);

				if (!purchase) {
					log.warn({ sessionId }, "Purchase not found for Stripe session");
					return {
						success: false,
						error: "Purchase not found",
					};
				}

				// Create payment transaction
				const transaction = await db
					.insert(payment_transactions)
					.values({
						public_id: `txn_${Date.now()}`,
						app_id: purchase.appId,
						provider_config_id: providerConfigId,
						payment_intent_id: payload.customData?.paymentIntentId as
							| string
							| undefined,
						customer_id: (payload.customData?.customerId as string) || null,
						amount: 0, // Get from session data
						currency: "usd",
						status: "completed",
						provider_transaction_id: sessionId,
						purchase_id: purchase.id,
						created_at: new Date(),
						updated_at: new Date(),
					})
					.returning();

				// Update purchase with transaction
				await PurchasesService.completePurchase(
					purchase.id,
					transaction[0].id,
				);

				log.info(
					{
						purchaseId: purchase.id,
						transactionId: transaction[0].id,
					},
					"Stripe checkout session completed",
				);

				return {
					success: true,
					transactionId: transaction[0].public_id,
				};
			}

			case "payment_intent.succeeded": {
				const transactionId = payload.transactionId;
				if (!transactionId) {
					return {
						success: false,
						error: "No transaction ID in payload",
					};
				}

				// Update transaction status
				await db
					.update(payment_transactions)
					.set({
						status: "completed",
						updated_at: new Date(),
					})
					.where(
						eq(payment_transactions.payment_intent_id, transactionId),
					);

				log.info({ transactionId }, "Stripe payment intent succeeded");

				return {
					success: true,
					transactionId,
				};
			}

			case "payment_intent.payment_failed": {
				const transactionId = payload.transactionId;
				if (!transactionId) {
					return {
						success: false,
						error: "No transaction ID in payload",
					};
				}

				// Update transaction status
				await db
					.update(payment_transactions)
					.set({
						status: "failed",
						updated_at: new Date(),
					})
					.where(
						eq(payment_transactions.payment_intent_id, transactionId),
					);

				log.info({ transactionId }, "Stripe payment intent failed");

				return {
					success: true,
					transactionId,
				};
			}

			case "charge.refunded": {
				const transactionId = payload.transactionId;
				if (!transactionId) {
					return {
						success: false,
						error: "No transaction ID in payload",
					};
				}

				// Update transaction status
				await db
					.update(payment_transactions)
					.set({
						status: "refunded",
						refunded_at: new Date(),
						updated_at: new Date(),
					})
					.where(eq(payment_transactions.provider_transaction_id, transactionId));

				log.info({ transactionId }, "Stripe charge refunded");

				return {
					success: true,
					transactionId,
				};
			}

			default: {
				log.debug({ eventType }, "Unhandled Stripe webhook event");
				return {
					success: true,
				};
			}
		}
	}

	/**
	 * Handle LemonSqueezy webhook events
	 */
	private static async handleLemonSqueezyWebhook(
		payload: VerifiedWebhookPayload,
		providerConfigId: number,
	): Promise<{
		success: boolean;
		transactionId?: string;
		error?: string;
	}> {
		const db = getDb();
		const eventType = payload.event.type;

		switch (eventType) {
			case "order:completed": {
				const transactionId = payload.transactionId;
				if (!transactionId) {
					return {
						success: false,
						error: "No transaction ID in payload",
					};
				}

				// Create payment transaction
				const transaction = await db
					.insert(payment_transactions)
					.values({
						public_id: `txn_${Date.now()}`,
						app_id: 0, // Get from payload
						provider_config_id: providerConfigId,
						amount: payload.amount || 0,
						currency: payload.currency || "usd",
						status: "completed",
						provider_transaction_id: transactionId,
						created_at: new Date(),
						updated_at: new Date(),
					})
					.returning();

				log.info(
					{
						transactionId: transaction[0].id,
						orderId: transactionId,
					},
					"LemonSqueezy order completed",
				);

				return {
					success: true,
					transactionId: transaction[0].public_id,
				};
			}

			case "order:refunded": {
				const transactionId = payload.transactionId;
				if (!transactionId) {
					return {
						success: false,
						error: "No transaction ID in payload",
					};
				}

				// Update transaction status
				await db
					.update(payment_transactions)
					.set({
						status: "refunded",
						refunded_at: new Date(),
						updated_at: new Date(),
					})
					.where(eq(payment_transactions.provider_transaction_id, transactionId));

				log.info({ transactionId }, "LemonSqueezy order refunded");

				return {
					success: true,
					transactionId,
				};
			}

			default: {
				log.debug({ eventType }, "Unhandled LemonSqueezy webhook event");
				return {
					success: true,
				};
			}
		}
	}
}
