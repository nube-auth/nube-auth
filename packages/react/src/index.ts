export { ProofaProvider, useProofaContext } from "./ProofaProvider";
export { useAuth } from "./useAuth";
export { useMe } from "./useMe";
export { useSessions } from "./useSessions";

// Re-export types from client for convenience
export type {
	AuthStatus,
	License,
	ProofaClientConfig,
	Session,
	UpdateProfileData,
	User,
} from "@proofa/client";
