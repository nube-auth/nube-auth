export interface ProofaClientConfig {
	gatewayUrl: string;
	/**
	 * S2S token for backend service-to-service authentication.
	 * If provided, it will be sent as X-Proofa-Service-Token header.
	 * Leave undefined for frontend cookie-based authentication.
	 */
	s2sToken?: string;
}

export interface User {
	public_id: string;
	primary_email: string;
	primary_email_verified: boolean;
	name: string | null;
	avatar_url: string | null;
}

export interface AuthStatus {
	loggedIn: boolean;
	user?: User;
}

export interface Session {
	public_id: string;
	created_at: number;
	last_seen_at: number;
	expires_at: number;
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
