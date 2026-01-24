import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";

interface AdminUser {
	id: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
}

interface AuthResponse {
	authenticated: boolean;
	user: AdminUser | null;
}

export function useAuth() {
	return useQuery({
		queryKey: ["auth"],
		queryFn: async () => {
			try {
				const data = await fetchAPI<AuthResponse>("/v1/admin/auth/me");
				return data;
			} catch (error) {
				// If auth check fails, user is not authenticated
				return { authenticated: false, user: null };
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: true,
		retry: false,
	});
}
