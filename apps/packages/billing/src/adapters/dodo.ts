/**
 * Dodo Payment Provider Adapter
 *
 * Implements payment provider interface for Dodo Payments using the official SDK.
 * Documentation: https://docs.dodopayments.com/
 */

import { createLogger, serializeError } from "@nube-auth/shared";
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
			// billing_currency activates Dodo's Adaptive Currency feature so the
			// customer sees and pays in the price's native currency (e.g. INR via UPI).
			// Without this, Dodo defaults to USD display regardless of the product price currency.
			type DodoBillingCurrency = NonNullable<
				Parameters<typeof this.client.checkoutSessions.create>[0]["billing_currency"]
			>;

			const session = await this.client.checkoutSessions.create({
				product_cart: [
					{
						product_id: params.productId,
						quantity: params.quantity ?? 1,
					},
				],
				// Prevent customers from applying arbitrary discount codes on the hosted checkout UI.
				// We still pass `discount_code` above to pre-apply the Nube-resolved coupon.
				feature_flags: {
					allow_discount_code: false,
				},
				customer: {
					email: params.customerEmail,
					...(params.customerId ? { customer_id: params.customerId } : {}),
				},
				return_url: params.successUrl,
				metadata: params.metadata ?? null,
				...(params.billingCurrency
					? { billing_currency: params.billingCurrency.toUpperCase() as DodoBillingCurrency }
					: {}),
				...(params.trialPeriodDays ? { subscription_data: { trial_period_days: params.trialPeriodDays } } : {}),
				// Prefer the resolved provider coupon id (our internal Dodo discount code)
				...(params.providerCoupon
					? { discount_code: params.providerCoupon.id }
					: params.promoCode
						? { discount_code: params.promoCode }
						: {}),
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
			this.log.error({ err: serializeError(error as Error) }, "Dodo webhook verification failed");
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
				// These events are state changes and don't always indicate a completed charge.
				// Actual money movement should be handled by payment.* or subscription.renewed events.
				return null;
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

	private extractFromPayment(data: Record<string, unknown>, status: PaymentDetails["status"]): PaymentDetails {
		const customer = data["customer"] as { customer_id?: string; email?: string } | undefined;
		const metadata = (data["metadata"] as Record<string, string>) ?? {};
		const totalAmount = Number(data["total_amount"] ?? 0);
		const taxAmount = Number(data["tax"] ?? 0);
		const preTaxAmount = Number(
			data["pre_tax_amount"] ??
				(Number.isFinite(totalAmount) && Number.isFinite(taxAmount) ? totalAmount - taxAmount : totalAmount),
		);
		return {
			transactionId: String(data["payment_id"] ?? ""),
			amount: preTaxAmount,
			currency: String(data["currency"] ?? "usd").toLowerCase(),
			status,
			customerId: customer?.customer_id ?? "",
			customerEmail: customer?.email ?? "",
			...(data["subscription_id"] ? { subscriptionId: String(data["subscription_id"]) } : {}),
			metadata,
		};
	}

	private extractFromSubscription(data: Record<string, unknown>, status: PaymentDetails["status"]): PaymentDetails {
		const customer = data["customer"] as { customer_id?: string; email?: string } | undefined;
		const metadata = (data["metadata"] as Record<string, string>) ?? {};
		const subscriptionId = String(data["subscription_id"] ?? "");
		// Each renewal has a unique previous_billing_date (start of the billing cycle just charged).
		// Using it as a suffix makes provider_transaction_id unique per renewal, preventing
		// the unique(provider_config_id, provider_transaction_id) constraint from failing
		// when the same subscription is renewed multiple times.
		const previousBillingDate = data["previous_billing_date"] as string | undefined;
		const transactionId = previousBillingDate ? `${subscriptionId}_${previousBillingDate}` : subscriptionId;
		return {
			transactionId,
			amount: Number(data["recurring_pre_tax_amount"] ?? 0),
			currency: String(data["currency"] ?? "usd").toLowerCase(),
			status,
			customerId: customer?.customer_id ?? "",
			customerEmail: customer?.email ?? "",
			subscriptionId: subscriptionId,
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
			currency: String(data["currency"] ?? "usd").toLowerCase(),
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
			this.log.error({ err: serializeError(error as Error), subscriptionId }, "Failed to get Dodo subscription");
			return null;
		}
	}

	/**
	 * No-op for Dodo — Dodo has no separate "product" concept.
	 * Each price point IS its own product in Dodo's data model, created by createPrice.
	 * Returning a sentinel so the sync worker can proceed to createPrice calls.
	 */
	async createProduct(params: CreateProductParams): Promise<CreateProductResult> {
		this.log.info({ name: params.name }, "Dodo: skipping createProduct (each price is its own Dodo product)");
		return { productId: "__dodo_no_product__", name: params.name };
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

			// Dodo's SDK type for currency — cast required because the SDK uses a
			// branded string union. We validate currency upstream via CurrencyCodeSchema.
			type DodoCurrency = Parameters<typeof this.client.products.create>[0]["price"]["currency"];
			const dodoCurrency = params.currency.toUpperCase() as DodoCurrency;

			// Use the rich label from the sync worker (e.g. "Pro — Monthly (USD 9.99)").
			// In Dodo each "price" is its own product, so the label becomes the product name.
			const priceName =
				params.label ??
				`${params.currency.toUpperCase()} ${(params.amountCents / 100).toFixed(2)} ${params.interval}`;

			const product = await this.client.products.create({
				name: priceName,
				price: isRecurring
					? {
							currency: dodoCurrency,
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
							currency: dodoCurrency,
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
	 * Create a Dodo Discount for a Nube promotion.
	 * Dodo discounts are identified by a code string. We generate an internal
	 * code so many Nube promotion_codes can all resolve to this one Dodo discount.
	 *
	 * Amount encoding:
	 *  - percentage: basis points  (10% → 1000, 5.4% → 540)
	 *  - flat:       USD cents      ($1.00 → 100)  — Dodo only allows USD for flat
	 *
	 * Product restriction: pass params.restrictedToProductIds to limit which
	 * Dodo products (= our external_price_id values) the discount applies to.
	 */
	async createCoupon(
		params: import("./types.js").CreateCouponParams,
	): Promise<import("./types.js").CreateCouponResult> {
		try {
			const internalCode = `NUBE-${params.name
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, "")
				.substring(0, 25)}-${Date.now().toString(36).toUpperCase()}`;

			// Dodo percentage amounts are in basis points (100 basis points = 1%)
			const amount =
				params.discountType === "percent"
					? params.discountValue * 100 // e.g. 10% → 1000 basis points
					: params.discountValue; // flat: already in USD cents

			const discount = await this.client.discounts.create({
				name: params.name,
				code: internalCode,
				type: "percentage" as Parameters<typeof this.client.discounts.create>[0]["type"],
				amount,
				...(params.maxRedemptions && { usage_limit: params.maxRedemptions }),
				...(params.expiresAt && { expires_at: params.expiresAt.toISOString() }),
				...(params.restrictedToProductIds?.length && { restricted_to: params.restrictedToProductIds }),
			} as Parameters<typeof this.client.discounts.create>[0]);

			this.log.info({ discountId: discount.discount_id, code: internalCode }, "Dodo discount created");

			return { couponId: internalCode, objectType: "discount" };
		} catch (error) {
			this.log.error(
				{ err: serializeError(error as Error), name: params.name },
				"Failed to create Dodo discount",
			);
			throw error;
		}
	}

	/**
	 * Delete a Dodo Discount by code.
	 */
	async deleteCoupon(discountCode: string): Promise<void> {
		try {
			// Dodo SDK: look up discounts and delete by ID
			const list = await this.client.discounts.list({ page_size: 100 });
			const match = list.items?.find((d: any) => d.code === discountCode);
			if (!match) {
				this.log.warn({ discountCode }, "Dodo discount not found — skipping delete");
				return;
			}
			await this.client.discounts.delete(match.discount_id);
			this.log.info({ discountCode, discountId: match.discount_id }, "Dodo discount deleted");
		} catch (error) {
			this.log.error({ err: serializeError(error as Error), discountCode }, "Failed to delete Dodo discount");
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

			this.log.info({ refundId: refund.refund_id, paymentId: params.paymentId }, "Dodo refund created");

			return {
				refundId: refund.refund_id,
				status: refund.status === "review" ? "pending" : refund.status,
				amount: refund.amount ?? 0,
				currency: ((refund.currency as string) ?? "usd").toLowerCase(),
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
