import { ProofaClient } from "@proofa/client";
import {
	AppDTOSchema,
	AppsListResponseSchema,
	LicensesListResponseSchema,
	ProjectDTOSchema,
	ProjectMembersListResponseSchema,
	ProjectsListResponseSchema,
} from "@proofa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	App,
	CreateAppRequest,
	CreateProjectRequest,
	License,
	Project,
	ProjectMember,
	UpdateAppRequest,
} from "../types/admin";
import { pingpong } from "../lib/pingpong";

const client = new ProofaClient({
	gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004",
});

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004";

// Helper to get CSRF token from cookie
function getCsrfToken(): string | null {
	const match = document.cookie.match(/proofa_csrf_token=([^;]+)/);
	return match && match[1] ? match[1] : null;
}

// Helper to make authenticated API calls
async function fetchAPI<T>(path: string, options?: RequestInit, schema?: any): Promise<T> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	// Add any custom headers
	if (options?.headers) {
		const customHeaders = options.headers as Record<string, string>;
		Object.assign(headers, customHeaders);
	}

	// Add CSRF token for state-changing requests
	if (options?.method && !["GET", "HEAD", "OPTIONS"].includes(options.method.toUpperCase())) {
		const csrfToken = getCsrfToken();
		if (csrfToken) {
			headers["X-CSRF-Token"] = csrfToken;
		}
	}

	const response = await pingpong(`${GATEWAY_URL}${path}`, {
		...options,
		credentials: "include",
		headers,
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
			// Only log in development
			if (import.meta.env.DEV) {
				console.error("Schema validation error:", error, "Response data:", json);
			}
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
			return fetchAPI<Project>(
				"/v1/admin/projects",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
				ProjectDTOSchema,
			);
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
			return fetchAPI<Project>(
				`/v1/admin/projects/${projectId}`,
				{
					method: "PATCH",
					body: JSON.stringify(data),
				},
				ProjectDTOSchema,
			);
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
			return fetchAPI<App>(
				`/v1/admin/projects/${projectId}/apps`,
				{
					method: "POST",
					body: JSON.stringify(data),
				},
				AppDTOSchema,
			);
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
			return fetchAPI<
				Array<{
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
				}>
			>(`/v1/admin/projects/${projectId}/apps/${appId}/plans`);
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
				name?: string;
				slug?: string;
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
		mutationFn: async (data: { name: string; slug?: string; provider: string; testMode: boolean; config: any }) => {
			return fetchAPI<{
				success: boolean;
				id: string;
				name: string;
				slug: string;
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

// ===== OAuth Provider Hooks =====

/**
 * Get available OAuth providers for an app (from platform level)
 */
export function useAvailableOAuthProviders(appId: string) {
	return useQuery({
		queryKey: ["oauth-providers", "available", appId],
		queryFn: async () => {
			const data = await fetchAPI<{ providers: any[] }>(`/v1/admin/apps/${appId}/oauth/available`);
			return data.providers;
		},
		enabled: !!appId,
	});
}

/**
 * Get selected OAuth providers for an app
 */
export function useSelectedOAuthProviders(appId: string) {
	return useQuery({
		queryKey: ["oauth-providers", "selected", appId],
		queryFn: async () => {
			const data = await fetchAPI<{ providers: any[] }>(`/v1/admin/apps/${appId}/oauth/selected`);
			return data.providers;
		},
		enabled: !!appId,
	});
}

/**
 * Select OAuth provider for app
 */
export function useSelectOAuthProvider(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { oauthProviderId: number; displayOrder?: number; customButtonText?: string }) => {
			return fetchAPI<{ selection: any }>(`/v1/admin/apps/${appId}/oauth/select`, {
				method: "POST",
				body: JSON.stringify(data),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["oauth-providers", "selected", appId] });
		},
	});
}

/**
 * Deselect OAuth provider for app
 */
export function useDeselectOAuthProvider(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (providerId: number) => {
			return fetchAPI<{ success: boolean }>(`/v1/admin/apps/${appId}/oauth/${providerId}/deselect`, {
				method: "DELETE",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["oauth-providers", "selected", appId] });
		},
	});
}

// ===== Payment Provider Hooks =====

/**
 * Get all payment providers for a project
 */
export function useProjectPaymentProviders(projectId: string) {
	return useQuery({
		queryKey: ["payment-providers", "project", projectId],
		queryFn: async () => {
			const data = await fetchAPI<{ providers: any[] }>(`/v1/admin/projects/${projectId}/payment-providers`);
			return data.providers;
		},
		enabled: !!projectId,
	});
}

/**
 * Get available payment providers for an app
 */
export function useAvailablePaymentProviders(appId: string, environment: "test" | "production" = "test") {
	return useQuery({
		queryKey: ["payment-providers", "available", appId, environment],
		queryFn: async () => {
			const data = await fetchAPI<{ providers: any[] }>(
				`/v1/admin/apps/${appId}/payment/available?environment=${environment}`,
			);
			return data.providers;
		},
		enabled: !!appId,
	});
}

/**
 * Get selected payment provider for an app
 */
export function useSelectedPaymentProvider(appId: string) {
	return useQuery({
		queryKey: ["payment-providers", "selected", appId],
		queryFn: async () => {
			const data = await fetchAPI<{ provider: any | null }>(`/v1/admin/apps/${appId}/payment/selected`);
			return data.provider;
		},
		enabled: !!appId,
	});
}

/**
 * Create payment provider
 */
export function useCreatePaymentProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: {
			projectId: string;
			data: {
				name: string;
				slug?: string;
				entityType: "platform" | "project" | "app";
				entityId?: number | null;
				projectId?: string;
				provider: string;
				environment: "test" | "production";
				credentials: Record<string, string>;
				webhookSecret?: string;
			};
		}) => {
			return fetchAPI<{ provider: any }>("/v1/admin/payment-providers", {
				method: "POST",
				body: JSON.stringify(data.data),
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["payment-providers", "project", variables.projectId] });
		},
	});
}

/**
 * Update payment provider
 */
export function useUpdatePaymentProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: {
			projectId: string;
			providerId: string;
			data: {
				name?: string;
				slug?: string;
				credentials?: Record<string, string>;
				webhookSecret?: string;
				isActive?: boolean;
				environment?: "test" | "production";
			};
		}) => {
			return fetchAPI<{ success: boolean }>(`/v1/admin/payment-providers/${data.providerId}`, {
				method: "PATCH",
				body: JSON.stringify(data.data),
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["payment-providers", "project", variables.projectId] });
		},
	});
}

/**
 * Delete payment provider
 */
export function useDeletePaymentProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { projectId: string; providerId: string }) => {
			return fetchAPI<{ success: boolean }>(`/v1/admin/payment-providers/${data.providerId}`, {
				method: "DELETE",
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["payment-providers", "project", variables.projectId] });
		},
	});
}

/**
 * Select payment provider for app
 */
export function useSelectPaymentProvider(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (paymentProviderId: number) => {
			return fetchAPI<{ success: boolean }>(`/v1/admin/apps/${appId}/payment/select`, {
				method: "POST",
				body: JSON.stringify({ paymentProviderId }),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["payment-providers", "selected", appId] });
		},
	});
}
