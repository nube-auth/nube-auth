// Environment-based configuration for the home dashboard
// For local development, set PUBLIC_DOCS_URL to localhost value

export const config = {
	docsUrl: import.meta.env.PUBLIC_DOCS_URL || "https://docs.proofa.com",
};

export default config;
