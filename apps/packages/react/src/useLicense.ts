import type { License } from "@nube-auth/client";
import { useQuery } from "@tanstack/react-query";
import { useNubeAuthContext } from "./ProofaProvider";

export function useLicense() {
	const { client } = useNubeAuthContext();

	const {
		data: license,
		isLoading,
		error,
		refetch,
	} = useQuery<License>({
		queryKey: ["license"],
		queryFn: () => client.license.getDetails(),
		staleTime: 1000 * 60 * 5, // 5 minutes
		retry: false,
		refetchOnWindowFocus: false,
	});

	return {
		license,
		isActive: license?.status === "active",
		isLoading,
		error,
		refetch,
	};
}
