/**
 * Webhook Simulator
 * Generates mock webhook payloads for testing payment flows
 */

import { createLogger } from "@proofa/shared";

const log = createLogger("webhook-simulator");

interface MockWebhookOptions {
	provider: "stripe" | "lemonsqueezy" | "dodo";
	eventType: string;
	amount?: number;
	userId?: string;
	appId?: string;
	planId?: string;
	metadata?: Record<string, string>;
}

/**
 * Generate mock Stripe webhook payload
 */
function generateStripeWebhook(options: MockWebhookOptions): any {
	const { eventType, amount = 2900, metadata = {} } = options;
	const timestamp = Math.floor(Date.now() / 1000);

	const baseEvent = {
		id: `evt_test_mock_${Date.now()}`,
		object: "event",
		api_version: "2023-10-16",
		created: timestamp,
		livemode: false,
		type: eventType,
	};

	switch (eventType) {
		case "payment.succeeded":
		case "checkout.session.completed":
			return {
				...baseEvent,
				type: "checkout.session.completed",
				data: {
					object: {
						id: `cs_test_mock_${Date.now()}`,
						object: "checkout.session",
						amount_total: amount,
						currency: "usd",
						customer: `cus_test_mock_${Date.now()}`,
						customer_email: `test@proofa.internal`,
						payment_status: "paid",
						status: "complete",
						mode: "payment",
						metadata,
					},
				},
			};

		case "payment.failed":
		case "invoice.payment_failed":
			return {
				...baseEvent,
				type: "invoice.payment_failed",
				data: {
					object: {
						id: `in_test_mock_${Date.now()}`,
						object: "invoice",
						amount_due: amount,
						amount_paid: 0,
						currency: "usd",
						customer: `cus_test_mock_${Date.now()}`,
						customer_email: `test@proofa.internal`,
						status: "open",
						payment_intent: `pi_test_mock_${Date.now()}`,
						subscription: `sub_test_mock_${Date.now()}`,
						metadata,
					},
				},
			};

		case "subscription.canceled":
		case "customer.subscription.deleted":
			return {
				...baseEvent,
				type: "customer.subscription.deleted",
				data: {
					object: {
						id: `sub_test_mock_${Date.now()}`,
						object: "subscription",
						customer: `cus_test_mock_${Date.now()}`,
						status: "canceled",
						canceled_at: timestamp,
						metadata,
					},
				},
			};

		case "charge.refunded":
			return {
				...baseEvent,
				type: "charge.refunded",
				data: {
					object: {
						id: `ch_test_mock_${Date.now()}`,
						object: "charge",
						amount: amount,
						amount_refunded: amount,
						currency: "usd",
						customer: `cus_test_mock_${Date.now()}`,
						refunded: true,
						metadata,
					},
				},
			};

		case "subscription.updated":
		case "customer.subscription.updated":
			return {
				...baseEvent,
				type: "customer.subscription.updated",
				data: {
					object: {
						id: `sub_test_mock_${Date.now()}`,
						object: "subscription",
						customer: `cus_test_mock_${Date.now()}`,
						status: "active",
						metadata,
					},
				},
			};

		default:
			throw new Error(`Unsupported Stripe event type: ${eventType}`);
	}
}

/**
 * Generate mock LemonSqueezy webhook payload
 */
function generateLemonSqueezyWebhook(options: MockWebhookOptions): any {
	const { eventType, amount = 2900, metadata = {} } = options;

	switch (eventType) {
		case "payment.succeeded":
		case "order_created":
			return {
				meta: {
					event_name: "order_created",
					webhook_id: `mock_${Date.now()}`,
					test_mode: true,
				},
				data: {
					id: `order_mock_${Date.now()}`,
					type: "orders",
					attributes: {
						total: amount,
						total_usd: amount,
						status: "paid",
						user_email: "test@proofa.internal",
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
					meta: metadata,
				},
			};

		case "subscription_created":
			return {
				meta: {
					event_name: "subscription_created",
					webhook_id: `mock_${Date.now()}`,
					test_mode: true,
				},
				data: {
					id: `sub_mock_${Date.now()}`,
					type: "subscriptions",
					attributes: {
						status: "active",
						user_email: "test@proofa.internal",
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
					meta: metadata,
				},
			};

		case "subscription.canceled":
		case "subscription_cancelled":
			return {
				meta: {
					event_name: "subscription_cancelled",
					webhook_id: `mock_${Date.now()}`,
					test_mode: true,
				},
				data: {
					id: `sub_mock_${Date.now()}`,
					type: "subscriptions",
					attributes: {
						status: "cancelled",
						ends_at: new Date().toISOString(),
					},
					meta: metadata,
				},
			};

		case "payment.failed":
		case "subscription_payment_failed":
			return {
				meta: {
					event_name: "subscription_payment_failed",
					webhook_id: `mock_${Date.now()}`,
					test_mode: true,
				},
				data: {
					id: `sub_mock_${Date.now()}`,
					type: "subscriptions",
					attributes: {
						status: "past_due",
					},
					meta: metadata,
				},
			};

		case "subscription_payment_refunded":
			return {
				meta: {
					event_name: "subscription_payment_refunded",
					webhook_id: `mock_${Date.now()}`,
					test_mode: true,
				},
				data: {
					id: `sub_mock_${Date.now()}`,
					type: "subscriptions",
					attributes: {
						status: "refunded",
					},
					meta: metadata,
				},
			};

		default:
			throw new Error(`Unsupported LemonSqueezy event type: ${eventType}`);
	}
}

/**
 * Generate mock Dodo webhook payload
 */
function generateDodoWebhook(options: MockWebhookOptions): any {
	const { eventType, amount = 2900, metadata = {} } = options;

	switch (eventType) {
		case "payment.succeeded":
			return {
				id: `evt_mock_${Date.now()}`,
				type: "payment.succeeded",
				created: Math.floor(Date.now() / 1000),
				data: {
					payment_id: `pay_mock_${Date.now()}`,
					amount,
					currency: "usd",
					status: "succeeded",
					customer_email: "test@proofa.internal",
					metadata,
				},
			};

		case "subscription.created":
			return {
				id: `evt_mock_${Date.now()}`,
				type: "subscription.created",
				created: Math.floor(Date.now() / 1000),
				data: {
					subscription_id: `sub_mock_${Date.now()}`,
					status: "active",
					customer_email: "test@proofa.internal",
					metadata,
				},
			};

		case "subscription.canceled":
			return {
				id: `evt_mock_${Date.now()}`,
				type: "subscription.canceled",
				created: Math.floor(Date.now() / 1000),
				data: {
					subscription_id: `sub_mock_${Date.now()}`,
					status: "canceled",
					canceled_at: new Date().toISOString(),
					metadata,
				},
			};

		case "payment.failed":
			return {
				id: `evt_mock_${Date.now()}`,
				type: "payment.failed",
				created: Math.floor(Date.now() / 1000),
				data: {
					payment_id: `pay_mock_${Date.now()}`,
					amount,
					currency: "usd",
					status: "failed",
					failure_reason: "insufficient_funds",
					metadata,
				},
			};

		case "payment.refunded":
			return {
				id: `evt_mock_${Date.now()}`,
				type: "payment.refunded",
				created: Math.floor(Date.now() / 1000),
				data: {
					payment_id: `pay_mock_${Date.now()}`,
					amount,
					currency: "usd",
					status: "refunded",
					refunded_at: new Date().toISOString(),
					metadata,
				},
			};

		default:
			throw new Error(`Unsupported Dodo event type: ${eventType}`);
	}
}

/**
 * Generate mock webhook payload for any provider
 */
export function generateMockWebhook(options: MockWebhookOptions): any {
	log.info({ provider: options.provider, eventType: options.eventType }, "Generating mock webhook");

	switch (options.provider) {
		case "stripe":
			return generateStripeWebhook(options);
		case "lemonsqueezy":
			return generateLemonSqueezyWebhook(options);
		case "dodo":
			return generateDodoWebhook(options);
		default:
			throw new Error(`Unsupported provider: ${options.provider}`);
	}
}

/**
 * Map user-friendly event names to provider-specific event types
 */
export function normalizeEventType(provider: string, eventType: string): string {
	// Map generic event names to provider-specific names
	const eventMap: Record<string, Record<string, string>> = {
		stripe: {
			"payment.succeeded": "checkout.session.completed",
			"payment.failed": "invoice.payment_failed",
			"subscription.canceled": "customer.subscription.deleted",
			"subscription.updated": "customer.subscription.updated",
			refund: "charge.refunded",
		},
		lemonsqueezy: {
			"payment.succeeded": "order_created",
			"payment.failed": "subscription_payment_failed",
			"subscription.canceled": "subscription_cancelled",
			refund: "subscription_payment_refunded",
		},
		dodo: {
			// Dodo uses generic names, so just pass through
		},
	};

	const mappings = eventMap[provider];
	return mappings?.[eventType] || eventType;
}
