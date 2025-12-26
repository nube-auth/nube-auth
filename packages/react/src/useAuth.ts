import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useProofaContext } from "./ProofaProvider";
import type { AuthStatus } from "@proofa/client";

export function useAuth() {
	const { client } = useProofaContext();
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
