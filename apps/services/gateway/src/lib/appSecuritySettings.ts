import { cache, readCacheKeys } from "@nube-auth/cache";
import { createLogger, serializeError } from "@nube-auth/shared";
import { coreClient } from "./core-client";

const log = createLogger("gateway:app-security-settings");

const CACHE_TTL_SECONDS = 3600;

export interface AppSecuritySettings {
	corsOrigins: string[];
	allowedHosts: string[];
}

export async function getAppSecuritySettings(appId: string): Promise<AppSecuritySettings | null> {
	const cacheKey = readCacheKeys.securitySettings(appId);
	const cached = await cache.get<AppSecuritySettings>(cacheKey);
	if (cached !== null) return cached;

	try {
		const result = await coreClient.edge<AppSecuritySettings>(
			"GET",
			`/v1/edge/apps/${encodeURIComponent(appId)}/security-settings`,
		);
		if (result.status === 404) return null;
		if (result.status !== 200) throw new Error(`Core security settings failed: ${result.status}`);
		await cache.set(cacheKey, result.data, CACHE_TTL_SECONDS);
		return result.data;
	} catch (error) {
		log.error({ err: serializeError(error as Error), appId }, "Failed to fetch app security settings");
		throw error;
	}
}

export async function invalidateAppSecuritySettings(appId: string): Promise<void> {
	const cacheKey = readCacheKeys.securitySettings(appId);
	try {
		await cache.delete(cacheKey);
		log.debug({ appId }, "Invalidated app security settings cache");
	} catch (error) {
		log.warn({ err: serializeError(error as Error), appId }, "Failed to invalidate app security settings cache");
	}
}
