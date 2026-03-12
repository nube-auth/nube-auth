import type { AuthStatus } from "@nube-auth/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNubeAuthContext } from "./ProofaProvider";

export function useAuth() {
	const { client } = useNubeAuthContext();
	const queryClient = useQueryClient();

	const {
		data: status,
		isLoading,
		error,
	} = useQuery<AuthStatus>({
		queryKey: ["auth", "status"],
		queryFn: () => client.auth.checkStatus(),
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnWindowFocus: false,
	});

	const logoutMutation = useMutation({
		mutationFn: () => client.auth.logout(),
		onSuccess: () => {
			queryClient.clear();
			window.location.href = "/";
		},
	});

	return {
		isAuthenticated: status?.loggedIn ?? false,
		user: status?.user,
		isLoading,
		error,
		logout: logoutMutation.mutate,
		isLoggingOut: logoutMutation.isPending,
	};
}
