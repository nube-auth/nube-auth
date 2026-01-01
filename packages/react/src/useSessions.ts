import type { Session } from "@proofa/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useProofaContext } from "./ProofaProvider";

export function useSessions() {
	const { client } = useProofaContext();
	const queryClient = useQueryClient();

	const {
		data: response,
		isLoading,
		error,
		refetch,
	} = useQuery<{ sessions: Session[] }>({
		queryKey: ["sessions"],
		queryFn: () => client.sessions.list(),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});

	const sessions = response?.sessions ?? [];

	const deleteMutation = useMutation({
		mutationFn: (sessionId: string) => client.sessions.delete(sessionId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["sessions"] });
		},
	});

	const deleteAllMutation = useMutation({
		mutationFn: () => client.sessions.deleteAll(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["sessions"] });
		},
	});

	return {
		sessions,
		isLoading,
		error,
		refetch,
		deleteSession: deleteMutation.mutate,
		deleteSessionAsync: deleteMutation.mutateAsync,
		isDeleting: deleteMutation.isPending,
		deleteError: deleteMutation.error,
		deleteAll: deleteAllMutation.mutate,
		deleteAllAsync: deleteAllMutation.mutateAsync,
		isDeletingAll: deleteAllMutation.isPending,
		deleteAllError: deleteAllMutation.error,
	};
}
