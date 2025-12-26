# Proofa Client Integration Guide

The `@proofa/client` package provides a type-safe TypeScript client for integrating with Proofa's authentication and licensing system.

## Installation

```bash
# In your monorepo
pnpm add @proofa/client --workspace

# Or in external project
npm install @proofa/client
```

## Quick Start

```typescript
import { ProofaClient } from '@proofa/client';

const client = new ProofaClient({
  gatewayUrl: 'https://api.proofa.dev'
});

// Check if user is authenticated
const status = await client.auth.checkStatus();

if (status.loggedIn) {
  // Get user profile
  const user = await client.me.get();
  console.log(user.name, user.primary_email);
}
```

## Configuration

### Initialize Client

```typescript
const client = new ProofaClient({
  gatewayUrl: process.env.GATEWAY_URL || 'https://api.proofa.dev'
});
```

### Environment Variables

For dashboards (Vite):
```env
VITE_GATEWAY_URL=https://api.proofa.dev
```

For backend (Node.js):
```env
GATEWAY_URL=https://api.proofa.dev
```

## API Reference

### Authentication

#### Check Status
```typescript
const status = await client.auth.checkStatus();
// Returns: { loggedIn: boolean, user?: User }
```

#### Logout
```typescript
await client.auth.logout();
// Clears session cookie
```

### User Profile

#### Get Profile
```typescript
const user = await client.me.get();
// Returns: User object with public_id, name, primary_email, etc.
```

#### Update Profile
```typescript
const updated = await client.me.update({
  name: 'John Doe',
  avatar_url: 'https://example.com/avatar.jpg'
});
```

### Sessions

#### List Sessions
```typescript
const { sessions } = await client.sessions.list();
// Returns array of active sessions
```

#### Logout All Sessions
```typescript
await client.sessions.deleteAll();
// Revokes all user sessions
```

### Admin: Projects

#### List Projects
```typescript
const { projects } = await client.admin.projects.list();
```

#### Get Project
```typescript
const project = await client.admin.projects.get(projectId);
```

#### Create Project
```typescript
const project = await client.admin.projects.create({
  name: 'My Project',
  slug: 'my-project',
  description: 'Optional description'
});
```

### Admin: Apps

#### List Apps
```typescript
const { apps } = await client.admin.projects.apps(projectId);
```

#### Create App
```typescript
const app = await client.admin.projects.createApp(projectId, {
  name: 'My App',
  slug: 'my-app',
  allowed_hosts: ['api.myapp.com'],
  redirect_uris: ['https://myapp.com/auth/callback'],
  required_providers: ['google', 'github'],
  licensing_required: true,
  default_license_plan: 'free',
  app_session_ttl_days: 30
});
```

### Admin: Members

#### List Project Members
```typescript
const { members } = await client.admin.projects.members(projectId);
```

### Admin: Licenses

#### List Licenses
```typescript
const { licenses } = await client.admin.licenses.list();
```

## React Integration

### Basic Setup

```typescript
// lib/proofa.ts
import { ProofaClient } from '@proofa/client';

export const proofaClient = new ProofaClient({
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3004'
});
```

### TanStack Query Hooks

```typescript
// hooks/useProofa.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proofaClient } from '@/lib/proofa';

export function useAuthStatus() {
  return useQuery({
    queryKey: ['auth-status'],
    queryFn: () => proofaClient.auth.checkStatus(),
  });
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => proofaClient.me.get(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string }) => 
      proofaClient.me.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => proofaClient.auth.logout(),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}
```

### Component Usage

```typescript
import { useAuthStatus, useMe, useUpdateProfile } from '@/hooks/useProofa';

export function ProfilePage() {
  const { data: status } = useAuthStatus();
  const { data: user } = useMe();
  const updateProfile = useUpdateProfile();

  if (!status?.loggedIn) {
    return <Navigate to="/login" />;
  }

  const handleUpdate = () => {
    updateProfile.mutate({ name: 'New Name' });
  };

  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.primary_email}</p>
      <button onClick={handleUpdate}>Update</button>
    </div>
  );
}
```

## Error Handling

```typescript
import { ProofaError } from '@proofa/client';

try {
  await client.me.get();
} catch (error) {
  if (error instanceof ProofaError) {
    console.error('Error:', error.code, error.message, error.status);
    
    if (error.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
  }
}
```

## TypeScript Types

All types are exported from the package:

```typescript
import type {
  User,
  Session,
  License,
  Project,
  App,
  ProjectMember,
  AuthStatus,
  CreateProjectData,
  CreateAppData,
  UpdateProfileData
} from '@proofa/client';
```

## Examples

See `example.ts` in the package for comprehensive usage examples.

## Support

For issues or questions, contact support@proofa.io or open an issue in the repository.
