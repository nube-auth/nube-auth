import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 3002,
		proxy: {
			"/api": {
				target: "http://localhost:3004",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, "/v1"),
			},
		},
	},
	define: {
		"import.meta.env.VITE_CORE_URL": JSON.stringify(process.env.VITE_CORE_URL || "https://api.proofa.dev"),
		"import.meta.env.VITE_HOME_URL": JSON.stringify(process.env.VITE_HOME_URL || "https://proofa.dev"),
		"import.meta.env.VITE_DOCS_URL": JSON.stringify(process.env.VITE_DOCS_URL || "https://docs.proofa.com"),
	},
});
