import vercel from "@astrojs/vercel/static";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	site: "https://proofa.sh",
	integrations: [
		tailwind(),
	],
	output: "static",
	adapter: vercel({
		webAnalytics: {
			enabled: true,
		},
	}),
	server: {
		port: 4321,
	},
});
