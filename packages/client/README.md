# @proofa/client

Proofa API client for TypeScript/JavaScript applications.

## Installation

```bash
pnpm add @proofa/client
```

## Usage

### Frontend (Cookie-based Authentication)

For frontend applications (user/admin dashboards), the client uses cookies automatically:

```typescript
import { ProofaClient } from '@proofa/client';

// Initialize without S2S token - uses cookies
const client = new ProofaClient({
  gatewayUrl: 'https://api.proofa.dev',
  // or for local dev:
  // gatewayUrl: 'http://localhost:3004'
});

// Get current user
const user = await client.me.get();

// Update profile
await client.me.update({ name: 'John Doe' });

// Logout
await client.auth.logout();
```

### Backend (S2S Token Authentication)

For backend services (Core, Gateway), provide an S2S token for service-to-service authentication:

```typescript
import { ProofaClient } from '@proofa/client';

// Initialize with S2S token for backend
const client = new ProofaClient({
  gatewayUrl: process.env.GATEWAY_URL,
  s2sToken: process.env.X_PROOFA_SERVICE_TOKEN
});

// All requests will include X-Proofa-Service-Token header
const user = await client.me.get();

// Admin: Create project
const project = await client.admin.projects.create({
  name: 'My Project',
  slug: 'my-project'
});
```

## API

### Authentication

- `client.auth.checkStatus()` - Check if user is logged in
- `client.auth.logout()` - Logout current user

### User Profile

- `client.me.get()` - Get current user profile
- `client.me.update(data)` - Update profile (name, picture)

### Sessions

- `client.sessions.list()` - List all active sessions
- `client.sessions.deleteAll()` - Logout all sessions

### Admin

- `client.admin.projects.list()` - List all projects
- `client.admin.projects.create(data)` - Create new project
- `client.admin.projects.get(id)` - Get project details
- `client.admin.projects.apps(projectId)` - List apps in project
- `client.admin.projects.createApp(projectId, data)` - Create app
- `client.admin.projects.members(projectId)` - List project members
- `client.admin.licenses.list()` - List all licenses
