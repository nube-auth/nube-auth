/**
 * Payment Provider Adapters
 * Phase 2 Implementation Pending
 */

export class ProviderAdapterFactory {
	static async createAdapter() {
		return { verifyWebhook: () => Promise.resolve(null) };
	}
}

export const StripeAdapter = {};
export const PaddleAdapter = {};
export const LemonSqueezyAdapter = {};
