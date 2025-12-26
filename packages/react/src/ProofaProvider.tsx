import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ProofaClient, type ProofaClientConfig } from "@proofa/client";

interface ProofaContextValue {
	client: ProofaClient;
	queryClient: QueryClient;
}

const ProofaContext = createContext<ProofaContextValue | null>(null);

interface ProofaProviderProps {
	config: ProofaClientConfig;
	queryClient?: QueryClient;
	children: ReactNode;
}

export function ProofaProvider({
	config,
	queryClient: externalQueryClient,
	children,
}: ProofaProviderProps) {
	const value = useMemo(() => {
		const client = new ProofaClient(config);
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
	}, [config.gatewayUrl, config.s2sToken, externalQueryClient]);

	return (
		<ProofaContext.Provider value={value}>
			<QueryClientProvider client={value.queryClient}>
				{children}
			</QueryClientProvider>
		</ProofaContext.Provider>
	);
}

export function useProofaContext(): ProofaContextValue {
	const context = useContext(ProofaContext);
	if (!context) {
		throw new Error("useProofaContext must be used within ProofaProvider");
	}
	return context;
}
