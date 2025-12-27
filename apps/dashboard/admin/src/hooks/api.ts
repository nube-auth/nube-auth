import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProofaClient } from "@proofa/client";
import type { Project, App, ProjectMember, License } from "../types/admin";

const client = new ProofaClient({
	gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004",
});

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004";

// Helper to make authenticated API calls
async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${GATEWAY_URL}${path}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw new Error(error.message || "Request failed");
	}

	return response.json();
}

/**
 * Hook to logout
 */
export function useLogout() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			return client.auth.logout();
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
			const data = await fetchAPI<{ projects: Project[] }>("/v1/admin/projects");
			return data.projects;
		},
	});
}

export function useCreateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { name: string; slug: string; description?: string }) => {
			return fetchAPI<Project>("/v1/admin/projects", {
				method: "POST",
				body: JSON.stringify(data),
			});
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
			return fetchAPI<Project>(`/v1/admin/projects/${projectId}`);
		},
		enabled: !!projectId,
	});
}

export function useProjectApps(projectId: string) {
	return useQuery({
		queryKey: ["project-apps", projectId],
		queryFn: async () => {
			const data = await fetchAPI<{ apps: App[] }>(`/v1/admin/projects/${projectId}/apps`);
			return data.apps;
		},
		enabled: !!projectId,
	});
}

export function useCreateApp(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: {
			name: string;
			slug?: string;
			description?: string;
			redirect_uris?: string[];
			allowed_hosts?: string[];
			required_providers?: string[];
			app_session_ttl_days?: number;
			licensing_required?: boolean;
			default_license_plan?: string;
			trial_days?: number;
		}) => {
			return fetchAPI<App>(`/v1/admin/projects/${projectId}/apps`, {
				method: "POST",
				body: JSON.stringify(data),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["project-apps", projectId] });
		},
	});
}

export function useApp(projectId: string, appId: string) {
	return useQuery({
		queryKey: ["app", appId],
		queryFn: async () => {
			return fetchAPI<App>(`/v1/admin/projects/${projectId}/apps/${appId}`);
		},
		enabled: !!projectId && !!appId,
	});
}

export function useUpdateApp(projectId: string, appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: Partial<App>) => {
			return fetchAPI<App>(`/v1/admin/projects/${projectId}/apps/${appId}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["app", appId] });
			queryClient.invalidateQueries({ queryKey: ["project-apps", projectId] });
		},
	});
}

export function useLicenses() {
	return useQuery({
		queryKey: ["licenses"],
		queryFn: async () => {
			const data = await fetchAPI<{ licenses: License[] }>("/v1/admin/licenses");
			return data.licenses;
		},
	});
}

export function useProjectMembers(projectId: string) {
	return useQuery({
		queryKey: ["project-members", projectId],
		queryFn: async () => {
			const data = await fetchAPI<{ members: ProjectMember[] }>(`/v1/admin/projects/${projectId}/members`);
			return data.members;
		},
		enabled: !!projectId,
	});
}
