/**
 * Stripe Payment Provider Adapter
 * 
 * Implements PaymentProviderAdapter for Stripe.
 * Handles checkout session creation, webhook processing, and subscription management.
 */

import Stripe from "stripe";
import { createLogger, serializeError } from "@nube-auth/shared";
import type {
	CheckoutSession,
	CreateCheckoutParams,
	CreateRefundParams,
	PaymentDetails,
	PaymentProviderAdapter,
	RefundResult,
	StripeCredentials,
	SubscriptionDetails,
	WebhookEvent,
} from "./types.js";

export class StripeAdapter implements PaymentProviderAdapter {
	private stripe: Stripe;
	private webhookSecret: string;
	private log = createLogger("StripeAdapter");

	constructor(credentials: StripeCredentials) {
		this.stripe = new Stripe(credentials.secretKey, {
			apiVersion: "2025-02-24.acacia",
			typescript: true,
		});
		this.webhookSecret = credentials.webhookSecret;
		this.log.debug("Stripe adapter initialized");
	}

	/**
	 * Create Stripe checkout session
	 */
	async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession> {
		try {
			const sessionParams: Stripe.Checkout.SessionCreateParams = {
				mode: params.mode || "subscription",
				line_items: [
					{
						price: params.productId, // Stripe Price ID
						quantity: params.quantity || 1,
					},
				],
				success_url: params.successUrl,
				cancel_url: params.cancelUrl,
				customer_email: params.customerEmail,
				allow_promotion_codes: true,
			};

			// Add metadata if provided
			if (params.metadata) {
				sessionParams.metadata = params.metadata;
			}

			// Add promotional code if provided
			if (params.promoCode) {
				sessionParams.discounts = [{ promotion_code: params.promoCode }];
			}

			// Add trial period for subscriptions
			if (params.mode === "subscription" && params.trialPeriodDays) {
				sessionParams.subscription_data = {
					trial_period_days: params.trialPeriodDays,
				};
			}

			const session = await this.stripe.checkout.sessions.create(sessionParams);

			this.log.info(
				{
					sessionId: session.id,
					customerId: params.customerId,
					mode: params.mode,
				},
				"Stripe checkout session created"
			);

			const result: CheckoutSession = {
				checkoutUrl: session.url || "",
				sessionId: session.id,
			};

			if (session.expires_at) {
				result.expiresAt = new Date(session.expires_at * 1000);
			}

			return result;
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					customerId: params.customerId,
				},
				"Failed to create Stripe checkout session"
			);
			throw error;
		}
	}

	/**
	 * Verify Stripe webhook signature
	 */
	async verifyWebhook(signature: string, rawBody: string): Promise<WebhookEvent | null> {
		try {
			const event = this.stripe.webhooks.constructEvent(
				rawBody,
				signature,
				this.webhookSecret
			);

			this.log.debug({ eventType: event.type, eventId: event.id }, "Webhook verified");

			return {
				id: event.id,
				type: event.type,
				data: event.data.object,
				rawBody,
			};
		} catch (error) {
			this.log.error(
				{ err: serializeError(error as Error) },
				"Webhook signature verification failed"
			);
			return null;
		}
	}

	/**
	 * Extract payment details from webhook event
	 */
	async extractPaymentDetails(event: WebhookEvent): Promise<PaymentDetails | null> {
		try {
			// Handle checkout.session.completed
			if (event.type === "checkout.session.completed") {
				const session = event.data as Stripe.Checkout.Session;

				// Retrieve full session with line items
				const fullSession = await this.stripe.checkout.sessions.retrieve(session.id, {
					expand: ["line_items", "subscription"],
				});

				const result: PaymentDetails = {
					transactionId: fullSession.payment_intent as string,
					amount: (fullSession.amount_total || 0) / 100, // Convert cents to dollars
					currency: fullSession.currency || "usd",
					status: fullSession.payment_status === "paid" ? "succeeded" : "pending",
					customerId: fullSession.customer as string,
					customerEmail: fullSession.customer_email || "",
				};

				if (fullSession.metadata) {
					result.metadata = fullSession.metadata as Record<string, string>;
				}

				if (fullSession.subscription) {
					result.subscriptionId = fullSession.subscription as string;
				}

				this.log.info(
					{
						transactionId: result.transactionId,
						amount: result.amount,
						customerId: result.customerId,
					},
					"Payment details extracted from checkout session"
				);

				return result;
			}

			// Handle invoice.payment_succeeded (for subscription renewals)
			if (event.type === "invoice.payment_succeeded") {
				const invoice = event.data as Stripe.Invoice;

				const result: PaymentDetails = {
					transactionId: invoice.payment_intent as string,
					amount: (invoice.amount_paid || 0) / 100,
					currency: invoice.currency,
					status: invoice.status === "paid" ? "succeeded" : "failed",
					customerId: invoice.customer as string,
					customerEmail: invoice.customer_email || "",
				};

				if (invoice.metadata) {
					result.metadata = invoice.metadata as Record<string, string>;
				}

				if (invoice.subscription) {
					result.subscriptionId = invoice.subscription as string;
				}

				this.log.info(
					{
						transactionId: result.transactionId,
						subscriptionId: result.subscriptionId,
					},
					"Payment details extracted from invoice"
				);

				return result;
			}

			// Handle customer.subscription.deleted (subscription canceled)
			if (event.type === "customer.subscription.deleted") {
				const subscription = event.data as Stripe.Subscription;

				const result: PaymentDetails = {
					transactionId: subscription.id, // Use subscription ID as transaction reference
					amount: 0,
					currency: "usd",
					status: "canceled",
					customerId: subscription.customer as string,
					customerEmail: "", // Email not available in subscription event
					subscriptionId: subscription.id,
				};

				if (subscription.metadata) {
					result.metadata = subscription.metadata as Record<string, string>;
				}

				this.log.info(
					{
						subscriptionId: subscription.id,
						customerId: subscription.customer,
					},
					"Subscription cancellation detected"
				);

				return result;
			}

			// Handle invoice.payment_failed (failed payment)
			if (event.type === "invoice.payment_failed") {
				const invoice = event.data as Stripe.Invoice;

				const result: PaymentDetails = {
					transactionId: invoice.payment_intent as string,
					amount: (invoice.amount_due || 0) / 100,
					currency: invoice.currency,
					status: "failed",
					customerId: invoice.customer as string,
					customerEmail: invoice.customer_email || "",
				};

				if (invoice.metadata) {
					result.metadata = invoice.metadata as Record<string, string>;
				}

				if (invoice.subscription) {
					result.subscriptionId = invoice.subscription as string;
				}

				this.log.warn(
					{
						transactionId: result.transactionId,
						subscriptionId: result.subscriptionId,
						amount: result.amount,
					},
					"Payment failure detected"
				);

				return result;
			}

			// Handle charge.refunded (refund issued)
			if (event.type === "charge.refunded") {
				const charge = event.data as Stripe.Charge;

				const result: PaymentDetails = {
					transactionId: charge.id,
					amount: (charge.amount_refunded || 0) / 100,
					currency: charge.currency,
					status: "refunded",
					customerId: charge.customer as string,
					customerEmail: charge.billing_details?.email || "",
				};

				if (charge.metadata) {
					result.metadata = charge.metadata as Record<string, string>;
				}

				this.log.info(
					{
						chargeId: charge.id,
						amountRefunded: result.amount,
						customerId: result.customerId,
					},
					"Refund detected"
				);

				return result;
			}

			// Handle customer.subscription.updated (subscription modified)
			if (event.type === "customer.subscription.updated") {
				const subscription = event.data as Stripe.Subscription;

				const result: PaymentDetails = {
					transactionId: subscription.id,
					amount: 0,
					currency: "usd",
					status: "pending",
					customerId: subscription.customer as string,
					customerEmail: "",
					subscriptionId: subscription.id,
				};

				if (subscription.metadata) {
					result.metadata = subscription.metadata as Record<string, string>;
				}

				this.log.info(
					{
						subscriptionId: subscription.id,
						status: subscription.status,
					},
					"Subscription update detected"
				);

				return result;
			}

			this.log.debug({ eventType: event.type }, "Event type not handled");
			return null;
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					eventType: event.type,
				},
				"Failed to extract payment details"
			);
			return null;
		}
	}

	/**
	 * Cancel Stripe subscription
	 */
	async cancelSubscription(subscriptionId: string, immediate = false): Promise<void> {
		try {
			if (immediate) {
				await this.stripe.subscriptions.cancel(subscriptionId);
				this.log.info({ subscriptionId }, "Subscription canceled immediately");
			} else {
				await this.stripe.subscriptions.update(subscriptionId, {
					cancel_at_period_end: true,
				});
				this.log.info({ subscriptionId }, "Subscription set to cancel at period end");
			}
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					subscriptionId,
					immediate,
				},
				"Failed to cancel subscription"
			);
			throw error;
		}
	}

	/**
	 * Get Stripe subscription details
	 */
	async getSubscription(subscriptionId: string): Promise<SubscriptionDetails | null> {
		try {
			const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

			return {
				subscriptionId: subscription.id,
				status: this.mapStripeStatus(subscription.status),
				currentPeriodStart: new Date(subscription.current_period_start * 1000),
				currentPeriodEnd: new Date(subscription.current_period_end * 1000),
				cancelAtPeriodEnd: subscription.cancel_at_period_end,
			};
		} catch (error) {
			this.log.error(
				{
					err: serializeError(error as Error),
					subscriptionId,
				},
				"Failed to get subscription"
			);
			return null;
		}
	}

	/**
	 * Map Stripe subscription status to our standard status
	 */
	private mapStripeStatus(
		status: Stripe.Subscription.Status
	): SubscriptionDetails["status"] {
		switch (status) {
			case "active":
				return "active";
			case "canceled":
				return "canceled";
			case "past_due":
				return "past_due";
			case "trialing":
				return "trialing";
			default:
				return "canceled";
		}
	}

	/**
	 * Create a product in Stripe
	 */
	async createProduct(params: import("./types.js").CreateProductParams): Promise<import("./types.js").CreateProductResult> {
		try {
			const product = await this.stripe.products.create({
				name: params.name,
				...(params.description && { description: params.description }),
			});

			this.log.info(
				{ productId: product.id, name: params.name },
				"Stripe product created"
			);

			return {
				productId: product.id,
				name: product.name,
			};
		} catch (error) {
			this.log.error(
				{ err: serializeError(error as Error), name: params.name },
				"Failed to create Stripe product"
			);
			throw error;
		}
	}

	/**
	 * Create a price for a product in Stripe
	 */
	async createPrice(params: import("./types.js").CreatePriceParams): Promise<import("./types.js").CreatePriceResult> {
		try {
			const priceParams: Stripe.PriceCreateParams = {
				product: params.productId,
				unit_amount: params.amountCents,
				currency: params.currency,
			};

			// Set recurring or one-time based on interval
			if (params.interval === "one_time") {
				// One-time payment (no recurring)
				priceParams.currency = params.currency;
			} else {
				// Recurring subscription
				priceParams.recurring = {
					interval: params.interval === "month" ? "month" : "year",
				};
			}

			const price = await this.stripe.prices.create(priceParams);

			this.log.info(
				{
					priceId: price.id,
					productId: params.productId,
					amount: params.amountCents,
					interval: params.interval,
				},
				"Stripe price created"
			);

			return {
				priceId: price.id,
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
					amount: params.amountCents,
				},
				"Failed to create Stripe price"
			);
			throw error;
		}
	}

	async createRefund(params: CreateRefundParams): Promise<RefundResult> {
		try {
			const refund = await this.stripe.refunds.create({
				payment_intent: params.paymentId,
				...(params.amount ? { amount: params.amount } : {}),
				...(params.reason ? { reason: "requested_by_customer" as const } : {}),
			});

			return {
				refundId: refund.id,
				status: refund.status === "succeeded" ? "succeeded" : refund.status === "failed" ? "failed" : "pending",
				amount: refund.amount,
				currency: refund.currency,
			};
		} catch (error) {
			this.log.error(
				{ err: serializeError(error as Error), paymentId: params.paymentId },
				"Failed to create Stripe refund"
			);
			throw error;
		}
	}
}
