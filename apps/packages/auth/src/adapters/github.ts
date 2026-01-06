import {
	type GitHubEmail,
	GitHubEmailsSchema,
	GitHubTokenResponseSchema,
	GitHubUserSchema,
	OAuthErrorSchema,
} from "../schemas/index.js";
import type { OAuthAdapter, OAuthProfile } from "../types/index.js";
import { pingpongFetch } from "../pingpong.js";

/**
 * GitHub OAuth configuration
 */
interface GitHubOAuthConfig {
	clientId: string;
	clientSecret: string;
}

interface TokenResponse {
	accessToken: string;
	refreshToken?: string | undefined;
	expiresIn?: number | undefined;
}

/**
 * GitHub OAuth adapter
 * Implements OAuth 2.0 for GitHub with validated responses
 */
export class GitHubOAuthAdapter implements OAuthAdapter {
	private clientId: string;
	private clientSecret: string;
	private readonly authorizationEndpoint = "https://github.com/login/oauth/authorize";
	private readonly tokenEndpoint = "https://github.com/login/oauth/access_token";
	private readonly userEndpoint = "https://api.github.com/user";
	private readonly userEmailEndpoint = "https://api.github.com/user/emails";

	constructor(config: GitHubOAuthConfig) {
		this.clientId = config.clientId;
		this.clientSecret = config.clientSecret;
	}

	/**
	 * Generate GitHub authorization URL
	 */
	getAuthorizationUrl(state: string, redirectUri: string): string {
		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: redirectUri,
			scope: "user:email",
			state,
			allow_signup: "true",
		});

		return `${this.authorizationEndpoint}?${params.toString()}`;
	}

	/**
	 * Exchange authorization code for tokens with validated response
	 */
	async exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
		const response = await pingpongFetch(this.tokenEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
			body: new URLSearchParams({
				code,
				client_id: this.clientId,
				client_secret: this.clientSecret,
				redirect_uri: redirectUri,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to exchange code for token: ${response.status} ${errorText}`);
		}

		const rawData = await response.json();

		// Check for OAuth error response
		const errorResult = OAuthErrorSchema.safeParse(rawData);
		if (errorResult.success && errorResult.data.error) {
			throw new Error(errorResult.data.error_description || errorResult.data.error);
		}

		const data = GitHubTokenResponseSchema.parse(rawData);

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
		// Fetch user data
		const userResponse = await pingpongFetch(this.userEndpoint, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/json",
			},
		});

		if (!userResponse.ok) {
			const errorText = await userResponse.text();
			throw new Error(`Failed to fetch user profile: ${userResponse.status} ${errorText}`);
		}

		const rawUserData = await userResponse.json();
		const userData = GitHubUserSchema.parse(rawUserData);

		// Fetch primary email if not in user data
		let email = userData.email;
		if (!email) {
			const emailResponse = await pingpongFetch(this.userEmailEndpoint, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/json",
				},
			});

			if (emailResponse.ok()) {
				const rawEmails = await emailResponse.json();
				const emails = GitHubEmailsSchema.parse(rawEmails);
				const primaryEmail = emails.find((e: GitHubEmail) => e.primary);
				email = primaryEmail?.email || emails[0]?.email || null;
			}
		}

		return {
			id: String(userData.id),
			email: email || "",
			name: userData.name || userData.login,
			picture: userData.avatar_url,
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
