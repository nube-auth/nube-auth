# Project Members Public ID Migration

This document summarizes the changes made to add `public_id` column to the `project_members` table and update all related APIs and UI components.

## Changes Made

### 1. Database Schema Updates

**File**: [packages/db/src/schema.ts](packages/db/src/schema.ts)
- ✅ Added `public_id: text("public_id").notNull().unique()` column to `project_members` table
- ✅ Added index `publicIdIdx: index("project_members_public_id_idx").on(table.public_id)`

### 2. Type Definitions

**File**: [packages/shared/src/types/index.ts](packages/shared/src/types/index.ts)
- ✅ Added `public_id: string; // PM0xxx` to `ProjectMember` interface

**File**: [packages/shared/src/types/schemas/admin.ts](packages/shared/src/types/schemas/admin.ts)  
- ✅ Updated `ProjectMemberDTOSchema.id` from `z.union([z.string(), z.number()])` to `PublicIdSchema`

### 3. Database Queries

**File**: [packages/db/src/queries.ts](packages/db/src/queries.ts)
- ✅ Added `findByPublicId(db, publicId)` method
- ✅ Added `updateByPublicId(db, publicId, data)` method  
- ✅ Added `deleteByPublicId(db, publicId)` method

### 4. API Endpoints (Gateway)

**File**: [apps/gateway/src/routes/admin.ts](apps/gateway/src/routes/admin.ts)
- ✅ Updated project member creation to include `public_id: createId("projectMember")`
- ✅ Updated `GET /v1/admin/projects/:projectId/members` response to use `id: m.public_id`
- ✅ Updated `POST /v1/admin/projects/:projectId/members` response to use `id: newMember.public_id`
- ✅ Updated `PATCH /v1/admin/projects/:projectId/members/:memberId` to:
  - Accept string `memberId` parameter (public_id) instead of integer
  - Use `findByPublicId()` and `updateByPublicId()` methods
  - Return `id: updatedMember.public_id` in response
- ✅ Updated `DELETE /v1/admin/projects/:projectId/members/:memberId` to:
  - Accept string `memberId` parameter (public_id) instead of integer  
  - Use `findByPublicId()` and `deleteByPublicId()` methods

### 5. Frontend UI Components

**File**: [apps/dashboard/admin/src/hooks/api.ts](apps/dashboard/admin/src/hooks/api.ts)
- ✅ Updated `useUpdateTeamMember` hook:
  - Changed `memberId` type from `number` to `string`
  - Updated response type `id` field from `number` to `string`
- ✅ Updated `useRemoveTeamMember` hook:
  - Changed `memberId` parameter type from `number` to `string`

**File**: [apps/dashboard/admin/src/pages/ProjectTeam.tsx](apps/dashboard/admin/src/pages/ProjectTeam.tsx)
- ✅ Updated `editingMember` state type from `{ id: number; ... }` to `{ id: string; ... }`
- ✅ All UI interactions now use public_id strings instead of internal integer IDs

### 6. Database Migration

**Files**:
- [packages/db/drizzle/0001_add_project_members_public_id.sql](packages/db/drizzle/0001_add_project_members_public_id.sql)
- [packages/db/scripts/migrate-project-members.ts](packages/db/scripts/migrate-project-members.ts)

**Migration Process**:
1. ✅ SQL migration adds the `public_id` column (nullable initially)
2. ✅ TypeScript script populates public_id values for existing records using `createId("projectMember")`
3. ✅ Verification ensures all records have public_ids

## ID Format

Project member public IDs follow the format: `MEM0{9-char-nanoid}`

Examples: `MEM0abc123xyz`, `MEM0xyz987def`

## Migration Steps

To apply these changes to an existing database:

1. **Run Schema Migration**:
   ```bash
   cd packages/db
   npx drizzle-kit push:sqlite
   ```

2. **Populate Public IDs**:
   ```bash
   cd packages/db  
   pnpm tsx scripts/migrate-project-members.ts
   ```

3. **Verify Migration**:
   - Check that all `project_members` records have `public_id` values
   - Test API endpoints to ensure they work with the new public IDs
   - Test UI functionality (member management, role updates, removal)

## Breaking Changes

⚠️ **API Breaking Changes**:
- Project member IDs in API responses are now strings (e.g., `"MEM0abc123xyz"`) instead of numbers
- API endpoints accepting member IDs now expect public ID strings instead of integer IDs

⚠️ **Frontend Breaking Changes**:
- Member ID types changed from `number` to `string` in TypeScript interfaces
- All member operations now use public ID strings

## Backward Compatibility

❌ **No backward compatibility** - this is a breaking change. All clients must be updated to handle string member IDs.

## Testing Recommendations

1. **API Testing**:
   - Test member listing, creation, update, and deletion 
   - Verify all responses use public IDs
   - Test error handling with invalid public IDs

2. **UI Testing**:
   - Test member management flows in admin dashboard
   - Verify member role updates work correctly
   - Test member removal functionality

3. **Migration Testing**:
   - Test migration script on sample data
   - Verify no data loss occurs during migration
   - Ensure all existing members get proper public IDs