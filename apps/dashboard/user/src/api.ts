import { pingpong } from "./lib/pingpong";
import { config } from "./config";
import { csrfHeaders } from "./lib/csrf";

const apiClient = {
	async get<T>(url: string): Promise<T> {
		const res = await pingpong(`${config.gatewayUrl}${url}`, {
			credentials: "include",
		});
		if (!res.ok()) throw new Error(`API error: ${res.status}`);
		return res.data;
	},

	async post<T>(url: string, data?: unknown): Promise<T> {
		const res = await pingpong(`${config.gatewayUrl}${url}`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...csrfHeaders() },
			body: JSON.stringify(data),
			credentials: "include",
		});
		if (!res.ok()) throw new Error(`API error: ${res.status}`);
		return res.data;
	},

	async patch<T>(url: string, data?: unknown): Promise<T> {
		const res = await pingpong(`${config.gatewayUrl}${url}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...csrfHeaders() },
			body: JSON.stringify(data),
			credentials: "include",
		});
		if (!res.ok()) throw new Error(`API error: ${res.status}`);
		return res.data;
	},

	async delete<T>(url: string): Promise<T> {
		const res = await pingpong(`${config.gatewayUrl}${url}`, {
			method: "DELETE",
			headers: csrfHeaders(),
			credentials: "include",
		});
		if (!res.ok()) throw new Error(`API error: ${res.status}`);
		return res.data;
	},
};

export interface User {
	userId: string;
	email: string;
	name: string;
	picture?: string | null;
}

export interface Session {
	id: string;
	createdAt: string;
	expiresAt: string;
	lastUsedAt?: string;
}

export interface License {
	id: string;
	appId: string;
	appName: string;
	expiresAt: string;
	status: "active" | "expired";
}

export const userApi = {
	async getMe(): Promise<User> {
		return apiClient.get<User>("/v1/me");
	},

	async updateProfile(name: string, picture?: string): Promise<User> {
		return apiClient.patch<User>("/v1/me", { name, picture });
	},

	async getSessions(): Promise<Session[]> {
		return apiClient.get<Session[]>("/v1/me/sessions");
	},

	async logoutAllSessions(): Promise<void> {
		await apiClient.delete("/v1/me/sessions");
	},

	async logout(): Promise<void> {
		await apiClient.post("/v1/auth/logout", {});
	},

	async checkLoginStatus(): Promise<{ isLoggedIn: boolean }> {
		try {
			await this.getMe();
			return { isLoggedIn: true };
		} catch {
			return { isLoggedIn: false };
		}
	},
};

export default apiClient;
