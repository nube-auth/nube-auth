import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node24",
	clean: true,
	dts: true,
	outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
});
