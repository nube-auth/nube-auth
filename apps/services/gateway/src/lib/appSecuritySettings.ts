import { cache } from "@nube-auth/cache";
import { getDb, appQueries } from "@nube-auth/db";
import { createLogger, serializeError } from "@nube-auth/shared";

const log = createLogger("gateway:app-security-settings");

const CACHE_TTL_SECONDS = 300; // 5 minutes — same as app-client-secret
const CACHE_KEY_PREFIX = "app-security-settings:";

export interface AppSecuritySettings {
	corsOrigins: string[];
	allowedHosts: string[];
}

/**
 * Fetches app security settings (corsOrigins + allowedHosts) for the given
 * public app ID, using Redis as a read-through cache (5 min TTL).
 *
 * Returns null if the app does not exist.
 * Throws if the DB lookup fails and no cached value exists.
 */
export async function getAppSecuritySettings(appId: string): Promise<AppSecuritySettings | null> {
	const cacheKey = `${CACHE_KEY_PREFIX}${appId}`;

	const cached = await cache.get<AppSecuritySettings>(cacheKey);
	if (cached !== null) {
		return cached;
	}

	try {
		const db = getDb();
		const appRecord = await appQueries.findByPublicId(db, appId);

		if (!appRecord) return null;

		const securitySettings = (appRecord.security_settings as Record<string, unknown>) ?? {};
		const result: AppSecuritySettings = {
			corsOrigins: (securitySettings["corsOrigins"] as string[] | undefined) ?? [],
			allowedHosts: (securitySettings["allowedHosts"] as string[] | undefined) ?? [],
		};

		await cache.set(cacheKey, result, CACHE_TTL_SECONDS);
		return result;
	} catch (err) {
		log.error({ err: serializeError(err as Error), appId }, "Failed to fetch app security settings");
		throw err;
	}
}
