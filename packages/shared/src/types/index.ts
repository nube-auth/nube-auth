/**
 * User type
 * Represents a platform user
 */
export interface User {
	id: number; // internal only
	public_id: string; // U0xxx
	primary_email: string | null;
	primary_email_verified: boolean;
	name: string | null;
	avatar_url: string | null;
	is_admin: boolean;
	created_at: number; // epoch seconds
	updated_at: number; // epoch seconds
}

/**
 * Identity type
 * OAuth/provider identity linked to a user
 */
export interface Identity {
	id: number; // internal only
	public_id: string; // I0xxx
	user_id: number;
	provider: string; // 'google', 'github', 'email', etc.
	provider_user_id: string; // unique per provider
	email: string | null;
	email_verified: boolean;
	created_at: number;
}

/**
 * Session type (Core Session)
 * Represents a user's global session across all apps
 */
export interface Session {
	id: number; // internal only
	public_id: string; // S0xxx
	user_id: number;
	created_at: number; // epoch seconds
	last_seen_at: number; // epoch seconds
	expires_at: number; // epoch seconds
	revoked_at: number | null; // null if active
}

/**
 * Project type
 * Represents a project owned by a user
 */
export interface Project {
	id: number; // internal only
	public_id: string; // P0xxx
	name: string;
	slug: string;
	owner_user_id: number;
	created_at: number;
	updated_at: number;
}

/**
 * ProjectMember type
 * Represents a user's membership in a project
 */
export interface ProjectMember {
	id: number; // internal only
	project_id: number;
	user_id: number;
	role: "owner" | "admin" | "member";
	created_at: number;
}

/**
 * App type
 * Represents an application within a project
 */
export interface App {
	id: number; // internal only
	public_id: string; // A0xxx
	project_id: number;
	name: string;
	slug: string;
	allowed_hosts: string; // JSON array
	redirect_uris: string; // JSON array
	required_providers: string; // JSON array ['google', 'github']
	is_active: boolean;
	licensing_required: boolean;
	default_license_plan: "free" | "trial"; // 'free' or 'trial'
	trial_days: number | null; // required if plan = 'trial'
	app_session_ttl_days: number; // default 28 (1-365)
	account_lockout_minutes: number; // default 15
	cache_ttl_minutes: number; // default 10
	cors_allowed_origins: string; // JSON array (optional)
	rate_limit_requests_per_minute: number; // default 100
	created_at: number;
	updated_at: number;
}

/**
 * License type
 * Represents a license for a user in an app
 */
export interface License {
	id: number; // internal only
	public_id: string; // L0xxx
	user_id: number;
	app_id: number;
	plan: "free" | "trial" | "pro" | "team" | "enterprise";
	status: "active" | "expired" | "canceled" | "suspended";
	source: "manual" | "promo" | "stripe" | "lemonsqueezy" | "internal";
	valid_from: number; // epoch seconds
	valid_until: number | null; // null = lifetime
	entitlements: string | null; // JSON object
	provider: string | null; // payment provider
	provider_ref_id: string | null; // provider ID
	metadata: string | null; // JSON object
	created_at: number;
	updated_at: number;
}

/**
 * AuthCode type
 * Single-use authorization code
 */
export interface AuthCode {
	id: number; // internal only
	public_id: string; // C0xxx
	code: string; // random high-entropy token
	user_id: number;
	app_id: number;
	redirect_uri: string;
	created_at: number;
	expires_at: number; // TTL 120s
	consumed_at: number | null; // null if unused
}

/**
 * EmailVerification type
 * OTP for email verification
 */
export interface EmailVerification {
	id: number; // internal only
	public_id: string; // E0xxx
	email: string;
	otp_hash: string; // bcrypt hashed
	attempts: number; // track failed attempts
	expires_at: number; // TTL 10 min
	locked_until: number | null; // null if not locked (3 attempts = 30 min lockout)
	consumed_at: number | null; // null if unused
	created_at: number;
}

/**
 * AuditLog type
 * Log of state-changing actions
 */
export interface AuditLog {
	id: number; // internal only
	public_id: string; // AL0xxx
	user_id: number;
	app_id: number | null;
	project_id: number | null;
	action: "create" | "update" | "delete" | "grant" | "revoke" | "login" | "logout";
	entity_type: string; // 'user', 'app', 'project', 'license', etc.
	entity_id: string | null;
	changes: string | null; // JSON object (before/after)
	ip_address: string | null;
	created_at: number;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
	ok: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: Record<string, any>;
	};
}

/**
 * Authenticated user context (after login)
 */
export interface AuthContext {
	user: User;
	session: Session;
	license?: License;
}
