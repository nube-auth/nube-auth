import { cache, readCacheKeys } from "@nube-auth/cache";
import { coreClient } from "./core-client";

const CACHE_TTL_SECONDS = 300;

export async function getClientSecretHash(appId: string): Promise<{ hash: string | null; isActive: boolean }> {
	const cacheKey = readCacheKeys.clientSecret(appId);
	const cached = await cache.get<{ hash: string | null; isActive?: boolean }>(cacheKey);
	if (cached?.hash) return { hash: cached.hash, isActive: cached.isActive !== false };

	const result = await coreClient.edge<{ hash: string | null; isActive: boolean }>(
		"GET",
		`/v1/edge/apps/${encodeURIComponent(appId)}/client-secret-hash`,
	);
	if (result.status !== 200) return { hash: null, isActive: false };
	if (result.data.hash && result.data.isActive) {
		await cache.set(cacheKey, { hash: result.data.hash, isActive: true }, CACHE_TTL_SECONDS);
	}
	return result.data;
}
