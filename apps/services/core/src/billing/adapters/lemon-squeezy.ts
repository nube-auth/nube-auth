/**
 * LemonSqueezy Payment Provider Adapter
 *
 * Implements PaymentProviderAdapter for LemonSqueezy integration
 */

import { createLogger } from "@proofa/shared";
import type {
	PaymentProviderAdapter,
	ProviderAdapterConfig,
	ProviderCheckoutSession,
	CheckoutSessionMetadata,
	PaymentTransaction,
	VerifiedWebhookPayload,
} from "./types.js";

const log = createLogger("lemon-squeezy-adapter");

interface LemonSqueezyCheckout {
	id: string;
	attributes: {
		checkout_options: {
			embed: boolean;
			media: boolean;
			logo: boolean;
		};
		created_at: string;
		expires_at?: string;
		preview_url?: string;
		redirect_url?: string;
		url: string;
		product_id: string;
		product_name: string;
		variant_id: string;
		variant_name: string;
		custom_price?: number;
		currency?: string;
		discount_code?: string;
		discount_percent?: number;
		expires: boolean;
		test_mode: boolean;
	};
}

interface LemonSqueezyOrder {
	id: string;
	attributes: {
		order_number: string;
		customer_id: string;
		product_id: string;
		variant_id: string;
		product_name: string;
		variant_name: string;
		user_name: string;
		user_email: string;
		currency: string;
		currency_rate: string;
		subtotal: string;
		tax: string;
		total: string;
		tax_name: string;
		tax_rate: string;
		status: string;
		status_formatted: string;
		refunded?: boolean;
		refunded_at?: string;
		created_at: string;
		updated_at: string;
	};
}

export class LemonSqueezyAdapter implements PaymentProviderAdapter {
	provider = "lemon_squeezy" as const;
	private apiKey: string | null = null;
	private storeId: string | null = null;
	private webhookSecret: string | null = null;
	private environment: "test" | "live" = "test";
	private baseUrl = "https://api.lemonsqueezy.com/v1";

	async initialize(config: ProviderAdapterConfig): Promise<void> {
		if (config.provider !== "lemon_squeezy") {
			throw new Error("LemonSqueezyAdapter requires provider type 'lemon_squeezy'");
		}

		const apiKey = config.credentials.secretKey;
		const storeId = config.credentials.publishableKey; // Store ID passed as publishableKey

		if (!apiKey || !storeId) {
			throw new Error("LemonSqueezy adapter requires credentials.secretKey and credentials.publishableKey (store ID)");
		}

		this.apiKey = apiKey;
		this.storeId = storeId;
		this.webhookSecret = config.webhookSecret || null;
		this.environment = config.environment;

		log.info({ environment: this.environment, storeId }, "LemonSqueezy adapter initialized");
	}

	async createCheckoutSession(
		planName: string,
		amount: number,
		_currency: string,
		metadata: CheckoutSessionMetadata,
		options?: {
			trialDays?: number;
			successUrl?: string;
			cancelUrl?: string;
		},
	): Promise<ProviderCheckoutSession> {
		if (!this.apiKey || !this.storeId) {
			throw new Error("LemonSqueezy adapter not initialized");
		}

		try {
			// Create variant product if not exists
			// In LemonSqueezy, we create a one-time checkout without variant management in Phase 1
			const customPrice = Math.round(amount / 100); // Convert cents to dollars

			const checkoutData = {
				data: {
					type: "checkouts",
					attributes: {
						product_id: this.storeId, // Product ID from store
						custom_price: customPrice,
						checkout_data: {
							name: metadata.customMetadata?.fullName || "Customer",
							email: metadata.customMetadata?.email || "",
							tax_number: metadata.customMetadata?.taxNumber || "",
							billing_address: {
								country: metadata.customMetadata?.country || "",
							},
							customer_data: {
								custom: {
									userId: metadata.userId.toString(),
									appId: metadata.appId.toString(),
									planProvidePriceId: metadata.planProvidePriceId.toString(),
									purchaseId: metadata.purchaseId.toString(),
									...(metadata.promotionCodeId && {
										promotionCodeId: metadata.promotionCodeId.toString(),
									}),
								},
							},
						},
						preview: false,
						redirect_url: options?.successUrl || `${process.env.FRONTEND_URL}/checkout/success`,
						expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
					},
					relationships: {
						store: {
							data: {
								type: "stores",
								id: this.storeId,
							},
						},
					},
				},
			};

			const response = await fetch(`${this.baseUrl}/checkouts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/vnd.api+json",
					Accept: "application/vnd.api+json",
				},
				body: JSON.stringify(checkoutData),
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`LemonSqueezy API error: ${response.status} - ${error}`);
			}

			const result = await response.json() as { data: LemonSqueezyCheckout };
			const checkout = result.data;

			return {
				id: checkout.id,
				provider: "lemon_squeezy",
				url: checkout.attributes.url,
				expiresAt: checkout.attributes.expires_at ? new Date(checkout.attributes.expires_at) : undefined,
				metadata,
				providerSessionId: checkout.id,
			};
		} catch (error) {
			log.error({ err: error as Error, planName, amount }, "Failed to create LemonSqueezy checkout");
			throw error;
		}
	}

	async getSession(providerSessionId: string): Promise<ProviderCheckoutSession | null> {
		if (!this.apiKey) {
			throw new Error("LemonSqueezy adapter not initialized");
		}

		try {
			const response = await fetch(`${this.baseUrl}/checkouts/${providerSessionId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					Accept: "application/vnd.api+json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`LemonSqueezy API error: ${response.status}`);
			}

			const result = await response.json() as { data: LemonSqueezyCheckout };
			const checkout = result.data;

			// Parse custom data from checkout
			const customData = (checkout.attributes as unknown as Record<string, unknown>).custom_data || {};

			const metadata: CheckoutSessionMetadata = {
				userId: parseInt((customData as Record<string, unknown>).userId as string || "0", 10),
				appId: parseInt((customData as Record<string, unknown>).appId as string || "0", 10),
				planProvidePriceId: parseInt((customData as Record<string, unknown>).planProvidePriceId as string || "0", 10),
				purchaseId: parseInt((customData as Record<string, unknown>).purchaseId as string || "0", 10),
			};

			return {
				id: checkout.id,
				provider: "lemon_squeezy",
				url: checkout.attributes.url,
				expiresAt: checkout.attributes.expires_at ? new Date(checkout.attributes.expires_at) : undefined,
				metadata,
				providerSessionId: checkout.id,
			};
		} catch (error) {
			log.error({ err: error as Error, sessionId: providerSessionId }, "Failed to get LemonSqueezy session");
			throw error;
		}
	}

	async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
		if (!this.apiKey) {
			throw new Error("LemonSqueezy adapter not initialized");
		}

		try {
			const response = await fetch(`${this.baseUrl}/orders/${transactionId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					Accept: "application/vnd.api+json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`LemonSqueezy API error: ${response.status}`);
			}

			const result = await response.json() as { data: LemonSqueezyOrder };
			const order = result.data;
			const attrs = order.attributes;

			return {
				id: order.id,
				providerSessionId: order.id,
				amount: Math.round(parseFloat(attrs.total) * 100), // Convert to cents
				currency: attrs.currency,
				status: attrs.refunded ? "refunded" : (attrs.status === "completed" ? "completed" : "pending"),
				createdAt: new Date(attrs.created_at),
				metadata: {
					orderNumber: attrs.order_number,
				},
			};
		} catch (error) {
			log.error({ err: error as Error, transactionId }, "Failed to get LemonSqueezy transaction");
			throw error;
		}
	}

	async verifyWebhook(rawBody: string, signature: string): Promise<VerifiedWebhookPayload | null> {
		if (!this.webhookSecret) {
			log.warn("LemonSqueezy webhook verification skipped - webhook secret not configured");
			return null;
		}

		try {
			// LemonSqueezy uses HMAC-SHA256 for webhook signatures
			const crypto = await import("crypto");
			const hmac = crypto.createHmac("sha256", this.webhookSecret);
			hmac.update(rawBody);
			const expectedSignature = hmac.digest("hex");

			if (signature !== expectedSignature) {
				log.warn("LemonSqueezy webhook signature verification failed");
				return null;
			}

			const payload = JSON.parse(rawBody) as {
				meta: { event_name: string; created_at: string };
				data: {
					id: string;
					type: string;
					attributes: Record<string, unknown>;
				};
			};

			const eventType = payload.meta.event_name;
			const data = payload.data;

			switch (eventType) {
				case "order:completed": {
					const attrs = data.attributes as LemonSqueezyOrder["attributes"];
					return {
						event: {
							provider: "lemon_squeezy",
							type: eventType,
							data: data.attributes,
							rawSignature: signature,
							timestamp: new Date(payload.meta.created_at),
						},
						transactionId: data.id,
						amount: Math.round(parseFloat(attrs.total) * 100),
						currency: attrs.currency,
						status: "completed",
						customData: {
							orderNumber: attrs.order_number,
							customerEmail: attrs.user_email,
						},
					};
				}

				case "order:refunded": {
					const attrs = data.attributes as LemonSqueezyOrder["attributes"];
					return {
						event: {
							provider: "lemon_squeezy",
							type: eventType,
							data: data.attributes,
							rawSignature: signature,
							timestamp: new Date(payload.meta.created_at),
						},
						transactionId: data.id,
						status: "refunded",
						customData: {
							orderNumber: attrs.order_number,
						},
					};
				}

				default: {
					log.debug({ eventType }, "Unhandled LemonSqueezy webhook event");
					return {
						event: {
							provider: "lemon_squeezy",
							type: eventType,
							data: data.attributes,
							rawSignature: signature,
							timestamp: new Date(payload.meta.created_at),
						},
					};
				}
			}
		} catch (error) {
			log.error({ err: error as Error }, "LemonSqueezy webhook verification failed");
			return null;
		}
	}

	async refund(transactionId: string, amount?: number): Promise<{
		refundId: string;
		status: string;
		amount: number;
	}> {
		if (!this.apiKey) {
			throw new Error("LemonSqueezy adapter not initialized");
		}

		try {
			// LemonSqueezy refunds are handled through their API
			// In Phase 1, we don't support partial refunds
			const refundData = {
				data: {
					type: "order_refunds",
					attributes: {
						...(amount && { amount: (amount / 100).toFixed(2) }),
					},
					relationships: {
						order: {
							data: {
								type: "orders",
								id: transactionId,
							},
						},
					},
				},
			};

			const response = await fetch(`${this.baseUrl}/order-refunds`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/vnd.api+json",
					Accept: "application/vnd.api+json",
				},
				body: JSON.stringify(refundData),
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`LemonSqueezy API error: ${response.status} - ${error}`);
			}

			const result = await response.json() as { data: { id: string; attributes: { status?: string; amount?: string } } };

			return {
				refundId: result.data.id,
				status: result.data.attributes.status || "pending",
				amount: amount || 0,
			};
		} catch (error) {
			log.error({ err: error as Error, transactionId }, "Failed to create LemonSqueezy refund");
			throw error;
		}
	}

	async getRefund(_refundId: string): Promise<{
		id: string;
		transactionId: string;
		amount: number;
		status: string;
		createdAt: Date;
	} | null> {
		// Phase 1: Implement in Phase 2
		log.warn("Refund retrieval not implemented for Phase 1");
		return null;
	}

	async cancelSubscription(_providerSubscriptionId: string): Promise<boolean> {
		// LemonSqueezy subscriptions for Phase 2
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
		// LemonSqueezy subscription updates for Phase 2
		log.warn("Subscription update not implemented for Phase 1");
		return false;
	}

	async getProviderPriceId(planId: number, _interval: string): Promise<string | null> {
		// Phase 1: Implement price syncing in Phase 2
		log.debug({ planId }, "Price lookup not yet synced with LemonSqueezy");
		return null;
	}

	async syncPrice(
		planId: number,
		interval: string,
		amount: number,
		_currency: string,
	): Promise<string> {
		// Phase 1: Store the price ID locally, actual LemonSqueezy sync in Phase 2
		const priceId = `lemon_${planId}_${interval}_${amount}`;
		log.info({ planId, priceId }, "LemonSqueezy price synced (Phase 1 mock)");
		return priceId;
	}

	async healthCheck(): Promise<boolean> {
		if (!this.apiKey) {
			return false;
		}

		try {
			const response = await fetch(`${this.baseUrl}/stores`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					Accept: "application/vnd.api+json",
				},
			});

			return response.ok;
		} catch {
			return false;
		}
	}

	async cleanup(): Promise<void> {
		this.apiKey = null;
		this.storeId = null;
		log.info("LemonSqueezy adapter cleaned up");
	}
}
