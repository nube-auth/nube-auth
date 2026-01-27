import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp, useProject } from "../hooks/api";
import {
Spinner,
Alert,
Heading,
Text,
Button,
Card,
CardBody,
Label,
Input
} from "@proofa/components";

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
			<div className="flex items-center justify-center min-h-[400px]">
				<Spinner />
			</div>
		);
	}

	if (!project || !app) {
		return <Alert variant="danger">Project or App not found</Alert>;
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
			<div className="mb-6">
				<div
					className="flex gap-2 items-center text-13px text-text-tertiary"
				>
					<Link to="/projects" className="text-text-tertiary no-underline">
						Projects
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}`}
						className="text-text-tertiary no-underline"
					>
						{project.name}
					</Link>
					<span>›</span>
					<Link
						to={`/projects/${projectId}/apps/${appId}`}
						className="text-text-tertiary no-underline"
					>
						{app.name}
					</Link>
					<span>›</span>
					<span className="text-text-primary">Integration Guide</span>
				</div>
			</div>

			{/* Page Header */}
			<div className="mb-8">
				<Heading level={1} size="lg" className="text-24px font-bold mb-2">Integration Guide</Heading>
				<Text className="text-14px text-text-tertiary">
					Learn how to integrate Proofa authentication into your application
				</Text>
			</div>

			{/* Tabs */}
			<div className="border-b border-border-primary mb-8">
				<div className="flex gap-8">
					{tabs.map((tab) => (
						<Button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`py-3 text-14px font-semibold bg-transparent border-none border-b-2 cursor-pointer transition-all duration-200 ${activeTab === tab.id ? "text-primary border-b-primary" : "text-text-tertiary border-b-transparent"}`}
						>
							{tab.label}
						</Button>
					))}
				</div>
			</div>

			{/* Tab Content */}
			<div>
				{/* Quick Start */}
				{activeTab === "quickstart" && (
					<div>
						<Heading level={2} size="lg" className="text-20px font-bold mb-4">Quick Start</Heading>
<Text className="text-14px text-text-secondary mb-6 leading-relaxed">
							Get started with Proofa in 5 minutes. This guide will walk you through the basic setup.
						</Text>

						{/* Step 1 */}
						<div className="card p-6 mb-4">
							<div className="flex items-center gap-3 mb-4">
								<div
									className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-14px font-bold"
								>
									1
								</div>
								<Heading level={3} size="md" className="text-16px font-semibold">Install the Proofa SDK</Heading>
							</div>
							<div className="relative">
								<pre
									className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0"
								>
									<code className="text-code-text">npm install @proofa/react</code>
								</pre>
								<Button
									type="button"
									onClick={() => handleCopy("npm install @proofa/react")}
									className="absolute top-3 right-3 py-1.5 px-3 text-12px bg-white/10 text-white border border-white/20 rounded-md cursor-pointer"
								>
									{copied ? "✓ Copied" : "Copy"}
								</Button>
							</div>
						</div>

						{/* Step 2 */}
						<div className="card p-6 mb-4">
							<div className="flex items-center gap-3 mb-4">
								<div
									className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-14px font-bold"
								>
									2
								</div>
								<Heading level={3} size="md" className="text-16px font-semibold">Get your App ID</Heading>
							</div>
							<Text className="text-14px text-text-secondary mb-3">
								Your App ID is:
							</Text>
							<code
								className="block py-3 px-4 bg-surface-secondary rounded-lg text-14px font-mono text-text-primary"
							>
								{app.id}
							</code>
						</div>

						{/* Step 3 */}
						<div className="card p-6 mb-4">
							<div className="flex items-center gap-3 mb-4">
								<div
									className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-14px font-bold"
								>
									3
								</div>
								<Heading level={3} size="md" className="text-16px font-semibold">
									Wrap your app with ProofaProvider
								</Heading>
							</div>
							<div className="relative">
								<pre
									className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
								>
									<code className="text-code-text">{`import { ProofaProvider } from '@proofa/react';

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
						<div className="card p-6">
							<div className="flex items-center gap-3 mb-4">
								<div
									className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-14px font-bold"
								>
									4
								</div>
								<Heading level={3} size="md" className="text-16px font-semibold">Use the auth hook</Heading>
							</div>
							<div className="relative">
								<pre
									className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
								>
									<code className="text-code-text">{`import { useAuth } from '@proofa/react';

function YourComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <Button onClick={() => login('google')}>Sign in</Button>;
  }

  return (
    <div>
      <Text>Welcome, {user.name}!</Text>
      <Button onClick={logout}>Sign out</Button>
    </div>
  );
}`}</code>
								</pre>
							</div>
						</div>

						{/* Next Steps */}
						<div
							className="mt-8 p-5 bg-surface-secondary rounded-lg border border-border-primary"
						>
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">Next Steps</Heading>
							<ul
								className="m-0 pl-5 text-14px text-text-secondary leading-loose"
							>
								<li>Check out framework-specific guides in the tabs above</li>
								<li>Configure OAuth providers in your app settings</li>
								<li>Set up backend verification for API routes</li>
								<li>
									<Link
										to={`/projects/${projectId}/apps/${appId}/api-keys`}
										className="text-primary"
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
						<Heading level={2} size="lg" className="text-20px font-bold mb-4">React Integration</Heading>
						<Text
							className="text-14px text-text-secondary mb-6 leading-relaxed"
						>
							Complete guide for integrating Proofa into your React application.
						</Text>

						<div className="card p-6 mb-4">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">Installation</Heading>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0"
							>
								<code className="text-code-text">npm install @proofa/react</code>
							</pre>
						</div>

						<div className="card p-6 mb-4">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">
								Setup Provider
							</Heading>
							<Text className="text-14px text-text-secondary mb-3">
								Wrap your root component with the ProofaProvider:
							</Text>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
							>
								<code className="text-code-text">{`import { ProofaProvider } from '@proofa/react';
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

						<div className="card p-6 mb-4">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">useAuth Hook</Heading>
							<Text className="text-14px text-text-secondary mb-3">
								Access authentication state and methods:
							</Text>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
							>
								<code className="text-code-text">{`import { useAuth } from '@proofa/react';

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
        <Button onClick={() => login('google')}>
          Sign in with Google
        </Button>
        <Button onClick={() => login('github')}>
          Sign in with GitHub
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Heading level={1} size="lg">Welcome, {user.name}!</Heading>
      <img src={user.avatar} alt={user.name} />
      <Text>{user.email}</Text>
      <Button onClick={logout}>Sign out</Button>
    </div>
  );
}`}</code>
							</pre>
						</div>

						<div className="card p-6">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">
								Protected Routes
							</Heading>
							<Text className="text-14px text-text-secondary mb-3">
								Create a component to protect routes:
							</Text>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
							>
								<code className="text-code-text">{`import { useAuth } from '@proofa/react';
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
						<Heading level={2} size="lg" className="text-20px font-bold mb-4">
							Next.js Integration
						</Heading>
						<Text
							className="text-14px text-text-secondary mb-6 leading-relaxed"
						>
							Complete guide for integrating Proofa into your Next.js application (App Router).
						</Text>

						<div className="card p-6 mb-4">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">Installation</Heading>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0"
							>
								<code className="text-code-text">npm install @proofa/react</code>
							</pre>
						</div>

						<div className="card p-6 mb-4">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">
								Setup Provider (app/layout.tsx)
							</Heading>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
							>
								<code className="text-code-text">{`'use client';

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

						<div className="card p-6 mb-4">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">
								Client Component
							</Heading>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
							>
								<code className="text-code-text">{`'use client';

import { useAuth } from '@proofa/react';

export default function Dashboard() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <Button onClick={() => login('google')}>Sign in</Button>;
  }

  return (
    <div>
      <Heading level={1} size="lg">Welcome, {user.name}!</Heading>
      <Button onClick={logout}>Sign out</Button>
    </div>
  );
}`}</code>
							</pre>
						</div>

						<div className="card p-6">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">
								Server-Side Verification
							</Heading>
							<Text className="text-14px text-text-secondary mb-3">
								Verify sessions in Server Components or API Routes:
							</Text>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
							>
								<code className="text-code-text">{`// app/api/protected/route.ts
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
						<Heading level={2} size="lg" className="text-20px font-bold mb-4">
							Vanilla JavaScript
						</Heading>
						<Text
							className="text-14px text-text-secondary mb-6 leading-relaxed"
						>
							Use Proofa without any framework.
						</Text>

						<div className="card p-6 mb-4">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">Installation</Heading>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0"
							>
								<code className="text-code-text">npm install @proofa/client</code>
							</pre>
						</div>

						<div className="card p-6 mb-4">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">
								Initialize Client
							</Heading>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
							>
								<code className="text-code-text">{`import { ProofaClient } from '@proofa/client';

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

						<div className="card p-6">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">HTML Example</Heading>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
							>
								<code className="text-code-text">{`<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <div id="app">
    <Button id="google-login">Sign in with Google</Button>
    <div id="user-profile" style="display: none;">
      <Heading level={2} size="lg">Welcome, <span id="user-name"></span>!</Heading>
      <Button id="logout">Sign out</Button>
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
						<Heading level={2} size="lg" className="text-20px font-bold mb-4">
							Backend Verification
						</Heading>
						<Text
							className="text-14px text-text-secondary mb-6 leading-relaxed"
						>
							Verify user sessions and protect your API endpoints.
						</Text>

						<div className="card p-6 mb-4">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">
								Node.js/Express
							</Heading>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
							>
								<code className="text-code-text">{`import { verifySession } from '@proofa/node';

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

						<div className="card p-6 mb-4">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">Python/Flask</Heading>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
							>
								<code className="text-code-text">{`from functools import wraps
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

						<div className="card p-6">
							<Heading level={3} size="md" className="text-16px font-semibold mb-3">API Keys</Heading>
							<Text className="text-14px text-text-secondary mb-3">
								For server-to-server communication, use your Service Token:
							</Text>
							<pre
								className="bg-code-bg p-4 rounded-lg overflow-auto text-13px font-mono m-0 leading-relaxed"
							>
								<code className="text-code-text">{`// Get user by email (admin operation)
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
								className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-md text-13px text-text-secondary"
							>
								<strong className="text-warning">Important:</strong> Never expose your Service Token
								in client-side code!{" "}
								<Link
									to={`/projects/${projectId}/apps/${appId}/api-keys`}
									className="text-primary"
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
