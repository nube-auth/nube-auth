import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProofaClient } from "@proofa/client";

const client = new ProofaClient({
	gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004",
});

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
			const data = await client.admin.projects.list();
			return data.projects;
		},
	});
}

export function useCreateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { name: string; slug: string; description?: string }) => {
			return client.admin.projects.create(data);
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
			return client.admin.projects.get(projectId);
		},
		enabled: !!projectId,
	});
}

export function useProjectApps(projectId: string) {
	return useQuery({
		queryKey: ["project-apps", projectId],
		queryFn: async () => {
			const data = await client.admin.projects.apps(projectId);
			return data.apps;
		},
		enabled: !!projectId,
	});
}

export function useCreateApp(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { name: string; slug?: string }) => {
			return client.admin.projects.createApp(projectId, data);
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
			const data = await client.admin.licenses.list();
			return data.licenses;
		},
	});
}

export function useProjectMembers(projectId: string) {
	return useQuery({
		queryKey: ["project-members", projectId],
		queryFn: async () => {
			const data = await client.admin.projects.members(projectId);
			return data.members;
		},
		enabled: !!projectId,
	});
}
