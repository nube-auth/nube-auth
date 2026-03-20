// Environment-based configuration for the home dashboard
// For local development, set PUBLIC_DOCS_URL to localhost value

export const config = {
	docsUrl: import.meta.env.PUBLIC_DOCS_URL || "https://docs.nubeauth.com",
	envTag: import.meta.env.PUBLIC_ENV_TAG || "Beta",
};

export default config;
