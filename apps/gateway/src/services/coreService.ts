import { getEnv } from '../config/env';
import { addS2SAuthHeader } from '../middleware/s2s';

interface CoreRequest {
	method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
	path: string;
	body?: Record<string, any>;
}

/**
 * Core service for making authenticated calls to Core API
 * All requests include X-Proofa-Service-Token header
 */
export const coreService = {
	/**
	 * Make authenticated request to Core
	 */
	async request<T>(config: CoreRequest): Promise<T> {
		const env = getEnv();
		const url = new URL(config.path, env.CORE_URL).toString();

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		addS2SAuthHeader(headers);

		const response = await fetch(url, {
			method: config.method,
			headers,
			body: config.body ? JSON.stringify(config.body) : undefined,
		});

		if (!response.ok) {
			throw new Error(`Core API error: ${response.status} ${response.statusText}`);
		}

		return response.json();
	},

	/**
	 * Exchange OAuth code for token
	 */
	async exchangeToken(code: string, appId: string): Promise<any> {
		return this.request({
			method: 'POST',
			path: '/v1/auth/exchange',
			body: { code, appId },
		});
	},

	/**
	 * Get license information
	 */
	async getLicense(appId: string): Promise<any> {
		return this.request({
			method: 'GET',
			path: `/v1/license/${appId}`,
		});
	},

	/**
	 * Get user information
	 */
	async getUser(userId: string): Promise<any> {
		return this.request({
			method: 'GET',
			path: `/v1/users/${userId}`,
		});
	},

	/**
	 * Update user information
	 */
	async updateUser(userId: string, data: Record<string, any>): Promise<any> {
		return this.request({
			method: 'PATCH',
			path: `/v1/users/${userId}`,
			body: data,
		});
	},

	/**
	 * Validate token with Core
	 */
	async validateToken(token: string): Promise<any> {
		return this.request({
			method: 'POST',
			path: '/v1/auth/validate',
			body: { token },
		});
	},
};
