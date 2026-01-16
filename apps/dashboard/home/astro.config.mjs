import vercel from "@astrojs/vercel/static";
import { defineConfig } from "astro/config";
import unocss from "unocss/astro";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://astro.build/config
export default defineConfig({
	site: "https://proofa.sh",
	integrations: [
		unocss({
			configFile: path.resolve(__dirname, "../../packages/styles/uno.astro.config.ts"),
		}),
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
