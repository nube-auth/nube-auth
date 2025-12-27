# Proofa Admin Dashboard - MVP TODO

**Last Updated**: December 27, 2025  
**Status**: Planning Phase - Revised with Project-Centric Approach  
**Target**: 4-6 weeks for MVP completion

> **Key Architecture Decision**: Projects remain the primary organizational unit. Apps live within projects. User invitations use a smart flow that checks if user exists before sending emails. License granting is integrated into the user invitation flow, not a separate action.

---

## 🎯 MVP Goals

Build a **project-based** admin dashboard where:
1. Projects organize multiple apps with aggregated stats
2. Admins can invite users per app (smart invite flow)
3. Admins can configure OAuth, payments, and licensing per app
4. Developers can integrate easily with SDK examples
5. Basic payment integration (LemonSqueezy + Dodo Payments)
6. Unified user entity (admins and regular users are same, just different roles)

**OUT OF SCOPE for MVP**:
- ❌ Advanced analytics (charts, graphs, cohorts)
- ❌ Custom email templates (use defaults only)
- ❌ Stripe payment integration (LemonSqueezy + Dodo only for MVP)
- ❌ Audit logs viewer
- ❌ Advanced security features (IP allowlisting, 2FA enforcement)
- ❌ Integrations marketplace
- ❌ Advanced team permissions (keep basic owner/admin/member)

**IMPORTANT NOTES**:
- Admin users and regular users are the same entity (unified `users` table)
- Admin role is just a role field: `owner`, `admin`, `member`, or `null`/`user`
- Team member invites work the same as app user invites
- License granting is NOT a separate flow - it's part of user invitation

---

## 📊 Current State Assessment

### ✅ What's Working
- Project CRUD (list, create, view)
- App CRUD (list, create, view, edit)
- Project members view (read-only)
- Basic license listing
- OAuth provider checkbox selection
- Session TTL configuration

### ❌ What's Broken/Missing
- No user invitation system (smart invite flow)
- No user management interface (view users per app)
- License granting is separate (should be part of user invite)
- No payment integration
- No API keys management
- No webhook configuration
- OAuth providers are just checkboxes (no credentials)
- Project selector dropdown non-functional (needs fixing)
- Project dashboard missing aggregated stats
- Duplicate PATCH endpoint in backend
- Array field editing bug in forms

---

## 🚀 Implementation Phases

---

## **PHASE 1: Foundation & Bug Fixes** (Week 1)
**Goal**: Fix critical bugs and prepare for app-centric rebuild

### 1.1 Critical Bug Fixes
- [ ] **Fix array field editing bug** in `AppDetail.tsx` and `AppSetup.tsx`
  - Change `"redirect_uris"` → `"redirectUris"` (camelCase)
  - Change `"allowed_hosts"` → `"allowedHosts"` (camelCase)
  - File: `apps/dashboard/admin/src/pages/AppDetail.tsx` lines 350, 390
  - File: `apps/dashboard/admin/src/pages/AppSetup.tsx` lines 295, 340

- [ ] **Remove duplicate PATCH endpoint** in backend
  - File: `apps/gateway/src/routes/admin.ts`
  - Delete first PATCH handler (lines 376-460)
  - Keep only the second one (lines 466-555) with proper validation

- [ ] **Fix duplicate "New Project" button**
  - Remove from top header in `App.tsx` (line 440-445)
  - Keep only in `Projects.tsx` page header

- [ ] **Fix license page app_id display**
  - File: `apps/dashboard/admin/src/pages/Licenses.tsx` line 93
  - Show app name instead of numeric ID
  - Fetch app details and join with license data

- [ ] **Fix project selector dropdown functionality**
  - File: `apps/dashboard/admin/src/App.tsx`
  - Currently stores selected project but doesn't filter content
  - Make it actually switch context between projects
  - Update all queries to filter by selected project

### 1.2 Database Schema Additions
- [ ] **Add payment_provider to apps table**
  ```sql
  ALTER TABLE apps ADD COLUMN payment_provider TEXT; -- 'lemonsqueezy' | 'dodo' | 'stripe' | null
  ALTER TABLE apps ADD COLUMN payment_test_mode INTEGER DEFAULT 1; -- 1 = test, 0 = live
  
  -- LemonSqueezy fields
  ALTER TABLE apps ADD COLUMN lemon_squeezy_store_id TEXT;
  ALTER TABLE apps ADD COLUMN lemon_squeezy_api_key TEXT;
  ALTER TABLE apps ADD COLUMN lemon_squeezy_webhook_secret TEXT;
  
  -- Dodo Payments fields
  ALTER TABLE apps ADD COLUMN dodo_api_key TEXT;
  ALTER TABLE apps ADD COLUMN dodo_secret_key TEXT;
  ALTER TABLE apps ADD COLUMN dodo_webhook_secret TEXT;
  
  -- Stripe fields (optional, for future)
  ALTER TABLE apps ADD COLUMN stripe_publishable_key TEXT;
  ALTER TABLE apps ADD COLUMN stripe_secret_key TEXT;
  ALTER TABLE apps ADD COLUMN stripe_webhook_secret TEXT;
  ```

- [ ] **Add webhook_url to apps table**
  ```sql
  ALTER TABLE apps ADD COLUMN webhook_url TEXT;
  ALTER TABLE apps ADD COLUMN webhook_events TEXT; -- JSON array of events
  ```

- [ ] **Add OAuth credentials to apps table**
  ```sql
  ALTER TABLE apps ADD COLUMN google_client_id TEXT;
  ALTER TABLE apps ADD COLUMN google_client_secret TEXT;
  ALTER TABLE apps ADD COLUMN github_client_id TEXT;
  ALTER TABLE apps ADD COLUMN github_client_secret TEXT;
  ```

**Deliverables**:
- ✅ All bugs fixed
- ✅ Database migrations ready
- ✅ Clean codebase for next phase

**Time Estimate**: 3-4 days

---

## **PHASE 2: Enhanced Project Dashboard** (Week 1-2)
**Goal**: Improve project-centric navigation and add aggregated stats

### 2.1 Project Dashboard Enhancement
- [x] **Create/enhance Project Dashboard page** (`/projects/:projectId`)
  - **Header Section**:
    - Project name, slug
    - Project selector works (filter all content by project)
    - Edit Project button
  
  - **Aggregated Stats Cards** (4 cards):
    - 📱 Total Apps (count in this project)
    - 👥 Total Users (sum across all apps)
    - 📋 Active Licenses (sum across all apps)
    - 💰 Total Revenue (sum across all apps, if payment configured)
  
  - **Apps List Section**:
    - Table of apps in this project
    - Columns: Name, Users, Licenses, Status, Actions
    - Quick actions per app: View, Edit, Settings
    - [+ Create App] button
  
  - **Quick Links**:
    - View All Users (across project)
    - View All Licenses (across project)
    - Manage Team Members
    - Project Settings

- [x] **Backend: Project stats endpoint**
  - GET /v1/admin/projects/:projectId/stats
  - Return aggregated counts: apps, users, licenses, revenue

### 2.2 Navigation Structure
- [x] **Project selector now navigates to project dashboard**
  - Selecting a project from dropdown navigates to `/projects/:projectId`
  - Shows "All Projects" option to view all projects
  - Auto-detects current project from URL
  ```
  Sidebar:
  ├── [Project Selector Dropdown ▼]
  ├── 📊 Overview (project dashboard)
  ├── 📱 Apps (list of apps in current project)
  ├── 👥 Team Members (project admins/members)
  ├── 📋 Licenses (all licenses in project)
  └── ⚙️  Settings
  ```

### 2.3 App Detail Page (within project context)
- [x] **Create enhanced App Dashboard** (`/projects/:projectId/apps/:appId`)
  - **Header Section**:
    - App name, icon, status badge
    - Copy App ID button
    - Breadcrumb navigation
  
  - **Stats Cards** (4 cards):
    - 📊 Total Users (this app only)
    - 🔐 Active Sessions (total sessions)
    - 💰 Active Licenses (this app)
    - 💵 Revenue (this app)
  
  - **Navigation Tabs**:
    - Dashboard (stats + quick actions)
    - Settings (Auth, Payment, Security, API, Webhooks)
    - Users (Phase 3)
    - Licenses (Phase 4)
    - Developers (Phase 7)

### 2.4 Breadcrumb Navigation
- [x] **Consistent breadcrumbs everywhere**
  - Format: `Projects > [Project Name] > Apps > [App Name] > [Section]`
  - Implemented on:
    - ProjectDetail: `Projects > [Project Name]`
    - AppDetail: `[Project Name] > Apps > [App Name]`
    - AppSetup: `Projects > [Project Name] > Setup New App`

**Deliverables**:
- ✅ Enhanced project dashboard with aggregated stats
- ✅ Functional project selector (filters content)
- ✅ App detail page within project context
- ✅ Consistent breadcrumbs

**Time Estimate**: 4-5 days

---

## **PHASE 3: User Management** (Week 2)
**Goal**: Complete user management with smart invite flow

### 3.1 Users List Page (`/projects/:projectId/apps/:appId/users`)

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Users                                 [+ Invite User]│
├─────────────────────────────────────────────────────┤
│ [Search...] [Filter: All ▼] [Sort: Recent ▼]       │
├─────────────────────────────────────────────────────┤
│ Avatar | Name          | Email         | Plan | ... │
│ ────────────────────────────────────────────────────│
│  JD    | John Doe      | john@...      | Pro  | ... │
│  AS    | Alice Smith   | alice@...     | Free | ... │
└─────────────────────────────────────────────────────┘
```

- [ ] **Create users list page**
  - Table with columns: Avatar, Name, Email, Plan, Status, Joined Date, Actions
  - Search by name/email (client-side for MVP, can be backend later)
  - Filter dropdown: All, Free, Pro, Trial, Suspended
  - Sort dropdown: Recent, Name A-Z, Email A-Z
  - Pagination (20 per page)
  - Empty state: "No users yet. Users will appear here after first signup."

- [ ] **Backend: GET /v1/admin/apps/:appId/users**
  - Query params: `?search=&filter=&sort=&page=&limit=`
  - Return: user list with license info joined
  - Response:
    ```json
    {
      "users": [
        {
          "id": "U0xxx",
          "name": "John Doe",
          "email": "john@example.com",
          "avatar_url": "https://...",
          "primary_email_verified": true,
          "plan": "pro",
          "status": "active",
          "created_at": 1234567890
        }
      ],
      "total": 45,
      "page": 1,
      "limit": 20
    }
    ```

### 3.2 User Detail Page (`/projects/:projectId/apps/:appId/users/:userId`)

- [ ] **Create user detail page**
  - **Profile Card**:
    - Avatar (large)
    - Name (editable)
    - Email (not editable)
    - Verification status badge
    - Created date
  
  - **License Information**:
    - Current plan badge
    - Subscription status
    - Valid until date
    - Payment method (if applicable)
    - Action buttons: Upgrade, Downgrade, Cancel
  
  - **Linked Identities**:
    - List of OAuth providers (Google, GitHub)
    - Provider email (if different)
    - Link date
    - Action: Unlink (with confirmation)
  
  - **Sessions** (last 10):
    - Device type
    - Browser
    - IP address
    - Location (city, country)
    - Created date
    - Last seen
    - Action: Revoke session
  
  - **Danger Zone** (bottom):
    - Suspend User button
    - Delete User button (with confirmation)

- [ ] **Backend: GET /v1/admin/apps/:appId/users/:userId**
  - Return full user profile with license, identities, sessions

- [ ] **Backend: PATCH /v1/admin/apps/:appId/users/:userId**
  - Update user name, status (active/suspended)

- [ ] **Backend: DELETE /v1/admin/apps/:appId/users/:userId**
  - Soft delete user (mark as deleted, don't actually delete)

- [ ] **Backend: DELETE /v1/admin/apps/:appId/users/:userId/sessions/:sessionId**
  - Revoke specific session

### 3.3 Smart Invite User Flow

- [ ] **Create "Invite User" modal**
  - **Form fields**:
    - Email (required)
    - License Plan (dropdown: Free, Pro, Trial, etc.)
    - Grant license? (checkbox, checked by default)
    - Custom message (optional text)
  
  - **Smart Flow Logic**:
    ```
    User clicks "Invite User"
      ↓
    Admin enters email + selects license plan
      ↓
    Backend checks: Does user exist in this app?
      ├── YES → Grant license immediately
      │         Show: "License granted to existing user"
      │         Redirect to user detail page
      │
      └── NO → Send invitation email
                Queue license for activation on signup
                Show: "Invitation sent. License will activate when they sign up"
    ```
  
  - **Invitation Email**:
    - Subject: "You've been invited to [App Name]"
    - Body: Invite message + signup link + license details
    - Link: `https://auth.proofa.com/signup?app_id=xxx&invite_code=yyy`

- [ ] **Backend: POST /v1/admin/apps/:appId/users/invite**
  - Request body:
    ```json
    {
      "email": "user@example.com",
      "plan": "pro",
      "grant_license": true,
      "custom_message": "Welcome to our app!"
    }
    ```
  
  - **Logic**:
    1. Check if user exists (by email)
    2. **If exists**:
       - Check if they already have a license for this app
       - If no license: Grant license immediately
       - If has license: Update to new plan
       - Return: `{ userExists: true, licenseGranted: true, user: {...} }`
    3. **If not exists**:
       - Create invitation record in database
       - Send invitation email
       - Queue license (stored with invite code)
       - Return: `{ userExists: false, inviteSent: true }`

- [ ] **Database: Add `invitations` table**
  ```sql
  CREATE TABLE invitations (
    id INTEGER PRIMARY KEY,
    public_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    app_id INTEGER NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    invited_by_user_id INTEGER NOT NULL,
    queued_license_plan TEXT,
    custom_message TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'expired'
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (app_id) REFERENCES apps(id),
    FOREIGN KEY (invited_by_user_id) REFERENCES users(id)
  );
  ```

- [ ] **Core: Handle invitation signup**
  - When user signs up with invite_code
  - Auto-activate queued license
  - Mark invitation as 'accepted'
  - Send welcome email

**Deliverables**:
- ✅ Users list with search/filter/sort
- ✅ User detail page with full profile
- ✅ Session management per user
- ✅ Smart invite flow (check if user exists)
- ✅ Invitation system with queued licenses

**Time Estimate**: 4-5 days

---

## **PHASE 4: License Management** (Week 3)
**Goal**: Simplified license CRUD and plan management

### 4.1 Licenses Overview Page (`/projects/:projectId/apps/:appId/licenses`)

- [ ] **Simplified licenses page** (read-only + plans management)
  - **Stats Cards** (top):
    - Total Active Licenses
    - Free Plan Users
    - Paid Plan Users
    - Monthly Revenue (if payment configured)
  
  - **Plans Section**:
    - List of available plans with details
    - Create/Edit/Delete plan buttons
    - Configure features per plan
  
  - **Active Licenses Table**:
    - Columns: User, Email, Plan, Status, Valid Until, Source, Actions
    - Filter: All, Active, Expired, Trial
    - Action per row: View User, Change Plan, Cancel
    - **NOTE**: No "Grant License" button here (done via User Invite)

- [ ] **License Actions**
  - **Change Plan** (inline action):
    - Modal: Select new plan
    - Update license immediately
    - Send notification email to user
  
  - **Cancel License**:
    - Confirmation dialog
    - Mark license as cancelled
    - User retains access until expiry date

### 4.2 Plans Configuration

- [ ] **Plans management** (embedded in licenses page or separate tab)
  - List of plans with: Name, Price, Features, Status
  - Create Plan button
  - Edit/Delete per plan

- [ ] **Plan form modal** (Create/Edit)
  - Basic Info: Name, Description
  - Pricing: Monthly price, Yearly price
  - Trial: Enable trial, Trial days
  - Features: List of features (multi-line textarea or tag input)
  - Status: Active/Inactive
  - Display order (for showing in UI)

- [ ] **Backend: GET /v1/admin/apps/:appId/plans**
  - Return list of plans for app

- [ ] **Backend: POST /v1/admin/apps/:appId/plans**
  - Create new plan
  - Validate: Name unique per app

- [ ] **Backend: PATCH /v1/admin/apps/:appId/plans/:planId**
  - Update plan details
  - If price changed, don't affect existing subscriptions

- [ ] **Backend: DELETE /v1/admin/apps/:appId/plans/:planId**
  - Check if any active licenses use this plan
  - If yes, prevent deletion (show error)
  - If no, soft delete plan

- [ ] **Backend: PATCH /v1/admin/apps/:appId/licenses/:licenseId**
  - Change user's plan (upgrade/downgrade)
  - Update valid_until if needed
  - Log change to audit trail

**Deliverables**:
- ✅ Simplified license overview (read-only list)
- ✅ Plans configuration (full CRUD)
- ✅ License plan changes (upgrade/downgrade)
- ✅ No separate "Grant License" flow (done via User Invite)

**Time Estimate**: 4-5 days

---

## **PHASE 5: OAuth Configuration** (Week 3)
**Goal**: Detailed OAuth provider setup per app

### 5.1 Authentication Settings Page (`/projects/:projectId/apps/:appId/settings/auth`)

- [ ] **Create OAuth providers section**
  - **Google OAuth Card**:
    - Toggle: Enable/Disable
    - When enabled, show form:
      - Client ID (input)
      - Client Secret (input, password type)
      - Allowed Domains (comma-separated, optional)
      - Test Connection button
    - Save button
  
  - **GitHub OAuth Card**:
    - Same structure as Google
    - Add: Allowed Organizations (optional)
  
  - **Email/OTP Card**:
    - Toggle: Enable/Disable
    - OTP length: 4, 6, 8 digits
    - OTP expiry: 5, 10, 15 minutes
    - Rate limit: X attempts per hour

### 5.2 Backend Updates

- [ ] **Backend: PATCH /v1/admin/apps/:appId/settings/auth**
  - Update OAuth credentials (encrypted storage)
  - Update OTP settings

- [ ] **Encrypt OAuth credentials in database**
  - Use environment variable encryption key
  - Encrypt client secrets before storage
  - Decrypt on retrieval

### 5.3 Test Connection

- [ ] **Implement OAuth test endpoint**
  - Backend: POST /v1/admin/apps/:appId/test-oauth
  - Attempt OAuth flow with provided credentials
  - Return success/failure with error details

**Deliverables**:
- ✅ Detailed OAuth configuration UI
- ✅ Encrypted credential storage
- ✅ Test connection functionality

**Time Estimate**: 3-4 days

---

## **PHASE 6: Payment Integration** (Week 4)
**Goal**: LemonSqueezy + Dodo Payments integration (Stripe optional for future)

### 6.1 Payment Settings Page (`/projects/:projectId/apps/:appId/settings/payment`)

- [ ] **Create payment provider selection**
  - Radio buttons: None, LemonSqueezy, Dodo Payments, Stripe (coming soon)
  - Show configuration form based on selection
  - Test/Live mode toggle (applies to all providers)

### 6.2 LemonSqueezy Configuration (PRIMARY)

- [ ] **LemonSqueezy configuration card**
  - **Store Configuration**:
    - Store ID (required)
    - API Key (required, password field)
    - Test Mode toggle
  
  - **Webhook Configuration**:
    - Webhook Secret (auto-generated or manual)
    - Webhook URL (auto-generated, copy button):
      - `https://api.proofa.com/webhooks/lemonsqueezy/:appId`
  
  - **Actions**:
    - Save Configuration button
    - Test Connection button
    - Sync Products button (sync plans to LemonSqueezy)
    - View LemonSqueezy Dashboard link (external)

- [ ] **Backend: LemonSqueezy integration**
  - POST /v1/admin/apps/:appId/payment/lemonsqueezy/configure
  - POST /v1/admin/apps/:appId/payment/lemonsqueezy/test
  - POST /v1/admin/apps/:appId/payment/lemonsqueezy/sync-products
  - Webhook handler: POST /webhooks/lemonsqueezy/:appId
    - Handle: `order_created`
    - Handle: `subscription_created`
    - Handle: `subscription_updated`
    - Handle: `subscription_cancelled`
    - Handle: `subscription_resumed`
    - Handle: `subscription_expired`
    - Handle: `subscription_payment_success`
    - Handle: `subscription_payment_failed`

### 6.3 Dodo Payments Configuration (PRIMARY)

- [ ] **Dodo Payments configuration card**
  - **API Configuration**:
    - API Key (required, password field)
    - Secret Key (required, password field)
    - Test Mode toggle
  
  - **Webhook Configuration**:
    - Webhook Secret (auto-generated or manual)
    - Webhook URL (auto-generated, copy button):
      - `https://api.proofa.com/webhooks/dodo/:appId`
  
  - **Actions**:
    - Save Configuration button
    - Test Connection button
    - Sync Products button (sync plans to Dodo)
    - View Dodo Dashboard link (external)

- [ ] **Backend: Dodo Payments integration**
  - POST /v1/admin/apps/:appId/payment/dodo/configure
  - POST /v1/admin/apps/:appId/payment/dodo/test
  - POST /v1/admin/apps/:appId/payment/dodo/sync-products
  - Webhook handler: POST /webhooks/dodo/:appId
    - Handle payment events (TBD based on Dodo API docs)
    - Handle subscription events
    - Handle refund events

### 6.4 Stripe Configuration (OPTIONAL - Future Implementation)

- [ ] **Stripe configuration card (disabled/grayed out for MVP)**
  - Show "Coming Soon" message
  - Link to roadmap or documentation
  - Placeholder fields (non-functional):
    - Publishable Key
    - Secret Key
    - Webhook Secret
  - Note: "Stripe integration will be available in a future update"

### 6.5 Payment Events Log (Simple)

- [ ] **Recent payment events table** (bottom of payment page)
  - Last 20 events
  - Columns: Date, Event Type, User, Amount, Status
  - No filtering for MVP (just chronological list)

**Deliverables**:
- ✅ LemonSqueezy integration (test + live mode)
- ✅ Dodo Payments integration (test + live mode)
- ✅ Webhook handlers for both providers
- ✅ Basic payment events log
- ✅ Stripe placeholder (UI only, non-functional)

**Time Estimate**: 5-6 days

---

## **PHASE 7: Developer Tools** (Week 4-5)
**Goal**: Make integration easy for developers

### 7.1 API Keys Page (`/projects/:projectId/apps/:appId/settings/api`)

- [ ] **Create API keys section**
  - **App Credentials** (read-only):
    - App ID (public, copyable)
    - Client Secret (private, masked, show/copy button)
    - Service Token (for S2S calls, masked, copy button)
  
  - **Regenerate Keys** (danger zone):
    - Regenerate Client Secret button (with confirmation)
    - Regenerate Service Token button (with confirmation)
    - Warning: "This will break existing integrations"

- [ ] **Backend: Regenerate endpoints**
  - POST /v1/admin/apps/:appId/regenerate-secret
  - POST /v1/admin/apps/:appId/regenerate-token

### 7.2 Integration Guide Page (`/projects/:projectId/apps/:appId/developers`)

- [ ] **Create integration guide with code examples**
  - **Quick Start Section**:
    - Prerequisites
    - Installation command
    - Basic setup code
  
  - **React Example** (tab):
    ```tsx
    import { ProofaProvider } from '@proofa/react';

    function App() {
      return (
        <ProofaProvider appId="A0xxx" redirectUrl="/dashboard">
          <YourApp />
        </ProofaProvider>
      );
    }
    ```
  
  - **Next.js Example** (tab):
    - App Router example
    - Pages Router example
  
  - **JavaScript Example** (tab):
    - Vanilla JS integration
  
  - **Backend Verification** (tab):
    - Node.js example
    - Python example
    - Go example
  
  - **Copy buttons for each code block**

- [ ] **Add links to full documentation**
  - Link to docs site
  - Link to SDK reference
  - Link to API reference

### 7.3 Webhooks Configuration (`/projects/:projectId/apps/:appId/settings/webhooks`)

- [ ] **Create webhooks section**
  - **Add Webhook Form**:
    - Webhook URL input
    - Events multi-select:
      - ☐ user.created
      - ☐ user.updated
      - ☐ user.deleted
      - ☐ session.created
      - ☐ license.created
      - ☐ license.updated
      - ☐ payment.succeeded
      - ☐ payment.failed
    - Add Webhook button
  
  - **Existing Webhooks List**:
    - URL
    - Events count
    - Status (active/failed)
    - Last delivery time
    - Actions: Edit, Test, Delete
  
  - **Webhook Logs** (per webhook):
    - Last 20 deliveries
    - Request payload (collapsible)
    - Response status
    - Retry count

- [ ] **Backend: Webhook CRUD**
  - POST /v1/admin/apps/:appId/webhooks
  - GET /v1/admin/apps/:appId/webhooks
  - PATCH /v1/admin/apps/:appId/webhooks/:webhookId
  - DELETE /v1/admin/apps/:appId/webhooks/:webhookId
  - POST /v1/admin/apps/:appId/webhooks/:webhookId/test

**Deliverables**:
- ✅ API keys management
- ✅ Integration guides with examples
- ✅ Webhook configuration UI

**Time Estimate**: 4-5 days

---

## **PHASE 8: Settings & Polish** (Week 5)
**Goal**: Complete remaining settings and polish UI

### 8.1 General Settings (`/projects/:projectId/apps/:appId/settings/general`)

- [ ] **App information section**
  - App Name (editable)
  - App Slug (editable)
  - Description (editable)
  - Save button

- [ ] **Branding section** (basic for MVP)
  - Logo upload (single image)
  - Primary color picker
  - Preview of login page
  - Save button

- [ ] **Email settings** (basic)
  - From Name (default: app name)
  - From Email (default: noreply@proofa.com)
  - Reply-To Email (optional)
  - Note: "Custom email templates coming soon"

### 8.2 Security Settings (`/projects/:projectId/apps/:appId/settings/security`)

- [ ] **Session management**
  - Max Session TTL (1-365 days)
  - Idle timeout (15-120 minutes)
  - Max concurrent sessions per user (1-10)

- [ ] **Rate limiting**
  - Login attempts: X per Y minutes
  - OTP requests: X per Y minutes
  - API requests: X per minute

- [ ] **Account lockout**
  - Failed login threshold (3-10 attempts)
  - Lockout duration (15-60 minutes)

### 8.3 Danger Zone (`/projects/:projectId/apps/:appId/settings/danger`)

- [ ] **Delete app section**
  - Warning message
  - Confirmation flow:
    - "Type app name to confirm"
    - Input field
    - Delete button (disabled until correct name entered)
  
- [ ] **Backend: DELETE /v1/admin/apps/:appId**
  - Soft delete app
  - Archive all related data
  - Can't be undone

### 8.4 UI Polish

- [ ] **Add loading skeletons** for all data fetching
- [ ] **Add error boundaries** for graceful error handling
- [ ] **Add toast notifications** for actions (success/error)
- [ ] **Consistent empty states** across all pages
- [ ] **Responsive design** (mobile-friendly)
- [ ] **Dark mode support** (optional for MVP)

**Deliverables**:
- ✅ Complete settings pages
- ✅ App deletion flow
- ✅ Polished UI with loading states

**Time Estimate**: 4-5 days

---

## **PHASE 9: Testing & Documentation** (Week 6)
**Goal**: Test everything and write documentation

### 9.1 End-to-End Testing

- [ ] **Manual testing checklist**
  - Create project flow
  - Create app within project
  - Project selector switches context correctly
  - Add OAuth providers (Google, GitHub)
  - Invite user (existing user → grants license immediately)
  - Invite user (new user → sends email + queues license)
  - Change user's license plan
  - Configure payment (LemonSqueezy + Dodo Payments)
  - Test webhook delivery (both providers)
  - Regenerate API keys
  - Revoke user session
  - Delete app

- [ ] **Integration testing**
  - Test OAuth flows (Google, GitHub)
  - Test payment webhooks (LemonSqueezy, Dodo Payments)
  - Test user signup with invite code → license auto-activation
  - Test user invitation → license granting for existing users
  - Test session management and revocation

- [ ] **Browser compatibility**
  - Chrome ✅
  - Firefox ✅
  - Safari ✅
  - Edge ✅

### 9.2 Documentation

- [ ] **Update README.md**
  - New features
  - Setup instructions
  - Environment variables

- [ ] **Create admin guide** (`docs/ADMIN_GUIDE.md`)
  - How to create an app
  - How to configure OAuth
  - How to grant licenses
  - How to setup payments

- [ ] **Create integration guide** (`docs/INTEGRATION_GUIDE.md`)
  - SDK installation
  - React integration
  - Next.js integration
  - Backend verification

### 9.3 Bug Fixes

- [ ] **Fix any bugs found during testing**
- [ ] **Performance optimizations**
- [ ] **Accessibility improvements**

**Deliverables**:
- ✅ Fully tested dashboard
- ✅ Complete documentation
- ✅ Bug-free experience

**Time Estimate**: 4-5 days

---

## 📦 Out of Scope (Post-MVP)

These features are important but NOT required for MVP:

### Analytics & Reporting
- User growth charts
- Revenue analytics
- Retention cohorts
- Geographic distribution
- Device/browser stats

### Advanced Email
- Custom email templates (HTML editor)
- Email template preview
- A/B testing emails
- Custom SMTP provider

### Advanced Security
- IP allowlisting/blocklisting
- 2FA enforcement
- Suspicious activity alerts
- Advanced fraud detection

### Team Collaboration
- Role-based permissions (beyond owner/admin/member)
- Activity audit logs viewer
- Team member invitations
- Permission inheritance

### Integrations
- Slack notifications
- Discord webhooks
- Zapier integration
- Third-party analytics (Mixpanel, Amplitude)

### Developer Tools
- GraphQL API
- Sandbox/test mode with test users
- API playground
- SDK for more languages (Python, Go, Ruby)

---

## 🎯 Success Metrics

After MVP completion, we should be able to:

1. ✅ Create a new project with multiple apps
2. ✅ See aggregated project stats (users, licenses, revenue)
3. ✅ Configure OAuth providers with credentials per app
4. ✅ Invite users with smart flow (existing = grant, new = email invite)
5. ✅ See list of users who signed up per app
6. ✅ Change user license plans (upgrade/downgrade)
7. ✅ Accept payments via LemonSqueezy or Dodo Payments
8. ✅ Integrate Proofa into a React app in under 10 minutes
9. ✅ Receive webhook notifications for key events
10. ✅ Manage user sessions (view, revoke)
11. ✅ Project selector switches context correctly
12. ✅ Delete an app completely

---

## 📋 Pre-Launch Checklist

Before launching MVP:

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] All linter warnings fixed
- [ ] No console.errors in production
- [ ] All API endpoints have error handling
- [ ] All forms have validation

### Security
- [ ] OAuth secrets encrypted in database
- [ ] API keys never logged
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] SQL injection prevention (parameterized queries)

### Performance
- [ ] All pages load under 2 seconds
- [ ] Images optimized
- [ ] No memory leaks
- [ ] Pagination on large lists

### UX
- [ ] All buttons have loading states
- [ ] All errors have user-friendly messages
- [ ] All empty states have helpful text
- [ ] All actions have confirmation dialogs (destructive actions)
- [ ] All forms have success feedback

### Documentation
- [ ] README.md complete
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Integration guide complete

---

## 📅 Timeline Summary

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | 3-4 days | Bug fixes & DB schema |
| Phase 2 | 4-5 days | App-centric navigation |
| Phase 3 | 4-5 days | User management |
| Phase 4 | 4-5 days | License management |
| Phase 5 | 3-4 days | OAuth configuration |
| Phase 6 | 5-6 days | Payment integration |
| Phase 7 | 4-5 days | Developer tools |
| Phase 8 | 4-5 days | Settings & polish |
| Phase 9 | 4-5 days | Testing & docs |
| **TOTAL** | **35-44 days** | **~6 weeks** |

---

## 🤝 Next Steps

1. **Review this TODO** - Approve, modify, or add items
2. **Prioritize phases** - Which phase should we start with?
3. **Set up project board** - Create GitHub issues/Notion board
4. **Begin Phase 1** - Fix bugs and prepare database

---

**Questions? Concerns? Suggestions?**
Please review and let me know what to adjust before we start implementation!
