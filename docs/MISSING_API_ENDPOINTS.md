# Missing API Endpoints - Comprehensive Analysis

**Generated:** January 10, 2026  
**Status:** All admin dashboard routes are returning 501 (Not Implemented)

## Critical Issue

The gateway service has ALL admin routes stubbed out, returning 501 errors:

```typescript
// apps/services/gateway/src/routes/admin.ts
adminRoutes.all("/*", (c) => {
	return c.json({
		error: "Admin functionality pending Phase 2 implementation",
	}, 501);
});
```

This means **ALL admin dashboard functionality is broken**.

---

## Section 1: Admin Dashboard API Endpoints (CRITICAL - All Missing)

### ❌ Admin Profile & Authentication
**Priority: CRITICAL**

| Endpoint | Status | Used By | Notes |
|----------|--------|---------|-------|
| `GET /v1/admin/me` | ❌ 501 | `App.tsx` (useMe hook) | Required for admin login/auth check |

**Implementation:**
- Gateway service needs to implement `/v1/admin/me` endpoint
- Should return admin user profile (id, email, name, primary_email)
- Already works for core service, just needs gateway proxy

---

### ❌ Project Management
**Priority: CRITICAL**

| Endpoint | Status | Used By | Notes |
|----------|--------|---------|-------|
| `GET /v1/admin/projects` | ❌ 501 | `useProjects()` | List all projects |
| `POST /v1/admin/projects` | ❌ 501 | `useCreateProject()` | Create new project |
| `GET /v1/admin/projects/:projectId` | ❌ 501 | `useProject()` | Get project details |
| `PATCH /v1/admin/projects/:projectId` | ❌ 501 | `useUpdateProject()` | Update project |
| `GET /v1/admin/projects/:projectId/stats` | ❌ 501 | `useProjectStats()` | Project statistics |

**Implementation:**
- All project CRUD operations need gateway implementation
- Core service likely has partial implementation
- Need to add database queries for projects table

---

### ❌ App Management
**Priority: CRITICAL**

| Endpoint | Status | Used By | Notes |
|----------|--------|---------|-------|
| `GET /v1/admin/projects/:projectId/apps` | ❌ 501 | `useProjectApps()` | List apps in project |
| `POST /v1/admin/projects/:projectId/apps` | ❌ 501 | `useCreateApp()` | Create new app |
| `GET /v1/admin/projects/:projectId/apps/:appId` | ❌ 501 | `useApp()` | Get app details |
| `PATCH /v1/admin/projects/:projectId/apps/:appId` | ❌ 501 | `useUpdateApp()` | Update app |
| `GET /v1/admin/projects/:projectId/apps/:appId/stats` | ❌ 501 | `useAppStats()` | App statistics |
| `GET /v1/admin/projects/:projectId/apps/:appId/users` | ❌ 501 | `useAppUsers()` | List app users |
| `GET /v1/admin/projects/:projectId/apps/:appId/plans` | ❌ 501 | `useAppPlans()` | List pricing plans |

**Implementation:**
- Complete app CRUD operations needed
- Statistics queries for dashboard cards
- User management per app

---

### ❌ Team Member Management
**Priority: HIGH**

| Endpoint | Status | Used By | Notes |
|----------|--------|---------|-------|
| `GET /v1/admin/projects/:projectId/members` | ❌ 501 | `useProjectMembers()` | List team members |
| `POST /v1/admin/projects/:projectId/members` | ❌ 501 | `useInviteTeamMember()` | Invite team member |
| `PATCH /v1/admin/projects/:projectId/members/:memberId` | ❌ 501 | `useUpdateTeamMember()` | Update member role |
| `DELETE /v1/admin/projects/:projectId/members/:memberId` | ❌ 501 | `useRemoveTeamMember()` | Remove team member |
| `GET /v1/admin/projects/:projectId/invitations` | ❌ 501 | `useProjectInvitations()` | List pending invitations |
| `DELETE /v1/admin/projects/:projectId/invitations/:invitationId` | ❌ 501 | `useCancelInvitation()` | Cancel invitation |

**Implementation:**
- Team collaboration features
- Invitation system with email notifications
- Role-based access control (owner, admin, member)

---

### ❌ License Management
**Priority: HIGH**

| Endpoint | Status | Used By | Notes |
|----------|--------|---------|-------|
| `GET /v1/admin/licenses` | ❌ 501 | `useLicenses()` | List all licenses |
| `POST /v1/admin/projects/:projectId/apps/:appId/users/:userId/renew` | ❌ 501 | `useRenewLicense()` | Renew user license |

**Implementation:**
- Core service has `/v1/admin/license/grant` (singular)
- But dashboard expects `/v1/admin/licenses` (plural) for list view
- Need to implement license listing and renewal

---

### ❌ OAuth Provider Configuration
**Priority: MEDIUM**

| Endpoint | Status | Used By | Notes |
|----------|--------|---------|-------|
| `GET /v1/admin/apps/:appId/oauth/available` | ⚠️ Core only | `useAvailableOAuthProviders()` | List available OAuth providers |
| `GET /v1/admin/apps/:appId/oauth/selected` | ⚠️ Core only | `useSelectedOAuthProviders()` | List selected providers |
| `POST /v1/admin/apps/:appId/oauth/select` | ⚠️ Core only | `useSelectOAuthProvider()` | Add OAuth provider to app |
| `DELETE /v1/admin/apps/:appId/oauth/:providerId/deselect` | ⚠️ Core only | `useDeselectOAuthProvider()` | Remove OAuth provider |

**Implementation:**
- Core service has stubs returning 501
- Need to implement OAuth provider selection logic
- Database schema likely needs `app_oauth_providers` table

---

### ❌ Payment Provider Configuration
**Priority: MEDIUM**

| Endpoint | Status | Used By | Notes |
|----------|--------|---------|-------|
| `GET /v1/admin/projects/:projectId/payment-config` | ❌ 501 | `useProjectPaymentConfig()` | Get project payment config |
| `POST /v1/admin/projects/:projectId/payment-config` | ❌ 501 | `useSaveProjectPaymentConfig()` | Save project payment config |
| `GET /v1/admin/projects/:projectId/apps/:appId/payment-config` | ❌ 501 | `useAppPaymentConfig()` | Get app payment config |
| `POST /v1/admin/projects/:projectId/apps/:appId/payment-config` | ❌ 501 | `useSaveAppPaymentConfig()` | Save app payment config |
| `DELETE /v1/admin/projects/:projectId/apps/:appId/payment-config` | ❌ 501 | `useDeleteAppPaymentConfig()` | Delete app payment override |
| `GET /v1/admin/projects/:projectId/payment-providers` | ⚠️ Core only | `useProjectPaymentProviders()` | List project providers |
| `POST /v1/admin/payment-providers` | ⚠️ Core only | `useCreatePaymentProvider()` | Create payment provider |
| `PATCH /v1/admin/payment-providers/:providerId` | ⚠️ Core only | `useUpdatePaymentProvider()` | Update provider |
| `DELETE /v1/admin/payment-providers/:providerId` | ⚠️ Core only | `useDeletePaymentProvider()` | Delete provider |
| `GET /v1/admin/apps/:appId/payment/available` | ⚠️ Core stub | `useAvailablePaymentProviders()` | List available providers for app |
| `GET /v1/admin/apps/:appId/payment/selected` | ⚠️ Core stub | `useSelectedPaymentProvider()` | Get selected provider |
| `POST /v1/admin/apps/:appId/payment/select` | ⚠️ Core stub | `useSelectPaymentProvider()` | Select provider for app |
| `GET /v1/admin/payment-providers/:providerId/health` | ❌ 501 | `useProviderHealth()` | Provider health check |

**Implementation:**
- Core service has payment provider routes but they return stubs
- Need actual implementation with database persistence
- Payment provider credentials storage (encrypted)
- Webhook configuration and health monitoring

---

### ❌ Billing & Transactions
**Priority: MEDIUM**

| Endpoint | Status | Used By | Notes |
|----------|--------|---------|-------|
| `GET /v1/admin/billing/purchases` | ❌ 501 | `useBillingPurchases()` | List purchases with filters |
| `GET /v1/admin/billing/purchases/:purchaseId` | ❌ 501 | `useBillingPurchaseDetail()` | Get purchase details |
| `GET /v1/admin/billing/transactions` | ❌ 501 | `useBillingTransactions()` | List transactions |
| `GET /v1/admin/billing/stats` | ❌ 501 | `useBillingStats()` | Billing statistics |
| `GET /v1/admin/billing/webhooks` | ❌ 501 | `useWebhookLogs()` | Webhook logs with filters |
| `GET /v1/admin/billing/webhooks/:webhookId` | ❌ 501 | `useWebhookDetail()` | Webhook details |
| `GET /v1/admin/billing/refunds` | ❌ 501 | `useBillingRefunds()` | List refunds |
| `POST /v1/admin/billing/refunds` | ❌ 501 | `useCreateRefund()` | Create refund |

**Implementation:**
- Complete billing dashboard functionality
- Transaction monitoring and filtering
- Webhook monitoring with retry logic
- Refund processing

---

## Section 2: User Dashboard API Endpoints

### ✅ User Profile & Sessions (Implemented)
**Priority: N/A - Working**

| Endpoint | Status | Used By | Notes |
|----------|--------|---------|-------|
| `GET /v1/me` | ✅ Implemented | `useMe()` | Get user profile |
| `PATCH /v1/me` | ✅ Implemented | `update()` in useMe | Update profile |
| `GET /v1/me/sessions` | ✅ Implemented | `useSessions()` | List user sessions |
| `DELETE /v1/me/sessions` | ✅ Implemented | `logout()` in useAuth | Logout all sessions |
| `DELETE /v1/me/sessions/:sessionId` | ✅ Implemented | Not used yet | Revoke specific session |
| `POST /v1/auth/logout` | ✅ Implemented | `logout()` | Logout current session |

**Status:** ✅ All user dashboard endpoints are working

---

## Section 3: Architecture Issues

### Gateway Service Structure
```
apps/services/gateway/src/routes/
├── admin.ts          ❌ Returns 501 for ALL routes
├── admin-billing.ts  ❌ Returns 501 for ALL routes  
├── auth.ts           ✅ Working
├── me.ts             ✅ Working
└── payments.ts       ? Unknown status
```

### Core Service Structure
```
apps/services/core/src/routes/v1/
├── admin/
│   ├── index.ts         ⚠️  Partial (license/grant, payment stubs)
│   ├── providers.ts     ⚠️  Stubs returning 200 with empty data
│   └── providers-stub.ts ⚠️ Identical to providers.ts
├── auth/            ✅ Implemented
├── billing/         ⚠️  Webhook handlers only
├── email/           ✅ Implemented
└── license/         ⚠️  Limited implementation
```

---

## Section 4: Implementation Priority & Roadmap

### 🔴 PHASE 1: Critical Admin Functionality (Week 1)
**Without these, admin dashboard is completely unusable**

1. **Admin Authentication** (4 hours)
   - Implement `GET /v1/admin/me` in gateway
   - Add admin authorization middleware
   - Test with existing admin pages

2. **Project Management** (8 hours)
   - Implement all project CRUD operations
   - Add database queries for projects table
   - List, create, view, update projects

3. **App Management** (12 hours)
   - Implement all app CRUD operations
   - App listing per project
   - App details and updates

4. **Basic Statistics** (6 hours)
   - Implement project stats endpoint
   - Implement app stats endpoint
   - Dashboard overview cards

**Total: ~30 hours / 4 days**

---

### 🟡 PHASE 2: Core Features (Week 2)
**Essential for multi-user projects and app management**

1. **Team Member Management** (10 hours)
   - Team member CRUD
   - Invitation system
   - Role-based permissions

2. **License Management** (8 hours)
   - License listing
   - License renewal
   - User license assignment

3. **App Users** (6 hours)
   - List users per app
   - User details
   - License status per user

**Total: ~24 hours / 3 days**

---

### 🟢 PHASE 3: Payment & OAuth (Week 3)
**For monetization and authentication features**

1. **OAuth Provider Configuration** (12 hours)
   - Available providers list
   - Select/deselect providers
   - Provider credentials storage

2. **Payment Provider Setup** (16 hours)
   - Payment provider CRUD
   - Provider credentials (encrypted)
   - Provider selection for apps
   - Health monitoring

**Total: ~28 hours / 3.5 days**

---

### 🔵 PHASE 4: Billing & Analytics (Week 4)
**For revenue tracking and webhook monitoring**

1. **Billing Dashboard** (14 hours)
   - Purchase listing with filters
   - Transaction history
   - Statistics and charts

2. **Webhook Monitoring** (8 hours)
   - Webhook logs
   - Webhook details
   - Retry mechanism UI

3. **Refund Processing** (6 hours)
   - Refund listing
   - Create refund
   - Refund status tracking

**Total: ~28 hours / 3.5 days**

---

## Section 5: Database Schema Requirements

### Missing or Incomplete Tables

1. **projects** table - Needs full CRUD support
2. **apps** table - Needs full CRUD support
3. **project_members** table - For team collaboration
4. **project_invitations** table - For invitation system
5. **oauth_providers** table - Platform OAuth providers (Google, GitHub, etc.)
6. **app_oauth_providers** table - App-specific OAuth selections
7. **payment_providers** table - Payment provider configs per project
8. **app_payment_providers** table - App-specific payment selections
9. **billing_purchases** table - Purchase records
10. **billing_transactions** table - Transaction history
11. **billing_webhooks** table - Webhook logs
12. **billing_refunds** table - Refund records

---

## Section 6: Immediate Action Items

### Step 1: Gateway Admin Routes (Today)
```typescript
// Replace apps/services/gateway/src/routes/admin.ts
// with actual route implementations that proxy to core service
```

### Step 2: Core Service Admin Implementation (This Week)
```typescript
// Implement in apps/services/core/src/routes/v1/admin/
// - projects.ts (CRUD)
// - apps.ts (CRUD)
// - members.ts (Team management)
// - licenses.ts (License management)
// - stats.ts (Statistics)
```

### Step 3: Database Migrations (This Week)
```sql
-- Add missing tables and indexes
-- Update existing schemas
-- Add foreign key constraints
```

### Step 4: Testing (Ongoing)
- Unit tests for each endpoint
- Integration tests for workflows
- E2E tests for critical paths

---

## Section 7: Code Examples for Implementation

### Example 1: Gateway Admin Routes
```typescript
// apps/services/gateway/src/routes/admin.ts
import { Hono } from "hono";
import { coreClient } from "../lib/core-client";

export const adminRoutes = new Hono();

// Admin profile
adminRoutes.get("/me", async (c) => {
  const auth = getAuth(c); // From middleware
  const user = await coreClient.getAdminProfile(auth.userId);
  return c.json(user);
});

// Projects
adminRoutes.get("/projects", async (c) => {
  const auth = getAuth(c);
  const projects = await coreClient.getProjects(auth.userId);
  return c.json({ projects });
});

adminRoutes.post("/projects", async (c) => {
  const auth = getAuth(c);
  const body = await c.req.json();
  const project = await coreClient.createProject(auth.userId, body);
  return c.json(project);
});

// ... more routes
```

### Example 2: Core Service Project Queries
```typescript
// apps/services/core/src/routes/v1/admin/projects.ts
import { getDb, projectQueries } from "@proofa/db";

export async function listProjects(c: Context) {
  const db = getDb();
  const projects = await projectQueries.findAll(db);
  return c.json({ projects });
}

export async function createProject(c: Context) {
  const db = getDb();
  const { name, slug, description } = await c.req.json();
  
  const project = await projectQueries.create(db, {
    public_id: createId("project"),
    name,
    slug,
    description,
  });
  
  return c.json(project);
}
```

---

## Section 8: Testing Checklist

### Admin Dashboard Pages to Test
- [ ] Login page - admin authentication
- [ ] Projects page - list all projects
- [ ] Project detail - single project view
- [ ] Project stats - statistics dashboard
- [ ] Project team - member management
- [ ] Project settings - update project
- [ ] Project apps - list apps in project
- [ ] App detail - single app view
- [ ] App stats - app statistics
- [ ] App users - user list per app
- [ ] App licenses - license management
- [ ] App settings - update app
- [ ] App OAuth - OAuth provider config
- [ ] App payment - payment provider config
- [ ] App API keys - API credentials
- [ ] Licenses page - all licenses view
- [ ] Billing dashboard - revenue overview
- [ ] Webhook monitoring - webhook logs
- [ ] Refund processing - refund management
- [ ] Transaction export - data export

### User Dashboard Pages to Test
- [x] Login page
- [x] Profile page
- [x] Sessions page

---

## Summary

**Total Missing Endpoints: 50+**
- ❌ **Critical (Admin Auth):** 1 endpoint
- ❌ **Critical (Projects):** 5 endpoints  
- ❌ **Critical (Apps):** 7 endpoints
- ❌ **High (Team):** 6 endpoints
- ❌ **High (Licenses):** 2 endpoints
- ❌ **Medium (OAuth):** 4 endpoints
- ❌ **Medium (Payment):** 13 endpoints
- ❌ **Medium (Billing):** 8 endpoints
- ✅ **Working (User):** 6 endpoints

**Estimated Implementation Time:**
- Phase 1 (Critical): 30 hours / 4 days
- Phase 2 (Core): 24 hours / 3 days
- Phase 3 (Payment/OAuth): 28 hours / 3.5 days
- Phase 4 (Billing): 28 hours / 3.5 days
- **Total: ~110 hours / 14 days** (2-3 weeks with testing)

**Root Cause:**
The gateway's admin routes are completely stubbed out with 501 responses. This was likely done during a refactoring where the plan was to implement them later, but they were never completed. The core service has partial implementations but is not accessible from the gateway.

**Recommended Action:**
Start with Phase 1 immediately - without admin authentication and project/app management, the entire admin dashboard is non-functional.
