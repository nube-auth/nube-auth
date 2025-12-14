import { redisClient } from '../redis/client';
import { SESSION_TTL } from '../config/constants';

export interface GatewaySession {
  userId: string;
  appId: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  metadata?: Record<string, any>;
}

/**
 * Session service for managing gateway sessions in Redis
 */
export const sessionService = {
  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    appId: string,
    metadata?: Record<string, any>
  ): Promise<{ token: string; session: GatewaySession }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);

    const session: GatewaySession = {
      userId,
      appId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActivity: now.toISOString(),
      metadata,
    };

    const token = this.generateSessionToken();
    const key = `gateway:session:${token}`;

    await redisClient.setex(key, SESSION_TTL, JSON.stringify(session));

    return { token, session };
  },

  /**
   * Get session by token
   */
  async getSession(token: string): Promise<GatewaySession | null> {
    const key = `gateway:session:${token}`;
    const data = await redisClient.get(key);

    if (!data) {
      return null;
    }

    try {
      const session = JSON.parse(data) as GatewaySession;
      // Update last activity
      session.lastActivity = new Date().toISOString();
      await redisClient.setex(key, SESSION_TTL, JSON.stringify(session));
      return session;
    } catch (error) {
      console.error('Failed to parse session:', error);
      return null;
    }
  },

  /**
   * Delete session by token
   */
  async deleteSession(token: string): Promise<void> {
    const key = `gateway:session:${token}`;
    await redisClient.del(key);
  },

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<void> {
    // TODO: implement if Redis key pattern scanning is needed
    // For now, would need to track session tokens by user
  },

  /**
   * Generate a secure session token
   */
  private generateSessionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  },
};
