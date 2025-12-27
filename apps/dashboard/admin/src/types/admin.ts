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
	project_id: string;
	name: string;
	slug?: string;
	app_session_ttl_days?: number;
	created_at: number;
	updated_at: number;
}

export interface ProjectMember {
	id: string;
	project_id: string;
	user_id: string;
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
