/**
 * Gateway session types
 */

export interface GatewaySession {
  userId: string;
  appId: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  metadata?: Record<string, any>;
}

export interface SessionToken {
  token: string;
  expiresAt: string;
}

export interface SessionContext {
  sessionToken: string;
  session: GatewaySession;
  userId: string;
  appId: string;
}

export interface SessionData {
  userId: string;
  appId: string;
  email?: string;
  name?: string;
  avatar?: string;
  roles?: string[];
}
