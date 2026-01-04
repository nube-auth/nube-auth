/**
 * Stripe Payment Provider Adapter
 *
 * Implements PaymentProviderAdapter for Stripe integration
 */

import Stripe from "stripe";
import { createLogger } from "@proofa/shared";
import type {
	PaymentProviderAdapter,
	ProviderAdapterConfig,
	ProviderCheckoutSession,
	CheckoutSessionMetadata,
	PaymentTransaction,
	VerifiedWebhookPayload,
} from "./types.js";

const log = createLogger("stripe-adapter");

export class StripeAdapter implements PaymentProviderAdapter {
	provider = "stripe" as const;
	private client: Stripe | null = null;
	private webhookSecret: string | null = null;
	private environment: "test" | "live" = "test";

	async initialize(config: ProviderAdapterConfig): Promise<void> {
		if (config.provider !== "stripe") {
			throw new Error("StripeAdapter requires provider type 'stripe'");
		}

		const apiKey = config.credentials.secretKey;
		if (!apiKey) {
			throw new Error("Stripe adapter requires credentials.secretKey");
		}

		this.client = new Stripe(apiKey, {
			apiVersion: "2025-01-27",
		});

		this.webhookSecret = config.webhookSecret || null;
		this.environment = config.environment;

		log.info({ environment: this.environment }, "Stripe adapter initialized");
	}

	async createCheckoutSession(
		planName: string,
		amount: number,
		currency: string,
		metadata: CheckoutSessionMetadata,
		options?: {
			trialDays?: number;
			successUrl?: string;
			cancelUrl?: string;
		},
	): Promise<ProviderCheckoutSession> {
		if (!this.client) {
			throw new Error("Stripe adapter not initialized");
		}

		try {
			const session = await this.client.checkout.sessions.create({
				mode: "payment",
				payment_method_types: ["card"],
				success_url: options?.successUrl || `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: options?.cancelUrl || `${process.env.FRONTEND_URL}/checkout/cancel`,
				metadata: {
					userId: metadata.userId.toString(),
					appId: metadata.appId.toString(),
					planProvidePriceId: metadata.planProvidePriceId.toString(),
					purchaseId: metadata.purchaseId.toString(),
					...(metadata.promotionCodeId && { promotionCodeId: metadata.promotionCodeId.toString() }),
					...metadata.customMetadata,
				},
				line_items: [
					{
						price_data: {
							currency: currency.toLowerCase(),
							product_data: {
								name: planName,
							},
							unit_amount: amount,
						},
						quantity: 1,
					},
				],
			});

			if (!session.url) {
				throw new Error("Stripe session created but no checkout URL returned");
			}

			return {
				id: session.id,
				provider: "stripe",
				url: session.url,
				expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
				metadata,
				providerSessionId: session.id,
			};
		} catch (error) {
			log.error({ err: error as Error, planName, amount }, "Failed to create Stripe checkout session");
			throw error;
		}
	}

	async getSession(providerSessionId: string): Promise<ProviderCheckoutSession | null> {
		if (!this.client) {
			throw new Error("Stripe adapter not initialized");
		}

		try {
			const session = await this.client.checkout.sessions.retrieve(providerSessionId);

			if (!session.metadata) {
				return null;
			}

			const metadata: CheckoutSessionMetadata = {
				userId: parseInt(session.metadata.userId || "0", 10),
				appId: parseInt(session.metadata.appId || "0", 10),
				planProvidePriceId: parseInt(session.metadata.planProvidePriceId || "0", 10),
				purchaseId: parseInt(session.metadata.purchaseId || "0", 10),
				...(session.metadata.promotionCodeId && {
					promotionCodeId: parseInt(session.metadata.promotionCodeId, 10),
				}),
			};

			return {
				id: session.id,
				provider: "stripe",
				url: session.url || "",
				expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
				metadata,
				providerSessionId: session.id,
			};
		} catch (error) {
			if ((error as { code?: string }).code === "resource_missing") {
				return null;
			}
			log.error({ err: error as Error, sessionId: providerSessionId }, "Failed to get Stripe session");
			throw error;
		}
	}

	async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
		if (!this.client) {
			throw new Error("Stripe adapter not initialized");
		}

		try {
			const paymentIntent = await this.client.paymentIntents.retrieve(transactionId);

			return {
				id: paymentIntent.id,
				providerSessionId: paymentIntent.id,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
				status: this.mapStripeStatus(paymentIntent.status as string),
				createdAt: new Date(paymentIntent.created * 1000),
				metadata: paymentIntent.metadata || undefined,
			};
		} catch (error) {
			if ((error as { code?: string }).code === "resource_missing") {
				return null;
			}
			log.error({ err: error as Error, transactionId }, "Failed to get Stripe transaction");
			throw error;
		}
	}

	async verifyWebhook(rawBody: string, signature: string): Promise<VerifiedWebhookPayload | null> {
		if (!this.client || !this.webhookSecret) {
			log.warn("Stripe webhook verification skipped - adapter not fully configured");
			return null;
		}

		try {
			const event = this.client.webhooks.constructEvent(rawBody, signature, this.webhookSecret);

			switch (event.type) {
				case "checkout.session.completed": {
					const session = event.data.object as Stripe.Checkout.Session;
					return {
						event: {
							provider: "stripe",
							type: event.type,
							data: session,
							rawSignature: signature,
							timestamp: new Date(event.created * 1000),
						},
						providerSessionId: session.id,
						status: "completed",
						customData: {
							paymentIntentId: session.payment_intent,
							customerId: session.customer,
						},
					};
				}

				case "payment_intent.succeeded": {
					const intent = event.data.object as Stripe.PaymentIntent;
					return {
						event: {
							provider: "stripe",
							type: event.type,
							data: intent,
							rawSignature: signature,
							timestamp: new Date(event.created * 1000),
						},
						transactionId: intent.id,
						amount: intent.amount,
						currency: intent.currency,
						status: "completed",
						customData: {
							metadata: intent.metadata,
						},
					};
				}

				case "payment_intent.payment_failed": {
					const intent = event.data.object as Stripe.PaymentIntent;
					return {
						event: {
							provider: "stripe",
							type: event.type,
							data: intent,
							rawSignature: signature,
							timestamp: new Date(event.created * 1000),
						},
						transactionId: intent.id,
						status: "failed",
						customData: {
							lastError: intent.last_payment_error?.message,
						},
					};
				}

				case "charge.refunded": {
					const charge = event.data.object as Stripe.Charge;
					return {
						event: {
							provider: "stripe",
							type: event.type,
							data: charge,
							rawSignature: signature,
							timestamp: new Date(event.created * 1000),
						},
						transactionId: charge.id,
						status: "refunded",
						customData: {
							refundedAmount: charge.amount_refunded,
						},
					};
				}

				default: {
					log.debug({ eventType: event.type }, "Unhandled Stripe webhook event");
					return {
						event: {
							provider: "stripe",
							type: event.type,
							data: event.data.object || {},
							rawSignature: signature,
							timestamp: new Date(event.created * 1000),
						},
					};
				}
			}
		} catch (error) {
			log.warn({ err: error as Error }, "Stripe webhook verification failed");
			return null;
		}
	}

	async refund(transactionId: string, amount?: number): Promise<{
		refundId: string;
		status: string;
		amount: number;
	}> {
		if (!this.client) {
			throw new Error("Stripe adapter not initialized");
		}

		try {
			const refund = await this.client.refunds.create({
				payment_intent: transactionId,
				...(amount && { amount }),
			});

			return {
				refundId: refund.id,
				status: refund.status,
				amount: refund.amount,
			};
		} catch (error) {
			log.error({ err: error as Error, transactionId }, "Failed to create Stripe refund");
			throw error;
		}
	}

	async getRefund(refundId: string): Promise<{
		id: string;
		transactionId: string;
		amount: number;
		status: string;
		createdAt: Date;
	} | null> {
		if (!this.client) {
			throw new Error("Stripe adapter not initialized");
		}

		try {
			const refund = await this.client.refunds.retrieve(refundId);

			if (!refund.payment_intent) {
				return null;
			}

			return {
				id: refund.id,
				transactionId: refund.payment_intent as string,
				amount: refund.amount,
				status: refund.status,
				createdAt: new Date(refund.created * 1000),
			};
		} catch (error) {
			if ((error as { code?: string }).code === "resource_missing") {
				return null;
			}
			log.error({ err: error as Error, refundId }, "Failed to get Stripe refund");
			throw error;
		}
	}

	async cancelSubscription(_providerSubscriptionId: string): Promise<boolean> {
		// Stripe subscriptions are handled differently in Phase 2
		// For Phase 1, we're doing one-time purchases
		log.warn("Subscription cancellation not implemented for Phase 1");
		return false;
	}

	async updateSubscription(
		_providerSubscriptionId: string,
		_updates: {
			priceId?: string;
			billingInterval?: string;
		},
	): Promise<boolean> {
		// Stripe subscription updates for Phase 2
		log.warn("Subscription update not implemented for Phase 1");
		return false;
	}

	async getProviderPriceId(planId: number, _interval: string): Promise<string | null> {
		// Phase 1: We'll implement price mapping in Phase 2
		// For now, return null to indicate not synced
		log.debug({ planId }, "Price lookup not yet synced with Stripe");
		return null;
	}

	async syncPrice(
		planId: number,
		interval: string,
		amount: number,
		currency: string,
	): Promise<string> {
		if (!this.client) {
			throw new Error("Stripe adapter not initialized");
		}

		try {
			// Create a product first
			const product = await this.client.products.create({
				name: `Plan ${planId} - ${interval}`,
				type: "service",
				metadata: {
					planId: planId.toString(),
					interval,
				},
			});

			// Create a price for the product
			const price = await this.client.prices.create({
				product: product.id,
				unit_amount: amount,
				currency: currency.toLowerCase(),
				metadata: {
					planId: planId.toString(),
					interval,
				},
			});

			return price.id;
		} catch (error) {
			log.error({ err: error as Error, planId, interval }, "Failed to sync price with Stripe");
			throw error;
		}
	}

	async healthCheck(): Promise<boolean> {
		if (!this.client) {
			return false;
		}

		try {
			// Simple API call to verify connectivity
			await this.client.balance.retrieve();
			return true;
		} catch {
			return false;
		}
	}

	async cleanup(): Promise<void> {
		// Stripe client doesn't need explicit cleanup
		this.client = null;
		log.info("Stripe adapter cleaned up");
	}

	private mapStripeStatus(stripeStatus: string): "pending" | "completed" | "failed" | "refunded" {
		switch (stripeStatus) {
			case "succeeded":
				return "completed";
			case "processing":
				return "pending";
			case "requires_payment_method":
			case "requires_confirmation":
			case "requires_action":
				return "pending";
			case "requires_capture":
				return "pending";
			default:
				return "failed";
		}
	}
}
