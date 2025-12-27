import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProofaClient } from "@proofa/client";
import type { Project, App, ProjectMember, License, CreateProjectRequest, CreateAppRequest, UpdateAppRequest } from "../types/admin";
import {
	ProjectDTOSchema,
	ProjectsListResponseSchema,
	AppDTOSchema,
	AppsListResponseSchema,
	ProjectMembersListResponseSchema,
	LicensesListResponseSchema,
} from "@proofa/shared/types/schemas";

const client = new ProofaClient({
	gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004",
});

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004";

// Helper to make authenticated API calls
async function fetchAPI<T>(path: string, options?: RequestInit, schema?: any): Promise<T> {
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

	const json = await response.json();

	// Validate response with schema if provided
	if (schema) {
		try {
			return schema.parse(json);
		} catch (error) {
			console.error("Schema validation error:", error, "Response data:", json);
			throw new Error(`Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}

	return json as T;
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
			const data = await fetchAPI<{ projects: Project[] }>(
				"/v1/admin/projects",
				undefined,
				ProjectsListResponseSchema,
			);
			return data.projects;
		},
	});
}

export function useCreateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: CreateProjectRequest) => {
			return fetchAPI<Project>("/v1/admin/projects", {
				method: "POST",
				body: JSON.stringify(data),
			}, ProjectDTOSchema);
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
			return fetchAPI<Project>(`/v1/admin/projects/${projectId}`, undefined, ProjectDTOSchema);
		},
		enabled: !!projectId,
	});
}

export function useProjectApps(projectId: string) {
	return useQuery({
		queryKey: ["project-apps", projectId],
		queryFn: async () => {
			const data = await fetchAPI<{ apps: App[] }>(
				`/v1/admin/projects/${projectId}/apps`,
				undefined,
				AppsListResponseSchema,
			);
			return data.apps;
		},
		enabled: !!projectId,
	});
}

export function useCreateApp(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: CreateAppRequest) => {
			return fetchAPI<App>(`/v1/admin/projects/${projectId}/apps`, {
				method: "POST",
				body: JSON.stringify(data),
			}, AppDTOSchema);
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
			return fetchAPI<App>(`/v1/admin/projects/${projectId}/apps/${appId}`, undefined, AppDTOSchema);
		},
		enabled: !!projectId && !!appId,
	});
}

export function useUpdateApp(projectId: string, appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: UpdateAppRequest) => {
			return fetchAPI<App>(
				`/v1/admin/projects/${projectId}/apps/${appId}`,
				{
					method: "PATCH",
					body: JSON.stringify(data),
				},
				AppDTOSchema,
			);
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
			const data = await fetchAPI<{ licenses: License[] }>(
				"/v1/admin/licenses",
				undefined,
				LicensesListResponseSchema,
			);
			return data.licenses;
		},
	});
}

export function useProjectMembers(projectId: string) {
	return useQuery({
		queryKey: ["project-members", projectId],
		queryFn: async () => {
			const data = await fetchAPI<{ members: ProjectMember[] }>(
				`/v1/admin/projects/${projectId}/members`,
				undefined,
				ProjectMembersListResponseSchema,
			);
			return data.members;
		},
		enabled: !!projectId,
	});
}
