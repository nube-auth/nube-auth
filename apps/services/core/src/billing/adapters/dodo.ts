/**
 * Dodo Payment Provider Adapter
 *
 * Implements payment provider interface for Dodo Payments using the official SDK.
 * Documentation: https://docs.dodopayments.com/
 */

import { createLogger, serializeError } from "@proofa/shared";
import DodoPayments from "dodopayments";
import type { UnwrapWebhookEvent } from "dodopayments/resources/webhooks/webhooks.js";
import type {
	CheckoutSession,
	CreateCheckoutParams,
	CreatePriceParams,
	CreatePriceResult,
	CreateProductParams,
	CreateProductResult,
	CreateRefundParams,
	DodoCredentials,
	PaymentDetails,
	PaymentProviderAdapter,
	RefundResult,
	SubscriptionDetails,
	WebhookEvent,
} from "./types.js";

const log = createLogger("dodo-adapter");

export class DodoAdapter implements PaymentProviderAdapter {
	private client: DodoPayments;
	private webhookSecret: string;
	private log = log;

	constructor(credentials: DodoCredentials) {
		this.webhookSecret = credentials.webhookSecret;
		this.client = new DodoPayments({
			bearerToken: credentials.apiKey,
			environment: credentials.environment,
		});
	}

	/**
	 * Create checkout session using Dodo's hosted checkout page.
	 * params.productId should be the Dodo product_id (stored as external_price_id in our prices table).
	 */
	async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession> {
		try {
			const session = await this.client.checkoutSessions.create({
				product_cart: [
					{
						product_id: params.productId,
						quantity: params.quantity ?? 1,
					},
				],
				customer: {
					email: params.customerEmail,
					...(params.customerId ? { customer_id: params.customerId } : {}),
				},
				return_url: params.successUrl,
				metadata: params.metadata ?? null,
				...(params.trialPeriodDays
					? { subscription_data: { trial_period_days: params.trialPeriodDays } }
					: {}),
				...(params.promoCode ? { discount_code: params.promoCode } : {}),
			});

			this.log.info(
				{ sessionId: session.session_id, productId: params.productId },
				"Dodo checkout session created",
			);

			return {
				checkoutUrl: session.checkout_url ?? "",
				sessionId: session.session_id,
			};
		} catch (error) {
			this.log.error(
				{ err: serializeError(error as Error), productId: params.productId },
				"Failed to create Dodo checkout",
			);
			throw error;
		}
	}

	/**
	 * Verify webhook using Standard Webhooks spec (webhook-id, webhook-signature, webhook-timestamp).
	 * The `signature` param is a JSON-encoded object of the three Standard Webhooks headers,
	 * packed by the webhook route handler.
	 */
	async verifyWebhook(signature: string, rawBody: string): Promise<WebhookEvent | null> {
		try {
			let headers: Record<string, string>;
			try {
				headers = JSON.parse(signature) as Record<string, string>;
			} catch {
				this.log.warn("Dodo webhook: signature is not valid JSON headers object");
				return null;
			}

			const event: UnwrapWebhookEvent = this.client.webhooks.unwrap(rawBody, {
				headers,
				key: this.webhookSecret,
			});

			return {
				id: `${event.type}-${event.timestamp}`,
				type: event.type,
				data: event.data,
				rawBody,
			};
		} catch (error) {
			this.log.error(
				{ err: serializeError(error as Error) },
				"Dodo webhook verification failed",
			);
			return null;
		}
	}

	/**
	 * Extract payment details from a verified Dodo webhook event.
	 */
	async extractPaymentDetails(event: WebhookEvent): Promise<PaymentDetails | null> {
		try {
			const data = event.data as Record<string, unknown>;

			// Payment events — data is a Dodo Payment object
			if (event.type === "payment.succeeded") {
				return this.extractFromPayment(data, "succeeded");
			}
			if (event.type === "payment.failed") {
				return this.extractFromPayment(data, "failed");
			}
			if (event.type === "payment.cancelled") {
				return this.extractFromPayment(data, "canceled");
			}
			if (event.type === "payment.processing") {
				return this.extractFromPayment(data, "pending");
			}

			// Subscription events — data is a Dodo Subscription object
			if (event.type === "subscription.active" || event.type === "subscription.renewed") {
				return this.extractFromSubscription(data, "succeeded");
			}
			if (event.type === "subscription.updated" || event.type === "subscription.plan_changed") {
				return this.extractFromSubscription(data, "succeeded");
			}
			if (event.type === "subscription.cancelled" || event.type === "subscription.expired") {
				return this.extractFromSubscription(data, "canceled");
			}
			if (event.type === "subscription.on_hold" || event.type === "subscription.failed") {
				return this.extractFromSubscription(data, "failed");
			}

			// Refund events — data is a Dodo Refund object
			if (event.type === "refund.succeeded") {
				return this.extractFromRefund(data);
			}

			this.log.debug({ eventType: event.type }, "Dodo event type not handled");
			return null;
		} catch (error) {
			this.log.error(
				{ err: serializeError(error as Error), eventType: event.type },
				"Failed to extract Dodo payment details",
			);
			return null;
		}
	}

	private extractFromPayment(
		data: Record<string, unknown>,
		status: PaymentDetails["status"],
	): PaymentDetails {
		const customer = data["customer"] as { customer_id?: string; email?: string } | undefined;
		const metadata = (data["metadata"] as Record<string, string>) ?? {};
		return {
			transactionId: String(data["payment_id"] ?? ""),
			amount: Number(data["total_amount"] ?? 0),
			currency: String(data["currency"] ?? "USD"),
			status,
			customerId: customer?.customer_id ?? "",
			customerEmail: customer?.email ?? "",
			...(data["subscription_id"] ? { subscriptionId: String(data["subscription_id"]) } : {}),
			metadata,
		};
	}

	private extractFromSubscription(
		data: Record<string, unknown>,
		status: PaymentDetails["status"],
	): PaymentDetails {
		const customer = data["customer"] as { customer_id?: string; email?: string } | undefined;
		const metadata = (data["metadata"] as Record<string, string>) ?? {};
		return {
			transactionId: String(data["subscription_id"] ?? ""),
			amount: Number(data["recurring_pre_tax_amount"] ?? 0),
			currency: String(data["currency"] ?? "USD"),
			status,
			customerId: customer?.customer_id ?? "",
			customerEmail: customer?.email ?? "",
			subscriptionId: String(data["subscription_id"] ?? ""),
			productId: String(data["product_id"] ?? ""),
			metadata,
		};
	}

	private extractFromRefund(data: Record<string, unknown>): PaymentDetails {
		const customer = data["customer"] as { customer_id?: string; email?: string } | undefined;
		const metadata = (data["metadata"] as Record<string, string>) ?? {};
		return {
			transactionId: String(data["refund_id"] ?? ""),
			amount: Number(data["amount"] ?? 0),
			currency: String(data["currency"] ?? "USD"),
			status: "refunded",
			customerId: customer?.customer_id ?? "",
			customerEmail: customer?.email ?? "",
			metadata,
		};
	}
	/**
	 * Cancel a subscription via Dodo SDK.
	 * If immediate=true, sets status to cancelled. Otherwise cancels at next billing date.
	 */
	async cancelSubscription(subscriptionId: string, immediate = false): Promise<void> {
		try {
			if (immediate) {
				await this.client.subscriptions.update(subscriptionId, { status: "cancelled" });
			} else {
				await this.client.subscriptions.update(subscriptionId, {
					cancel_at_next_billing_date: true,
				});
			}
			this.log.info({ subscriptionId, immediate }, "Dodo subscription canceled");
		} catch (error) {
			this.log.error(
				{ err: serializeError(error as Error), subscriptionId },
				"Failed to cancel Dodo subscription",
			);
			throw error;
		}
	}

	/**
	 * Retrieve subscription details from Dodo.
	 */
	async getSubscription(subscriptionId: string): Promise<SubscriptionDetails | null> {
		try {
			const sub = await this.client.subscriptions.retrieve(subscriptionId);
			return {
				subscriptionId: sub.subscription_id,
				status: this.mapDodoStatus(sub.status),
				currentPeriodStart: new Date(sub.previous_billing_date),
				currentPeriodEnd: new Date(sub.next_billing_date),
				cancelAtPeriodEnd: sub.cancel_at_next_billing_date,
			};
		} catch (error) {
			const err = error as { status?: number };
			if (err.status === 404) {
				return null;
			}
			this.log.error(
				{ err: serializeError(error as Error), subscriptionId },
				"Failed to get Dodo subscription",
			);
			return null;
		}
	}

	/**
	 * Create a product in Dodo.
	 * In Dodo, products contain pricing directly. We create a placeholder one-time product here;
	 * the actual pricing is set via createPrice which creates a separate product per price point.
	 */
	async createProduct(params: CreateProductParams): Promise<CreateProductResult> {
		try {
			const product = await this.client.products.create({
				name: params.name,
				description: params.description ?? null,
				price: {
					currency: "USD",
					discount: 0,
					price: 0,
					purchasing_power_parity: false,
					type: "one_time_price",
				},
				tax_category: "saas",
			});

			this.log.info(
				{ productId: product.product_id, name: params.name },
				"Dodo product created",
			);

			return {
				productId: product.product_id,
				name: params.name,
			};
		} catch (error) {
			this.log.error(
				{ err: serializeError(error as Error), name: params.name },
				"Failed to create Dodo product",
			);
			throw error;
		}
	}

	/**
	 * Create a price in Dodo.
	 * In Dodo, pricing is embedded in products. Each "price" creates a new product
	 * with the appropriate pricing configuration. The returned priceId IS the product_id
	 * which is used in checkout's product_cart.
	 */
	async createPrice(params: CreatePriceParams): Promise<CreatePriceResult> {
		try {
			const isRecurring = params.interval !== "one_time";
			const intervalMap: Record<string, "Month" | "Year"> = {
				month: "Month",
				year: "Year",
			};

			const product = await this.client.products.create({
				name: `Price ${params.amountCents} ${params.currency} ${params.interval}`,
				price: isRecurring
					? {
							currency: params.currency.toUpperCase() as "USD",
							discount: 0,
							price: params.amountCents,
							purchasing_power_parity: false,
							type: "recurring_price",
							payment_frequency_count: 1,
							payment_frequency_interval: intervalMap[params.interval] ?? "Month",
							subscription_period_count: 1,
							subscription_period_interval: intervalMap[params.interval] ?? "Month",
						}
					: {
							currency: params.currency.toUpperCase() as "USD",
							discount: 0,
							price: params.amountCents,
							purchasing_power_parity: false,
							type: "one_time_price",
						},
				tax_category: "saas",
			});

			this.log.info(
				{
					productId: product.product_id,
					amountCents: params.amountCents,
					interval: params.interval,
				},
				"Dodo price (product) created",
			);

			return {
				priceId: product.product_id,
				productId: params.productId,
				amountCents: params.amountCents,
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
				"Failed to create Dodo price",
			);
			throw error;
		}
	}

	/**
	 * Create a refund for a payment via Dodo SDK.
	 */
	async createRefund(params: CreateRefundParams): Promise<RefundResult> {
		try {
			const refund = await this.client.refunds.create({
				payment_id: params.paymentId,
				...(params.reason ? { reason: params.reason } : {}),
			});

			this.log.info(
				{ refundId: refund.refund_id, paymentId: params.paymentId },
				"Dodo refund created",
			);

			return {
				refundId: refund.refund_id,
				status: refund.status === "review" ? "pending" : refund.status,
				amount: refund.amount ?? 0,
				currency: (refund.currency as string) ?? "USD",
			};
		} catch (error) {
			this.log.error(
				{ err: serializeError(error as Error), paymentId: params.paymentId },
				"Failed to create Dodo refund",
			);
			throw error;
		}
	}

	private mapDodoStatus(status: string): "active" | "canceled" | "past_due" | "trialing" {
		switch (status) {
			case "active":
				return "active";
			case "cancelled":
			case "canceled":
				return "canceled";
			case "on_hold":
			case "failed":
				return "past_due";
			case "pending":
				return "trialing";
			default:
				return "active";
		}
	}
}
