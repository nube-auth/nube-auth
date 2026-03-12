# Nube Auth Client Package

Created a new `@nube-auth/client` package that provides a unified TypeScript client for interacting with the Nube Auth Gateway API.

## What Was Created

### New Package: `packages/client/`

**Files:**
- `src/client.ts` - Main NubeAuthClient class with all API methods
- `src/types.ts` - TypeScript interfaces for all API types
- `src/index.ts` - Package exports
- `README.md` - Basic package documentation
- `INTEGRATION.md` - Comprehensive integration guide
- `example.ts` - Usage examples
- `package.json` - Package configuration
- `tsconfig.json` - TypeScript configuration

### Features

**Authentication:**
- `client.auth.checkStatus()` - Check login status
- `client.auth.logout()` - Logout user

**User Profile:**
- `client.me.get()` - Get current user
- `client.me.update(data)` - Update profile

**Sessions:**
- `client.sessions.list()` - List active sessions
- `client.sessions.deleteAll()` - Logout all sessions

**Admin API:**
- `client.admin.projects.list()` - List projects
- `client.admin.projects.create(data)` - Create project
- `client.admin.projects.get(id)` - Get project
- `client.admin.projects.apps(projectId)` - List apps
- `client.admin.projects.createApp(projectId, data)` - Create app
- `client.admin.projects.members(projectId)` - List members
- `client.admin.licenses.list()` - List licenses

## Changes Made

### Dashboard Updates

Both `apps/dashboard/user` and `apps/dashboard/admin` now use `@nube-auth/client`:

**Before:**
```typescript
// Direct fetch calls
const res = await fetch("/api/me");
const user = await res.json();
```

**After:**
```typescript
// Using client
import { NubeAuthClient } from '@nube-auth/client';

const client = new NubeAuthClient({
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL
});

const user = await client.me.get();
```

### Field Name Updates

Updated all field references to match the Gateway API schema:
- `user.email` → `user.primary_email`
- `user.id` → `user.public_id`
- `session.id` → `session.public_id`
- `session.createdAt` → `session.created_at` (epoch seconds)
- `session.expiresAt` → `session.expires_at` (epoch seconds)
- `license.id` → `license.public_id`
- `license.active` → `license.status === "active"`
- `project.id` → `project.public_id`
- `app.id` → `app.public_id`

### Removed Fields

- `user.createdAt` - Not provided by API (displayed as "N/A")
- `session.isCurrent` - Determined by array order (first session is current)

## Benefits

1. **Type Safety** - Full TypeScript support with proper interfaces
2. **Code Reuse** - Eliminates duplicate API code between dashboards
3. **Error Handling** - Centralized error handling with NubeAuthError class
4. **Maintainability** - Single source of truth for API interactions
5. **Third-Party Ready** - Can be published as a standalone package

## Usage Example

```typescript
import { NubeAuthClient } from '@nube-auth/client';

const client = new NubeAuthClient({
  gatewayUrl: 'https://api.nubeauth.com'
});

// Check authentication
const status = await client.auth.checkStatus();

if (status.loggedIn) {
  // Get user profile
  const user = await client.me.get();
  console.log(user.name, user.primary_email);
  
  // List projects (admin)
  const { projects } = await client.admin.projects.list();
}
```

## Documentation

- [README.md](packages/client/README.md) - Basic usage
- [INTEGRATION.md](packages/client/INTEGRATION.md) - Comprehensive guide
- [example.ts](packages/client/example.ts) - Code examples

## Testing

Both dashboards build successfully:
```bash
pnpm --filter @nube-auth/dashboard-user build   # ✅ Success
pnpm --filter @nube-auth/dashboard-admin build  # ✅ Success
```

## Next Steps

1. **Publish Package** - Optionally publish to npm for external use
2. **Add Tests** - Unit tests for client methods
3. **Add Documentation** - JSDoc comments for better IDE support
4. **SDK Features** - Add helper methods (e.g., `isAuthenticated()`, `requireAuth()`)
5. **React Hooks Package** - Create `@nube-auth/react` with pre-built hooks

## For Third-Party Integration

Third parties can now use `@nube-auth/client` directly:

```bash
npm install @nube-auth/client
```

```typescript
import { NubeAuthClient } from '@nube-auth/client';

const nubeAuth = new NubeAuthClient({
  gatewayUrl: process.env.NUBE_AUTH_GATEWAY_URL
});

// Use in your app
app.get('/profile', async (req, res) => {
  try {
    const user = await nube-auth.me.get();
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Not authenticated' });
  }
});
```
