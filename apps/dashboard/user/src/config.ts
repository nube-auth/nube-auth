// Environment-based configuration
// For local dev, set VITE_HOME_URL, VITE_DOCS_URL, VITE_GATEWAY_URL to localhost
export const config = {
	homeUrl: import.meta.env.VITE_HOME_URL || "https://proofa.sh",
	docsUrl: import.meta.env.VITE_DOCS_URL || "https://docs.proofa.com",
	gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "https://api.proofa.sh",
};
