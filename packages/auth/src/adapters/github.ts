import type { OAuthAdapter, OAuthProfile } from '../types/index.js';

/**
 * GitHub OAuth configuration
 */
interface GitHubOAuthConfig {
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
 * GitHub OAuth adapter
 * Implements OAuth 2.0 for GitHub
 */
export class GitHubOAuthAdapter implements OAuthAdapter {
  private clientId: string;
  private clientSecret: string;
  private readonly authorizationEndpoint = 'https://github.com/login/oauth/authorize';
  private readonly tokenEndpoint = 'https://github.com/login/oauth/access_token';
  private readonly userEndpoint = 'https://api.github.com/user';
  private readonly userEmailEndpoint = 'https://api.github.com/user/emails';

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
      scope: 'user:email',
      state,
      allow_signup: 'true',
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
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        code: params.code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: params.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json() as any;
    
    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

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
    // Fetch user data
    const userResponse = await fetch(this.userEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const userData = await userResponse.json() as any;

    // Fetch primary email
    let email = userData.email;
    if (!email) {
      const emailResponse = await fetch(this.userEmailEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (emailResponse.ok) {
        const emails = await emailResponse.json() as any[];
        const primaryEmail = emails.find((e: any) => e.primary);
        email = primaryEmail?.email || emails[0]?.email;
      }
    }

    return {
      id: String(userData.id),
      email: email || '',
      name: userData.name || userData.login,
      picture: userData.avatar_url || undefined,
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
