/**
 * LemonSqueezy Payment Provider Adapter
 *
 * Implements payment provider interface for LemonSqueezy
 * Documentation: https://docs.lemonsqueezy.com/api
 */

import { createLogger, serializeError } from "@nube-auth/shared";
import crypto from "node:crypto";
import type {
	CheckoutSession,
	CreateCheckoutParams,
	CreatePriceParams,
	CreatePriceResult,
	CreateProductParams,
	CreateProductResult,
	CreateRefundParams,
	LemonSqueezyCredentials,
	PaymentDetails,
	PaymentProviderAdapter,
	RefundResult,
	SubscriptionDetails,
	WebhookEvent,
} from "./types.js";

const log = createLogger("lemonsqueezy-adapter");

interface LemonSqueezyProduct {
	data: {
		id: string;
		attributes: {
			name: string;
			description: string;
			store_id: number;
		};
	};
}

interface LemonSqueezyVariant {
	data: {
		id: string;
		attributes: {
			product_id: number;
			name: string;
			price: number;
			interval: string | null;
			interval_count: number | null;
		};
	};
}

interface LemonSqueezyCheckout {
	data: {
		id: string;
		attributes: {
			url: string;
			expires_at: string | null;
		};
	};
}

interface LemonSqueezyWebhookPayload {
	meta: {
		event_name: string;
		webhook_id: string;
	};
	data: {
		id: string;
		type: string;
		attributes: Record<string, unknown>;
	};
}

export class LemonSqueezyAdapter implements PaymentProviderAdapter {
	private apiKey: string;
	private webhookSecret: string;
	private storeId: string;
	private baseUrl = "https://api.lemonsqueezy.com/v1";
	private log = log;

	constructor(credentials: LemonSqueezyCredentials) {
		this.apiKey = credentials.apiKey;
		this.webhookSecret = credentials.webhookSecret;
		this.storeId = credentials.storeId;
	}

	/**
	 * Create checkout session
	 */
	async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession> {
		try {
			const checkoutData = {
				data: {
					type: "checkouts",
					attributes: {
						store_id: Number.parseInt(this.storeId, 10),
						variant_id: Number.parseInt(params.productId, 10), // LemonSqueezy uses variant IDs
						checkout_data: {
							email: params.customerEmail,
							custom: params.metadata || {},
							discount_code: params.promoCode || undefined,
						},
					},
					relationships: {
						store: {
							data: {
								type: "stores",
								id: this.storeId,
							},
						},
						variant: {
							data: {
								type: "variants",
								id: params.productId,
							},
						},
					},
				},
			};

			const response = await fetch(`${this.baseUrl}/checkouts`, {
				method: "POST",
				headers: {
					Accept: "application/vnd.api+json",
					"Content-Type": "application/vnd.api+json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(checkoutData),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`LemonSqueezy API error: ${response.status} ${errorText}`);
			}

			const checkout: LemonSqueezyCheckout = await response.json();

			this.log.info(
				{
					checkoutId: checkout.data.id,
					variantId: params.productId,
				},
				"LemonSqueezy checkout created"
			);

			return {
				checkoutUrl: checkout.data.attributes.url,
				sessionId: checkout.data.id,
				...(checkout.data.attributes.expires_at && {
					expiresAt: new Date(checkout.data.attributes.expires_at),
				}),
			};
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					variantId: params.productId,
				},
				"Failed to create LemonSqueezy checkout"
			);
			throw error;
		}
	}

	/**
	 * Verify webhook signature
	 */
	async verifyWebhook(signature: string, rawBody: string): Promise<WebhookEvent | null> {
		try {
			// LemonSqueezy uses HMAC SHA256 for webhook verification
			const hmac = crypto.createHmac("sha256", this.webhookSecret);
			hmac.update(rawBody);
			const digest = hmac.digest("hex");

			if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
				this.log.warn("LemonSqueezy webhook signature verification failed");
				return null;
			}

			const payload: LemonSqueezyWebhookPayload = JSON.parse(rawBody);

			return {
				id: payload.meta.webhook_id,
				type: payload.meta.event_name,
				data: payload.data,
				rawBody,
			};
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
				},
				"Failed to verify LemonSqueezy webhook"
			);
			return null;
		}
	}

	/**
	 * Extract payment details from webhook event
	 */
	async extractPaymentDetails(event: WebhookEvent): Promise<PaymentDetails | null> {
		try {
			const payload = event.data as {
				id: string;
				type: string;
				attributes: Record<string, unknown>;
			};

			// Handle order_created event (successful payment)
			if (event.type === "order_created") {
				const attrs = payload.attributes;

				return {
					transactionId: payload.id,
					amount: Number(attrs["total"]) / 100, // LemonSqueezy returns cents
					currency: String(attrs["currency"] || "usd"),
					status: String(attrs["status"]) === "paid" ? "succeeded" : "pending",
					customerId: String(attrs["customer_id"] || ""),
					customerEmail: String(attrs["user_email"] || ""),
					metadata: (attrs["custom_data"] as Record<string, string>) || {},
				};
			}

			// Handle subscription_created event
			if (event.type === "subscription_created") {
				const attrs = payload.attributes;

				return {
					transactionId: payload.id,
					amount: 0,
					currency: "usd",
					status: "succeeded",
					customerId: String(attrs["customer_id"] || ""),
					customerEmail: String(attrs["user_email"] || ""),
					subscriptionId: payload.id,
					metadata: (attrs["custom_data"] as Record<string, string>) || {},
				};
			}

			// Handle subscription_updated event
			if (event.type === "subscription_updated") {
				const attrs = payload.attributes;

				return {
					transactionId: payload.id,
					amount: 0,
					currency: "usd",
					status: String(attrs["status"]) === "active" ? "succeeded" : "pending",
					customerId: String(attrs["customer_id"] || ""),
					customerEmail: String(attrs["user_email"] || ""),
					subscriptionId: payload.id,
					metadata: (attrs["custom_data"] as Record<string, string>) || {},
				};
			}

			// Handle subscription_cancelled event
			if (event.type === "subscription_cancelled") {
				const attrs = payload.attributes;

				return {
					transactionId: payload.id,
					amount: 0,
					currency: "usd",
					status: "canceled",
					customerId: String(attrs["customer_id"] || ""),
					customerEmail: String(attrs["user_email"] || ""),
					subscriptionId: payload.id,
					metadata: (attrs["custom_data"] as Record<string, string>) || {},
				};
			}

			// Handle subscription_payment_failed event
			if (event.type === "subscription_payment_failed") {
				const attrs = payload.attributes;

				return {
					transactionId: payload.id,
					amount: Number(attrs["amount"] || 0) / 100,
					currency: "usd",
					status: "failed",
					customerId: String(attrs["customer_id"] || ""),
					customerEmail: String(attrs["user_email"] || ""),
					subscriptionId: String(attrs["subscription_id"] || ""),
					metadata: (attrs["custom_data"] as Record<string, string>) || {},
				};
			}

			// Handle subscription_payment_refunded event
			if (event.type === "subscription_payment_refunded") {
				const attrs = payload.attributes;

				return {
					transactionId: payload.id,
					amount: Number(attrs["refunded_amount"] || 0) / 100,
					currency: "usd",
					status: "refunded",
					customerId: String(attrs["customer_id"] || ""),
					customerEmail: String(attrs["user_email"] || ""),
					metadata: (attrs["custom_data"] as Record<string, string>) || {},
				};
			}

			this.log.debug({ eventType: event.type }, "LemonSqueezy event type not handled");
			return null;
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					eventType: event.type,
				},
				"Failed to extract LemonSqueezy payment details"
			);
			return null;
		}
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(subscriptionId: string, immediate = false): Promise<void> {
		try {
			const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
				method: "DELETE",
				headers: {
					Accept: "application/vnd.api+json",
					Authorization: `Bearer ${this.apiKey}`,
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`LemonSqueezy API error: ${response.status} ${errorText}`);
			}

			this.log.info({ subscriptionId, immediate }, "LemonSqueezy subscription canceled");
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					subscriptionId,
				},
				"Failed to cancel LemonSqueezy subscription"
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
					Accept: "application/vnd.api+json",
					Authorization: `Bearer ${this.apiKey}`,
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				const errorText = await response.text();
				throw new Error(`LemonSqueezy API error: ${response.status} ${errorText}`);
			}

			const subscription = await response.json();
			const attrs = subscription.data.attributes;

			return {
				subscriptionId: subscription.data.id,
				status: this.mapLemonSqueezyStatus(attrs["status"]),
				currentPeriodStart: new Date(attrs.renews_at),
				currentPeriodEnd: new Date(attrs.ends_at || attrs.renews_at),
				cancelAtPeriodEnd: attrs.cancelled,
			};
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					subscriptionId,
				},
				"Failed to get LemonSqueezy subscription"
			);
			return null;
		}
	}

	/**
	 * Create product in LemonSqueezy
	 */
	async createProduct(params: CreateProductParams): Promise<CreateProductResult> {
		try {
			const productData = {
				data: {
					type: "products",
					attributes: {
						store_id: Number.parseInt(this.storeId, 10),
						name: params.name,
						description: params.description || "",
					},
				},
			};

			const response = await fetch(`${this.baseUrl}/products`, {
				method: "POST",
				headers: {
					Accept: "application/vnd.api+json",
					"Content-Type": "application/vnd.api+json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(productData),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`LemonSqueezy API error: ${response.status} ${errorText}`);
			}

			const product: LemonSqueezyProduct = await response.json();

			this.log.info(
				{
					productId: product.data.id,
					name: params.name,
				},
				"LemonSqueezy product created"
			);

			return {
				productId: product.data.id,
				name: product.data.attributes.name,
			};
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					name: params.name,
				},
				"Failed to create LemonSqueezy product"
			);
			throw error;
		}
	}

	/**
	 * Create price (variant) in LemonSqueezy
	 */
	async createPrice(params: CreatePriceParams): Promise<CreatePriceResult> {
		try {
			const variantData = {
				data: {
					type: "variants",
					attributes: {
						product_id: Number.parseInt(params.productId, 10),
						name: `${params.interval === "one_time" ? "One-time" : params.interval === "month" ? "Monthly" : "Yearly"}`,
						price: params.amountCents,
						interval: params.interval === "one_time" ? null : params.interval,
						interval_count: params.interval === "one_time" ? null : 1,
					},
				},
			};

			const response = await fetch(`${this.baseUrl}/variants`, {
				method: "POST",
				headers: {
					Accept: "application/vnd.api+json",
					"Content-Type": "application/vnd.api+json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(variantData),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`LemonSqueezy API error: ${response.status} ${errorText}`);
			}

			const variant: LemonSqueezyVariant = await response.json();

			this.log.info(
				{
					variantId: variant.data.id,
					productId: params.productId,
					price: params.amountCents,
					interval: params.interval,
				},
				"LemonSqueezy variant created"
			);

			return {
				priceId: variant.data.id,
				productId: params.productId,
				amountCents: variant.data.attributes.price,
				currency: params.currency,
				interval: params.interval,
			};
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					productId: params.productId,
					amountCents: params.amountCents,
				},
				"Failed to create LemonSqueezy variant"
			);
			throw error;
		}
	}

	async createRefund(_params: CreateRefundParams): Promise<RefundResult> {
		// LemonSqueezy handles refunds through their dashboard.
		// API-initiated refunds are not supported in their current API.
		throw new Error("LemonSqueezy does not support API-initiated refunds");
	}

	/**
	 * Map LemonSqueezy status to our standard status
	 */
	private mapLemonSqueezyStatus(status: string): "active" | "canceled" | "past_due" | "trialing" {
		switch (status) {
			case "active":
				return "active";
			case "cancelled":
				return "canceled";
			case "past_due":
				return "past_due";
			case "on_trial":
				return "trialing";
			default:
				return "active";
		}
	}
}
