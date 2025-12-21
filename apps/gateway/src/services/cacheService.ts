import { CACHE_TTL } from "../config/constants";
import { redisClient } from "../redis/client";
import { coreService } from "./coreService";

/**
 * Cache service for Redis caching of user data, licenses, and projects
 * All cached data has a 2-minute TTL
 */
export const cacheService = {
	/**
	 * Get or fetch user data
	 */
	async getUser(userId: string): Promise<any> {
		const key = `gateway:user:${userId}`;

		// Try to get from cache
		const cached = await redisClient.get(key);
		if (cached) {
			return JSON.parse(cached);
		}

		// Fetch from Core and cache
		const user = await coreService.getUser(userId);
		await redisClient.setex(key, CACHE_TTL, JSON.stringify(user));

		return user;
	},

	/**
	 * Get or fetch license information
	 */
	async getLicense(appId: string): Promise<any> {
		const key = `gateway:license:${appId}`;

		// Try to get from cache
		const cached = await redisClient.get(key);
		if (cached) {
			return JSON.parse(cached);
		}

		// Fetch from Core and cache
		const license = await coreService.getLicense(appId);
		await redisClient.setex(key, CACHE_TTL, JSON.stringify(license));

		return license;
	},

	/**
	 * Get or fetch project information
	 */
	async getProject(projectId: string): Promise<any> {
		const key = `gateway:project:${projectId}`;

		// Try to get from cache
		const cached = await redisClient.get(key);
		if (cached) {
			return JSON.parse(cached);
		}

		// Fetch from Core and cache
		const project = await coreService.request({
			method: "GET",
			path: `/v1/projects/${projectId}`,
		});
		await redisClient.setex(key, CACHE_TTL, JSON.stringify(project));

		return project;
	},

	/**
	 * Invalidate user cache
	 */
	async invalidateUser(userId: string): Promise<void> {
		const key = `gateway:user:${userId}`;
		await redisClient.del(key);
	},

	/**
	 * Invalidate license cache
	 */
	async invalidateLicense(appId: string): Promise<void> {
		const key = `gateway:license:${appId}`;
		await redisClient.del(key);
	},

	/**
	 * Invalidate project cache
	 */
	async invalidateProject(projectId: string): Promise<void> {
		const key = `gateway:project:${projectId}`;
		await redisClient.del(key);
	},
};
