export interface ProofaClientConfig {
	gatewayUrl: string;
	/**
	 * App public ID for license and subscription queries.
	 * Required for client.license and client.subscription modules.
	 */
	appId?: string | undefined;
	/**
	 * S2S token for backend service-to-service authentication.
	 * If provided, it will be sent as X-Proofa-Service-Token header.
	 * Leave undefined for frontend cookie-based authentication.
	 */
	s2sToken?: string | undefined;
}

export interface User {
	id: string;
	email: string;
	name: string | null;
	createdAt: string;
	avatar_url?: string | null;
	emailVerified?: boolean;
}

export interface AuthStatus {
	loggedIn: boolean;
	user?: User;
}

export interface Session {
	id: string;
	createdAt: string | number;
	expiresAt: string;
	isCurrent?: boolean;
	// Device/location info
	ipAddress?: string | null;
	userAgent?: string | null;
	country?: string | null; // ISO 3166-1 alpha-2 country code
}

export interface License {
	public_id: string;
	app_id: string;
	plan: string;
	status: "active" | "expired" | "canceled" | "suspended";
	valid_from: number;
	valid_until: number | null;
	entitlements?: Record<string, unknown>;
}

export interface Subscription {
	public_id: string;
	status: "active" | "canceled" | "past_due" | "trialing";
	billing_interval: string;
	current_period_start: string;
	current_period_end: string | null;
	cancel_at_period_end: boolean;
	amount_cents: number;
	currency: string;
}

export interface UpdateProfileData {
	name?: string;
	avatar_url?: string;
}

export interface ApiError {
	ok: false;
	error: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	};
}
