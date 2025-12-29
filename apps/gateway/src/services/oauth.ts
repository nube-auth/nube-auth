import type { DbClient } from "@proofa/db";
import { oauthProviderQueries, appQueries } from "@proofa/db";
import { decryptOAuthCredentials, type OAuthCredentials as SharedOAuthCredentials } from "@proofa/shared";

export interface OAuthProvider {
	provider: string;
	credentials: SharedOAuthCredentials;
	source: "platform" | "project" | "app";
	custom_button_text?: string;
	display_order: number;
}

/**
 * Get all available OAuth providers for an app
 * Returns providers from all hierarchy levels (platform, project, app)
 *
 * @param db Database instance
 * @param appId Internal app ID
 * @returns Array of available OAuth providers with their credentials
 */
export async function getAvailableOAuthProviders(
	db: DbClient,
	appId: number,
): Promise<OAuthProvider[]> {
	const providers = await oauthProviderQueries.getAvailableOAuthProviders(db, appId);

	return providers.map((p) => ({
		provider: p.provider,
		credentials: decryptOAuthCredentials(p.credentials),
		source: p.entity_type as "platform" | "project" | "app",
		custom_button_text: undefined,
		display_order: 0,
	}));
}

/**
 * Get selected OAuth providers for an app
 * Returns only the providers the app has explicitly enabled
 *
 * @param db Database instance
 * @param appId Internal app ID
 * @returns Array of selected OAuth providers with their credentials
 */
export async function getOAuthProviders(
	db: DbClient,
	appId: number,
): Promise<OAuthProvider[]> {
	const selections = await oauthProviderQueries.getOAuthProviders(db, appId);

	return selections.map((s) => ({
		provider: s.provider,
		credentials: decryptOAuthCredentials(s.credentials),
		source: s.entity_type as "platform" | "project" | "app",
		custom_button_text: s.custom_button_text || undefined,
		display_order: s.display_order,
	}));
}

/**
 * Get OAuth provider by name for an app
 * Returns the credentials for a specific provider if the app has it enabled
 *
 * @param db Database instance
 * @param appId Internal app ID
 * @param providerName Name of the provider (e.g., "google", "github")
 * @returns OAuth provider with credentials or null if not found
 */
export async function getOAuthProvider(
	db: DbClient,
	appId: number,
	providerName: string,
): Promise<OAuthProvider | null> {
	const provider = await oauthProviderQueries.getOAuthProviderByName(db, appId, providerName);

	if (!provider) {
		return null;
	}

	return {
		provider: provider.provider,
		credentials: decryptOAuthCredentials(provider.credentials),
		source: provider.entity_type as "platform" | "project" | "app",
		custom_button_text: provider.custom_button_text || undefined,
		display_order: provider.display_order,
	};
}

/**
 * Get OAuth providers by app public ID
 *
 * @param db Database instance
 * @param appPublicId Public app ID
 * @returns Array of OAuth providers with credentials
 */
export async function getOAuthProvidersByPublicId(
	db: DbClient,
	appPublicId: string,
): Promise<OAuthProvider[]> {
	const app = await appQueries.findByPublicId(db, appPublicId);
	if (!app) {
		throw new Error("App not found");
	}

	return getOAuthProviders(db, app.id);
}

/**
 * Check if an app has a specific OAuth provider enabled
 *
 * @param db Database instance
 * @param appId Internal app ID
 * @param providerName Name of the provider (e.g., "google", "github")
 * @returns True if the provider is enabled for the app
 */
export async function hasOAuthProvider(
	db: DbClient,
	appId: number,
	providerName: string,
): Promise<boolean> {
	const provider = await getOAuthProvider(db, appId, providerName);
	return provider !== null;
}
