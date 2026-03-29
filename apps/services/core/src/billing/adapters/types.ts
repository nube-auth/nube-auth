/**
 * Payment Provider Adapter Interface
 * Defines the contract that all payment provider implementations must follow
 */

export interface CreateCheckoutParams {
  customerId: string;
  customerEmail: string;
  productId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
  mode?: 'payment' | 'subscription';
  /** @deprecated Pass providerCoupon instead — raw Nube code is resolved server-side to provider IDs */
  promoCode?: string;
  /**
   * Resolved provider coupon to apply at checkout.
   * Populated by checkout.ts after looking up promotion_provider_refs.
   * - Stripe: objectType 'coupon' → discounts:[{coupon:id}]; 'promotion_code' → discounts:[{promotion_code:id}]
   * - LemonSqueezy / Dodo: id is passed as discount_code (provider's internal code string)
   */
  providerCoupon?: {
    id: string;
    objectType: 'coupon' | 'promotion_code' | 'discount';
  };
  /** ISO 4217 currency code (lowercase). Used by Dodo's Adaptive Currency to set the checkout display/billing currency. */
  billingCurrency?: string;
}

export interface CheckoutSession {
  checkoutUrl: string;
  sessionId: string;
  expiresAt?: Date;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: unknown;
  rawBody: string;
}

export interface PaymentDetails {
  transactionId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'canceled' | 'refunded';
  customerId: string;
  customerEmail: string;
  productId?: string;
  subscriptionId?: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionDetails {
  subscriptionId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface CreateProductParams {
  name: string;
  description?: string;
  /**
   * Key/value pairs attached to the product in the provider dashboard.
   * Supported by Stripe (product metadata). Ignored by providers that lack metadata support.
   * Use for traceability: nube_app_id, nube_plan_id, etc.
   */
  metadata?: Record<string, string>;
}

export interface CreateProductResult {
  productId: string;
  name: string;
}

export interface CreatePriceParams {
  productId: string;
  amountCents: number;
  currency: string;
  interval: 'month' | 'year' | 'one_time';
  /**
   * Human-readable label shown in the provider dashboard alongside the price.
   * Used as Stripe price `nickname`, LemonSqueezy variant `name`, and Dodo product `name`.
   * Pattern: "[Plan] — [Interval] ([CURRENCY] [Amount])"  e.g. "Pro — Monthly (USD 9.99)"
   */
  label?: string;
  /**
   * Key/value pairs attached to the price object in the provider dashboard.
   * Supported by Stripe (price metadata). Ignored by providers that lack metadata support.
   */
  metadata?: Record<string, string>;
}

export interface CreatePriceResult {
  priceId: string;
  productId: string;
  amountCents: number;
  currency: string;
  interval: 'month' | 'year' | 'one_time';
}

export interface CreateCouponParams {
  /** Display name shown in the provider dashboard */
  name: string;
  discountType: 'percent' | 'fixed';
  /** For percent: 1–100. For fixed: amount in cents. */
  discountValue: number;
  /** Required for fixed discounts in Stripe (ISO 4217 lowercase, e.g. "usd") */
  currency?: string;
  maxRedemptions?: number;
  expiresAt?: Date;
  /** Traceability metadata (supported by Stripe; ignored by LS/Dodo) */
  metadata?: Record<string, string>;
}

export interface CreateCouponResult {
  /**
   * ID/code stored in promotion_provider_refs.provider_coupon_id.
   * - Stripe: coupon ID (e.g. "EkCW1234")
   * - LemonSqueezy: discount code string (e.g. "NUBE-PROMO0abc")
   * - Dodo: discount code string
   */
  couponId: string;
  objectType: 'coupon' | 'promotion_code' | 'discount';
}

export interface CreateRefundParams {
  paymentId: string; // Provider transaction/payment ID
  amount?: number; // Partial refund amount in cents; omit for full refund
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number;
  currency: string;
}

export interface PaymentProviderAdapter {
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession>;
  verifyWebhook(signature: string, rawBody: string): Promise<WebhookEvent | null>;
  extractPaymentDetails(event: WebhookEvent): Promise<PaymentDetails | null>;
  cancelSubscription(subscriptionId: string, immediate?: boolean): Promise<void>;
  getSubscription(subscriptionId: string): Promise<SubscriptionDetails | null>;
  createProduct(params: CreateProductParams): Promise<CreateProductResult>;
  createPrice(params: CreatePriceParams): Promise<CreatePriceResult>;
  createRefund(params: CreateRefundParams): Promise<RefundResult>;
  /**
   * Create a coupon/discount on the payment provider.
   * The returned couponId is stored in promotion_provider_refs so checkout
   * can resolve a Nube promotion code to a provider-native discount.
   */
  createCoupon(params: CreateCouponParams): Promise<CreateCouponResult>;
  /**
   * Deactivate/delete a coupon on the provider.
   * Called when a Nube promotion is deactivated.
   */
  deleteCoupon(couponId: string): Promise<void>;
}

export interface StripeCredentials {
  secretKey: string;
  webhookSecret: string;
}

export interface LemonSqueezyCredentials {
  apiKey: string;
  webhookSecret: string;
  storeId: string;
}

export interface DodoCredentials {
  apiKey: string;
  webhookSecret: string;
  environment: 'test_mode' | 'live_mode';
}

export type PaymentProviderCredentials = 
  | StripeCredentials 
  | LemonSqueezyCredentials 
  | DodoCredentials;
