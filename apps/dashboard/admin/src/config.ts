// Runtime configuration — prefer window.__NUBAUTH_CONFIG__ injected by nginx
// at container boot. Falls back to Vite env vars for local dev.
declare global {
	interface Window {
		__NUBAUTH_CONFIG__?: {
			gatewayUrl?: string;
			homeUrl?: string;
			docsUrl?: string;
			envTag?: string;
		};
	}
}

const runtime = typeof window !== "undefined" ? window.__NUBAUTH_CONFIG__ : undefined;

export const config = {
	homeUrl: runtime?.homeUrl || import.meta.env.VITE_HOME_URL || "http://localhost:4321",
	docsUrl: runtime?.docsUrl || import.meta.env.VITE_DOCS_URL || "http://localhost:4322",
	gatewayUrl: runtime?.gatewayUrl || import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004",
	envTag: runtime?.envTag || import.meta.env.VITE_ENV_TAG || "Beta",
};

export default config;
