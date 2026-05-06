import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/billing/services/*.ts",
		"src/billing/adapters/*.ts",
		"src/utils/*.ts",
	],
	format: ["esm"],
	target: "node22",
	clean: true,
	splitting: false,
});
