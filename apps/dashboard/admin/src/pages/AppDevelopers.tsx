import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useApp, useProject } from "../hooks/api";
import {
	Spinner,
	Alert,
	Heading,
	Text,
	Button,
	Card,
	CardBody,
	Tabs,
	TabsList,
	TabsItem,
	TabsPanel,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
} from "@nube-auth/components";
import { PageLoader } from "../components/PageLoader";

export function AppDevelopersPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const [copied, setCopied] = useState(false);

	const handleCopy = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			// Clipboard API may fail silently in some browsers
		}
	};

	if (projectLoading || appLoading) {
		return <PageLoader />;
	}

	if (!project || !app) {
		return <Alert variant="danger">Project or App not found</Alert>;
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}`} />}>
							{project.name}
						</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}/apps/${appId}`} />}>
							{app.name}
						</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton active>Integration Guide</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Page Header */}
			<div>
				<Heading level={1} size="lg">
					Integration Guide
				</Heading>
				<Text className="text-muted">
					Learn how to integrate Nube Auth authentication into your application
				</Text>
			</div>

			{/* Tabs */}
			<Tabs defaultValue="quickstart">
				<TabsList>
					<TabsItem value="quickstart">Quick Start</TabsItem>
					<TabsItem value="react">React</TabsItem>
					<TabsItem value="nextjs">Next.js</TabsItem>
					<TabsItem value="javascript">JavaScript</TabsItem>
					<TabsItem value="backend">Backend</TabsItem>
				</TabsList>

				<TabsPanel value="quickstart">
					<Heading level={2} size="lg" className="text-xl font-bold mb-4">
						Quick Start
					</Heading>
					<Text className="text-sm text-muted mb-6 leading-relaxed">
						Get started with Nube Auth in 5 minutes. This guide will walk you through the basic setup.
					</Text>

					{/* Step 1 */}
					<Card className="mb-4">
						<CardBody>
							<div className="flex items-center gap-3 mb-4">
								<div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
									1
								</div>
								<Heading level={3} size="md" className="text-base font-semibold">
									Install the Nube Auth SDK
								</Heading>
							</div>
							<div className="relative">
								<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0">
									<code className="text-foreground">npm install @nube-auth/react</code>
								</pre>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() => handleCopy("npm install @nube-auth/react")}
									className="absolute top-3 right-3"
								>
									{copied ? "✓ Copied" : "Copy"}
								</Button>
							</div>
						</CardBody>
					</Card>

					{/* Step 2 */}
					<Card className="mb-4">
						<CardBody>
							<div className="flex items-center gap-3 mb-4">
								<div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
									2
								</div>
								<Heading level={3} size="md" className="text-base font-semibold">
									Get your App ID
								</Heading>
							</div>
							<Text className="text-sm text-muted mb-3">Your App ID is:</Text>
							<code className="block py-3 px-4 bg-muted/30 rounded-lg text-sm font-mono text-foreground">
								{app.id}
							</code>
						</CardBody>
					</Card>

					{/* Step 3 */}
					<Card className="mb-4">
						<CardBody>
							<div className="flex items-center gap-3 mb-4">
								<div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
									3
								</div>
								<Heading level={3} size="md" className="text-base font-semibold">
									Wrap your app with NubeAuthProvider
								</Heading>
							</div>
							<div className="relative">
								<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
									<code className="text-foreground">{`import { NubeAuthProvider } from '@nube-auth/react';

function App() {
  return (
    <NubeAuthProvider appId="${app.id}">
      <YourApp />
    </NubeAuthProvider>
  );
}`}</code>
								</pre>
							</div>
						</CardBody>
					</Card>

					{/* Step 4 */}
					<Card>
						<CardBody>
							<div className="flex items-center gap-3 mb-4">
								<div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
									4
								</div>
								<Heading level={3} size="md" className="text-base font-semibold">
									Use the auth hook
								</Heading>
							</div>
							<div className="relative">
								<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
									<code className="text-foreground">{`import { useAuth } from '@nube-auth/react';

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
						</CardBody>
					</Card>

					{/* Next Steps */}
					<div className="mt-8 p-5 bg-muted/30 rounded-lg border border-border">
						<Heading level={3} size="md" className="text-base font-semibold mb-3">
							Next Steps
						</Heading>
						<ul className="m-0 pl-5 text-sm text-muted leading-loose">
							<li>Check out framework-specific guides in the tabs above</li>
							<li>Configure OAuth providers in your app settings</li>
							<li>Set up backend verification for API routes</li>
							<li>
								<Link to={`/projects/${projectId}/apps/${appId}/api-keys`} className="text-primary">
									Get your API keys
								</Link>{" "}
								for backend integration
							</li>
						</ul>
					</div>
				</TabsPanel>

				<TabsPanel value="react">
					<Heading level={2} size="lg" className="text-xl font-bold mb-4">
						React Integration
					</Heading>
					<Text className="text-sm text-muted mb-6 leading-relaxed">
						Complete guide for integrating Nube Auth into your React application.
					</Text>

					<Card className="mb-4">
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								Installation
							</Heading>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0">
								<code className="text-foreground">npm install @nube-auth/react</code>
							</pre>
						</CardBody>
					</Card>

					<Card className="mb-4">
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								Setup Provider
							</Heading>
							<Text className="text-sm text-muted mb-3">
								Wrap your root component with the NubeAuthProvider:
							</Text>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
								<code className="text-foreground">{`import { NubeAuthProvider } from '@nube-auth/react';
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <NubeAuthProvider 
        appId="${app.id}"
        redirectUrl="/dashboard"
      >
        <YourRoutes />
      </NubeAuthProvider>
    </BrowserRouter>
  );
}

export default App;`}</code>
							</pre>
						</CardBody>
					</Card>

					<Card className="mb-4">
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								useAuth Hook
							</Heading>
							<Text className="text-sm text-muted mb-3">
								Access authentication state and methods:
							</Text>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
								<code className="text-foreground">{`import { useAuth } from '@nube-auth/react';

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
						</CardBody>
					</Card>

					<Card>
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								Protected Routes
							</Heading>
							<Text className="text-sm text-muted mb-3">
								Create a component to protect routes:
							</Text>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
								<code className="text-foreground">{`import { useAuth } from '@nube-auth/react';
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
						</CardBody>
					</Card>
				</TabsPanel>

				<TabsPanel value="nextjs">
					<Heading level={2} size="lg" className="text-xl font-bold mb-4">
						Next.js Integration
					</Heading>
					<Text className="text-sm text-muted mb-6 leading-relaxed">
						Complete guide for integrating Nube Auth into your Next.js application (App Router).
					</Text>

					<Card className="mb-4">
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								Installation
							</Heading>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0">
								<code className="text-foreground">npm install @nube-auth/react</code>
							</pre>
						</CardBody>
					</Card>

					<Card className="mb-4">
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								Setup Provider (app/layout.tsx)
							</Heading>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
								<code className="text-foreground">{`'use client';

import { NubeAuthProvider } from '@nube-auth/react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NubeAuthProvider 
          appId="${app.id}"
          redirectUrl="/dashboard"
        >
          {children}
        </NubeAuthProvider>
      </body>
    </html>
  );
}`}</code>
							</pre>
						</CardBody>
					</Card>

					<Card className="mb-4">
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								Client Component
							</Heading>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
								<code className="text-foreground">{`'use client';

import { useAuth } from '@nube-auth/react';

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
						</CardBody>
					</Card>

					<Card>
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								Server-Side Verification
							</Heading>
							<Text className="text-sm text-muted mb-3">
								Verify sessions in Server Components or API Routes:
							</Text>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
								<code className="text-foreground">{`// app/api/protected/route.ts
import { verifySession } from '@nube-auth/next';

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
						</CardBody>
					</Card>
				</TabsPanel>

				<TabsPanel value="javascript">
					<Heading level={2} size="lg" className="text-xl font-bold mb-4">
						Vanilla JavaScript
					</Heading>
					<Text className="text-sm text-muted mb-6 leading-relaxed">
						Use Nube Auth without any framework.
					</Text>

					<Card className="mb-4">
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								Installation
							</Heading>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0">
								<code className="text-foreground">npm install @nube-auth/client</code>
							</pre>
						</CardBody>
					</Card>

					<Card className="mb-4">
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								Initialize Client
							</Heading>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
								<code className="text-foreground">{`import { NubeAuthClient } from '@nube-auth/client';

const client = new NubeAuthClient({
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
						</CardBody>
					</Card>

					<Card>
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								HTML Example
							</Heading>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
								<code className="text-foreground">{`<!DOCTYPE html>
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
						</CardBody>
					</Card>
				</TabsPanel>

				<TabsPanel value="backend">
					<Heading level={2} size="lg" className="text-xl font-bold mb-4">
						Backend Verification
					</Heading>
					<Text className="text-sm text-muted mb-6 leading-relaxed">
						Verify user sessions and protect your API endpoints.
					</Text>

					<Card className="mb-4">
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								Node.js/Express
							</Heading>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
								<code className="text-foreground">{`import { verifySession } from '@nube-auth/node';

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
						</CardBody>
					</Card>

					<Card className="mb-4">
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								Python/Flask
							</Heading>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
								<code className="text-foreground">{`from functools import wraps
import requests

NUBE_AUTH_API = "https://api.nubeauth.com"
APP_ID = "${app.id}"

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return {'error': 'Unauthorized'}, 401
        
        # Verify with Nube Auth
        response = requests.get(
            f"{NUBE_AUTH_API}/v1/verify",
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
						</CardBody>
					</Card>

					<Card>
						<CardBody>
							<Heading level={3} size="md" className="text-base font-semibold mb-3">
								API Keys
							</Heading>
							<Text className="text-sm text-muted mb-3">
								For server-to-server communication, use your Service Token:
							</Text>
							<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono m-0 leading-relaxed">
								<code className="text-foreground">{`// Get user by email (admin operation)
const response = await fetch('https://api.nubeauth.com/v1/users/by-email', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.NUBE_AUTH_SERVICE_TOKEN}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: 'user@example.com' })
});

const user = await response.json();`}</code>
							</pre>
							<div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-sm text-muted">
								<strong className="text-amber-500">Important:</strong> Never expose your Service Token
								in client-side code!{" "}
								<Link to={`/projects/${projectId}/apps/${appId}/api-keys`} className="text-primary">
									Get your API keys →
								</Link>
							</div>
						</CardBody>
					</Card>
				</TabsPanel>
			</Tabs>
		</div>
	);
}
