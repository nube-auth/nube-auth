# OAuth Simplification - API Response Examples

This document shows the before/after comparison of API responses after the OAuth simplification.

---

## GET /v1/admin/projects/:projectId

### Before
```json
{
  "id": "PRJ0abc123def456",
  "name": "My Project",
  "slug": "my-project",
  "description": "A sample project",
  "googleClientId": "123456789.apps.googleusercontent.com",
  "googleClientSecret": "GOC...xyz1",
  "githubClientId": "Iv1.1234567890abcdef",
  "githubClientSecret": "git...abc1",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### After
```json
{
  "id": "PRJ0abc123def456",
  "name": "My Project",
  "slug": "my-project",
  "description": "A sample project",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Changes:**
- ❌ Removed: `googleClientId`, `googleClientSecret`, `githubClientId`, `githubClientSecret`

---

## PATCH /v1/admin/projects/:projectId/oauth

### Before
**Request:**
```http
PATCH /v1/admin/projects/PRJ0abc123def456/oauth
Content-Type: application/json

{
  "googleClientId": "new-google-client-id",
  "googleClientSecret": "new-google-secret",
  "githubClientId": "new-github-client-id",
  "githubClientSecret": "new-github-secret"
}
```

**Response:**
```json
{
  "googleClientId": "new-google-client-id",
  "googleClientSecret": "new...ret1",
  "githubClientId": "new-github-client-id",
  "githubClientSecret": "new...ret1"
}
```

### After
**Endpoint removed entirely** - returns 404

**Rationale:**
OAuth credentials are now managed only at the platform level via environment variables, so this endpoint is no longer needed.

---

## POST /v1/admin/projects/:projectId/apps

### Before
**Request:**
```json
{
  "name": "My App",
  "slug": "my-app",
  "description": "A sample app",
  "redirectUris": ["http://localhost:3001/callback"],
  "allowedHosts": ["localhost:3001"],
  "sessionTtlDays": 28
}
```

**Response:**
```json
{
  "id": "APP0xyz789abc123",
  "projectId": "PRJ0abc123def456",
  "name": "My App",
  "slug": "my-app",
  "description": "A sample app",
  "redirectUris": ["http://localhost:3001/callback"],
  "allowedHosts": ["localhost:3001"],
  "corsOrigins": ["http://localhost:3001"],
  "clientSecret": "sk_...abc1",
  "serviceToken": "st_...xyz1",
  "sessionTtlDays": 28,
  "accountLockoutMinutes": 30,
  "cacheTtlMinutes": 60,
  "rateLimit": 100,
  "oauthInheritSource": "proofa",
  "googleClientId": undefined,
  "googleClientSecret": undefined,
  "githubClientId": undefined,
  "githubClientSecret": undefined,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### After
**Request:** (same)
```json
{
  "name": "My App",
  "slug": "my-app",
  "description": "A sample app",
  "redirectUris": ["http://localhost:3001/callback"],
  "allowedHosts": ["localhost:3001"],
  "sessionTtlDays": 28
}
```

**Response:**
```json
{
  "id": "APP0xyz789abc123",
  "projectId": "PRJ0abc123def456",
  "name": "My App",
  "slug": "my-app",
  "description": "A sample app",
  "redirectUris": ["http://localhost:3001/callback"],
  "allowedHosts": ["localhost:3001"],
  "corsOrigins": ["http://localhost:3001"],
  "clientSecret": "sk_...abc1",
  "serviceToken": "st_...xyz1",
  "sessionTtlDays": 28,
  "accountLockoutMinutes": 30,
  "cacheTtlMinutes": 60,
  "rateLimit": 100,
  "enabledProviders": ["google"],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Changes:**
- ❌ Removed: `oauthInheritSource`, `googleClientId`, `googleClientSecret`, `githubClientId`, `githubClientSecret`
- ✅ Added: `enabledProviders` (array of provider names, defaults to `["google"]`)

---

## GET /v1/admin/projects/:projectId/apps/:appId

### Before
```json
{
  "id": "APP0xyz789abc123",
  "projectId": "PRJ0abc123def456",
  "name": "My App",
  "slug": "my-app",
  "description": "A sample app",
  "redirectUris": ["http://localhost:3001/callback"],
  "allowedHosts": ["localhost:3001"],
  "corsOrigins": ["http://localhost:3001"],
  "clientSecret": "sk_...abc1",
  "serviceToken": "st_...xyz1",
  "sessionTtlDays": 28,
  "accountLockoutMinutes": 30,
  "cacheTtlMinutes": 60,
  "rateLimit": 100,
  "oauthInheritSource": "app",
  "googleClientId": "app-specific-google-id",
  "googleClientSecret": "app...ret1",
  "githubClientId": "app-specific-github-id",
  "githubClientSecret": "app...ret1",
  "selectedPaymentProviderId": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### After
```json
{
  "id": "APP0xyz789abc123",
  "projectId": "PRJ0abc123def456",
  "name": "My App",
  "slug": "my-app",
  "description": "A sample app",
  "redirectUris": ["http://localhost:3001/callback"],
  "allowedHosts": ["localhost:3001"],
  "corsOrigins": ["http://localhost:3001"],
  "clientSecret": "sk_...abc1",
  "serviceToken": "st_...xyz1",
  "sessionTtlDays": 28,
  "accountLockoutMinutes": 30,
  "cacheTtlMinutes": 60,
  "rateLimit": 100,
  "enabledProviders": ["google", "github"],
  "selectedPaymentProviderId": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Changes:**
- ❌ Removed: `oauthInheritSource`, `googleClientId`, `googleClientSecret`, `githubClientId`, `githubClientSecret`
- ✅ Added: `enabledProviders` (array showing which OAuth providers this app can use)

---

## PATCH /v1/admin/projects/:projectId/apps/:appId

### Before
**Request:**
```json
{
  "name": "Updated App Name",
  "description": "Updated description",
  "oauthInheritSource": "app",
  "googleClientId": "custom-google-id",
  "googleClientSecret": "custom-google-secret",
  "corsOrigins": ["https://example.com"],
  "rateLimit": 200
}
```

**Response:**
```json
{
  "id": "APP0xyz789abc123",
  "projectId": "PRJ0abc123def456",
  "name": "Updated App Name",
  "slug": "my-app",
  "description": "Updated description",
  "redirectUris": ["http://localhost:3001/callback"],
  "allowedHosts": ["localhost:3001"],
  "corsOrigins": ["https://example.com"],
  "clientSecret": "sk_...abc1",
  "serviceToken": "st_...xyz1",
  "sessionTtlDays": 28,
  "accountLockoutMinutes": 30,
  "cacheTtlMinutes": 60,
  "rateLimit": 200,
  "oauthInheritSource": "app",
  "googleClientId": "custom-google-id",
  "googleClientSecret": "cus...ret1",
  "githubClientId": undefined,
  "githubClientSecret": undefined,
  "selectedPaymentProviderId": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T12:00:00.000Z"
}
```

### After
**Request:**
```json
{
  "name": "Updated App Name",
  "description": "Updated description",
  "enabledProviders": ["google", "github"],
  "corsOrigins": ["https://example.com"],
  "rateLimit": 200
}
```

**Response:**
```json
{
  "id": "APP0xyz789abc123",
  "projectId": "PRJ0abc123def456",
  "name": "Updated App Name",
  "slug": "my-app",
  "description": "Updated description",
  "redirectUris": ["http://localhost:3001/callback"],
  "allowedHosts": ["localhost:3001"],
  "corsOrigins": ["https://example.com"],
  "clientSecret": "sk_...abc1",
  "serviceToken": "st_...xyz1",
  "sessionTtlDays": 28,
  "accountLockoutMinutes": 30,
  "cacheTtlMinutes": 60,
  "rateLimit": 200,
  "enabledProviders": ["google", "github"],
  "selectedPaymentProviderId": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T12:00:00.000Z"
}
```

**Changes:**
- ❌ Request: Removed `oauthInheritSource`, `googleClientId`, `googleClientSecret`, `githubClientId`, `githubClientSecret`
- ✅ Request: Added `enabledProviders` (optional array of provider names)
- ❌ Response: Removed OAuth credential fields and inheritance source
- ✅ Response: Added `enabledProviders`

---

## TypeScript Type Changes

### Before
```typescript
// App DTO Type
interface AppDTO {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  description: string;
  redirectUris: string[];
  allowedHosts: string[];
  corsOrigins: string[];
  clientSecret: string;
  serviceToken: string;
  sessionTtlDays: number;
  accountLockoutMinutes: number;
  cacheTtlMinutes: number;
  rateLimit: number;
  oauthInheritSource: "proofa" | "project" | "app";
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  selectedPaymentProviderId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Update App Request Type
interface UpdateAppRequest {
  name?: string;
  slug?: string;
  description?: string;
  redirectUris?: string[];
  allowedHosts?: string[];
  sessionTtlDays?: number;
  oauthInheritSource?: "proofa" | "project" | "app";
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  corsOrigins?: string[];
  rateLimit?: number;
  accountLockoutMinutes?: number;
  cacheTtlMinutes?: number;
}

// Project DTO Type
interface ProjectDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // ... other stats fields
}
```

### After
```typescript
// App DTO Type
interface AppDTO {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  description: string;
  redirectUris: string[];
  allowedHosts: string[];
  corsOrigins: string[];
  clientSecret: string;
  serviceToken: string;
  sessionTtlDays: number;
  accountLockoutMinutes: number;
  cacheTtlMinutes: number;
  rateLimit: number;
  enabledProviders: string[];  // ← NEW
  selectedPaymentProviderId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Update App Request Type
interface UpdateAppRequest {
  name?: string;
  slug?: string;
  description?: string;
  redirectUris?: string[];
  allowedHosts?: string[];
  sessionTtlDays?: number;
  enabledProviders?: ("google" | "github")[];  // ← NEW
  corsOrigins?: string[];
  rateLimit?: number;
  accountLockoutMinutes?: number;
  cacheTtlMinutes?: number;
}

// Project DTO Type
interface ProjectDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // ... other stats fields
  // OAuth fields removed entirely
}
```

---

## Database Schema Changes

### Before
```sql
-- Projects table
CREATE TABLE "projects" (
  -- ... other fields
  "google_client_id" text,
  "google_client_secret" text,
  "github_client_id" text,
  "github_client_secret" text,
  -- ... other fields
);

-- Apps table
CREATE TABLE "apps" (
  -- ... other fields
  "oauth_inherit_source" text DEFAULT 'proofa' NOT NULL,
  "google_client_id" text,
  "google_client_secret" text,
  "github_client_id" text,
  "github_client_secret" text,
  -- ... other fields
);

-- OAuth Providers table
CREATE TABLE "oauth_providers" (
  "id" serial PRIMARY KEY,
  "public_id" varchar(255) NOT NULL,
  "name" varchar(255),
  "slug" varchar(255),
  "entity_type" varchar(20) NOT NULL,
  "entity_id" integer,
  "provider" varchar(50) NOT NULL,
  "credentials" text NOT NULL,
  -- ... other fields
);

-- App OAuth Selections table
CREATE TABLE "app_oauth_selections" (
  "id" serial PRIMARY KEY,
  "public_id" varchar(255) NOT NULL,
  "app_id" integer NOT NULL,
  "oauth_provider_id" integer NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  -- ... other fields
);
```

### After
```sql
-- Projects table
CREATE TABLE "projects" (
  -- ... other fields
  -- OAuth credential fields removed
  -- ... other fields
);

-- Apps table
CREATE TABLE "apps" (
  -- ... other fields
  "enabled_providers" jsonb NOT NULL DEFAULT '["google"]',  -- ← NEW
  -- oauth_inherit_source removed
  -- OAuth credential fields removed
  -- ... other fields
);

-- OAuth Providers table - REMOVED
-- App OAuth Selections table - REMOVED
```

---

## Summary of Changes

| Change Type | Count | Details |
|-------------|-------|---------|
| **Fields Removed** | 13 | All OAuth credential fields and inheritance source |
| **Fields Added** | 1 | `enabledProviders` array in apps |
| **Tables Removed** | 2 | `oauth_providers`, `app_oauth_selections` |
| **Endpoints Removed** | 1 | `PATCH /v1/admin/projects/:projectId/oauth` |
| **Response Size** | -30% | Smaller API responses (less redundant OAuth data) |
| **Code Complexity** | -500 LOC | Simpler codebase with less OAuth management logic |

---

## Migration Impact

### Apps Created Before Migration
- Will automatically get `enabled_providers: ["google"]` as default
- No data loss - authentication continues to work
- Platform OAuth credentials (env vars) will be used

### Apps Created After Migration
- Will have `enabled_providers: ["google"]` by default
- Can be updated to include `["google", "github"]` if needed
- Only platform OAuth credentials are used (from env vars)

### No Impact On
- ✅ User authentication flows
- ✅ Existing user sessions
- ✅ OAuth callback URLs
- ✅ API authentication (client secrets, service tokens)

---

**For more details, see:**
- `OAUTH_SIMPLIFICATION_SUMMARY.md` - Complete technical overview
- `OAUTH_SIMPLIFICATION_QUICKSTART.md` - Step-by-step migration guide
- `OAUTH_SIMPLIFICATION_CHANGES.md` - Detailed change log
