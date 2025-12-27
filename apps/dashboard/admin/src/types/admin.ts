export interface Project {
	id: string;
	name: string;
	slug?: string;
	description?: string;
	created_at: number;
	updated_at: number;
}

export interface App {
	id: string;
	public_id: string;
	project_id: string;
	name: string;
	slug?: string;
	description?: string;
	allowed_hosts?: string[];
	redirect_uris?: string[];
	required_providers?: string[];
	is_active?: boolean;
	licensing_required?: boolean;
	default_license_plan?: string;
	trial_days?: number;
	app_session_ttl_days?: number;
	account_lockout_minutes?: number;
	cache_ttl_minutes?: number;
	cors_allowed_origins?: string[];
	rate_limit_requests_per_minute?: number;
	created_at: number;
	updated_at: number;
}

export interface ProjectMember {
	id: string;
	project_id: string;
	userId: string;
	name: string;
	role: string;
	created_at: number;
}

export interface License {
	id: string;
	project_id: string;
	app_id?: string;
	user_id?: string;
	type: string;
	status: string;
	plan?: string;
	valid_from?: number;
	valid_until?: number;
	created_at: number;
	updated_at: number;
}
