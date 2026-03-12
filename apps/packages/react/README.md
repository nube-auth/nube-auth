# @nube-auth/react

React hooks and components for Nube Auth authentication and user management.

## Installation

```bash
pnpm add @nube-auth/react
```

## Setup

Wrap your app with `NubeAuthProvider`:

```tsx
import { NubeAuthProvider } from '@nube-auth/react';

function App() {
  return (
    <NubeAuthProvider
      config={{
        gatewayUrl: 'https://api.nubeauth.com'
      }}
    >
      <YourApp />
    </NubeAuthProvider>
  );
}
```

## Hooks

### useAuth

Check authentication status and logout:

```tsx
import { useAuth } from '@nube-auth/react';

function Header() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <>
          <span>Hello, {user?.name}</span>
          <button onClick={() => logout()}>Logout</button>
        </>
      ) : (
        <a href="/login">Login</a>
      )}
    </div>
  );
}
```

### useMe

Get and update current user profile:

```tsx
import { useMe } from '@nube-auth/react';

function Profile() {
  const { user, isLoading, update, isUpdating } = useMe();

  if (isLoading) return <div>Loading...</div>;

  const handleUpdate = () => {
    update({ name: 'New Name' });
  };

  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.primary_email}</p>
      <button onClick={handleUpdate} disabled={isUpdating}>
        Update Name
      </button>
    </div>
  );
}
```

### useSessions

Manage user sessions:

```tsx
import { useSessions } from '@nube-auth/react';

function Sessions() {
  const { sessions, isLoading, deleteSession, deleteAll } = useSessions();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Active Sessions</h2>
      <button onClick={() => deleteAll()}>Revoke All Sessions</button>
      {sessions.map((session) => (
        <div key={session.public_id}>
          <p>Created: {new Date(session.created_at * 1000).toLocaleDateString()}</p>
          <button onClick={() => deleteSession(session.public_id)}>
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Custom Query Client

If you want to provide your own React Query client:

```tsx
import { QueryClient } from '@tanstack/react-query';
import { NubeAuthProvider } from '@nube-auth/react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

function App() {
  return (
    <NubeAuthProvider
      config={{ gatewayUrl: 'https://api.nubeauth.com' }}
      queryClient={queryClient}
    >
      <YourApp />
    </NubeAuthProvider>
  );
}
```

## Backend Usage

For backend/SSR usage with S2S token:

```tsx
import { NubeAuthProvider } from '@nube-auth/react';

function App() {
  return (
    <NubeAuthProvider
      config={{
        gatewayUrl: process.env.GATEWAY_URL,
        s2sToken: process.env.X_NUBE_AUTH_SERVICE_TOKEN
      }}
    >
      <YourApp />
    </NubeAuthProvider>
  );
}
```

## Brand Logos

Centralized brand logo components for consistent branding across all dashboards:

```tsx
import {
  GoogleLogo,
  GitHubLogo,
  StripeLogo,
  NextJsLogo,
  ReactLogo,
  JavaScriptLogo,
  FlutterLogo,
  NodeJsLogo,
  TailwindLogo,
} from '@nube-auth/react';

function LoginButtons() {
  return (
    <div className="flex gap-4">
      <button className="flex items-center gap-2">
        <GoogleLogo className="w-5 h-5" />
        Sign in with Google
      </button>
      <button className="flex items-center gap-2">
        <GitHubLogo className="w-5 h-5" />
        Sign in with GitHub
      </button>
    </div>
  );
}

function PaymentProviders() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <StripeLogo className="w-6 h-6" />
        <span>Stripe</span>
      </div>
    </div>
  );
}

function IntegrationShowcase() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex items-center gap-2">
        <NextJsLogo className="w-8 h-8" />
        <span>Next.js</span>
      </div>
      <div className="flex items-center gap-2">
        <ReactLogo className="w-8 h-8" />
        <span>React</span>
      </div>
      <div className="flex items-center gap-2">
        <FlutterLogo className="w-8 h-8" />
        <span>Flutter</span>
      </div>
    </div>
  );
}
```

### Available Logos

- **OAuth Providers**: `GoogleLogo`, `GitHubLogo`
- **Payment Providers**: `StripeLogo`
- **Framework SDKs**: `NextJsLogo`, `ReactLogo`, `JavaScriptLogo`, `FlutterLogo`, `NodeJsLogo`, `TailwindLogo`

All logo components accept a `className` prop for sizing and styling.
