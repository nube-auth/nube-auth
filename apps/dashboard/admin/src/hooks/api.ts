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
} from "@proofa/shared";

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

export function useUpdateProject(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { name: string; slug: string; description?: string }) => {
			return fetchAPI<Project>(`/v1/admin/projects/${projectId}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}, ProjectDTOSchema);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["project", projectId] });
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

export function useProjectStats(projectId: string) {
	return useQuery({
		queryKey: ["project-stats", projectId],
		queryFn: async () => {
			return fetchAPI<{
				totalApps: number;
				totalUsers: number;
				totalLicenses: number;
				activeLicenses: number;
				licenseCounts: Record<string, number>;
				totalRevenue: number;
			}>(`/v1/admin/projects/${projectId}/stats`);
		},
		enabled: !!projectId,
	});
}

export function useAppStats(projectId: string, appId: string) {
	return useQuery({
		queryKey: ["app-stats", projectId, appId],
		queryFn: async () => {
			return fetchAPI<{
				totalUsers: number;
				totalLicenses: number;
				activeLicenses: number;
				licenseCounts: Record<string, number>;
				totalSessions: number;
				totalRevenue: number;
			}>(`/v1/admin/projects/${projectId}/apps/${appId}/stats`);
		},
		enabled: !!projectId && !!appId,
	});
}

export function useAppUsers(projectId: string, appId: string) {
	return useQuery({
		queryKey: ["app-users", projectId, appId],
		queryFn: async () => {
			return fetchAPI<{
				users: Array<{
					id: string;
					name: string | null;
					email: string;
					avatarUrl: string | null;
					primaryEmailVerified: boolean;
					plan: string;
					status: string;
					createdAt: number;
					licenseValidUntil: number | null;
				}>;
				total: number;
			}>(`/v1/admin/projects/${projectId}/apps/${appId}/users`);
		},
		enabled: !!projectId && !!appId,
	});
}

export function useAppPlans(projectId: string, appId: string) {
	return useQuery({
		queryKey: ["app-plans", projectId, appId],
		queryFn: async () => {
			return fetchAPI<Array<{
				id: string;
				name: string;
				slug: string;
				description: string | null;
				monthlyPrice: number | null;
				yearlyPrice: number | null;
				oneTimePrice: number | null;
				trialEnabled: boolean;
				trialDays: number | null;
				features: string[];
				status: string;
				displayOrder: number;
			}>>(`/v1/admin/projects/${projectId}/apps/${appId}/plans`);
		},
		enabled: !!projectId && !!appId,
	});
}

// Team Member Management
export function useInviteTeamMember(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { email: string; role?: string }) => {
			return fetchAPI<
				| {
						type: "member";
						id: number;
						userId: string;
						email: string;
						name: string | null;
						role: string;
						createdAt: number;
				  }
				| {
						type: "invitation";
						id: string;
						email: string;
						role: string;
						status: string;
						createdAt: number;
						expiresAt: number;
				  }
			>(`/v1/admin/projects/${projectId}/members`, {
				method: "POST",
				body: JSON.stringify(data),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
			queryClient.invalidateQueries({ queryKey: ["project-invitations", projectId] });
		},
	});
}

export function useProjectInvitations(projectId: string) {
	return useQuery({
		queryKey: ["project-invitations", projectId],
		queryFn: async () => {
			return fetchAPI<{
				invitations: Array<{
					id: string;
					email: string;
					role: string;
					status: string;
					createdAt: number;
					expiresAt: number;
				}>;
			}>(`/v1/admin/projects/${projectId}/invitations`);
		},
		enabled: !!projectId,
	});
}

export function useCancelInvitation(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (invitationId: string) => {
			return fetchAPI<{ success: boolean }>(`/v1/admin/projects/${projectId}/invitations/${invitationId}`, {
				method: "DELETE",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["project-invitations", projectId] });
		},
	});
}

export function useUpdateTeamMember(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
			return fetchAPI<{
				id: string;
				userId: string;
				email: string;
				name: string | null;
				role: string;
				createdAt: number;
			}>(`/v1/admin/projects/${projectId}/members/${memberId}`, {
				method: "PATCH",
				body: JSON.stringify({ role }),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
		},
	});
}

export function useRemoveTeamMember(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (memberId: string) => {
			return fetchAPI<{ success: boolean }>(`/v1/admin/projects/${projectId}/members/${memberId}`, {
				method: "DELETE",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
		},
	});
}

// License Management
export function useRenewLicense(projectId: string, appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (userId: string) => {
			return fetchAPI<{
				success: boolean;
				message: string;
				license: {
					id: string;
					plan: string;
					status: string;
					validUntil: number | null;
				};
			}>(`/v1/admin/projects/${projectId}/apps/${appId}/users/${userId}/renew`, {
				method: "POST",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["app-users", projectId, appId] });
			queryClient.invalidateQueries({ queryKey: ["app-user", projectId, appId] });
		},
	});
}

// Payment Configuration
export function useProjectPaymentConfig(projectId: string) {
	return useQuery({
		queryKey: ["project-payment-config", projectId],
		queryFn: async () => {
			return fetchAPI<{
				configured: boolean;
				id?: string;
				provider?: string;
				testMode?: boolean;
				isActive?: boolean;
				createdAt?: number;
				updatedAt?: number;
			}>(`/v1/admin/projects/${projectId}/payment-config`);
		},
		enabled: !!projectId,
	});
}

export function useSaveProjectPaymentConfig(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { provider: string; testMode: boolean; config: any }) => {
			return fetchAPI<{
				success: boolean;
				id: string;
				provider: string;
				testMode: boolean;
			}>(`/v1/admin/projects/${projectId}/payment-config`, {
				method: "POST",
				body: JSON.stringify(data),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["project-payment-config", projectId] });
		},
	});
}

export function useAppPaymentConfig(projectId: string, appId: string) {
	return useQuery({
		queryKey: ["app-payment-config", projectId, appId],
		queryFn: async () => {
			return fetchAPI<{
				configured: boolean;
				source?: "project" | "app";
				id?: string;
				provider?: string;
				testMode?: boolean;
				isActive?: boolean;
				createdAt?: number;
				updatedAt?: number;
			}>(`/v1/admin/projects/${projectId}/apps/${appId}/payment-config`);
		},
		enabled: !!projectId && !!appId,
	});
}

export function useSaveAppPaymentConfig(projectId: string, appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { provider: string; testMode: boolean; config: any }) => {
			return fetchAPI<{
				success: boolean;
				id: string;
				provider: string;
				testMode: boolean;
			}>(`/v1/admin/projects/${projectId}/apps/${appId}/payment-config`, {
				method: "POST",
				body: JSON.stringify(data),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["app-payment-config", projectId, appId] });
		},
	});
}

export function useDeleteAppPaymentConfig(projectId: string, appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			return fetchAPI<{
				success: boolean;
				message: string;
			}>(`/v1/admin/projects/${projectId}/apps/${appId}/payment-config`, {
				method: "DELETE",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["app-payment-config", projectId, appId] });
		},
	});
}
