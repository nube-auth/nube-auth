import type { Subscription } from "@nube-auth/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNubeAuthContext } from "./NubeAuthProvider";

export function useSubscription() {
	const { client } = useNubeAuthContext();
	const queryClient = useQueryClient();

	const {
		data: subscription,
		isLoading,
		error,
		refetch,
	} = useQuery<Subscription>({
		queryKey: ["subscription"],
		queryFn: () => client.subscription.getDetails(),
		staleTime: 1000 * 60 * 5, // 5 minutes
		retry: false,
		refetchOnWindowFocus: false,
	});

	const cancelMutation = useMutation({
		mutationFn: (reason?: string) => client.subscription.cancel(reason),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["subscription"] });
			queryClient.invalidateQueries({ queryKey: ["license"] });
		},
	});

	const resumeMutation = useMutation({
		mutationFn: () => client.subscription.resume(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["subscription"] });
			queryClient.invalidateQueries({ queryKey: ["license"] });
		},
	});

	return {
		subscription,
		isActive: subscription?.status === "active",
		isLoading,
		error,
		refetch,
		cancel: cancelMutation.mutate,
		cancelAsync: cancelMutation.mutateAsync,
		isCanceling: cancelMutation.isPending,
		cancelError: cancelMutation.error,
		resume: resumeMutation.mutate,
		resumeAsync: resumeMutation.mutateAsync,
		isResuming: resumeMutation.isPending,
		resumeError: resumeMutation.error,
	};
}
