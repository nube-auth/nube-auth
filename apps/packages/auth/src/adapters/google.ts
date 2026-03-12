import { GoogleTokenResponseSchema, GoogleUserInfoSchema } from "../schemas/index.js";
import type { OAuthAdapter, OAuthProfile } from "../types/index.js";
import { pingpongFetch } from "../pingpong.js";
import { createLogger } from "@nube-auth/shared";
import * as jose from "jose";

const log = createLogger("google-oauth-adapter");

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/**
 * Verify and decode a Google id_token using JWKS
 * Validates signature, audience, issuer, and expiry
 */
async function verifyGoogleIdToken(
	idToken: string,
	clientId: string,
): Promise<Record<string, unknown>> {
	const jwks = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
	const { payload } = await jose.jwtVerify(idToken, jwks, {
		audience: clientId,
		issuer: GOOGLE_ISSUERS,
	});
	return payload as Record<string, unknown>;
}

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
	idToken?: string | undefined;
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
		try {
			const response = await pingpongFetch(this.tokenEndpoint, {
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

			log.debug({ status: response.status, ok: response.ok?.() }, "Token exchange response received");

			if (!response.ok()) {
				const errorText = response.body;
				throw new Error(`Failed to exchange code for token: ${response.status} ${errorText}`);
			}

			// Get response data - handle both response.data and manual JSON parsing
			let rawData = response.data;
			log.debug({ 
				hasData: !!rawData, 
				dataType: typeof rawData,
				hasBody: !!response.body,
				bodyType: typeof response.body
			}, "Checking response data");

			if (!rawData && response.body) {
				// Fallback: manually parse if response.data not available
				try {
					const bodyStr = typeof response.body === 'string' 
						? response.body
						: JSON.stringify(response.body);
					rawData = JSON.parse(bodyStr);
					log.debug({ parsed: true }, "Parsed response body");
				} catch (e) {
					log.error({ body: response.body, parseError: e instanceof Error ? e.message : String(e) }, "Failed to parse body");
					throw new Error(`Failed to parse token response: ${response.body}`);
				}
			}

			log.debug({ 
				rawData,
				keys: rawData ? Object.keys(rawData) : null,
				hasAccessToken: !!rawData?.access_token,
				accessTokenType: typeof rawData?.access_token,
				accessTokenLength: typeof rawData?.access_token === 'string' ? rawData.access_token.length : null,
				hasIdToken: !!rawData?.id_token
			}, "Token response data");

			const data = GoogleTokenResponseSchema.parse(rawData);

			return {
				accessToken: data.access_token,
				refreshToken: data.refresh_token,
				expiresIn: data.expires_in,
				idToken: rawData?.id_token,
			};
		} catch (error) {
			log.error({ error: error instanceof Error ? error.message : String(error) }, "Token exchange failed");
			throw error;
		}
	}

	/**
	 * Fetch user profile using id_token (JWT) from OpenID Connect flow
	 * Verifies JWT signature against Google's JWKS before extracting claims
	 */
	async fetchUserProfile(idTokenOrAccessToken: string): Promise<OAuthProfile> {
		try {
			// For OpenID Connect, if it looks like a JWT (has dots), verify and decode it
			if (idTokenOrAccessToken.includes('.')) {
				log.debug({ tokenPrefix: idTokenOrAccessToken.substring(0, 20) }, "Verifying id_token JWT");
				const decoded = await verifyGoogleIdToken(idTokenOrAccessToken, this.clientId);
				
				log.debug({ 
					keys: Object.keys(decoded),
					hasEmail: !!decoded['email'],
					hasSub: !!decoded['sub']
				}, "Verified id_token");

				// Reject unverified emails
				if (decoded['email_verified'] !== true) {
					throw new Error("Google email not verified");
				}

				const data = GoogleUserInfoSchema.parse({
					sub: decoded['sub'],
					email: decoded['email'],
					name: decoded['name'],
					picture: decoded['picture'],
				});

				return {
					id: data.sub,
					email: data.email,
					name: data.name || (data.email.split("@")[0] ?? data.email),
					picture: data.picture,
				};
			}

			// Fallback: if not a JWT, use the userinfo endpoint with access token
			log.debug({ 
				tokenType: typeof idTokenOrAccessToken,
				tokenLength: idTokenOrAccessToken?.length,
				tokenPrefix: idTokenOrAccessToken?.substring(0, 20),
			}, "Fetching user profile with access token");

			const response = await pingpongFetch(this.userInfoEndpoint, {
				headers: {
					Authorization: `Bearer ${idTokenOrAccessToken}`,
				},
			});

			log.debug({ 
				status: response.status, 
				ok: response.ok?.(),
			}, "User profile response received");

			if (!response.ok()) {
				const errorText = response.body;
				log.error({ 
					status: response.status, 
					errorText,
				}, "Failed to fetch user profile");
				throw new Error(`Failed to fetch user profile: ${response.status} ${errorText}`);
			}

			// Get response data - handle both response.data and manual JSON parsing
			let rawData = response.data;
			if (!rawData && response.body) {
				// Fallback: manually parse if response.data not available
				try {
					const bodyStr = typeof response.body === 'string' 
						? response.body
						: JSON.stringify(response.body);
					rawData = JSON.parse(bodyStr);
				} catch (_e) {
					throw new Error(`Failed to parse user profile response: ${response.body}`);
				}
			}

			const data = GoogleUserInfoSchema.parse(rawData);

			return {
				id: data.sub,
				email: data.email,
				name: data.name || (data.email.split("@")[0] ?? data.email),
				picture: data.picture,
			};
		} catch (error) {
			log.error({ error: error instanceof Error ? error.message : String(error) }, "User profile fetch failed");
			throw error;
		}
	}

	/**
	 * Complete OAuth flow: exchange code and fetch profile
	 */
	async exchangeToken(code: string, redirectUri: string): Promise<OAuthProfile> {
		const tokens = await this.exchangeCodeForTokens(code, redirectUri);
		return this.fetchUserProfile(tokens.accessToken);
	}
}
