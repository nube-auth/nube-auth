/**
 * One-shot migration for staging and production.
 * Reseals provider credentials into enc1, copies app JSON into columns, then drops the old columns.
 * Reads DATABASE_URL and PAYMENT_CONFIGS_KEY from the environment. Does not print secret values.
 */
import { createDecipheriv, createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { protectSecret, sealSecret } from "../src/secret-box.js";

const { Client } = pg;
const MIGRATION_WHEN = 1777100000000;
const sqlPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../drizzle/0007_app_secret_columns.sql");

function parseKey(hex: string): Buffer {
	const key = Buffer.from(hex, "hex");
	if (key.length !== 32) throw new Error("PAYMENT_CONFIGS_KEY must be 32-byte hex");
	return key;
}

function aesDecrypt(encrypted: string, key: Buffer): string {
	const parts = encrypted.split(".");
	if (parts.length !== 3) throw new Error("Invalid encrypted data format");
	const [ivB64, tagB64, ciphertextB64] = parts as [string, string, string];
	const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
	decipher.setAuthTag(Buffer.from(tagB64, "base64"));
	return Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]).toString("utf8");
}

function decryptLegacyCredentials(credentials: string, dek: string | null, kek: Buffer): Record<string, unknown> {
	if (credentials.startsWith("enc1:")) {
		throw new Error("credentials are already enc1");
	}
	if (dek) {
		const dekB64 = aesDecrypt(dek, kek);
		const dataKey = Buffer.from(dekB64, "base64");
		return JSON.parse(aesDecrypt(credentials, dataKey)) as Record<string, unknown>;
	}
	return JSON.parse(aesDecrypt(credentials, kek)) as Record<string, unknown>;
}

async function main() {
	const databaseUrl = process.env["DATABASE_URL"];
	const keyHex = process.env["PAYMENT_CONFIGS_KEY"];
	if (!databaseUrl) throw new Error("DATABASE_URL is required");
	if (!keyHex) throw new Error("PAYMENT_CONFIGS_KEY is required");
	const kek = parseKey(keyHex);

	const connectionString = databaseUrl
		.replace(/([?&])sslmode=[^&]*/g, "$1")
		.replace(/[?&]$/, "")
		.replace("?&", "?");
	const client = new Client({
		connectionString,
		ssl: { rejectUnauthorized: false },
	});
	await client.connect();
	try {
		const already = await client.query(
			`SELECT 1 FROM information_schema.columns WHERE table_name = 'apps' AND column_name = 'client_secret_hash'`,
		);
		if (already.rowCount) {
			console.log("apps.client_secret_hash already exists; nothing to do");
			return;
		}

		await client.query("BEGIN");

		const providers = await client.query<{
			id: number;
			credentials: string;
			credentials_dek: string | null;
			webhook_secret: string | null;
		}>(`SELECT id, credentials, credentials_dek, webhook_secret FROM payment_provider_configs`);

		for (const row of providers.rows) {
			const parsed = decryptLegacyCredentials(row.credentials, row.credentials_dek, kek);
			delete parsed["webhookSecret"];
			const sealed = sealSecret(JSON.stringify(parsed), keyHex);
			let webhook = row.webhook_secret;
			if (webhook && !webhook.startsWith("enc1:")) {
				webhook = sealSecret(webhook, keyHex);
			}
			await client.query(
				`UPDATE payment_provider_configs SET credentials = $1, webhook_secret = $2, updated_at = NOW() WHERE id = $3`,
				[sealed, webhook, row.id],
			);
		}

		const migrationSql = readFileSync(sqlPath, "utf8");
		for (const statement of migrationSql.split("--> statement-breakpoint")) {
			const trimmed = statement.trim();
			if (trimmed) await client.query(trimmed);
		}

		const missingTokens = await client.query<{ id: number }>(
			`SELECT id FROM apps WHERE service_token_hash IS NULL OR service_token_enc IS NULL`,
		);
		for (const row of missingTokens.rows) {
			const sealed = protectSecret(randomBytes(32).toString("hex"), keyHex);
			await client.query(`UPDATE apps SET service_token_hash = $1, service_token_enc = $2 WHERE id = $3`, [
				sealed.hash,
				sealed.enc,
				row.id,
			]);
		}

		const check = await client.query<{
			apps: number;
			bad_client: number;
			bad_service: number;
			bad_credentials: number;
			bad_webhook: number;
			unresolved_plan: number;
		}>(`
			SELECT
				(SELECT count(*) FROM apps) AS apps,
				(SELECT count(*) FROM apps WHERE client_secret_hash IS NULL OR client_secret_enc NOT LIKE 'enc1:%') AS bad_client,
				(SELECT count(*) FROM apps WHERE service_token_hash IS NULL OR service_token_enc NOT LIKE 'enc1:%') AS bad_service,
				(SELECT count(*) FROM payment_provider_configs WHERE credentials NOT LIKE 'enc1:%') AS bad_credentials,
				(SELECT count(*) FROM payment_provider_configs WHERE webhook_secret_enc IS NOT NULL AND webhook_secret_enc NOT LIKE 'enc1:%') AS bad_webhook,
				(SELECT count(*) FROM apps a WHERE a.licensing_required AND a.default_plan_id IS NULL) AS unresolved_plan
		`);
		const row = check.rows[0];
		if (
			!row ||
			Number(row.bad_client) ||
			Number(row.bad_service) ||
			Number(row.bad_credentials) ||
			Number(row.bad_webhook)
		) {
			throw new Error(`migration check failed: ${JSON.stringify(row)}`);
		}

		const hash = createHash("sha256").update(migrationSql).digest("hex");
		await client.query(`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`, [
			hash,
			MIGRATION_WHEN,
		]);

		await client.query("COMMIT");
		console.log(
			JSON.stringify({
				apps: row.apps,
				providersResealed: providers.rows.length,
				serviceTokensCreated: missingTokens.rowCount,
				unresolvedDefaultPlans: row.unresolved_plan,
			}),
		);
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		await client.end();
	}
}

main().catch((error: Error) => {
	console.error(error.message);
	process.exit(1);
});
