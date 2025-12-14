import type { OAuthAdapter, OAuthProfile } from '../types';

/**
 * Google OAuth configuration
 */
interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * Google OAuth adapter
 * Implements OAuth 2.0 for Google
 */
export class GoogleOAuthAdapter implements OAuthAdapter {
  private clientId: string;
  private clientSecret: string;
  private readonly authorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenEndpoint = 'https://oauth2.googleapis.com/token';
  private readonly userInfoEndpoint = 'https://openidconnect.googleapis.com/v1/userinfo';

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
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for user profile
   */
  async exchangeToken(code: string, redirectUri: string): Promise<OAuthProfile> {
    // TODO: Implement token exchange
    // 1. POST to tokenEndpoint with code, client_id, client_secret, redirect_uri
    // 2. Extract access_token from response
    // 3. Use access_token to fetch user info from userInfoEndpoint
    // 4. Map response to OAuthProfile

    throw new Error('Not implemented');
  }
}
