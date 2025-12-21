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
		"import.meta.env.VITE_CORE_URL": JSON.stringify(process.env.VITE_CORE_URL || "http://localhost:3003"),
	},
});
