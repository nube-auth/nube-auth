import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ProofaClient } from "@proofa/client";

const client = new ProofaClient({
	gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "http://localhost:3001",
});

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
