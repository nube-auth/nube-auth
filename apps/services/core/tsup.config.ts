import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/utils/*.ts"],
	format: ["esm"],
	target: "node24",
	clean: true,
	splitting: false,
});
