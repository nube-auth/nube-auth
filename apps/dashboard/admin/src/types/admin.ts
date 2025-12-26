export interface Project {
	public_id: string;
	name: string;
	slug?: string;
	description?: string;
	created_at: number;
	updated_at: number;
}

export interface App {
	public_id: string;
	project_id: string;
	name: string;
	slug?: string;
	app_session_ttl_days?: number;
	created_at: number;
	updated_at: number;
}

export interface ProjectMember {
	public_id: string;
	project_id: string;
	user_id: string;
	role: string;
	created_at: number;
}

export interface License {
	public_id: string;
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
