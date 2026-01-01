# OAuth Simplification Changes - Summary

**Date:** January 1, 2026  
**Purpose:** Remove OAuth credential management at project/app level, simplify to platform-only OAuth

## Changes Completed ✅

### 1. Specification Updates
- ✅ Updated spec version to 1.1.0
- ✅ Updated last modified date to January 1, 2026
- ✅ Added "platform-level credentials only" to OAuth description
- ✅ Removed OAuth credentials from projects table schema (google_client_id, google_client_secret, github_client_id, github_client_secret)
- ✅ Updated apps table schema: Changed `required_providers` to `enabled_providers` with default `["google"]`
- ✅ Added description fields to projects and apps tables

### 2. Database Schema Updates
- ✅ Removed OAuth credential fields from `projects` table
- ✅ Removed `oauth_providers` table
- ✅ Removed `app_oauth_selections` table  
- ✅ Updated `apps` table: 
  - Removed: `oauth_inherit_source`, `google_client_id`, `google_client_secret`, `github_client_id`, `github_client_secret`
  - Added: `enabled_providers` (jsonb, default `["google"]`)

### 3. Query Layer Updates
- ✅ Removed `oauthProviderQueries` export from packages/db/src/index.ts
- ✅ Removed all OAuth provider query methods from packages/db/src/providers.ts
- ✅ Kept `paymentProviderQueries` intact

### 4. Admin API Routes Updates (apps/gateway/src/routes/admin.ts)
- ✅ Removed imports: `oauthProviderQueries`, `oauth_providers`
- ✅ Removed OAuth credential fields from GET /v1/admin/projects/:projectId response
- ✅ Removed entire PATCH /v1/admin/projects/:projectId/oauth endpoint
- ✅ Removed `oauth_inherit_source: "proofa"` from POST /v1/admin/projects/:projectId/apps (app creation)
- ✅ Updated POST /v1/admin/projects/:projectId/apps response: replaced OAuth credential fields with `enabledProviders`
- ✅ Updated GET /v1/admin/projects/:projectId/apps/:appId response: replaced OAuth credential fields with `enabledProviders`
- ✅ Updated PATCH /v1/admin/projects/:projectId/apps/:appId: removed OAuth inheritance logic, added `enabledProviders` handling
- ✅ Updated PATCH /v1/admin/projects/:projectId/apps/:appId response: replaced OAuth credential fields with `enabledProviders`

## Changes Still Needed ⚠️

### 5. Type/Schema Updates  
- ✅ Updated `AppDTOSchema`: Removed OAuth credential fields, added `enabledProviders`
- ✅ Updated `UpdateAppRequestSchema`: Removed OAuth fields, added `enabledProviders`  
- ✅ Removed `UpdateProjectOAuthRequestSchema` entirely
- ✅ Updated `ProjectDTOSchema`: Removed OAuth credential fields
- ✅ Removed `UpdateProjectOAuthRequest` type export

### 6. Migration Script
- ✅ Created migration script: `packages/db/drizzle/0001_oauth_simplification.sql`
- ⚠️ Migration needs to be applied to database
- ⚠️ Drizzle schema needs to be regenerated: `pnpm --filter @proofa/db generate`

### 7. Remaining Tasks
- ⚠️ Apply migration to database
- ⚠️ Regenerate Drizzle types
- ⚠️ Update admin dashboard frontend (if applicable) to:
  - Remove OAuth configuration UI for projects
  - Remove OAuth configuration UI for apps
  - Add enabled providers selector for apps
- ⚠️ Test all changes end-to-end

## New Architecture Summary

**Before:**
- OAuth credentials could be configured at 3 levels: platform, project, app
- Complex inheritance system with `oauth_inherit_source`
- Multiple tables: `oauth_providers`, `app_oauth_selections`
- Per-project and per-app OAuth client IDs/secrets

**After:**
- OAuth credentials ONLY at platform level (env vars: `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`, etc.)
- Apps simply select which providers to enable via `enabled_providers` JSON array
- No OAuth credential tables needed
- Simpler: Apps choose from available platform providers

## Migration Path for Existing Deployments

1. Export any custom OAuth credentials from projects/apps (if any exist)
2. Run migration to drop columns and tables
3. Update app records to set `enabled_providers` based on previous `required_providers`
4. Ensure platform-level OAuth credentials are configured in environment variables
5. Update admin dashboard UI to remove OAuth configuration sections

## Files Modified ✅

✅ `/docs/PRODUCT_SPEC.md`  
✅ `/packages/db/src/schema.ts`  
✅ `/packages/db/src/index.ts`  
✅ `/packages/db/src/providers.ts`
✅ `/apps/gateway/src/routes/admin.ts`
✅ `/packages/shared/src/types/schemas/admin.ts`
✅ `/packages/db/drizzle/0001_oauth_simplification.sql` (created)

## Files Still To Modify

⚠️ Database (apply migration)
⚠️ Update admin dashboard frontend (React components - if applicable):
   - Remove project OAuth settings page/component
   - Remove app OAuth settings section
   - Add provider selector UI for apps (checkbox/dropdown for google, github)

---

**Next Steps:**
1. Complete admin routes cleanup
2. Update type schemas  
3. Create and test migration script
4. Update any frontend code that references OAuth settings
5. Update documentation/README files
