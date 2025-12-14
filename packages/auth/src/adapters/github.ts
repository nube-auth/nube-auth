import type { OAuthAdapter, OAuthProfile } from '../types';

/**
 * GitHub OAuth configuration
 */
interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
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
   * Exchange authorization code for user profile
   */
  async exchangeToken(code: string, redirectUri: string): Promise<OAuthProfile> {
    // TODO: Implement token exchange
    // 1. POST to tokenEndpoint with code, client_id, client_secret, redirect_uri
    // 2. Extract access_token from response
    // 3. Use access_token to fetch user info from userEndpoint
    // 4. Fetch primary email from userEmailEndpoint
    // 5. Map response to OAuthProfile

    throw new Error('Not implemented');
  }
}
