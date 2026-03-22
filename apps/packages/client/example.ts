/**
 * Example usage of @nube-auth/client
 *
 * This file demonstrates how to use the Nube Auth client in your applications.
 */

import { NubeAuthClient } from "./src/index";

// Frontend usage (cookie-based authentication)
const client = new NubeAuthClient({
	gatewayUrl: "https://api.nubeauth.com",
	// For local development:
	// gatewayUrl: 'http://localhost:3004'
});

// Backend usage (S2S token authentication)
const _backendClient = new NubeAuthClient({
	gatewayUrl: process.env.GATEWAY_URL || "https://api.nubeauth.com",
	s2sToken: process.env.X_NUBE_AUTH_SERVICE_TOKEN,
});

// ============================================
// AUTHENTICATION
// ============================================

async function _checkAuthentication() {
	try {
		const status = await client.auth.checkStatus();
		console.log("Logged in:", status.loggedIn);
		if (status.user) {
			console.log("User:", status.user.name, status.user.primary_email);
		}
	} catch (_error) {
		console.error("Not authenticated");
	}
}

async function _logout() {
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

async function _getUserProfile() {
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

async function _updateProfile() {
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

async function _listSessions() {
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

async function _deleteSession(sessionId: string) {
	try {
		await client.sessions.delete(sessionId);
		console.log("Session deleted");
	} catch (error) {
		console.error("Failed to delete session:", error);
	}
}

async function _logoutAllSessions() {
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

import { NubeAuthError } from "./src/index";

async function _handleErrors() {
	try {
		await client.me.get();
	} catch (error) {
		if (error instanceof NubeAuthError) {
			console.error("Nube Auth API Error:", {
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
 * Example React hooks using @nube-auth/client with TanStack Query
 */

/*
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NubeAuthClient } from '@nube-auth/client';

const client = new NubeAuthClient({
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
 * For React applications, use the @nube-auth/react package instead!
 * It provides ready-to-use hooks with built-in React Query integration.
 *
 * Install: pnpm add @nube-auth/react
 *
 * Example usage:
 */

/*
import { NubeAuthProvider, useAuth, useMe, useSessions } from '@nube-auth/react';

// 1. Wrap your app with NubeAuthProvider
function App() {
  return (
    <NubeAuthProvider config={{ gatewayUrl: 'https://api.nubeauth.com' }}>
      <YourApp />
    </NubeAuthProvider>
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
 * Admin operations (projects, apps, licenses) are not included in @nube-auth/client.
 * Admin dashboards should call the Gateway API directly using fetch or your HTTP client.
 *
 * Example:
 */

/*
// Create project (admin only)
async function createProject(data: { name: string; slug: string }) {
  const response = await fetch('https://api.nubeauth.com/v1/admin/projects', {
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
  const response = await fetch('https://api.nubeauth.com/v1/admin/projects', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to list projects');
  }
  
  return response.json();
}
*/

// ============================================
// APP / CLI / EXTENSION INTEGRATION (Bearer)
// ============================================

import type { OAuthStartOptions, TokenExchangeResult } from "./src/index";

const APP_ID    = "app_abc123";      // your app's public ID from NubeAuth admin
const RETURN_TO = "myapp://auth";   // registered custom URL scheme (or https callback)

/**
 * Step 1 — Build the OAuth URL and open in the system browser.
 * No session token needed yet — use a bootstrap client.
 */
function _buildOAuthUrl(deviceId?: string): string {
	const bootstrapClient = new NubeAuthClient({ gatewayUrl: "https://api.nubeauth.com" });

	const options: OAuthStartOptions = {
		appId: APP_ID,
		returnTo: RETURN_TO,
		deviceId,  // optional hardware UUID for audit logs / device-level revocation
	};

	return bootstrapClient.app.buildOAuthUrl(options);
	// → https://api.nubeauth.com/v1/auth/start?audience=app&app_id=app_abc123&return_to=myapp://auth
}

/**
 * Step 2 — Handle the deep-link / HTTPS callback.
 * The user signs in and is redirected to: return_to?code=<one-time-code>
 * The code expires in 60 seconds and is single-use.
 */
async function _exchangeCode(callbackUrl: string): Promise<TokenExchangeResult> {
	const code = new URL(callbackUrl).searchParams.get("code");
	if (!code) throw new Error("Missing exchange code in callback URL");

	const bootstrapClient = new NubeAuthClient({ gatewayUrl: "https://api.nubeauth.com" });
	const result = await bootstrapClient.app.exchangeCode(code, APP_ID);
	// result: { sessionToken, userId, appId }

	// Persist the token in secure storage (Keychain, credential store, etc.)
	// await secureStorage.set("session_token", result.sessionToken);

	return result;
}

/**
 * Step 3 — Create an authenticated client with the stored token.
 * All requests will include: Authorization: Bearer <sessionToken>
 */
function _createAuthedClient(sessionToken: string): NubeAuthClient {
	return new NubeAuthClient({
		gatewayUrl: "https://api.nubeauth.com",
		appId: APP_ID,
		sessionToken,
	});
}

/**
 * Step 4 — Check the user's subscription / plan.
 */
async function _checkSubscription(sessionToken: string) {
	const authedClient = _createAuthedClient(sessionToken);

	const sub = await authedClient.subscription.getDetails();
	// {
	//   hasActivePlan: boolean
	//   planSlug: string | null       — e.g. "power"
	//   status: string | null         — "active" | "trialing" | "past_due" | ...
	//   billingInterval: string | null — "month" | "year"
	//   periodEnd: string | null      — ISO-8601
	// }

	if (sub.hasActivePlan) {
		console.log(`Active plan: ${sub.planSlug}, expires: ${sub.periodEnd}`);
	} else {
		console.log("No active plan — prompt upgrade");
	}
}

/**
 * Full app flow (e.g. CLI — simplified, no real HTTP server)
 */
async function _fullAppFlow() {
	// 1. Start login
	const oauthUrl = _buildOAuthUrl("device-uuid-1234");
	console.log("Open in browser:", oauthUrl);

	// 2. Wait for callback (your platform-specific mechanism)
	// const callbackUrl = await waitForDeepLink(); // macOS / mobile
	// const callbackUrl = await localHttpServer();  // CLI
	const callbackUrl = "myapp://auth?code=abc123_example_only"; // placeholder

	// 3. Exchange code → sessionToken
	const result = await _exchangeCode(callbackUrl).catch(() => null);
	if (!result) {
		console.error("Code exchange failed — expired or already used");
		return;
	}
	console.log("Signed in, userId:", result.userId);

	// 4. Use the authenticated client
	const authedClient = _createAuthedClient(result.sessionToken);
	const user = await authedClient.me.get();
	console.log("Hello,", user.name);

	await _checkSubscription(result.sessionToken);
}
