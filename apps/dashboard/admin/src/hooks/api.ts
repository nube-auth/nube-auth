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
	return match?.[1] ? match[1] : null;
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
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
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
			queryClient.invalidateQueries({ queryKey: ["app", appId] });
		},
	});
}

// ============================================
// BILLING API HOOKS
// ============================================

interface BillingPurchase {
	id: string;
	app_id: string;
	user_id: string;
	provider: "lemon_squeezy" | "paddle";
	provider_purchase_id: string;
	amount: number;
	currency: string;
	status: string;
	created_at: string;
	updated_at: string;
	app?: { id: string; name: string };
	user?: { id: string; email: string };
}

interface BillingTransaction {
	id: string;
	purchase_id: string;
	type: "purchase" | "renewal" | "refund" | "chargeback" | "manual_adjustment";
	status: "pending" | "completed" | "failed";
	amount: number;
	currency: string;
	provider: "lemon_squeezy" | "paddle";
	created_at: string;
	updated_at: string;
	purchase?: BillingPurchase;
}

interface BillingStats {
	revenue: {
		total: number;
		by_type: Record<string, number>;
		by_provider: Record<string, number>;
		by_currency: Record<string, number>;
	};
	refunds: {
		total: number;
		percentage: number;
	};
	subscriptions: {
		active: number;
	};
	transactions: {
		total: number;
		last_30_days: number;
	};
	webhooks: {
		success: number;
		failed: number;
		processing: number;
	};
}

export function useBillingPurchases(filters?: {
	status?: string;
	provider?: string;
	app_id?: string;
	limit?: number;
	offset?: number;
	start_date?: string;
	end_date?: string;
}) {
	const queryParams = new URLSearchParams();
	if (filters) {
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				queryParams.set(key, String(value));
			}
		});
	}
	const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

	return useQuery({
		queryKey: ["billing", "purchases", filters],
		queryFn: async () => {
			const data = await fetchAPI<{
				data: BillingPurchase[];
				pagination: { total: number; limit: number; offset: number; hasMore: boolean };
			}>(`/v1/admin/billing/purchases${queryString}`);
			return data;
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchOnWindowFocus: false,
	});
}

export function useBillingPurchaseDetail(purchaseId: string) {
	return useQuery({
		queryKey: ["billing", "purchase", purchaseId],
		queryFn: async () => {
			return fetchAPI<{ data: BillingPurchase }>(`/v1/admin/billing/purchases/${purchaseId}`);
		},
		enabled: !!purchaseId,
		staleTime: 2 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
}

export function useBillingTransactions(filters?: {
	type?: string;
	status?: string;
	provider?: string;
	limit?: number;
	offset?: number;
	start_date?: string;
	end_date?: string;
}) {
	const queryParams = new URLSearchParams();
	if (filters) {
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				queryParams.set(key, String(value));
			}
		});
	}
	const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

	return useQuery({
		queryKey: ["billing", "transactions", filters],
		queryFn: async () => {
			const data = await fetchAPI<{
				data: BillingTransaction[];
				pagination: { total: number; limit: number; offset: number; hasMore: boolean };
			}>(`/v1/admin/billing/transactions${queryString}`);
			return data;
		},
		staleTime: 2 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
}

export function useBillingStats(filters?: { start_date?: string; end_date?: string; provider?: string }) {
	const queryParams = new URLSearchParams();
	if (filters) {
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				queryParams.set(key, String(value));
			}
		});
	}
	const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

	return useQuery({
		queryKey: ["billing", "stats", filters],
		queryFn: async () => {
			return fetchAPI<{ data: BillingStats }>(`/v1/admin/billing/stats${queryString}`);
		},
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
}

// ============================================
// PAYMENT PROVIDER HEALTH
// ============================================

interface ProviderHealth {
	provider: string;
	healthy: boolean;
	lastWebhook?: string;
	lastWebhookStatus?: "success" | "failed";
	successRate: number;
	failedWebhooks: number;
}

export function useProviderHealth(providerId: string) {
	return useQuery({
		queryKey: ["provider-health", providerId],
		queryFn: async () => {
			return fetchAPI<{ data: ProviderHealth }>(`/v1/admin/payment-providers/${providerId}/health`);
		},
		enabled: !!providerId,
		staleTime: 1 * 60 * 1000, // 1 minute for fresher health data
		refetchOnWindowFocus: false,
	});
}

// ============================================
// WEBHOOK MONITORING
// ============================================

interface WebhookLog {
	id: string;
	provider: "lemon_squeezy" | "paddle";
	event_type: string;
	event_id: string;
	status: "not_started" | "processing" | "success" | "failed";
	ip_address: string;
	processing_duration_ms: number;
	error_message?: string;
	retry_count: number;
	received_at: string;
	processing_completed_at?: string;
}

interface WebhookDetail extends WebhookLog {
	request_body: Record<string, any>;
	request_headers: Record<string, string>;
	signature: string;
	error_stack?: string;
	processing_started_at?: string;
	last_retry_at?: string;
}

export function useWebhookLogs(filters?: {
	provider?: string;
	status?: string;
	event_type?: string;
	limit?: number;
	offset?: number;
	start_date?: string;
	end_date?: string;
}) {
	const queryParams = new URLSearchParams();
	if (filters) {
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				queryParams.set(key, String(value));
			}
		});
	}
	const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

	return useQuery({
		queryKey: ["webhooks", filters],
		queryFn: async () => {
			const data = await fetchAPI<{
				webhooks: WebhookLog[];
				pagination: { total: number; limit: number; offset: number; hasMore: boolean };
			}>(`/v1/admin/billing/webhooks${queryString}`);
			return data;
		},
		staleTime: 30 * 1000, // 30 seconds for webhook data
		refetchOnWindowFocus: false,
	});
}

export function useWebhookDetail(webhookId: string) {
	return useQuery({
		queryKey: ["webhook", webhookId],
		queryFn: async () => {
			return fetchAPI<WebhookDetail>(`/v1/admin/billing/webhooks/${webhookId}`);
		},
		enabled: !!webhookId,
		staleTime: 2 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
}

// ============================================
// REFUND PROCESSING
// ============================================

interface Refund {
	id: string;
	provider: "lemon_squeezy" | "paddle";
	purchase_id: string;
	amount: number;
	currency: string;
	status: "pending" | "processing" | "completed" | "failed";
	reason: string;
	created_at: string;
	completed_at?: string;
	provider_refund_id?: string;
	error_message?: string;
	purchase?: BillingPurchase;
}

export function useBillingRefunds(filters?: {
	status?: string;
	provider?: string;
	purchase_id?: string;
	limit?: number;
	offset?: number;
	start_date?: string;
	end_date?: string;
}) {
	const queryParams = new URLSearchParams();
	if (filters) {
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				queryParams.set(key, String(value));
			}
		});
	}
	const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

	return useQuery({
		queryKey: ["billing", "refunds", filters],
		queryFn: async () => {
			const data = await fetchAPI<{
				refunds: Refund[];
				pagination: { total: number; limit: number; offset: number; hasMore: boolean };
			}>(`/v1/admin/billing/refunds${queryString}`);
			return data;
		},
		staleTime: 2 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
}

export function useCreateRefund() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: { purchase_id: string; amount: number; reason: string }) => {
			return fetchAPI<{ refund: Refund }>("/v1/admin/billing/refunds", {
				method: "POST",
				body: JSON.stringify(data),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["billing", "refunds"] });
			queryClient.invalidateQueries({ queryKey: ["billing", "purchases"] });
			queryClient.invalidateQueries({ queryKey: ["billing", "transactions"] });
		},
	});
}
