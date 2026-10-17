import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/utils/*.ts"],
	format: ["esm"],
	target: "node22",
	clean: true,
	splitting: false,
});
