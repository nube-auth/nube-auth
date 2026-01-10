# Implementation TODO - Admin Dashboard API

**Created:** January 10, 2026  
**Status:** Ready to implement  
**Goal:** Make admin dashboard fully functional

---

## Overview

This TODO tracks implementation of 44 missing admin API endpoints needed for the admin dashboard to function. We're implementing a two-tier architecture where Gateway proxies authenticated requests to Core service which handles business logic and database operations.

**Excluded from scope:** Billing routes (deferred - not needed until payment integration)

---

## Phase 1: Critical Foundation (Days 1-2)

### Priority: 🔴 CRITICAL
**Without these, admin dashboard is completely broken**

---

### Task 1.1: Admin Profile & Authentication

**Objective:** Enable admin login and profile display

#### Subtasks:
- [ ] **1.1.1** Implement `GET /v1/admin/me` in Gateway
  - **File:** `apps/services/gateway/src/routes/admin.ts`
  - **Action:** Add route that returns auth context user info
  - **Dependencies:** None (auth middleware already works)
  - **Acceptance:** Admin dashboard shows user profile on load

#### Files to Modify:
```
apps/services/gateway/src/routes/admin.ts
```

#### Code Pattern:
```typescript
// Gateway route - return auth context
adminRoutes.get("/me", async (c: Context) => {
  const auth = getAuth(c);
  const db = getDb();
  const user = await userQueries.findByPublicId(db, auth.userId);
  
  return c.json({
    id: auth.userId,
    email: auth.email,
    name: auth.name,
    primary_email: user?.primary_email,
  });
});
```

#### Test:
```bash
# Login to admin dashboard at localhost:5174
# Should see profile in top right corner
curl -b cookies.txt http://localhost:3004/v1/admin/me
```

---

### Task 1.2: Project Management (CRUD)

**Objective:** Create, read, update projects

#### Subtasks:
- [ ] **1.2.1** Create Core projects routes file
  - **File:** `apps/services/core/src/routes/v1/admin/projects.ts` (NEW)
  - **Routes:** 
    - `GET /v1/admin/users/:userId/projects` - List user's projects
    - `POST /v1/admin/projects` - Create project
    - `GET /v1/admin/projects/:projectId` - Get project details
    - `PATCH /v1/admin/projects/:projectId` - Update project
    - `DELETE /v1/admin/projects/:projectId` - Soft delete project

- [ ] **1.2.2** Implement list projects
  - **Query:** `projectQueries.findByOwnerId()` + `projectQueries.findByUserId()`
  - **Logic:** Return projects where user is owner OR member
  - **Format:** Return public_id as `id` field

- [ ] **1.2.3** Implement create project
  - **Query:** `projectQueries.create()`
  - **Logic:** 
    - Generate public_id with `createId("project")`
    - Set owner_user_id from userId
    - Create project_member entry for owner
  - **Transaction:** Wrap in db transaction

- [ ] **1.2.4** Implement update project
  - **Query:** `projectQueries.update()`
  - **Validation:** Check user is owner or admin member
  - **Fields:** name, slug, description

- [ ] **1.2.5** Implement soft delete
  - **Query:** `projectQueries.delete()` (already appends timestamp to slug)
  - **Validation:** Check user is owner

- [ ] **1.2.6** Mount projects routes in Core admin index
  - **File:** `apps/services/core/src/routes/v1/admin/index.ts`
  - **Action:** `router.route("/", projectRoutes)`

- [ ] **1.2.7** Add Gateway proxy routes
  - **File:** `apps/services/gateway/src/routes/admin.ts`
  - **Action:** Proxy all project routes to Core with S2S token

#### Files to Create:
```
apps/services/core/src/routes/v1/admin/projects.ts (NEW)
```

#### Files to Modify:
```
apps/services/core/src/routes/v1/admin/index.ts
apps/services/gateway/src/routes/admin.ts
```

#### Database Tables Used:
- `projects` (via projectQueries)
- `project_members` (via projectMemberQueries)
- `users` (via userQueries)

#### Test:
```bash
# Should see projects list in admin dashboard
# Should be able to create new project
# Should be able to edit project settings
```

---

### Task 1.3: App Management (CRUD)

**Objective:** Manage apps within projects

#### Subtasks:
- [ ] **1.3.1** Create Core apps routes file
  - **File:** `apps/services/core/src/routes/v1/admin/apps.ts` (NEW)
  - **Routes:**
    - `GET /v1/admin/projects/:projectId/apps` - List apps in project
    - `POST /v1/admin/projects/:projectId/apps` - Create app
    - `GET /v1/admin/projects/:projectId/apps/:appId` - Get app details
    - `PATCH /v1/admin/projects/:projectId/apps/:appId` - Update app
    - `DELETE /v1/admin/projects/:projectId/apps/:appId` - Soft delete app

- [ ] **1.3.2** Implement list apps
  - **Query:** `appQueries.findByProjectId()`
  - **Format:** Transform JSONB fields to flat structure for dashboard

- [ ] **1.3.3** Implement create app
  - **Query:** `appQueries.create()`
  - **Logic:**
    - Generate public_id with `createId("app")`
    - Initialize JSONB fields with defaults:
      ```typescript
      app_tokens: { clientSecret: crypto.randomBytes(32).toString('hex') },
      security_settings: { 
        redirectUris: [],
        allowedHosts: [],
        sessionTtlDays: 28 
      },
      plan_settings: {
        licensingRequired: false,
        defaultPlan: "free"
      },
      enabled_providers: ["google"]
      ```

- [ ] **1.3.4** Implement update app
  - **Query:** `appQueries.update()` for basic fields
  - **Query:** `appQueries.updateSecuritySettings()` for nested updates (ATOMIC)
  - **Fields:** name, slug, description, enabled_providers
  - **Validation:** Check user has access to parent project

- [ ] **1.3.5** Implement soft delete
  - **Query:** `appQueries.delete()`
  - **Validation:** Check project access

- [ ] **1.3.6** Mount apps routes in Core admin index
  - **File:** `apps/services/core/src/routes/v1/admin/index.ts`
  - **Action:** `router.route("/", appRoutes)`

- [ ] **1.3.7** Add Gateway proxy routes
  - **File:** `apps/services/gateway/src/routes/admin.ts`

#### Files to Create:
```
apps/services/core/src/routes/v1/admin/apps.ts (NEW)
```

#### Files to Modify:
```
apps/services/core/src/routes/v1/admin/index.ts
apps/services/gateway/src/routes/admin.ts
```

#### Database Tables Used:
- `apps` (via appQueries)
- `projects` (validation)

#### Important Note:
⚠️ **Use atomic JSONB updates** for apps table:
```typescript
// CORRECT - Atomic update
await appQueries.updateSecuritySettings(db, appId, {
  sessionTtlDays: 30
});

// WRONG - Race condition
const app = await appQueries.findById(db, appId);
app.security_settings.sessionTtlDays = 30;
await appQueries.update(db, appId, { security_settings: app.security_settings });
```

#### Test:
```bash
# Navigate to project in admin dashboard
# Should see apps list
# Should create new app
# Should edit app settings
```

---

### Task 1.4: Basic Statistics

**Objective:** Show dashboard overview cards

#### Subtasks:
- [ ] **1.4.1** Create Core stats routes file
  - **File:** `apps/services/core/src/routes/v1/admin/stats.ts` (NEW)
  - **Routes:**
    - `GET /v1/admin/projects/:projectId/stats` - Project statistics
    - `GET /v1/admin/projects/:projectId/apps/:appId/stats` - App statistics

- [ ] **1.4.2** Implement project stats
  - **Queries:**
    - Count apps: `appQueries.findByProjectId()` length
    - Count licenses: Join licenses ← apps ← project
    - Count users: Distinct users from licenses
    - Sum revenue: (stub with 0 for now)
  - **Return:**
    ```typescript
    {
      totalApps: number,
      totalUsers: number,
      totalLicenses: number,
      activeLicenses: number,
      licenseCounts: { plan_slug: count },
      totalRevenue: 0 // stub
    }
    ```

- [ ] **1.4.3** Implement app stats
  - **Queries:**
    - Count licenses for app
    - Count active licenses (status='active')
    - Count users with licenses
    - Count sessions for app
  - **Return:** Similar structure to project stats

- [ ] **1.4.4** Mount stats routes
  - **File:** `apps/services/core/src/routes/v1/admin/index.ts`

- [ ] **1.4.5** Add Gateway proxies

#### Files to Create:
```
apps/services/core/src/routes/v1/admin/stats.ts (NEW)
```

#### Files to Modify:
```
apps/services/core/src/routes/v1/admin/index.ts
apps/services/gateway/src/routes/admin.ts
```

#### Test:
```bash
# Project detail page should show stats cards
# App detail page should show stats cards
```

---

## Phase 2: Team & License Management (Day 3)

### Priority: 🟡 HIGH
**Essential for multi-user projects and app access control**

---

### Task 2.1: Team Member Management

**Objective:** Invite, manage, remove team members

#### Subtasks:
- [ ] **2.1.1** Create Core members routes file
  - **File:** `apps/services/core/src/routes/v1/admin/members.ts` (NEW)
  - **Routes:**
    - `GET /v1/admin/projects/:projectId/members` - List team members
    - `POST /v1/admin/projects/:projectId/members` - Invite member (or add existing user)
    - `PATCH /v1/admin/projects/:projectId/members/:memberId` - Update role
    - `DELETE /v1/admin/projects/:projectId/members/:memberId` - Remove member
    - `GET /v1/admin/projects/:projectId/invitations` - List pending invitations
    - `DELETE /v1/admin/projects/:projectId/invitations/:invitationId` - Cancel invitation

- [ ] **2.1.2** Implement list members
  - **Query:** `projectMemberQueries.findByProjectId()`
  - **Join:** with users table to get email, name
  - **Format:** Include role, created_at, user info

- [ ] **2.1.3** Implement invite/add member
  - **Logic:**
    - Check if email already exists as user
    - If user exists: Create project_member directly
    - If not: Create project_invitation with expiry
    - Send invitation email (optional for MVP)
  - **Queries:** 
    - `userQueries.findByEmail()`
    - `projectMemberQueries.create()` OR
    - `projectInvitationQueries.create()`

- [ ] **2.1.4** Implement update member role
  - **Query:** `projectMemberQueries.updateByPublicId()`
  - **Validation:** Can't change owner role, can't demote yourself if you're last admin
  - **Roles:** owner, admin, member

- [ ] **2.1.5** Implement remove member
  - **Query:** `projectMemberQueries.deleteByPublicId()`
  - **Validation:** Can't remove owner, can't remove yourself if last admin

- [ ] **2.1.6** Implement list invitations
  - **Query:** `projectInvitationQueries.findByProjectId()`
  - **Filter:** Only pending/active invitations

- [ ] **2.1.7** Implement cancel invitation
  - **Query:** `projectInvitationQueries.delete()`

- [ ] **2.1.8** Mount members routes

- [ ] **2.1.9** Add Gateway proxies

#### Files to Create:
```
apps/services/core/src/routes/v1/admin/members.ts (NEW)
```

#### Files to Modify:
```
apps/services/core/src/routes/v1/admin/index.ts
apps/services/gateway/src/routes/admin.ts
```

#### Database Tables Used:
- `project_members`
- `project_invitations`
- `users`

#### Test:
```bash
# Project team page should show members
# Should invite new member by email
# Should change member role
# Should remove member
```

---

### Task 2.2: License Management

**Objective:** Grant, renew, revoke licenses

#### Subtasks:
- [ ] **2.2.1** Enhance Core licenses routes
  - **File:** `apps/services/core/src/routes/v1/admin/licenses.ts` (NEW)
  - **Existing routes to keep:**
    - `POST /v1/admin/license/grant` (already exists)
    - `GET /v1/admin/licenses/:userId` (already exists)
    - `DELETE /v1/admin/licenses/:licenseId` (exists but stub)
  - **New routes:**
    - `GET /v1/admin/licenses` - List all licenses (with filters)
    - `POST /v1/admin/projects/:projectId/apps/:appId/users/:userId/renew` - Renew license

- [ ] **2.2.2** Implement list all licenses
  - **Query:** 
    - Join licenses ← apps ← projects
    - Filter by project access
  - **Filters:** app_id, status, user_id
  - **Format:** Include app name, user email, plan details

- [ ] **2.2.3** Implement renew license
  - **Query:** `licenseQueries.update()`
  - **Logic:** Extend valid_until date based on plan duration
  - **Validation:** Check project access

- [ ] **2.2.4** Fix revoke license (currently stub)
  - **Query:** `licenseQueries.revoke()` or `licenseQueries.update()` with status='canceled'

- [ ] **2.2.5** Move routes to proper file structure
  - **File:** `apps/services/core/src/routes/v1/admin/licenses.ts`
  - **Keep:** in index.ts for backward compatibility

- [ ] **2.2.6** Add Gateway proxies

#### Files to Create/Modify:
```
apps/services/core/src/routes/v1/admin/licenses.ts (NEW/ENHANCE)
apps/services/core/src/routes/v1/admin/index.ts (update imports)
apps/services/gateway/src/routes/admin.ts
```

#### Database Tables Used:
- `licenses`
- `plans`
- `apps`
- `users`

#### Test:
```bash
# Licenses page should show all licenses
# App users page should show user licenses
# Should be able to renew license
# Should be able to revoke license
```

---

### Task 2.3: App Users

**Objective:** View users who have access to an app

#### Subtasks:
- [ ] **2.3.1** Implement get app users
  - **File:** Add to `apps/services/core/src/routes/v1/admin/apps.ts`
  - **Route:** `GET /v1/admin/projects/:projectId/apps/:appId/users`
  - **Query:**
    - Join licenses ← users for this app
    - Include license details (plan, status, valid_until)
  - **Return:**
    ```typescript
    {
      users: [{
        id: user.public_id,
        name: user.name,
        email: user.primary_email,
        avatarUrl: user.avatar_url,
        primaryEmailVerified: user.primary_email_verified,
        plan: plan.slug,
        status: license.status,
        createdAt: user.created_at,
        licenseValidUntil: license.valid_until
      }],
      total: count
    }
    ```

- [ ] **2.3.2** Add Gateway proxy

#### Files to Modify:
```
apps/services/core/src/routes/v1/admin/apps.ts
apps/services/gateway/src/routes/admin.ts
```

#### Test:
```bash
# App users page should show list of users
# Should show license status for each user
```

---

## Phase 3: OAuth & Payment Providers (Day 4)

### Priority: 🟢 MEDIUM
**For authentication and monetization features**

---

### Task 3.1: OAuth Provider Configuration

**Objective:** Select which OAuth providers (Google, GitHub, etc.) are enabled for an app

#### Subtasks:
- [ ] **3.1.1** Create OAuth provider routes file
  - **File:** `apps/services/core/src/routes/v1/admin/oauth.ts` (NEW)
  - **Routes:**
    - `GET /v1/admin/apps/:appId/oauth/available` - List platform OAuth providers
    - `GET /v1/admin/apps/:appId/oauth/selected` - List selected providers for app
    - `POST /v1/admin/apps/:appId/oauth/select` - Add provider to app
    - `DELETE /v1/admin/apps/:appId/oauth/:providerId/deselect` - Remove provider

- [ ] **3.1.2** Define available OAuth providers
  - **Logic:** Return static list of supported providers
    ```typescript
    [
      { id: 1, name: "Google", provider: "google", icon: "..." },
      { id: 2, name: "GitHub", provider: "github", icon: "..." },
      { id: 3, name: "Microsoft", provider: "microsoft", icon: "..." }
    ]
    ```

- [ ] **3.1.3** Implement get selected providers
  - **Query:** Read `apps.enabled_providers` JSONB field
  - **Format:** Return provider details from static list

- [ ] **3.1.4** Implement select provider
  - **Query:** `appQueries.update()` to add to `enabled_providers` array
  - **Use atomic update** if possible

- [ ] **3.1.5** Implement deselect provider
  - **Query:** `appQueries.update()` to remove from array

- [ ] **3.1.6** Replace stub in providers.ts
  - **File:** `apps/services/core/src/routes/v1/admin/providers.ts`
  - **Action:** Move OAuth logic here OR delete this file

- [ ] **3.1.7** Mount OAuth routes

- [ ] **3.1.8** Add Gateway proxies

#### Files to Create:
```
apps/services/core/src/routes/v1/admin/oauth.ts (NEW)
```

#### Files to Modify:
```
apps/services/core/src/routes/v1/admin/providers.ts (delete or repurpose)
apps/services/core/src/routes/v1/admin/index.ts
apps/services/gateway/src/routes/admin.ts
```

#### Database Tables Used:
- `apps` (enabled_providers JSONB field)

#### Test:
```bash
# App OAuth page should show available providers
# Should be able to toggle providers on/off
```

---

### Task 3.2: Payment Provider Configuration

**Objective:** Configure payment provider credentials per project

#### Subtasks:
- [ ] **3.2.1** Create payment provider routes file
  - **File:** `apps/services/core/src/routes/v1/admin/payment-providers.ts` (NEW)
  - **Routes:**
    - `GET /v1/admin/projects/:projectId/payment-providers` - List providers
    - `POST /v1/admin/payment-providers` - Create provider config
    - `PATCH /v1/admin/payment-providers/:providerId` - Update provider
    - `DELETE /v1/admin/payment-providers/:providerId` - Delete provider
    - `GET /v1/admin/apps/:appId/payment/available` - Providers available to app
    - `GET /v1/admin/apps/:appId/payment/selected` - Selected provider for app
    - `POST /v1/admin/apps/:appId/payment/select` - Select provider

- [ ] **3.2.2** Check if payment_provider_configs table exists
  - **Schema:** Already defined in schema.ts?
  - **If missing:** May need migration

- [ ] **3.2.3** Implement list providers
  - **Query:** Select from payment_provider_configs WHERE project
  - **Encryption:** Mask credentials in response

- [ ] **3.2.4** Implement create provider
  - **Query:** Insert into payment_provider_configs
  - **Encryption:** Encrypt credentials before storing
  - **Fields:** name, provider (lemon_squeezy/paddle/stripe), environment (test/prod), credentials

- [ ] **3.2.5** Implement update provider
  - **Query:** Update payment_provider_configs
  - **Encryption:** Re-encrypt if credentials changed

- [ ] **3.2.6** Implement delete provider
  - **Query:** Delete from payment_provider_configs
  - **Validation:** Can't delete if app is using it

- [ ] **3.2.7** Implement available providers for app
  - **Logic:** Return all providers for parent project

- [ ] **3.2.8** Implement selected provider
  - **Query:** Read apps.selected_payment_provider_id

- [ ] **3.2.9** Implement select provider
  - **Query:** Update apps.selected_payment_provider_id

- [ ] **3.2.10** Replace stubs in existing providers.ts
  - **File:** `apps/services/core/src/routes/v1/admin/providers.ts`

- [ ] **3.2.11** Add Gateway proxies

#### Files to Create:
```
apps/services/core/src/routes/v1/admin/payment-providers.ts (NEW or enhance existing)
```

#### Files to Modify:
```
apps/services/core/src/routes/v1/admin/providers.ts (replace stubs)
apps/services/core/src/routes/v1/admin/index.ts
apps/services/gateway/src/routes/admin.ts
```

#### Database Tables Used:
- `payment_provider_configs`
- `apps` (selected_payment_provider_id)

#### Encryption:
⚠️ **Must encrypt credentials** before storing in DB
```typescript
import { encrypt, decrypt } from "@proofa/shared";
const encrypted = encrypt(JSON.stringify(credentials));
```

#### Test:
```bash
# Payment providers page should list providers
# Should create Lemon Squeezy provider
# Should select provider for app
```

---

### Task 3.3: Plans Management

**Objective:** Create and manage subscription/license plans

#### Subtasks:
- [ ] **3.3.1** Create plans routes file
  - **File:** `apps/services/core/src/routes/v1/admin/plans.ts` (NEW)
  - **Routes:**
    - `GET /v1/admin/projects/:projectId/apps/:appId/plans` - List plans
    - `POST /v1/admin/projects/:projectId/apps/:appId/plans` - Create plan
    - `PATCH /v1/admin/projects/:projectId/apps/:appId/plans/:planId` - Update plan
    - `DELETE /v1/admin/projects/:projectId/apps/:appId/plans/:planId` - Soft delete

- [ ] **3.3.2** Implement list plans
  - **Query:** `planQueries.findByAppId()`

- [ ] **3.3.3** Implement create plan
  - **Query:** `planQueries.create()`
  - **Fields:** name, slug, monthly_price, yearly_price, one_time_price, trial_days, features

- [ ] **3.3.4** Implement update plan
  - **Query:** `planQueries.update()`

- [ ] **3.3.5** Implement delete plan
  - **Query:** `planQueries.delete()`
  - **Validation:** Can't delete if users have licenses on this plan

- [ ] **3.3.6** Mount plans routes

- [ ] **3.3.7** Add Gateway proxies

#### Files to Create:
```
apps/services/core/src/routes/v1/admin/plans.ts (NEW)
```

#### Files to Modify:
```
apps/services/core/src/routes/v1/admin/index.ts
apps/services/gateway/src/routes/admin.ts
```

#### Database Tables Used:
- `plans`
- `licenses` (validation)

#### Test:
```bash
# App plans page should list plans
# Should create new plan
# Should edit plan pricing
```

---

## Phase 4: Additional Features (Optional/Future)

### Priority: 🔵 LOW
**Nice to have, not critical for MVP**

---

### Task 4.1: Audit Logging

**Objective:** Track admin actions for security/compliance

#### Subtasks:
- [ ] Add audit log entries for all admin actions
- [ ] Create endpoint to view audit logs
- [ ] Filter by user, action, date range

#### Files:
```
apps/services/core/src/routes/v1/admin/audit.ts (NEW)
```

---

### Task 4.2: Permission Checks

**Objective:** Fine-grained role-based access control

#### Subtasks:
- [ ] Create authorization middleware
- [ ] Check project member role before allowing actions
- [ ] Implement permission rules:
  - Owner: all actions
  - Admin: all except delete project
  - Member: read-only

#### Files:
```
apps/services/core/src/middleware/authorization.ts (NEW)
```

---

### Task 4.3: Advanced Statistics

**Objective:** More detailed analytics

#### Subtasks:
- [ ] Time-series data (daily/weekly/monthly)
- [ ] Growth metrics
- [ ] Cohort analysis
- [ ] Export to CSV

---

## Testing Checklist

### Manual Testing Flow

#### Phase 1 Tests:
- [ ] **Admin Login**
  - Navigate to http://localhost:5174/login
  - Login with OAuth (Google)
  - Should see dashboard with projects

- [ ] **Projects**
  - Create new project
  - View project details
  - Edit project name/slug
  - See project stats cards
  - Delete project

- [ ] **Apps**
  - Create new app in project
  - View app details
  - Edit app settings
  - See app stats cards
  - Delete app

#### Phase 2 Tests:
- [ ] **Team Members**
  - Invite team member by email
  - View pending invitations
  - Accept invitation (if user exists)
  - Change member role
  - Remove member
  - Cancel pending invitation

- [ ] **Licenses**
  - View all licenses page
  - Grant license to user
  - View app users with licenses
  - Renew license
  - Revoke license

#### Phase 3 Tests:
- [ ] **OAuth**
  - View available OAuth providers
  - Enable/disable providers for app
  - Test login with enabled providers

- [ ] **Payment Providers**
  - Create Lemon Squeezy provider config
  - Enter credentials (test mode)
  - Select provider for app
  - Verify credentials are encrypted in DB

- [ ] **Plans**
  - Create free plan
  - Create paid plan (monthly/yearly)
  - Edit plan pricing
  - Delete unused plan

---

## Database Migrations Needed

Check if these tables exist and have correct schema:

- [ ] `projects` - ✅ Exists
- [ ] `project_members` - ✅ Exists
- [ ] `project_invitations` - ✅ Exists
- [ ] `apps` - ✅ Exists (check JSONB fields)
- [ ] `plans` - ✅ Exists
- [ ] `licenses` - ✅ Exists
- [ ] `payment_provider_configs` - ⚠️ Check if exists
- [ ] `users` - ✅ Exists
- [ ] `sessions` - ✅ Exists

---

## Architecture Decisions

### 1. Gateway Proxy Pattern
**Decision:** Gateway only validates auth and proxies to Core

**Rationale:**
- Core has direct DB access
- Core contains business logic
- Gateway handles session/auth only
- Separation of concerns

### 2. Use Existing Queries
**Decision:** Use query functions from `@proofa/db`

**Rationale:**
- Already implemented and tested
- Handles soft deletes
- Atomic JSONB updates
- Consistent patterns

### 3. Public IDs vs Internal IDs
**Decision:** Always use public_id in API responses, internal id for DB joins

**Pattern:**
```typescript
// Query by public_id from API
const project = await projectQueries.findByPublicId(db, projectId);

// Use internal id for joins
const apps = await appQueries.findByProjectId(db, project.id);

// Return public_id in response
return { id: project.public_id, name: project.name };
```

### 4. Error Handling
**Pattern:**
```typescript
try {
  const result = await someQuery();
  if (!result) return c.json({ error: "Not found" }, 404);
  return c.json(result);
} catch (error) {
  log.error({ err: serializeError(error) }, "Operation failed");
  return c.json({ error: "Internal server error" }, 500);
}
```

### 5. Transaction Usage
**When to use:**
- Creating project + first member
- Creating invitation + sending email
- Complex multi-table operations

**Pattern:**
```typescript
const result = await db.transaction(async (tx) => {
  const project = await projectQueries.create(tx, projectData);
  const member = await projectMemberQueries.create(tx, memberData);
  return { project, member };
});
```

---

## Code Patterns & Standards

### Import Order:
```typescript
// 1. External deps
import { Hono } from "hono";
import type { Context } from "hono";

// 2. Internal packages
import { getDb, projectQueries, userQueries } from "@proofa/db";
import { createLogger, createId, serializeError } from "@proofa/shared";

// 3. Relative imports
import { getAuth } from "../middleware/auth";
```

### Route Handler Pattern:
```typescript
router.get("/path", async (c: Context) => {
  const param = c.req.param("param");
  const db = getDb();
  
  try {
    // 1. Validate params
    if (!param) return c.json({ error: "Missing param" }, 400);
    
    // 2. Get user from auth (if needed)
    const auth = getAuth(c);
    
    // 3. Fetch data
    const data = await someQueries.find(db, param);
    
    // 4. Check authorization (if needed)
    if (data.owner_id !== auth.userId) {
      return c.json({ error: "Forbidden" }, 403);
    }
    
    // 5. Return response
    return c.json(data);
  } catch (error) {
    log.error({ err: serializeError(error) }, "Handler error");
    return c.json({ error: "Internal error" }, 500);
  }
});
```

### Naming Conventions:
- Routes: `projectRoutes`, `appRoutes`, `memberRoutes`
- Queries: `projectQueries`, `appQueries`
- DTOs: Use schemas from `@proofa/shared`
- Public IDs: Always use `public_id` from DB
- File names: kebab-case (`project-routes.ts`)

---

## Implementation Order Summary

1. ✅ **Day 1 AM:** Admin profile + Gateway setup
2. ✅ **Day 1 PM:** Projects CRUD
3. ✅ **Day 2 AM:** Apps CRUD + Stats
4. ✅ **Day 2 PM:** Testing Phase 1
5. ✅ **Day 3 AM:** Team management
6. ✅ **Day 3 PM:** License management + App users
7. ✅ **Day 4 AM:** OAuth providers
8. ✅ **Day 4 PM:** Payment providers + Plans

**Estimated Total:** 4 days for full implementation

---

## Success Criteria

### Phase 1 Complete When:
- [x] Admin can login to dashboard
- [ ] Admin can create/view/edit projects
- [ ] Admin can create/view/edit apps
- [ ] Stats cards show data

### Phase 2 Complete When:
- [ ] Admin can invite team members
- [ ] Admin can manage member roles
- [ ] Admin can grant/revoke licenses
- [ ] Admin can view app users

### Phase 3 Complete When:
- [ ] Admin can configure OAuth providers
- [ ] Admin can configure payment providers
- [ ] Admin can create/edit pricing plans

### All Complete When:
- [ ] All 44 endpoints working
- [ ] All admin dashboard pages functional
- [ ] No 501 errors
- [ ] Manual testing passed

---

## Notes & Gotchas

### 1. JSONB Fields
Apps table uses JSONB - must use atomic updates:
```typescript
// Use these methods from appQueries:
updateSecuritySettings()
updateAppTokens()
updatePlanSettings()
```

### 2. Soft Deletes
Most tables have `deleted_at` - queries automatically filter:
```typescript
where(and(
  eq(table.id, id),
  isNull(table.deleted_at)
))
```

### 3. Session Cookies
Different cookies for user vs admin:
- `proofa_user_session` - User dashboard
- `proofa_admin_session` - Admin dashboard

### 4. S2S Authentication
Core expects this header from Gateway:
```typescript
"X-Proofa-Service-Token": env.CORE_S2S_TOKEN
```

### 5. Public IDs
Always have format: `PRJ0xxx`, `APP0xxx`, `USR0xxx`, etc.

---

## Questions to Resolve During Implementation

- [ ] Should we check `users.is_admin` flag for admin access?
- [ ] Do we need pagination immediately or add later?
- [ ] Should invitations send actual emails or just create DB records?
- [ ] How to handle timezone for statistics?
- [ ] Should we cache statistics or query real-time?

---

**Ready to implement?** Start with Task 1.1! 🚀
