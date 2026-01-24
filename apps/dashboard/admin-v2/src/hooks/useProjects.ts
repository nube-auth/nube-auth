import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import {
	ProjectDTOSchema,
	ProjectsListResponseSchema,
	type ProjectDTO,
} from "@proofa/shared";

interface CreateProjectRequest {
	name: string;
	slug: string;
	description?: string;
}

interface UpdateProjectRequest {
	name: string;
	slug: string;
	description?: string;
}

/**
 * Get all projects for the authenticated admin
 */
export function useProjects() {
	return useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const data = await fetchAPI<{ projects: ProjectDTO[] }>(
				"/v1/admin/projects",
			);
			// Validate with schema
			const validated = ProjectsListResponseSchema.parse(data);
			return validated.projects;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});
}

/**
 * Get a single project by ID
 */
export function useProject(projectId: string | undefined) {
	return useQuery({
		queryKey: ["project", projectId],
		queryFn: async () => {
			if (!projectId) throw new Error("Project ID is required");
			const data = await fetchAPI<ProjectDTO>(
				`/v1/admin/projects/${projectId}`,
			);
			// Validate with schema
			return ProjectDTOSchema.parse(data);
		},
		enabled: !!projectId,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});
}

/**
 * Create a new project
 */
export function useCreateProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateProjectRequest) => {
			const response = await fetchAPI<ProjectDTO>("/v1/admin/projects", {
				method: "POST",
				body: JSON.stringify(data),
			});
			return ProjectDTOSchema.parse(response);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
	});
}

/**
 * Update an existing project
 */
export function useUpdateProject(projectId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UpdateProjectRequest) => {
			const response = await fetchAPI<ProjectDTO>(
				`/v1/admin/projects/${projectId}`,
				{
					method: "PATCH",
					body: JSON.stringify(data),
				},
			);
			return ProjectDTOSchema.parse(response);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["project", projectId] });
		},
	});
}

/**
 * Delete a project
 */
export function useDeleteProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (projectId: string) => {
			await fetchAPI<{ success: boolean }>(
				`/v1/admin/projects/${projectId}`,
				{
					method: "DELETE",
				},
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
	});
}

/**
 * Get project statistics
 */
export function useProjectStats(projectId: string | undefined) {
	return useQuery({
		queryKey: ["project-stats", projectId],
		queryFn: async () => {
			if (!projectId) throw new Error("Project ID is required");
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
