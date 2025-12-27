// Environment-based configuration
// For local dev, set VITE_HOME_URL, VITE_DOCS_URL, VITE_CORE_URL to localhost
export const config = {
	homeUrl: import.meta.env.VITE_HOME_URL || "http://localhost:4321",
	docsUrl: import.meta.env.VITE_DOCS_URL || "http://localhost:4322",
	coreUrl: import.meta.env.VITE_CORE_URL || "http://localhost:3003",
};

export default config;
