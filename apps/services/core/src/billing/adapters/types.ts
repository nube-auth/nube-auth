/**
 * Payment Provider Adapter Types
 *
 * Defines the interface that all payment provider adapters must implement.
 * Providers can be Stripe, LemonSqueezy, Paddle, etc.
 */

/**
 * Provider types supported by the system
 */
export type PaymentProviderType = "stripe" | "lemon_squeezy" | "paddle";

/**
 * Billing cycle intervals
 */
export type BillingInterval = "month" | "year" | "one_time";

/**
 * Checkout session metadata
 */
export interface CheckoutSessionMetadata {
	userId: number;
	appId: number;
	planProvidePriceId: number;
	purchaseId: number;
	promotionCodeId?: number;
	customMetadata?: Record<string, string>;
}

/**
 * Checkout session response from provider
 */
export interface ProviderCheckoutSession {
	id: string;
	provider: PaymentProviderType;
	url: string;
	expiresAt?: Date;
	metadata: CheckoutSessionMetadata;
	providerSessionId: string; // Provider-specific session ID (e.g., Stripe session_id)
}

/**
 * Payment transaction details
 */
export interface PaymentTransaction {
	id: string; // Provider transaction ID
	providerSessionId: string;
	amount: number; // Amount in cents
	currency: string;
	status: "pending" | "completed" | "failed" | "refunded";
	createdAt: Date;
	metadata?: Record<string, unknown>;
}

/**
 * Webhook event from provider
 */
export interface WebhookEvent {
	provider: PaymentProviderType;
	type: string;
	data: Record<string, unknown>;
	rawSignature: string;
	timestamp?: Date;
}

/**
 * Webhook payload after verification
 */
export interface VerifiedWebhookPayload {
	event: WebhookEvent;
	providerSessionId?: string;
	transactionId?: string;
	status?: "completed" | "failed" | "pending" | "refunded";
	amount?: number;
	currency?: string;
	customData?: Record<string, unknown>;
}

/**
 * Provider adapter configuration
 */
export interface ProviderAdapterConfig {
	provider: PaymentProviderType;
	environment: "test" | "live";
	credentials: {
		secretKey?: string;
		publishableKey?: string;
		accessToken?: string;
		[key: string]: string | undefined;
	};
	webhookSecret?: string;
	webhookUrl?: string;
}

/**
 * Payment Provider Adapter Interface
 *
 * All payment provider implementations must follow this interface
 */
export interface PaymentProviderAdapter {
	/**
	 * Provider type
	 */
	provider: PaymentProviderType;

	/**
	 * Initialize adapter with configuration
	 */
	initialize(config: ProviderAdapterConfig): Promise<void>;

	/**
	 * Create a checkout session for a purchase
	 */
	createCheckoutSession(
		planName: string,
		amount: number,
		currency: string,
		metadata: CheckoutSessionMetadata,
		options?: {
			trialDays?: number;
			successUrl?: string;
			cancelUrl?: string;
		},
	): Promise<ProviderCheckoutSession>;

	/**
	 * Get session details from provider
	 */
	getSession(providerSessionId: string): Promise<ProviderCheckoutSession | null>;

	/**
	 * Get transaction details from provider
	 */
	getTransaction(transactionId: string): Promise<PaymentTransaction | null>;

	/**
	 * Verify and parse webhook payload
	 * Returns verified payload if signature is valid, null if invalid
	 */
	verifyWebhook(
		rawBody: string,
		signature: string,
	): Promise<VerifiedWebhookPayload | null>;

	/**
	 * Handle refund for a transaction
	 */
	refund(
		transactionId: string,
		amount?: number, // Partial refund amount in cents, undefined = full refund
	): Promise<{
		refundId: string;
		status: string;
		amount: number;
	}>;

	/**
	 * Get refund details
	 */
	getRefund(refundId: string): Promise<{
		id: string;
		transactionId: string;
		amount: number;
		status: string;
		createdAt: Date;
	} | null>;

	/**
	 * Cancel a subscription/recurring payment
	 */
	cancelSubscription(providerSubscriptionId: string): Promise<boolean>;

	/**
	 * Update subscription details (e.g., change billing interval)
	 */
	updateSubscription(
		providerSubscriptionId: string,
		updates: {
			priceId?: string;
			billingInterval?: BillingInterval;
		},
	): Promise<boolean>;

	/**
	 * Get provider-specific price ID (for creating checkout sessions)
	 * Maps plan to provider's price/product system
	 */
	getProviderPriceId(planId: number, interval: BillingInterval): Promise<string | null>;

	/**
	 * Sync provider's current price with our plan_provider_prices table
	 * Used to validate and update pricing information
	 */
	syncPrice(
		planId: number,
		interval: BillingInterval,
		amount: number,
		currency: string,
	): Promise<string>; // Returns provider price ID

	/**
	 * Health check for provider API connectivity
	 */
	healthCheck(): Promise<boolean>;

	/**
	 * Clean up resources (close connections, etc.)
	 */
	cleanup(): Promise<void>;
}

/**
 * Provider adapter factory type
 */
export type ProviderAdapterFactory = {
	[P in PaymentProviderType]: () => PaymentProviderAdapter;
};

/**
 * Payment provider configuration from database
 */
export interface StoredProviderConfig {
	id: number;
	publicId: string;
	appId: number;
	provider: PaymentProviderType;
	environment: "test" | "live";
	credentials: string; // Encrypted JSON string
	webhookSecret?: string;
	isActive: boolean;
	isDefault: boolean;
	metadata?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}
