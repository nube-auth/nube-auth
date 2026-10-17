import { cache } from "@nube-auth/cache";
import { coreClient } from "./core-client";

const CACHE_TTL_SECONDS = 300;

export async function getClientSecretHash(appId: string): Promise<{ hash: string | null; isActive: boolean }> {
	const cacheKey = `app-client-secret:v2:${appId}`;
	const cached = await cache.get<{ hash: string | null }>(cacheKey);
	if (cached?.hash) return { hash: cached.hash, isActive: true };

	const result = await coreClient.edge<{ hash: string | null; isActive: boolean }>(
		"GET",
		`/v1/edge/apps/${encodeURIComponent(appId)}/client-secret-hash`,
	);
	if (result.status !== 200) return { hash: null, isActive: false };
	if (result.data.hash && result.data.isActive) {
		await cache.set(cacheKey, { hash: result.data.hash }, CACHE_TTL_SECONDS);
	}
	return result.data;
}
