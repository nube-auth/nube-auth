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

/**
 * Create a payment provider adapter with the given credentials.
 * 
 * IMPORTANT: For Dodo, if credentials don't include an `environment` field,
 * you must add it manually before calling this function:
 * ```
 * credentials.environment = dbEnvironment === "production" ? "live_mode" : "test_mode";
 * ```
 * Also ensure `webhookSecret` is provided (from provider config's webhook_secret column).
 */
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
    
    case "dodo": {
      const dodoCredentials = credentials as DodoCredentials;
      if (!dodoCredentials.apiKey) {
        throw new Error("Dodo credentials must include 'apiKey'");
      }
      if (!dodoCredentials.webhookSecret) {
        throw new Error(
          "Dodo credentials must include 'webhookSecret'. " +
          "If loading from DB, map provider_config.webhook_secret -> credentials.webhookSecret"
        );
      }
      // Warn if environment is missing (common mistake)
      if (!dodoCredentials.environment) {
        throw new Error(
          "Dodo credentials must include 'environment' field (test_mode or live_mode). " +
          "If loading from DB, convert: dbEnv === 'production' ? 'live_mode' : 'test_mode'"
        );
      }
      return new DodoAdapter(dodoCredentials);
    }
    
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}
