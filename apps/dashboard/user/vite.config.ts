import path from "node:path";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwind()],
	resolve: {
		alias: {
			"@nube-auth/react": path.resolve(__dirname, "../../packages/react/dist/index.js"),
			"@nube-auth/client": path.resolve(__dirname, "../../packages/client/dist/index.js"),
			"@nube-auth/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
			"@nube-auth/auth": path.resolve(__dirname, "../../packages/auth/dist/index.js"),
			"@nube-auth/cache": path.resolve(__dirname, "../../packages/cache/dist/index.js"),
			"@nube-auth/db": path.resolve(__dirname, "../../packages/db/dist/index.js"),
			"@nube-auth/queue": path.resolve(__dirname, "../../packages/queue/dist/index.js"),
		},
	},
	server: {
		port: 5173,
		host: true,
		allowedHosts: ["localhost"],
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
		"import.meta.env.VITE_COOKIE_NAMESPACE": JSON.stringify(process.env.VITE_COOKIE_NAMESPACE || ""),
	},
});
