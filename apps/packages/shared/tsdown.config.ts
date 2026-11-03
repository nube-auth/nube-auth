import { defineConfig } from "tsdown";

export default defineConfig([
	// Browser-consumed entries — no createRequire banner
	{
		entry: {
			index: "src/index.ts",
			"types/schemas/index": "src/types/schemas/index.ts",
		},
		format: ["esm"],
		platform: "node",
		dts: true,
		clean: true,
		sourcemap: false,
		outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
	},
	// Server-only entries
	{
		entry: {
			"env-loader": "src/env-loader.ts",
			email: "src/email.ts",
			"outbound-url": "src/outbound-url.ts",
		},
		format: ["esm"],
		platform: "node",
		banner: {
			js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
		},
		dts: true,
		clean: false,
		sourcemap: false,
		outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
	},
]);
