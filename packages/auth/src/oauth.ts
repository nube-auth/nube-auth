/**
 * OAuth provider adapters
 * Abstracts OAuth provider details (Google, GitHub, etc.)
 */

export interface OAuthProvider {
	name: string;
	clientId: string;
	clientSecret: string;
	authorizationEndpoint: string;
	tokenEndpoint: string;
	userInfoEndpoint: string;
}

export interface OAuthProfile {
	id: string;
	email: string;
	name: string;
	avatar_url?: string;
}

/**
 * Google OAuth provider
 */
export const GoogleOAuth: OAuthProvider = {
	name: "google",
	clientId: process.env.GOOGLE_CLIENT_ID || "",
	clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
	authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
	tokenEndpoint: "https://oauth2.googleapis.com/token",
	userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
};

/**
 * GitHub OAuth provider
 */
export const GitHubOAuth: OAuthProvider = {
	name: "github",
	clientId: process.env.GITHUB_CLIENT_ID || "",
	clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
	authorizationEndpoint: "https://github.com/login/oauth/authorize",
	tokenEndpoint: "https://github.com/login/oauth/access_token",
	userInfoEndpoint: "https://api.github.com/user",
};

/**
 * Build OAuth authorization URL
 */
export function buildAuthorizationUrl(
	provider: OAuthProvider,
	state: string,
	redirectUri: string,
	scope?: string[],
): string {
	const params = new URLSearchParams({
		client_id: provider.clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		state,
		...(scope && { scope: scope.join(" ") }),
	});

	return `${provider.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
	provider: OAuthProvider,
	code: string,
	redirectUri: string,
): Promise<string> {
	const response = await fetch(provider.tokenEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({
			client_id: provider.clientId,
			client_secret: provider.clientSecret,
			code,
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		}),
	});

	if (!response.ok) {
		throw new Error(`Failed to exchange code: ${response.statusText}`);
	}

	const data = (await response.json()) as any;
	return data.access_token;
}

/**
 * Fetch user profile from OAuth provider
 */
export async function fetchUserProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
	const response = await fetch(provider.userInfoEndpoint, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch user profile: ${response.statusText}`);
	}

	const data = (await response.json()) as any;

	// Normalize different provider response formats
	if (provider.name === "google") {
		return {
			id: data.sub,
			email: data.email,
			name: data.name,
			avatar_url: data.picture,
		};
	} else if (provider.name === "github") {
		return {
			id: data.id.toString(),
			email: data.email || "",
			name: data.name || data.login,
			avatar_url: data.avatar_url,
		};
	}

	throw new Error(`Unsupported provider: ${provider.name}`);
}

/**
 * Complete OAuth flow: get authorization URL, exchange code, fetch profile
 */
export async function completeOAuthFlow(
	provider: OAuthProvider,
	code: string,
	redirectUri: string,
	_state?: string,
): Promise<OAuthProfile> {
	const accessToken = await exchangeCodeForToken(provider, code, redirectUri);
	return fetchUserProfile(provider, accessToken);
}
