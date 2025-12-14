/**
 * User type
 * Represents a platform user
 */
export interface User {
  public_id: string;
  primary_email: string;
  name: string;
  avatar_url?: string;
  is_admin: boolean;
  created_at: number; // epoch seconds
  updated_at: number; // epoch seconds
}

/**
 * Session type
 * Represents a user session
 */
export interface Session {
  public_id: string;
  user_id: string;
  created_at: number; // epoch seconds
  last_seen_at: number; // epoch seconds
  expires_at: number; // epoch seconds
  revoked_at?: number; // epoch seconds or null
}

/**
 * Project type
 * Represents a project owned by a user
 */
export interface Project {
  public_id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  created_at: number; // epoch seconds
}

/**
 * ProjectMember type
 * Represents a user's membership in a project
 */
export interface ProjectMember {
  user_id: string;
  project_id: string;
  role: 'owner' | 'admin' | 'member';
}

/**
 * App type
 * Represents an application within a project
 */
export interface App {
  public_id: string;
  project_id: string;
  name: string;
  slug: string;
  licensing_required: boolean;
  default_license_plan?: string;
  app_session_ttl_days: number;
}

/**
 * License type
 * Represents a license for an app
 */
export interface License {
  public_id: string;
  user_id: string;
  app_id: string;
  plan: string;
  status: 'active' | 'expired' | 'revoked' | 'pending';
  valid_from: number; // epoch seconds
  valid_until: number; // epoch seconds
}

/**
 * AuthUser type
 * User information in auth context
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

/**
 * AuthSession type
 * Session information in auth context
 */
export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: number;
  lastSeenAt: number;
}

/**
 * OAuthProfile type
 * Profile information from OAuth provider
 */
export interface OAuthProfile {
  provider: string;
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

/**
 * AuthCode type
 * Represents an authentication code (e.g., for email verification)
 */
export interface AuthCode {
  code: string;
  email: string;
  provider: string;
  expiresAt: number;
  used: boolean;
}
