import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

/**
 * Hook to get current user profile
 */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/me');
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json() as Promise<User>;
    },
  });
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name?: string; picture?: string }) => {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json() as Promise<User>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

/**
 * Hook to get user sessions
 */
export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await fetch('/api/me/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      return data.sessions as Session[];
    },
  });
}

/**
 * Hook to logout
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to logout');
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}

/**
 * Hook to check auth status
 */
export function useAuthStatus() {
  return useQuery({
    queryKey: ['auth-status'],
    queryFn: async () => {
      const res = await fetch('/api/auth/status');
      if (!res.ok) throw new Error('Failed to check auth');
      return res.json() as Promise<{ loggedIn: boolean; user?: User }>;
    },
  });
}
