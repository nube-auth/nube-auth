import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
	plugins: [
		react(),
		tailwind({
			content: [
				'./src/**/*.{js,ts,jsx,tsx}',
				'../../packages/components/src/**/*.{js,ts,jsx,tsx}',
			],
		}),
	],
	resolve: {
		alias: {
			// Utilities
			"@/lib": path.resolve(__dirname, "./src/lib"),
			// Proofa packages
			"@proofa/react": path.resolve(__dirname, "../../packages/react/dist/index.js"),
			"@proofa/client": path.resolve(__dirname, "../../packages/client/dist/index.js"),
			"@proofa/shared": path.resolve(__dirname, "../../packages/shared/dist/index.js"),
			"@proofa/auth/pingpong": path.resolve(__dirname, "../../packages/auth/dist/pingpong.js"),
			"@proofa/auth": path.resolve(__dirname, "../../packages/auth/dist/index.js"),
			"@proofa/cache": path.resolve(__dirname, "../../packages/cache/dist/index.js"),
			"@proofa/db": path.resolve(__dirname, "../../packages/db/dist/index.js"),
			"@proofa/queue": path.resolve(__dirname, "../../packages/queue/dist/index.js"),
		},
	},
	server: {
		port: 5174,
		host: true,
		allowedHosts: ["localhost"],
		proxy: {
			"/api": {
				target: "http://localhost:3004",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, "/v1"),
			},
		},
	},
	define: {
		"import.meta.env.VITE_GATEWAY_URL": JSON.stringify(process.env.VITE_GATEWAY_URL || "http://localhost:3004"),
		"import.meta.env.VITE_CORE_URL": JSON.stringify(process.env.VITE_CORE_URL || "http://localhost:3003"),
		"import.meta.env.VITE_HOME_URL": JSON.stringify(process.env.VITE_HOME_URL || "http://localhost:4321"),
		"import.meta.env.VITE_DOCS_URL": JSON.stringify(process.env.VITE_DOCS_URL || "http://localhost:4322"),
	},
});
