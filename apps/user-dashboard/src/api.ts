import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

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
  status: 'active' | 'expired';
}

export const userApi = {
  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>('/v1/me');
    return data;
  },

  async updateProfile(name: string, picture?: string): Promise<User> {
    const { data } = await apiClient.patch<User>('/v1/me', { name, picture });
    return data;
  },

  async getSessions(): Promise<Session[]> {
    const { data } = await apiClient.get<Session[]>('/v1/me/sessions');
    return data;
  },

  async logoutAllSessions(): Promise<void> {
    await apiClient.delete('/v1/me/sessions');
  },

  async logout(): Promise<void> {
    await apiClient.post('/v1/auth/logout', {});
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
