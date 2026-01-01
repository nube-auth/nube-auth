import { GoogleTokenResponseSchema, GoogleUserInfoSchema } from "../schemas/index.js";
import type { OAuthAdapter, OAuthProfile } from "../types/index.js";
import { pingpong } from "../pingpong";

/**
 * Google OAuth configuration
 */
interface GoogleOAuthConfig {
	clientId: string;
	clientSecret: string;
}

interface TokenResponse {
	accessToken: string;
	refreshToken?: string | undefined;
	expiresIn?: number | undefined;
}

/**
 * Google OAuth adapter
 * Implements OAuth 2.0 for Google with validated responses
 */
export class GoogleOAuthAdapter implements OAuthAdapter {
	private clientId: string;
	private clientSecret: string;
	private readonly authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
	private readonly tokenEndpoint = "https://oauth2.googleapis.com/token";
	private readonly userInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";

	constructor(config: GoogleOAuthConfig) {
		this.clientId = config.clientId;
		this.clientSecret = config.clientSecret;
	}

	/**
	 * Generate Google authorization URL
	 */
	getAuthorizationUrl(state: string, redirectUri: string): string {
		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: redirectUri,
			response_type: "code",
			scope: "openid email profile",
			state,
			access_type: "offline",
			prompt: "consent",
		});

		return `${this.authorizationEndpoint}?${params.toString()}`;
	}

	/**
	 * Exchange authorization code for tokens with validated response
	 */
	async exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
		const response = await pingpong(this.tokenEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				code,
				client_id: this.clientId,
				client_secret: this.clientSecret,
				redirect_uri: redirectUri,
				grant_type: "authorization_code",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to exchange code for token: ${response.status} ${errorText}`);
		}

		const rawData = await response.json();
		const data = GoogleTokenResponseSchema.parse(rawData);

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresIn: data.expires_in,
		};
	}

	/**
	 * Fetch user profile using access token with validated response
	 */
	async fetchUserProfile(accessToken: string): Promise<OAuthProfile> {
		const response = await pingpong(this.userInfoEndpoint, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to fetch user profile: ${response.status} ${errorText}`);
		}

		const rawData = await response.json();
		const data = GoogleUserInfoSchema.parse(rawData);

		return {
			id: data.sub,
			email: data.email,
			name: data.name || (data.email.split("@")[0] ?? data.email),
			picture: data.picture,
		};
	}

	/**
	 * Complete OAuth flow: exchange code and fetch profile
	 */
	async exchangeToken(code: string, redirectUri: string): Promise<OAuthProfile> {
		const tokens = await this.exchangeCodeForTokens(code, redirectUri);
		return this.fetchUserProfile(tokens.accessToken);
	}
}
