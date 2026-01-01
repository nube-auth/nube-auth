# OAuth Simplification - Complete Summary

**Date:** January 1, 2026  
**Status:** Backend implementation complete, migration script created  
**Purpose:** Simplify OAuth credential management from 3-level (platform/project/app) to platform-level only

---

## Summary of Changes

Proofa's OAuth architecture has been simplified. Previously, OAuth credentials could be configured at three levels (platform, project, and app) with a complex inheritance system. Now, OAuth credentials are managed **only at the platform level** via environment variables, and apps simply select which providers to enable.

### Key Architectural Changes

**Before:**
- OAuth credentials at 3 levels: platform (env vars), project (database), app (database)
- Complex inheritance system with `oauth_inherit_source` field
- Multiple database tables: `oauth_providers`, `app_oauth_selections`
- Per-project and per-app OAuth client IDs and secrets in database

**After:**
- OAuth credentials **ONLY** at platform level (environment variables)
- Apps select which providers to enable via `enabled_providers` JSON array
- No OAuth credential storage in database (removed tables and columns)
- Simpler: Apps choose from available platform providers

---

## Detailed Changes

### 1. Database Schema (`packages/db/src/schema.ts`)

**Removed Tables:**
- `oauth_providers` - Multi-level OAuth provider configuration table
- `app_oauth_selections` - App-to-provider selection mapping table

**Modified `projects` Table:**
- ❌ Removed: `google_client_id`
- ❌ Removed: `google_client_secret`
- ❌ Removed: `github_client_id`
- ❌ Removed: `github_client_secret`

**Modified `apps` Table:**
- ❌ Removed: `oauth_inherit_source` (enum: proofa, project, app)
- ❌ Removed: `google_client_id`
- ❌ Removed: `google_client_secret`
- ❌ Removed: `github_client_id`
- ❌ Removed: `github_client_secret`
- ✅ Added: `enabled_providers` (jsonb, default: `["google"]`)

### 2. Database Query Layer (`packages/db/src/providers.ts`)

**Removed:**
- Entire `oauthProviderQueries` object with methods:
  - `findByEntityAndProvider()`
  - `findByEntity()`
  - `findByPublicId()`
  - `create()`
  - `update()`
  - `softDelete()`

**Kept:**
- `paymentProviderQueries` (unchanged)

### 3. Database Exports (`packages/db/src/index.ts`)

**Removed:**
- Export of `oauthProviderQueries`
- Export of `oauth_providers` table reference

### 4. Admin API Routes (`apps/gateway/src/routes/admin.ts`)

**Import Changes:**
- ❌ Removed: `oauthProviderQueries`
- ❌ Removed: `oauth_providers`

**Route: `GET /v1/admin/projects/:projectId`**
- ❌ Removed from response:
  ```typescript
  googleClientId
  googleClientSecret (masked)
  githubClientId
  githubClientSecret (masked)
  ```

**Route: `PATCH /v1/admin/projects/:projectId/oauth`**
- ❌ **Entirely removed** - No longer needed

**Route: `POST /v1/admin/projects/:projectId/apps`**
- ❌ Removed: `oauth_inherit_source: "proofa"` from app creation
- ✅ Updated response to include `enabledProviders` instead of OAuth credentials

**Route: `GET /v1/admin/projects/:projectId/apps/:appId`**
- ❌ Removed from response:
  ```typescript
  oauthInheritSource
  googleClientId
  googleClientSecret (masked)
  githubClientId
  githubClientSecret (masked)
  ```
- ✅ Added to response: `enabledProviders: string[]`

**Route: `PATCH /v1/admin/projects/:projectId/apps/:appId`**
- ❌ Removed: All OAuth inheritance logic (~30 lines)
- ❌ Removed: OAuth credential validation and encryption
- ✅ Added: `enabledProviders` update handling
- ✅ Updated response to include `enabledProviders`

### 5. Type Schemas (`packages/shared/src/types/schemas/admin.ts`)

**`ProjectDTOSchema`:**
- ❌ Removed:
  ```typescript
  googleClientId?: string
  googleClientSecret?: string // Masked
  githubClientId?: string
  githubClientSecret?: string // Masked
  ```

**`CreateAppRequestSchema`:**
- No changes (didn't include OAuth fields)

**`UpdateAppRequestSchema`:**
- ❌ Removed:
  ```typescript
  oauthInheritSource?: "proofa" | "project" | "app"
  googleClientId?: string
  googleClientSecret?: string
  githubClientId?: string
  githubClientSecret?: string
  ```
- ✅ Added:
  ```typescript
  enabledProviders?: ("google" | "github")[]
  ```

**`UpdateProjectOAuthRequestSchema`:**
- ❌ **Entirely removed** - No longer needed

**`AppDTOSchema`:**
- ❌ Removed:
  ```typescript
  oauthInheritSource: "proofa" | "project" | "app"
  googleClientId?: string
  googleClientSecret?: string // Masked
  githubClientId?: string
  githubClientSecret?: string // Masked
  ```
- ✅ Added:
  ```typescript
  enabledProviders: string[]
  ```

**Type Exports:**
- ❌ Removed: `UpdateProjectOAuthRequest`

### 6. Product Specification (`docs/PRODUCT_SPEC.md`)

**Version Updated:**
- From: 1.0.0
- To: 1.1.0
- Last Modified: January 1, 2026

**OAuth Description:**
- ✅ Updated to specify "platform-level credentials only"

**Database Schema Section:**
- ✅ Updated `projects` table: Removed OAuth credential columns
- ✅ Updated `apps` table: Changed `required_providers` to `enabled_providers` with default `["google"]`
- ✅ Added `description` fields to both tables

---

## Migration

### Migration Script Created: `packages/db/drizzle/0001_oauth_simplification.sql`

**What it does:**
1. Drops foreign key constraints for OAuth tables
2. Drops indexes for OAuth tables
3. Drops `app_oauth_selections` table
4. Drops `oauth_providers` table
5. Adds `enabled_providers` column to `apps` table (default: `["google"]`)
6. Removes `oauth_inherit_source` from `apps` table
7. Removes all OAuth credential columns from `apps` table
8. Removes all OAuth credential columns from `projects` table

**To apply:**
```bash
# Navigate to db package
cd packages/db

# Apply migration (method depends on your setup)
# Option 1: Using Drizzle Kit
pnpm drizzle-kit push

# Option 2: Using psql
psql -U your_user -d your_database -f drizzle/0001_oauth_simplification.sql

# Regenerate Drizzle types
pnpm generate
```

### Data Migration Notes

- Existing apps will automatically get `enabled_providers: ["google"]` as the default
- If any apps were using specific OAuth providers, those selections will be lost
- Consider exporting any custom OAuth credentials before applying the migration
- No user data or authentication sessions will be affected

---

## Core Routes (No Changes Needed)

The core authentication routes (`apps/core/src/routes/auth.ts` and `apps/core/src/routes/v1/auth/index.ts`) **already use platform-level credentials** from environment variables:
- `process.env.GOOGLE_CLIENT_ID`
- `process.env.GOOGLE_CLIENT_SECRET`
- `process.env.GITHUB_CLIENT_ID`
- `process.env.GITHUB_CLIENT_SECRET`

This is exactly the desired behavior, so no changes were needed.

---

## Remaining Tasks

### Database
- [ ] Apply migration script to development database
- [ ] Apply migration script to production database
- [ ] Regenerate Drizzle types: `pnpm --filter @proofa/db generate`
- [ ] Verify migration success

### Frontend (Admin Dashboard)
- [ ] Remove project OAuth configuration UI
  - Remove settings page/tab for project OAuth
  - Remove API calls to `PATCH /v1/admin/projects/:projectId/oauth`
- [ ] Update app OAuth configuration UI
  - Remove OAuth credential input fields
  - Remove OAuth inheritance source dropdown
  - Add provider selector (checkboxes for Google, GitHub)
  - Update API calls to use `enabledProviders` field
- [ ] Update TypeScript types to use new schemas

### Testing
- [ ] Test app creation (should default to `enabledProviders: ["google"]`)
- [ ] Test app updates with `enabledProviders` changes
- [ ] Test OAuth authentication flows (should use platform credentials)
- [ ] Verify no OAuth credential fields appear in API responses
- [ ] Test project creation/updates (no OAuth fields)

### Documentation
- [ ] Update README with simplified OAuth setup instructions
- [ ] Update deployment docs to emphasize platform-level env vars
- [ ] Remove any references to project/app OAuth configuration from docs

---

## Environment Variables Required

Ensure these are set in your deployment environment:

```bash
# Required
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional (if GitHub OAuth is enabled)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

---

## Benefits of This Change

1. **Simpler MVP:** Removes unnecessary complexity from initial product
2. **Easier Setup:** One set of OAuth credentials instead of managing per-project/app
3. **Reduced Code:** ~500+ lines of OAuth management code removed
4. **Clearer UX:** Users don't need to understand OAuth inheritance models
5. **Faster Onboarding:** Apps work immediately with platform providers
6. **Maintainability:** Less database tables and columns to maintain

---

## Rollback Plan

If needed, revert by:
1. Restore schema.ts from git: `git checkout HEAD~1 packages/db/src/schema.ts`
2. Restore providers.ts from git
3. Restore admin.ts routes from git
4. Restore schemas from git
5. Recreate `oauth_providers` and `app_oauth_selections` tables
6. Run: `pnpm --filter @proofa/db generate`

---

## Files Changed

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| `/docs/PRODUCT_SPEC.md` | Modified | ~30 |
| `/packages/db/src/schema.ts` | Modified | ~80 (removed tables & columns) |
| `/packages/db/src/providers.ts` | Modified | ~300 (removed queries) |
| `/packages/db/src/index.ts` | Modified | ~2 (removed exports) |
| `/apps/gateway/src/routes/admin.ts` | Modified | ~120 (removed route & OAuth logic) |
| `/packages/shared/src/types/schemas/admin.ts` | Modified | ~40 |
| `/packages/db/drizzle/0001_oauth_simplification.sql` | Created | New migration file |
| `/OAUTH_SIMPLIFICATION_CHANGES.md` | Created | Documentation |
| `/OAUTH_SIMPLIFICATION_SUMMARY.md` | Created | This file |

**Total:** 8 files changed, ~570 lines of code removed, ~30 lines added

---

## Success Criteria

✅ All backend changes complete  
✅ No TypeScript compilation errors  
✅ Migration script created  
✅ Specification updated  
⚠️ Migration not yet applied  
⚠️ Frontend not yet updated  
⚠️ End-to-end testing not yet done

---

**Next Steps:**
1. Apply the migration to your development database
2. Test the API changes with Postman/curl
3. Update the admin dashboard frontend
4. Perform end-to-end testing
5. Deploy to production

---

**Questions or Issues?**  
Refer to the detailed change log in `OAUTH_SIMPLIFICATION_CHANGES.md`
