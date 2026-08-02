import { cache } from "@nube-auth/cache";
import { appQueries, getDb } from "@nube-auth/db";
import { createLogger, serializeError } from "@nube-auth/shared";

const log = createLogger("gateway:app-security-settings");

const CACHE_TTL_SECONDS = 3600; // 1 hour — invalidated explicitly on update
export const APP_SECURITY_SETTINGS_CACHE_KEY_PREFIX = "app-security-settings:";

export interface AppSecuritySettings {
	corsOrigins: string[];
	allowedHosts: string[];
}

/**
 * Fetches app security settings (corsOrigins + allowedHosts) for the given
 * public app ID, using Redis as a read-through cache (1 hour TTL).
 *
 * Returns null if the app does not exist.
 * Throws if the DB lookup fails and no cached value exists.
 */
export async function getAppSecuritySettings(appId: string): Promise<AppSecuritySettings | null> {
	const cacheKey = `${APP_SECURITY_SETTINGS_CACHE_KEY_PREFIX}${appId}`;

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
	} catch (error) {
		log.error({ err: serializeError(error as Error), appId }, "Failed to fetch app security settings");
		throw error;
	}
}

/**
 * Invalidates the cached security settings for the given app.
 * Call this after any update to an app's security_settings in the DB.
 * The next read will re-fetch from the DB and repopulate the cache.
 */
export async function invalidateAppSecuritySettings(appId: string): Promise<void> {
	const cacheKey = `${APP_SECURITY_SETTINGS_CACHE_KEY_PREFIX}${appId}`;
	try {
		await cache.delete(cacheKey);
		log.debug({ appId }, "Invalidated app security settings cache");
	} catch (error) {
		// Non-fatal — stale cache will expire within TTL
		log.warn({ err: serializeError(error as Error), appId }, "Failed to invalidate app security settings cache");
	}
}
