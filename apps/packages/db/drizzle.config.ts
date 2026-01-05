import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const configDir = typeof __dirname === "string" ? __dirname : dirname(fileURLToPath(import.meta.url));

// Load .env and .env.local from workspace root
dotenv.config({ path: resolve(configDir, "../../.env") });
dotenv.config({ path: resolve(configDir, "../../.env.local"), override: true });

const url = process.env.DATABASE_URL;
if (!url) {
	throw new Error("DATABASE_URL environment variable is not set");
}

export default defineConfig({
	schema: "./src/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url,
	},
});
