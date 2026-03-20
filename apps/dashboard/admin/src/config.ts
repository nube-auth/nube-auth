// Environment-based configuration
// For local dev, set VITE_HOME_URL, VITE_DOCS_URL, VITE_GATEWAY_URL to localhost
export const config = {
	homeUrl: import.meta.env.VITE_HOME_URL || "http://localhost:4321",
	docsUrl: import.meta.env.VITE_DOCS_URL || "http://localhost:4322",
	gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004",
	envTag: import.meta.env.VITE_ENV_TAG || "Beta",
};

export default config;
