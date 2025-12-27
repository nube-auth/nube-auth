import type { Config } from "drizzle-kit";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDir =
	typeof __dirname === "string"
		? __dirname
		: dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(configDir, "../../.env") });

export default {
	schema: "./src/schema.ts",
	out: "./drizzle",
	driver: "turso",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
		authToken: process.env.DATABASE_AUTH_TOKEN,
	},
} satisfies Config;
