/**
 * Example usage of @proofa/client
 * 
 * This file demonstrates how to use the Proofa client in your applications.
 */

import { ProofaClient } from "./src/index";

// Frontend usage (cookie-based authentication)
const client = new ProofaClient({
	gatewayUrl: "https://api.proofa.dev",
	// For local development:
	// gatewayUrl: 'http://localhost:3004'
});

// Backend usage (S2S token authentication)
const backendClient = new ProofaClient({
	gatewayUrl: process.env.GATEWAY_URL || "https://api.proofa.dev",
	s2sToken: process.env.X_PROOFA_SERVICE_TOKEN,
});

// ============================================
// AUTHENTICATION
// ============================================

async function checkAuthentication() {
	try {
		const status = await client.auth.checkStatus();
		console.log("Logged in:", status.loggedIn);
		if (status.user) {
			console.log("User:", status.user.name, status.user.primary_email);
		}
	} catch (error) {
		console.error("Not authenticated");
	}
}

async function logout() {
	try {
		await client.auth.logout();
		console.log("Logged out successfully");
	} catch (error) {
		console.error("Logout failed:", error);
	}
}

// ============================================
// USER PROFILE
// ============================================

async function getUserProfile() {
	try {
		const user = await client.me.get();
		console.log("User profile:", {
			id: user.public_id,
			name: user.name,
			email: user.primary_email,
			verified: user.primary_email_verified,
		});
	} catch (error) {
		console.error("Failed to fetch profile:", error);
	}
}

async function updateProfile() {
	try {
		const updated = await client.me.update({
			name: "John Doe",
			avatar_url: "https://example.com/avatar.jpg",
		});
		console.log("Profile updated:", updated);
	} catch (error) {
		console.error("Failed to update profile:", error);
	}
}

// ============================================
// SESSIONS
// ============================================

async function listSessions() {
	try {
		const { sessions } = await client.sessions.list();
		console.log(`Found ${sessions.length} active sessions`);
		sessions.forEach((session) => {
			console.log({
				id: session.public_id,
				created: new Date(session.created_at * 1000),
				lastSeen: new Date(session.last_seen_at * 1000),
				expires: new Date(session.expires_at * 1000),
			});
		});
	} catch (error) {
		console.error("Failed to list sessions:", error);
	}
}

async function deleteSession(sessionId: string) {
	try {
		await client.sessions.delete(sessionId);
		console.log("Session deleted");
	} catch (error) {
		console.error("Failed to delete session:", error);
	}
}

async function logoutAllSessions() {
	try {
		await client.sessions.deleteAll();
		console.log("All sessions logged out");
	} catch (error) {
		console.error("Failed to logout all sessions:", error);
	}
}

// ============================================
// ERROR HANDLING
// ============================================

import { ProofaError } from "./src/index";

async function handleErrors() {
	try {
		await client.me.get();
	} catch (error) {
		if (error instanceof ProofaError) {
			console.error("Proofa API Error:", {
				code: error.code,
				message: error.message,
				status: error.status,
			});

			// Handle specific errors
			if (error.status === 401) {
				console.log("User not authenticated, redirect to login");
			} else if (error.status === 403) {
				console.log("User not authorized");
			} else if (error.status === 404) {
				console.log("Resource not found");
			}
		} else {
			console.error("Unknown error:", error);
		}
	}
}

// ============================================
// USAGE WITH REACT HOOKS
// ============================================

/**
 * Example React hooks using @proofa/client with TanStack Query
 */

/*
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProofaClient } from '@proofa/client';

const client = new ProofaClient({
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3004'
});

// Check authentication
export function useAuthStatus() {
  return useQuery({
    queryKey: ['auth-status'],
    queryFn: () => client.auth.checkStatus(),
  });
}

// Get current user
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => client.me.get(),
  });
}

// Update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; avatar_url?: string }) =>
      client.me.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

// List projects
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const data = await client.admin.projects.list();
      return data.projects;
    },
  });
}

// Create project
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string }) =>
      client.admin.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
*/

// ============================================

/**
 * For React applications, use the @proofa/react package instead!
 * It provides ready-to-use hooks with built-in React Query integration.
 * 
 * Install: pnpm add @proofa/react
 * 
 * Example usage:
 */

/*
import { ProofaProvider, useAuth, useMe, useSessions } from '@proofa/react';

// 1. Wrap your app with ProofaProvider
function App() {
  return (
    <ProofaProvider config={{ gatewayUrl: 'https://api.proofa.dev' }}>
      <YourApp />
    </ProofaProvider>
  );
}

// 2. Use hooks in your components
function Profile() {
  const { user, isLoading, update, isUpdating } = useMe();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{user?.name}</h1>
      <button 
        onClick={() => update({ name: 'New Name' })}
        disabled={isUpdating}
      >
        Update Name
      </button>
    </div>
  );
}

function Sessions() {
  const { sessions, deleteSession, deleteAll } = useSessions();
  
  return (
    <div>
      <button onClick={() => deleteAll()}>Logout All</button>
      {sessions.map(session => (
        <div key={session.public_id}>
          <span>{new Date(session.created_at * 1000).toLocaleDateString()}</span>
          <button onClick={() => deleteSession(session.public_id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  
  return (
    <header>
      {isAuthenticated ? (
        <>
          <span>Hello, {user?.name}</span>
          <button onClick={() => logout()}>Logout</button>
        </>
      ) : (
        <a href="/login">Login</a>
      )}
    </header>
  );
}
*/

// ============================================
// ADMIN OPERATIONS
// ============================================

/**
 * Admin operations (projects, apps, licenses) are not included in @proofa/client.
 * Admin dashboards should call the Gateway API directly using fetch or your HTTP client.
 * 
 * Example:
 */

/*
// Create project (admin only)
async function createProject(data: { name: string; slug: string }) {
  const response = await fetch('https://api.proofa.dev/v1/admin/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include', // Important: includes session cookie
  });
  
  if (!response.ok) {
    throw new Error('Failed to create project');
  }
  
  return response.json();
}

// List projects (admin only)
async function listProjects() {
  const response = await fetch('https://api.proofa.dev/v1/admin/projects', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to list projects');
  }
  
  return response.json();
}
*/
