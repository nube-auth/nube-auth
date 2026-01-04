/**
 * Provider Adapter Factory
 *
 * Creates and manages payment provider adapters
 */

import { createLogger } from "@proofa/shared";
import type { PaymentProviderAdapter, PaymentProviderType, ProviderAdapterConfig } from "./types.js";
import { StripeAdapter } from "./stripe.js";
import { LemonSqueezyAdapter } from "./lemon-squeezy.js";

const log = createLogger("provider-factory");

/**
 * Factory for creating payment provider adapters
 */
export class ProviderAdapterFactory {
	private static instances: Map<string, PaymentProviderAdapter> = new Map();

	/**
	 * Create or get an adapter instance
	 * Uses instance caching to avoid recreating adapters for same configuration
	 */
	static async createAdapter(
		config: ProviderAdapterConfig,
	): Promise<PaymentProviderAdapter> {
		const instanceKey = `${config.provider}:${config.environment}`;

		// Return cached instance if exists
		if (this.instances.has(instanceKey)) {
			return this.instances.get(instanceKey)!;
		}

		const adapter = this.instantiateAdapter(config.provider);

		try {
			await adapter.initialize(config);
			this.instances.set(instanceKey, adapter);
			log.info({ provider: config.provider, environment: config.environment }, "Provider adapter created");
			return adapter;
		} catch (error) {
			log.error(
				{ err: error as Error, provider: config.provider },
				"Failed to initialize provider adapter",
			);
			throw error;
		}
	}

	/**
	 * Get cached adapter instance
	 */
	static getAdapter(provider: PaymentProviderType, environment: "test" | "live"): PaymentProviderAdapter | null {
		const instanceKey = `${provider}:${environment}`;
		return this.instances.get(instanceKey) || null;
	}

	/**
	 * Clear cached adapter
	 */
	static async clearAdapter(provider: PaymentProviderType, environment: "test" | "live"): Promise<void> {
		const instanceKey = `${provider}:${environment}`;
		const adapter = this.instances.get(instanceKey);

		if (adapter) {
			await adapter.cleanup();
			this.instances.delete(instanceKey);
			log.info({ provider, environment }, "Provider adapter cleared");
		}
	}

	/**
	 * Clear all cached adapters
	 */
	static async clearAllAdapters(): Promise<void> {
		const promises: Promise<void>[] = [];

		for (const adapter of this.instances.values()) {
			promises.push(adapter.cleanup());
		}

		await Promise.all(promises);
		this.instances.clear();
		log.info("All provider adapters cleared");
	}

	/**
	 * Get list of supported providers
	 */
	static getSupportedProviders(): PaymentProviderType[] {
		return ["stripe", "lemon_squeezy"];
	}

	/**
	 * Instantiate the correct adapter based on provider type
	 */
	private static instantiateAdapter(provider: PaymentProviderType): PaymentProviderAdapter {
		switch (provider) {
			case "stripe":
				return new StripeAdapter();

			case "lemon_squeezy":
				return new LemonSqueezyAdapter();

			default:
				throw new Error(`Unsupported payment provider: ${provider}`);
		}
	}
}

/**
 * Registry for managing multiple provider configurations per app
 */
export class ProviderRegistry {
	private appAdapters: Map<number, Map<PaymentProviderType, PaymentProviderAdapter>> = new Map();

	/**
	 * Register an adapter for an app
	 */
	async registerAdapter(
		appId: number,
		config: ProviderAdapterConfig,
	): Promise<PaymentProviderAdapter> {
		const adapter = await ProviderAdapterFactory.createAdapter(config);

		if (!this.appAdapters.has(appId)) {
			this.appAdapters.set(appId, new Map());
		}

		this.appAdapters.get(appId)!.set(config.provider, adapter);
		log.info({ appId, provider: config.provider }, "Provider registered for app");

		return adapter;
	}

	/**
	 * Get adapter for app and provider
	 */
	getAdapter(appId: number, provider: PaymentProviderType): PaymentProviderAdapter | null {
		return this.appAdapters.get(appId)?.get(provider) || null;
	}

	/**
	 * Get all adapters for an app
	 */
	getAppAdapters(appId: number): Map<PaymentProviderType, PaymentProviderAdapter> {
		return this.appAdapters.get(appId) || new Map();
	}

	/**
	 * Remove adapter for app
	 */
	async removeAdapter(appId: number, provider: PaymentProviderType): Promise<void> {
		const adapter = this.appAdapters.get(appId)?.get(provider);

		if (adapter) {
			await adapter.cleanup();
			this.appAdapters.get(appId)?.delete(provider);
			log.info({ appId, provider }, "Provider adapter removed for app");
		}
	}

	/**
	 * Remove all adapters for app
	 */
	async removeAppAdapters(appId: number): Promise<void> {
		const adapters = this.appAdapters.get(appId);

		if (adapters) {
			const promises: Promise<void>[] = [];
			for (const adapter of adapters.values()) {
				promises.push(adapter.cleanup());
			}

			await Promise.all(promises);
			this.appAdapters.delete(appId);
			log.info({ appId }, "All provider adapters removed for app");
		}
	}

	/**
	 * Check if provider is configured for app
	 */
	hasProvider(appId: number, provider: PaymentProviderType): boolean {
		return this.appAdapters.get(appId)?.has(provider) || false;
	}

	/**
	 * Get list of configured providers for app
	 */
	getConfiguredProviders(appId: number): PaymentProviderType[] {
		return Array.from(this.appAdapters.get(appId)?.keys() || []);
	}
}

/**
 * Singleton registry instance
 */
export const providerRegistry = new ProviderRegistry();
