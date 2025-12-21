/**
 * OAuth adapter interface
 * All OAuth providers must implement this interface
 */
export interface OAuthAdapter {
	/**
	 * Generate the authorization URL for the OAuth provider
	 * @param state CSRF protection state token
	 * @param redirectUri Callback URI after authorization
	 * @returns Authorization URL
	 */
	getAuthorizationUrl(state: string, redirectUri: string): string;

	/**
	 * Exchange authorization code for user profile
	 * @param code Authorization code from OAuth provider
	 * @param redirectUri Callback URI (must match original)
	 * @returns User profile from OAuth provider
	 */
	exchangeToken(code: string, redirectUri: string): Promise<OAuthProfile>;
}

/**
 * OAuth profile from external provider
 */
export interface OAuthProfile {
	id: string;
	email: string;
	name: string;
	picture?: string;
	avatar_url?: string;
}

/**
 * OAuth provider configuration
 */
export interface ProviderConfig {
	clientId: string;
	clientSecret: string;
	scope?: string[];
}
