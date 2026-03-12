import { NubeAuthClient, type NubeAuthClientConfig } from "@nube-auth/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";

interface NubeAuthContextValue {
	client: NubeAuthClient;
	queryClient: QueryClient;
}

const NubeAuthContext = createContext<NubeAuthContextValue | null>(null);

interface NubeAuthProviderProps {
	config: NubeAuthClientConfig;
	queryClient?: QueryClient;
	children: ReactNode;
}

export function NubeAuthProvider({ config, queryClient: externalQueryClient, children }: NubeAuthProviderProps) {
	const value = useMemo(() => {
		const client = new NubeAuthClient(config);
		const queryClient =
			externalQueryClient ||
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 1000 * 60 * 5, // 5 minutes
						refetchOnWindowFocus: false,
						retry: false,
					},
				},
			});

		return { client, queryClient };
	}, [config.gatewayUrl, config.s2sToken, externalQueryClient, config]);

	return (
		<NubeAuthContext.Provider value={value}>
			<QueryClientProvider client={value.queryClient}>{children}</QueryClientProvider>
		</NubeAuthContext.Provider>
	);
}

export function useNubeAuthContext(): NubeAuthContextValue {
	const context = useContext(NubeAuthContext);
	if (!context) {
		throw new Error("useNubeAuthContext must be used within NubeAuthProvider");
	}
	return context;
}
