import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/utils/*.ts"],
	format: ["esm"],
	target: "node24",
	clean: true,
	outExtensions: () => ({ js: ".js" }),
});
