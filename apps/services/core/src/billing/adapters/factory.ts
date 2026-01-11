/**
 * Payment Provider Adapter Factory
 * Creates appropriate adapter instance based on provider type
 */

import { StripeAdapter } from "./stripe.js";
import { LemonSqueezyAdapter } from "./lemonsqueezy.js";
import { DodoAdapter } from "./dodo.js";
import type {
  PaymentProviderAdapter,
  StripeCredentials,
  LemonSqueezyCredentials,
  DodoCredentials,
} from "./types.js";

export function createProviderAdapter(
  provider: string,
  credentials: unknown
): PaymentProviderAdapter {
  switch (provider) {
    case "stripe":
      return new StripeAdapter(credentials as StripeCredentials);
    
    case "lemonsqueezy":
    case "lemon_squeezy":
      return new LemonSqueezyAdapter(credentials as LemonSqueezyCredentials);
    
    case "dodo":
      return new DodoAdapter(credentials as DodoCredentials);
    
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}
