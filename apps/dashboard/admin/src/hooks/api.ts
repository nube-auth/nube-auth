import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Project {
	id: string;
	name: string;
	description: string;
	public_id: string;
	slug?: string;
}

interface App {
	id: string;
	name: string;
	public_id: string;
	app_session_ttl_days: number;
}

interface ProjectMember {
	id: string;
	user_id: string;
	project_id: string;
	role: "owner" | "member";
	created_at: string;
}

interface License {
	id: string;
	public_id: string;
	app_id: string;
	max_requests_per_day: number;
	active: boolean;
	expires_at: string;
	status?: string;
	validUntil?: string;
	appId?: string;
	plan?: string;
}

/**
 * Hook to logout
 */
export function useLogout() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const res = await fetch("/api/auth/logout", { 
				method: "POST",
				credentials: "include"
			});
			if (!res.ok) throw new Error("Failed to logout");
			return res.json();
		},
		onSuccess: () => {
			queryClient.clear();
			window.location.href = "/login";
		},
	});
}

export function useProjects() {
	return useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const res = await fetch("/api/admin/projects", { credentials: "include" });
			if (!res.ok) throw new Error("Failed to fetch projects");
			const data = await res.json();
			return (data.projects || []) as Project[];
		},
	});
}

export function useCreateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { name: string; description?: string }) => {
			const res = await fetch("/api/admin/projects", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) throw new Error("Failed to create project");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
	});
}

export function useProject(projectId: string) {
	return useQuery({
		queryKey: ["project", projectId],
		queryFn: async () => {
			const res = await fetch(`/api/admin/projects/${projectId}`, { credentials: "include" });
			if (!res.ok) throw new Error("Failed to fetch project");
			return res.json() as Promise<Project>;
		},
		enabled: !!projectId,
	});
}

export function useProjectApps(projectId: string) {
	return useQuery({
		queryKey: ["project-apps", projectId],
		queryFn: async () => {
			const res = await fetch(`/api/admin/projects/${projectId}/apps`, { credentials: "include" });
			if (!res.ok) throw new Error("Failed to fetch apps");
			const data = await res.json();
			return (data.apps || []) as App[];
		},
		enabled: !!projectId,
	});
}

export function useCreateApp(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { name: string }) => {
			const res = await fetch(`/api/admin/projects/${projectId}/apps`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) throw new Error("Failed to create app");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["project-apps", projectId] });
		},
	});
}

export function useLicenses() {
	return useQuery({
		queryKey: ["licenses"],
		queryFn: async () => {
			const res = await fetch("/api/admin/licenses", { credentials: "include" });
			if (!res.ok) throw new Error("Failed to fetch licenses");
			const data = await res.json();
			return (data.licenses || []) as License[];
		},
	});
}

export function useProjectMembers(projectId: string) {
	return useQuery({
		queryKey: ["project-members", projectId],
		queryFn: async () => {
			const res = await fetch(`/api/admin/projects/${projectId}/members`, { credentials: "include" });
			if (!res.ok) throw new Error("Failed to fetch members");
			return res.json() as Promise<ProjectMember[]>;
		},
		enabled: !!projectId,
	});
}
