import * as crypto from 'crypto';
import type { Session } from '@proofa/shared';
import { generateSessionToken } from './crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret-change-in-production';

/**
 * Create a signed session cookie
 */
export function createSessionCookie(
  sessionId: string,
  options?: {
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    domain?: string;
    path?: string;
  }
): { name: string; value: string; attributes: Record<string, unknown> } {
  const signed = signSessionId(sessionId);

  return {
    name: 'proofa_session',
    value: signed,
    attributes: {
      httpOnly: true,
      secure: options?.secure ?? true,
      sameSite: options?.sameSite ?? 'Lax',
      domain: options?.domain,
      path: options?.path ?? '/',
    },
  };
}

/**
 * Parse and verify session cookie
 */
export function parseSessionCookie(cookieValue: string): string | null {
  try {
    return verifySessionId(cookieValue);
  } catch {
    return null;
  }
}

/**
 * Sign session ID with HMAC
 */
export function signSessionId(sessionId: string): string {
  const hmac = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(sessionId)
    .digest('hex');
  return `${sessionId}.${hmac}`;
}

/**
 * Verify signed session ID
 */
export function verifySessionId(signed: string): string {
  const [sessionId, hmac] = signed.split('.');
  if (!sessionId || !hmac) {
    throw new Error('Invalid session format');
  }

  const expectedHmac = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(sessionId)
    .digest('hex');

  if (hmac !== expectedHmac) {
    throw new Error('Session signature invalid');
  }

  return sessionId;
}

/**
 * Create a new session object (for Core only)
 */
export function createCoreSession(userId: string, identityId: string): Session {
  const sessionId = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    id: sessionId,
    userId,
    identityId,
    appId: null,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a new session for an app
 */
export function createAppSession(
  userId: string,
  identityId: string,
  appId: string,
  ttlDays: number
): Session {
  const sessionId = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  return {
    id: sessionId,
    userId,
    identityId,
    appId,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: Session): boolean {
  return new Date() > session.expiresAt;
}

/**
 * Get remaining TTL in milliseconds
 */
export function getSessionTTL(session: Session): number {
  const remaining = session.expiresAt.getTime() - new Date().getTime();
  return Math.max(0, remaining);
}
