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
  promoCode?: string;
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
}

export interface CreatePriceResult {
  priceId: string;
  productId: string;
  amountCents: number;
  currency: string;
  interval: 'month' | 'year' | 'one_time';
}

export interface PaymentProviderAdapter {
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession>;
  verifyWebhook(signature: string, rawBody: string): Promise<WebhookEvent | null>;
  extractPaymentDetails(event: WebhookEvent): Promise<PaymentDetails | null>;
  cancelSubscription(subscriptionId: string, immediate?: boolean): Promise<void>;
  getSubscription(subscriptionId: string): Promise<SubscriptionDetails | null>;
  createProduct(params: CreateProductParams): Promise<CreateProductResult>;
  createPrice(params: CreatePriceParams): Promise<CreatePriceResult>;
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
}

export type PaymentProviderCredentials = 
  | StripeCredentials 
  | LemonSqueezyCredentials 
  | DodoCredentials;
