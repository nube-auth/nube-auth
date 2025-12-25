// Environment-based configuration
// For local dev, set VITE_HOME_URL, VITE_DOCS_URL, VITE_CORE_URL to localhost
export const config = {
	homeUrl: import.meta.env.VITE_HOME_URL || "https://proofa.dev",
	docsUrl: import.meta.env.VITE_DOCS_URL || "https://docs.proofa.com",
	coreUrl: import.meta.env.VITE_CORE_URL || "https://api.proofa.dev",
};
