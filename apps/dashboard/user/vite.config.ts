import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173,
		host: true,
		allowedHosts: [
			"localhost",
		],
		proxy: {
			"/api": {
				target: "http://localhost:3004",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
	define: {
		"import.meta.env.VITE_GATEWAY_URL": JSON.stringify(process.env.VITE_GATEWAY_URL || "http://localhost:3004"),
		"import.meta.env.VITE_HOME_URL": JSON.stringify(process.env.VITE_HOME_URL || "http://localhost:4321"),
		"import.meta.env.VITE_DOCS_URL": JSON.stringify(process.env.VITE_DOCS_URL || "http://localhost:4322"),
	},
});
