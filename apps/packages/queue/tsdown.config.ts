import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	sourcemap: true,
	clean: true,
	target: "es2020",
	outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
});
