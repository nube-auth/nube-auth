/**
 * Dodo Payment Provider Adapter
 *
 * Implements payment provider interface for Dodo Payments
 * Documentation: https://docs.dodopayments.com/
 */

import { createLogger, serializeError } from "@proofa/shared";
import crypto from "node:crypto";
import type {
	CheckoutSession,
	CreateCheckoutParams,
	CreatePriceParams,
	CreatePriceResult,
	CreateProductParams,
	CreateProductResult,
	DodoCredentials,
	PaymentDetails,
	PaymentProviderAdapter,
	SubscriptionDetails,
	WebhookEvent,
} from "./types.js";

const log = createLogger("dodo-adapter");

interface DodoProduct {
	id: string;
	name: string;
	description: string;
	created_at: string;
}

interface DodoPrice {
	id: string;
	product_id: string;
	amount: number;
	currency: string;
	interval: string | null;
	interval_count: number;
	type: "recurring" | "one_time";
}

interface DodoCheckoutSession {
	id: string;
	url: string;
	expires_at: string | null;
	customer_email: string;
	status: string;
}

interface DodoWebhookPayload {
	id: string;
	type: string;
	data: {
		object: Record<string, unknown>;
	};
	created_at: string;
}

export class DodoAdapter implements PaymentProviderAdapter {
	private apiKey: string;
	private webhookSecret: string;
	private baseUrl = "https://api.dodopayments.com/v1";
	private log = log;

	constructor(credentials: DodoCredentials) {
		this.apiKey = credentials.apiKey;
		this.webhookSecret = credentials.webhookSecret;
	}

	/**
	 * Create checkout session
	 */
	async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession> {
		try {
			const checkoutData = {
				price_id: params.productId,
				customer_email: params.customerEmail,
				quantity: params.quantity || 1,
				success_url: params.successUrl,
				cancel_url: params.cancelUrl,
				metadata: params.metadata || {},
				mode: params.mode || "subscription",
				trial_period_days: params.trialPeriodDays,
				promo_code: params.promoCode,
			};

			const response = await fetch(`${this.baseUrl}/checkout/sessions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(checkoutData),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Dodo API error: ${response.status} ${errorText}`);
			}

			const session: DodoCheckoutSession = await response.json();

			this.log.info(
				{
					sessionId: session.id,
					priceId: params.productId,
				},
				"Dodo checkout session created"
			);

			return {
				checkoutUrl: session.url,
				sessionId: session.id,
				...(session.expires_at && { expiresAt: new Date(session.expires_at) }),
			};
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					priceId: params.productId,
				},
				"Failed to create Dodo checkout"
			);
			throw error;
		}
	}

	/**
	 * Verify webhook signature
	 */
	async verifyWebhook(signature: string, rawBody: string): Promise<WebhookEvent | null> {
		try {
			// Dodo uses HMAC SHA256 for webhook verification
			const hmac = crypto.createHmac("sha256", this.webhookSecret);
			hmac.update(rawBody);
			const digest = hmac.digest("hex");

			// Dodo sends signature as "t=timestamp,v1=signature"
			const signatureParts = signature.split(",");
			const v1Signature = signatureParts.find((part) => part.startsWith("v1="));
			const actualSignature = v1Signature ? v1Signature.split("=")[1] : "";

			if (actualSignature !== digest) {
				this.log.warn("Dodo webhook signature verification failed");
				return null;
			}

			const payload: DodoWebhookPayload = JSON.parse(rawBody);

			return {
				id: payload.id,
				type: payload.type,
				data: payload.data.object,
				rawBody,
			};
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
				},
				"Failed to verify Dodo webhook"
			);
			return null;
		}
	}

	/**
	 * Extract payment details from webhook event
	 */
	async extractPaymentDetails(event: WebhookEvent): Promise<PaymentDetails | null> {
		try {
			const data = event.data as Record<string, unknown>;

			// Handle checkout.session.completed event (successful payment)
			if (event.type === "checkout.session.completed") {
				return {
					transactionId: String(data["payment_intent"] || data["id"]),
					amount: Number((data["amount_total"] || 0) as number) / 100,
					currency: String(data["currency"] || "usd"),
					status: String(data["payment_status"]) === "paid" ? "succeeded" : "pending",
					customerId: String(data["customer"] || ""),
					customerEmail: String(data["customer_email"] || ""),
					...(data["subscription"] ? { subscriptionId: String(data["subscription"]) } : {}),
					metadata: (data["metadata"] as Record<string, string>) || {},
				};
			}

			// Handle payment.succeeded event
			if (event.type === "payment.succeeded") {
				return {
					transactionId: String(data["id"]),
					amount: Number((data["amount"] || 0) as number) / 100,
					currency: String(data["currency"] || "usd"),
					status: "succeeded",
					customerId: String(data["customer"] || ""),
					customerEmail: String(data["customer_email"] || ""),
					...(data["subscription"] ? { subscriptionId: String(data["subscription"]) } : {}),
					metadata: (data["metadata"] as Record<string, string>) || {},
				};
			}

			// Handle subscription.created event
			if (event.type === "subscription.created") {
				return {
					transactionId: String(data["id"]),
					amount: 0,
					currency: "usd",
					status: "succeeded",
					customerId: String(data["customer"] || ""),
					customerEmail: String(data["customer_email"] || ""),
					subscriptionId: String(data["id"]),
					metadata: (data["metadata"] as Record<string, string>) || {},
				};
			}

			// Handle subscription.updated event
			if (event.type === "subscription.updated") {
				const status = String(data["status"]);
				return {
					transactionId: String(data["id"]),
					amount: 0,
					currency: "usd",
					status: status === "active" ? "succeeded" : "pending",
					customerId: String(data["customer"] || ""),
					customerEmail: String(data["customer_email"] || ""),
					subscriptionId: String(data["id"]),
					metadata: (data["metadata"] as Record<string, string>) || {},
				};
			}

			// Handle subscription.canceled event
			if (event.type === "subscription.canceled") {
				return {
					transactionId: String(data["id"]),
					amount: 0,
					currency: "usd",
					status: "canceled",
					customerId: String(data["customer"] || ""),
					customerEmail: String(data["customer_email"] || ""),
					subscriptionId: String(data["id"]),
					metadata: (data["metadata"] as Record<string, string>) || {},
				};
			}

			// Handle payment.failed event
			if (event.type === "payment.failed") {
				return {
					transactionId: String(data["id"]),
					amount: Number((data["amount"] || 0) as number) / 100,
					currency: String(data["currency"] || "usd"),
					status: "failed",
					customerId: String(data["customer"] || ""),
					customerEmail: String(data["customer_email"] || ""),
					...(data["subscription"] ? { subscriptionId: String(data["subscription"]) } : {}),
					metadata: (data["metadata"] as Record<string, string>) || {},
				};
			}

			// Handle payment.refunded event
			if (event.type === "payment.refunded") {
				return {
					transactionId: String(data["id"]),
					amount: Number((data["amount_refunded"] || 0) as number) / 100,
					currency: String(data["currency"] || "usd"),
					status: "refunded" as const,
					customerId: String(data["customer"] || ""),
					customerEmail: String(data["customer_email"] || ""),
					...(data["metadata"] ? { metadata: data["metadata"] as Record<string, string> } : {}),
				};
			}

			this.log.debug({ eventType: event.type }, "Dodo event type not handled");
			return null;
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					eventType: event.type,
				},
				"Failed to extract Dodo payment details"
			);
			return null;
		}
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(subscriptionId: string, immediate = false): Promise<void> {
		try {
			const cancelData = {
				cancel_at_period_end: !immediate,
			};

			const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}/cancel`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(cancelData),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Dodo API error: ${response.status} ${errorText}`);
			}

			this.log.info({ subscriptionId, immediate }, "Dodo subscription canceled");
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					subscriptionId,
				},
				"Failed to cancel Dodo subscription"
			);
			throw error;
		}
	}

	/**
	 * Get subscription details
	 */
	async getSubscription(subscriptionId: string): Promise<SubscriptionDetails | null> {
		try {
			const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				const errorText = await response.text();
				throw new Error(`Dodo API error: ${response.status} ${errorText}`);
			}

			const subscription = await response.json();

			return {
				subscriptionId: subscription.id,
				status: this.mapDodoStatus(subscription.status),
				currentPeriodStart: new Date(subscription.current_period_start * 1000),
				currentPeriodEnd: new Date(subscription.current_period_end * 1000),
				cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
			};
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					subscriptionId,
				},
				"Failed to get Dodo subscription"
			);
			return null;
		}
	}

	/**
	 * Create product in Dodo
	 */
	async createProduct(params: CreateProductParams): Promise<CreateProductResult> {
		try {
			const productData = {
				name: params.name,
				description: params.description || "",
			};

			const response = await fetch(`${this.baseUrl}/products`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(productData),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Dodo API error: ${response.status} ${errorText}`);
			}

			const product: DodoProduct = await response.json();

			this.log.info(
				{
					productId: product.id,
					name: params.name,
				},
				"Dodo product created"
			);

			return {
				productId: product.id,
				name: product.name,
			};
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					name: params.name,
				},
				"Failed to create Dodo product"
			);
			throw error;
		}
	}

	/**
	 * Create price in Dodo
	 */
	async createPrice(params: CreatePriceParams): Promise<CreatePriceResult> {
		try {
			const priceData = {
				product_id: params.productId,
				amount: params.amountCents,
				currency: params.currency.toLowerCase(),
				type: params.interval === "one_time" ? "one_time" : "recurring",
				recurring: params.interval !== "one_time" ? {
					interval: params.interval,
					interval_count: 1,
				} : undefined,
			};

			const response = await fetch(`${this.baseUrl}/prices`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(priceData),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Dodo API error: ${response.status} ${errorText}`);
			}

			const price: DodoPrice = await response.json();

			this.log.info(
				{
					priceId: price.id,
					productId: params.productId,
					amount: params.amountCents,
					interval: params.interval,
				},
				"Dodo price created"
			);

			return {
				priceId: price.id,
				productId: params.productId,
				amountCents: price.amount,
				currency: price.currency,
				interval: params.interval,
			};
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					productId: params.productId,
					amountCents: params.amountCents,
				},
				"Failed to create Dodo price"
			);
			throw error;
		}
	}

	/**
	 * Map Dodo status to our standard status
	 */
	private mapDodoStatus(status: string): "active" | "canceled" | "past_due" | "trialing" {
		switch (status) {
			case "active":
				return "active";
			case "canceled":
			case "cancelled":
				return "canceled";
			case "past_due":
				return "past_due";
			case "trialing":
				return "trialing";
			default:
				return "active";
		}
	}
}
