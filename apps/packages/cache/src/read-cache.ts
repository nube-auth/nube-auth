import { cache } from "./client.js";

/** Read-through keys populated by Gateway GET and middleware paths. */
export const readCacheKeys = {
	license: (userPublicId: string, appPublicId: string) => `gateway:license:${userPublicId}:${appPublicId}`,
	subscription: (userPublicId: string, appPublicId: string) => `gateway:sub:${userPublicId}:${appPublicId}`,
	clientSecret: (appPublicId: string) => `app-client-secret:v2:${appPublicId}`,
	securitySettings: (appPublicId: string) => `app-security-settings:${appPublicId}`,
};

/** Drop the cached license and subscription for one user in one app. */
export async function forgetUserAppCache(userPublicId: string, appPublicId: string): Promise<void> {
	await Promise.all([
		cache.delete(readCacheKeys.license(userPublicId, appPublicId)),
		cache.delete(readCacheKeys.subscription(userPublicId, appPublicId)),
	]);
}

/** Drop cached app secret and security settings. */
export async function forgetAppReadCache(appPublicId: string): Promise<void> {
	await Promise.all([
		cache.delete(readCacheKeys.clientSecret(appPublicId)),
		cache.delete(readCacheKeys.securitySettings(appPublicId)),
	]);
}

/** Drop every cached license and subscription for an app. */
export async function forgetAppEntitlements(appPublicId: string): Promise<void> {
	const patterns = [`gateway:license:*:${appPublicId}`, `gateway:sub:*:${appPublicId}`];
	for (const pattern of patterns) {
		let cursor = 0;
		do {
			const page = await cache.scan(cursor, pattern);
			if (page.keys.length > 0) await cache.deleteMany(page.keys);
			cursor = Number(page.cursor);
		} while (cursor !== 0);
	}
}
