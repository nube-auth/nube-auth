import type { OAuthAdapter, OAuthProfile } from '../types/index.js';

/**
 * Google OAuth configuration
 */
interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

interface BuildAuthUrlParams {
  redirectUri: string;
  state: string;
}

interface ExchangeCodeParams {
  code: string;
  redirectUri: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
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
   * Build authorization URL (alias)
   */
  buildAuthorizationUrl(params: BuildAuthUrlParams): string {
    return this.getAuthorizationUrl(params.state, params.redirectUri);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(params: ExchangeCodeParams): Promise<TokenResponse> {
    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: params.code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: params.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json() as any;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Fetch user profile using access token
   */
  async fetchUserProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch(this.userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const data = await response.json() as any;
    return {
      id: data.sub,
      email: data.email,
      name: data.name || data.email.split('@')[0],
      picture: data.picture || undefined,
    };
  }

  /**
   * Exchange authorization code for user profile (legacy)
   */
  async exchangeToken(code: string, redirectUri: string): Promise<OAuthProfile> {
    const tokens = await this.exchangeCodeForToken({ code, redirectUri });
    return this.fetchUserProfile(tokens.accessToken);
  }
}
