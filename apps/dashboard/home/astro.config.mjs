import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	site: "https://nubeauth.com",
	integrations: [tailwind()],
	output: "static",
	server: {
		port: 4321,
	},
});
