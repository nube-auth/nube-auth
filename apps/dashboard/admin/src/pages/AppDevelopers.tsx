import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp, useProject } from "../hooks/api";

type Tab = "quickstart" | "react" | "nextjs" | "javascript" | "backend";

export function AppDevelopersPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const [activeTab, setActiveTab] = useState<Tab>("quickstart");
	const [copied, setCopied] = useState(false);

	const handleCopy = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Copy failed:", error);
		}
	};

	if (projectLoading || appLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
			</div>
		);
	}

	if (!project || !app) {
		return <div className="error-state">Project or App not found</div>;
	}

	const tabs: { id: Tab; label: string }[] = [
		{ id: "quickstart", label: "Quick Start" },
		{ id: "react", label: "React" },
		{ id: "nextjs", label: "Next.js" },
		{ id: "javascript", label: "JavaScript" },
		{ id: "backend", label: "Backend" },
	];

	return (
		<div className="page">
			{/* Breadcrumb */}
			<div style={{ marginBottom: "24px" }}>
				<div
					style={{
						display: "flex",
						gap: "8px",
						alignItems: "center",
						fontSize: "13px",
						color: "var(--text-tertiary)",
					}}
				>
					<Link to="/projects" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
						Projects
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}`}
						style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
					>
						{project.name}
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}/apps/${appId}`}
						style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
					>
						{app.name}
					</Link>
					<span>›</span>
					<span style={{ color: "var(--text-primary)" }}>Integration Guide</span>
				</div>
			</div>

			{/* Page Header */}
			<div style={{ marginBottom: "32px" }}>
				<h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Integration Guide</h1>
				<p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
					Learn how to integrate Proofa authentication into your application
				</p>
			</div>

			{/* Tabs */}
			<div style={{ borderBottom: "1px solid var(--border-primary)", marginBottom: "32px" }}>
				<div style={{ display: "flex", gap: "32px" }}>
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							style={{
								padding: "12px 0",
								fontSize: "14px",
								fontWeight: "600",
								color: activeTab === tab.id ? "var(--primary)" : "var(--text-tertiary)",
								background: "none",
								border: "none",
								borderBottom:
									activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
								cursor: "pointer",
								transition: "all 0.2s ease",
							}}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Tab Content */}
			<div>
				{/* Quick Start */}
				{activeTab === "quickstart" && (
					<div>
						<h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Quick Start</h2>
						<p
							style={{
								fontSize: "14px",
								color: "var(--text-secondary)",
								marginBottom: "24px",
								lineHeight: "1.6",
							}}
						>
							Get started with Proofa in 5 minutes. This guide will walk you through the basic setup.
						</p>

						{/* Step 1 */}
						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
								<div
									style={{
										width: "32px",
										height: "32px",
										borderRadius: "50%",
										background: "var(--primary)",
										color: "white",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "14px",
										fontWeight: "700",
									}}
								>
									1
								</div>
								<h3 style={{ fontSize: "16px", fontWeight: "600" }}>Install the Proofa SDK</h3>
							</div>
							<div style={{ position: "relative" }}>
								<pre
									style={{
										background: "#1e1e1e",
										padding: "16px",
										borderRadius: "8px",
										overflow: "auto",
										fontSize: "13px",
										fontFamily: "monospace",
										margin: 0,
									}}
								>
									<code style={{ color: "#d4d4d4" }}>npm install @proofa/react</code>
								</pre>
								<button
									type="button"
									onClick={() => handleCopy("npm install @proofa/react")}
									style={{
										position: "absolute",
										top: "12px",
										right: "12px",
										padding: "6px 12px",
										fontSize: "12px",
										background: "rgba(255, 255, 255, 0.1)",
										color: "white",
										border: "1px solid rgba(255, 255, 255, 0.2)",
										borderRadius: "6px",
										cursor: "pointer",
									}}
								>
									{copied ? "✓ Copied" : "Copy"}
								</button>
							</div>
						</div>

						{/* Step 2 */}
						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
								<div
									style={{
										width: "32px",
										height: "32px",
										borderRadius: "50%",
										background: "var(--primary)",
										color: "white",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "14px",
										fontWeight: "700",
									}}
								>
									2
								</div>
								<h3 style={{ fontSize: "16px", fontWeight: "600" }}>Get your App ID</h3>
							</div>
							<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>
								Your App ID is:
							</p>
							<code
								style={{
									display: "block",
									padding: "12px 16px",
									background: "var(--surface-secondary)",
									borderRadius: "8px",
									fontSize: "14px",
									fontFamily: "monospace",
									color: "var(--text-primary)",
								}}
							>
								{app.id}
							</code>
						</div>

						{/* Step 3 */}
						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
								<div
									style={{
										width: "32px",
										height: "32px",
										borderRadius: "50%",
										background: "var(--primary)",
										color: "white",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "14px",
										fontWeight: "700",
									}}
								>
									3
								</div>
								<h3 style={{ fontSize: "16px", fontWeight: "600" }}>
									Wrap your app with ProofaProvider
								</h3>
							</div>
							<div style={{ position: "relative" }}>
								<pre
									style={{
										background: "#1e1e1e",
										padding: "16px",
										borderRadius: "8px",
										overflow: "auto",
										fontSize: "13px",
										fontFamily: "monospace",
										margin: 0,
										lineHeight: "1.5",
									}}
								>
									<code style={{ color: "#d4d4d4" }}>{`import { ProofaProvider } from '@proofa/react';

function App() {
  return (
    <ProofaProvider appId="${app.id}">
      <YourApp />
    </ProofaProvider>
  );
}`}</code>
								</pre>
							</div>
						</div>

						{/* Step 4 */}
						<div className="card" style={{ padding: "24px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
								<div
									style={{
										width: "32px",
										height: "32px",
										borderRadius: "50%",
										background: "var(--primary)",
										color: "white",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "14px",
										fontWeight: "700",
									}}
								>
									4
								</div>
								<h3 style={{ fontSize: "16px", fontWeight: "600" }}>Use the auth hook</h3>
							</div>
							<div style={{ position: "relative" }}>
								<pre
									style={{
										background: "#1e1e1e",
										padding: "16px",
										borderRadius: "8px",
										overflow: "auto",
										fontSize: "13px",
										fontFamily: "monospace",
										margin: 0,
										lineHeight: "1.5",
									}}
								>
									<code style={{ color: "#d4d4d4" }}>{`import { useAuth } from '@proofa/react';

function YourComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={() => login('google')}>Sign in</button>;
  }

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}`}</code>
								</pre>
							</div>
						</div>

						{/* Next Steps */}
						<div
							style={{
								marginTop: "32px",
								padding: "20px",
								background: "var(--surface-secondary)",
								borderRadius: "8px",
								border: "1px solid var(--border-primary)",
							}}
						>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>Next Steps</h3>
							<ul
								style={{
									margin: 0,
									paddingLeft: "20px",
									fontSize: "14px",
									color: "var(--text-secondary)",
									lineHeight: "1.8",
								}}
							>
								<li>Check out framework-specific guides in the tabs above</li>
								<li>Configure OAuth providers in your app settings</li>
								<li>Set up backend verification for API routes</li>
								<li>
									<Link
										to={`/projects/${projectId}/apps/${appId}/api-keys`}
										style={{ color: "var(--primary)" }}
									>
										Get your API keys
									</Link>{" "}
									for backend integration
								</li>
							</ul>
						</div>
					</div>
				)}

				{/* React Tab */}
				{activeTab === "react" && (
					<div>
						<h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>React Integration</h2>
						<p
							style={{
								fontSize: "14px",
								color: "var(--text-secondary)",
								marginBottom: "24px",
								lineHeight: "1.6",
							}}
						>
							Complete guide for integrating Proofa into your React application.
						</p>

						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>Installation</h3>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
								}}
							>
								<code style={{ color: "#d4d4d4" }}>npm install @proofa/react</code>
							</pre>
						</div>

						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
								Setup Provider
							</h3>
							<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>
								Wrap your root component with the ProofaProvider:
							</p>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
									lineHeight: "1.5",
								}}
							>
								<code style={{ color: "#d4d4d4" }}>{`import { ProofaProvider } from '@proofa/react';
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <ProofaProvider 
        appId="${app.id}"
        redirectUrl="/dashboard"
      >
        <YourRoutes />
      </ProofaProvider>
    </BrowserRouter>
  );
}

export default App;`}</code>
							</pre>
						</div>

						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>useAuth Hook</h3>
							<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>
								Access authentication state and methods:
							</p>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
									lineHeight: "1.5",
								}}
							>
								<code style={{ color: "#d4d4d4" }}>{`import { useAuth } from '@proofa/react';

function Dashboard() {
  const { 
    user,           // User object with name, email, avatar
    isAuthenticated,// Boolean: true if logged in
    isLoading,      // Boolean: true while checking auth
    login,          // Function: login(provider: 'google' | 'github')
    logout          // Function: logout()
  } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <button onClick={() => login('google')}>
          Sign in with Google
        </button>
        <button onClick={() => login('github')}>
          Sign in with GitHub
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <img src={user.avatar} alt={user.name} />
      <p>{user.email}</p>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}`}</code>
							</pre>
						</div>

						<div className="card" style={{ padding: "24px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
								Protected Routes
							</h3>
							<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>
								Create a component to protect routes:
							</p>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
									lineHeight: "1.5",
								}}
							>
								<code style={{ color: "#d4d4d4" }}>{`import { useAuth } from '@proofa/react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Usage:
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />`}</code>
							</pre>
						</div>
					</div>
				)}

				{/* Next.js Tab */}
				{activeTab === "nextjs" && (
					<div>
						<h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>
							Next.js Integration
						</h2>
						<p
							style={{
								fontSize: "14px",
								color: "var(--text-secondary)",
								marginBottom: "24px",
								lineHeight: "1.6",
							}}
						>
							Complete guide for integrating Proofa into your Next.js application (App Router).
						</p>

						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>Installation</h3>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
								}}
							>
								<code style={{ color: "#d4d4d4" }}>npm install @proofa/react</code>
							</pre>
						</div>

						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
								Setup Provider (app/layout.tsx)
							</h3>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
									lineHeight: "1.5",
								}}
							>
								<code style={{ color: "#d4d4d4" }}>{`'use client';

import { ProofaProvider } from '@proofa/react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ProofaProvider 
          appId="${app.id}"
          redirectUrl="/dashboard"
        >
          {children}
        </ProofaProvider>
      </body>
    </html>
  );
}`}</code>
							</pre>
						</div>

						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
								Client Component
							</h3>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
									lineHeight: "1.5",
								}}
							>
								<code style={{ color: "#d4d4d4" }}>{`'use client';

import { useAuth } from '@proofa/react';

export default function Dashboard() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={() => login('google')}>Sign in</button>;
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}`}</code>
							</pre>
						</div>

						<div className="card" style={{ padding: "24px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
								Server-Side Verification
							</h3>
							<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>
								Verify sessions in Server Components or API Routes:
							</p>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
									lineHeight: "1.5",
								}}
							>
								<code style={{ color: "#d4d4d4" }}>{`// app/api/protected/route.ts
import { verifySession } from '@proofa/next';

export async function GET(request: Request) {
  const session = await verifySession(request);
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ 
    message: 'Protected data',
    userId: session.userId 
  });
}`}</code>
							</pre>
						</div>
					</div>
				)}

				{/* JavaScript Tab */}
				{activeTab === "javascript" && (
					<div>
						<h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>
							Vanilla JavaScript
						</h2>
						<p
							style={{
								fontSize: "14px",
								color: "var(--text-secondary)",
								marginBottom: "24px",
								lineHeight: "1.6",
							}}
						>
							Use Proofa without any framework.
						</p>

						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>Installation</h3>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
								}}
							>
								<code style={{ color: "#d4d4d4" }}>npm install @proofa/client</code>
							</pre>
						</div>

						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
								Initialize Client
							</h3>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
									lineHeight: "1.5",
								}}
							>
								<code style={{ color: "#d4d4d4" }}>{`import { ProofaClient } from '@proofa/client';

const client = new ProofaClient({
  appId: '${app.id}',
  redirectUrl: '/dashboard'
});

// Login with Google
document.querySelector('#google-login').addEventListener('click', () => {
  client.auth.login({ provider: 'google' });
});

// Check current user
async function checkAuth() {
  try {
    const user = await client.auth.getUser();
    console.log('Logged in:', user);
    document.querySelector('#user-name').textContent = user.name;
  } catch (error) {
    console.log('Not logged in');
    window.location.href = '/login';
  }
}

// Logout
document.querySelector('#logout').addEventListener('click', async () => {
  await client.auth.logout();
  window.location.href = '/';
});

checkAuth();`}</code>
							</pre>
						</div>

						<div className="card" style={{ padding: "24px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>HTML Example</h3>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
									lineHeight: "1.5",
								}}
							>
								<code style={{ color: "#d4d4d4" }}>{`<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <div id="app">
    <button id="google-login">Sign in with Google</button>
    <div id="user-profile" style="display: none;">
      <h2>Welcome, <span id="user-name"></span>!</h2>
      <button id="logout">Sign out</button>
    </div>
  </div>

  <script type="module" src="/main.js"></script>
</body>
</html>`}</code>
							</pre>
						</div>
					</div>
				)}

				{/* Backend Tab */}
				{activeTab === "backend" && (
					<div>
						<h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>
							Backend Verification
						</h2>
						<p
							style={{
								fontSize: "14px",
								color: "var(--text-secondary)",
								marginBottom: "24px",
								lineHeight: "1.6",
							}}
						>
							Verify user sessions and protect your API endpoints.
						</p>

						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
								Node.js/Express
							</h3>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
									lineHeight: "1.5",
								}}
							>
								<code style={{ color: "#d4d4d4" }}>{`import { verifySession } from '@proofa/node';

// Middleware
async function requireAuth(req, res, next) {
  const session = await verifySession(
    req.headers.authorization,
    { appId: '${app.id}' }
  );

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = session;
  next();
}

// Protected route
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ 
    message: 'Protected data',
    userId: req.user.id,
    email: req.user.email
  });
});`}</code>
							</pre>
						</div>

						<div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>Python/Flask</h3>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
									lineHeight: "1.5",
								}}
							>
								<code style={{ color: "#d4d4d4" }}>{`from functools import wraps
import requests

PROOFA_API = "https://api.proofa.com"
APP_ID = "${app.id}"

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return {'error': 'Unauthorized'}, 401
        
        # Verify with Proofa
        response = requests.get(
            f"{PROOFA_API}/v1/verify",
            headers={'Authorization': token, 'X-App-ID': APP_ID}
        )
        
        if response.status_code != 200:
            return {'error': 'Invalid session'}, 401
        
        request.user = response.json()
        return f(*args, **kwargs)
    
    return decorated_function

@app.route('/api/protected')
@require_auth
def protected_route():
    return {
        'message': 'Protected data',
        'user_id': request.user['id']
    }`}</code>
							</pre>
						</div>

						<div className="card" style={{ padding: "24px" }}>
							<h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>API Keys</h3>
							<p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>
								For server-to-server communication, use your Service Token:
							</p>
							<pre
								style={{
									background: "#1e1e1e",
									padding: "16px",
									borderRadius: "8px",
									overflow: "auto",
									fontSize: "13px",
									fontFamily: "monospace",
									margin: 0,
									lineHeight: "1.5",
								}}
							>
								<code style={{ color: "#d4d4d4" }}>{`// Get user by email (admin operation)
const response = await fetch('https://api.proofa.com/v1/users/by-email', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.PROOFA_SERVICE_TOKEN}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: 'user@example.com' })
});

const user = await response.json();`}</code>
							</pre>
							<div
								style={{
									marginTop: "16px",
									padding: "12px",
									background: "rgba(251, 191, 36, 0.1)",
									border: "1px solid rgba(251, 191, 36, 0.3)",
									borderRadius: "6px",
									fontSize: "13px",
									color: "var(--text-secondary)",
								}}
							>
								<strong style={{ color: "#fbbf24" }}>Important:</strong> Never expose your Service Token
								in client-side code!{" "}
								<Link
									to={`/projects/${projectId}/apps/${appId}/api-keys`}
									style={{ color: "var(--primary)" }}
								>
									Get your API keys →
								</Link>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
