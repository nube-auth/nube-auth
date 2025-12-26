import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useProofaContext } from "./ProofaProvider";
import type { UpdateProfileData, User } from "@proofa/client";

export function useMe() {
	const { client } = useProofaContext();
	const queryClient = useQueryClient();

	const {
		data: user,
		isLoading,
		error,
		refetch,
	} = useQuery<User>({
		queryKey: ["me"],
		queryFn: () => client.me.get(),
		staleTime: 1000 * 60 * 5, // 5 minutes
		retry: false,
		refetchOnWindowFocus: false,
	});

	const updateMutation = useMutation({
		mutationFn: (data: UpdateProfileData) => client.me.update(data),
		onSuccess: (updatedUser) => {
			queryClient.setQueryData(["me"], updatedUser);
			queryClient.invalidateQueries({ queryKey: ["auth", "status"] });
		},
	});

	return {
		user,
		isLoading,
		error,
		refetch,
		update: updateMutation.mutate,
		updateAsync: updateMutation.mutateAsync,
		isUpdating: updateMutation.isPending,
		updateError: updateMutation.error,
	};
}
