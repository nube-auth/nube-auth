const API_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004";

const apiClient = {
	async get<T>(url: string): Promise<T> {
		const res = await fetch(`${API_URL}${url}`, {
			credentials: "include",
		});
		if (!res.ok) throw new Error(`API error: ${res.status}`);
		return res.json();
	},

	async post<T>(url: string, data?: unknown): Promise<T> {
		const res = await fetch(`${API_URL}${url}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
			credentials: "include",
		});
		if (!res.ok) throw new Error(`API error: ${res.status}`);
		return res.json();
	},

	async patch<T>(url: string, data?: unknown): Promise<T> {
		const res = await fetch(`${API_URL}${url}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
			credentials: "include",
		});
		if (!res.ok) throw new Error(`API error: ${res.status}`);
		return res.json();
	},

	async delete<T>(url: string): Promise<T> {
		const res = await fetch(`${API_URL}${url}`, {
			method: "DELETE",
			credentials: "include",
		});
		if (!res.ok) throw new Error(`API error: ${res.status}`);
		return res.json();
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
