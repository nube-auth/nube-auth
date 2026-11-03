import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	platform: "node",
	target: "node24",
	banner: {
		js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
	},
	clean: true,
	sourcemap: false,
	outExtensions: () => ({ js: ".js" }),
});
