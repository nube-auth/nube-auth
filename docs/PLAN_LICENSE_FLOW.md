# Plan & License Flow — Current State

> Audit of the plan creation and license management flow across frontend, gateway, core service, and database.

---

## Table of Contents

- [1. Plan Creation Flow](#1-plan-creation-flow)
  - [1.1 Frontend (Admin Dashboard)](#11-frontend-admin-dashboard)
  - [1.2 API Call](#12-api-call)
  - [1.3 Gateway Proxy](#13-gateway-proxy)
  - [1.4 Core Service Route](#14-core-service-route)
  - [1.5 Database](#15-database)
- [2. Plan Update Flow](#2-plan-update-flow)
- [3. Plan Delete Flow](#3-plan-delete-flow)
- [4. License Grant Flow](#4-license-grant-flow)
- [5. License Change Plan Flow](#5-license-change-plan-flow)
- [6. Database Schema](#6-database-schema)
- [7. Identified Issues](#7-identified-issues)
- [8. Recommended Fixes](#8-recommended-fixes)

---

## 1. Plan Creation Flow

### 1.1 Frontend (Admin Dashboard)

**File:** `apps/dashboard/admin/src/pages/AppLicenses.tsx`

The plan creation modal collects the following fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | text | ✅ | e.g., "Pro Plan" |
| `slug` | text | ✅ | Auto-lowercased, spaces → dashes. Immutable after creation |
| `description` | textarea | ❌ | Brief description |
| `monthlyPrice` | number (step 0.01) | ❌ | User enters **dollars** (e.g., 9.99) |
| `yearlyPrice` | number (step 0.01) | ❌ | User enters **dollars** |
| `oneTimePrice` | number (step 0.01) | ❌ | User enters **dollars** |
| `durationDays` | number | ❌ | Leave empty = lifetime |
| `trialEnabled` | checkbox | ❌ | Toggles trial days field visibility |
| `trialDays` | number | ❌ | Only shown when trial enabled |
| `features` | list (add/remove) | ❌ | Added one-by-one via input + "Add" button |
| `displayOrder` | number | ❌ | Hidden, defaults to 0 |

**Price conversion in `handleSavePlan()`:**
- Dollars → cents: `Math.round(parseFloat(value) * 100)`

### 1.2 API Call

**Create:** `POST ${GATEWAY}/v1/admin/projects/${projectId}/apps/${appId}/plans`

**Payload sent (snake_case):**
```json
{
  "name": "Pro Plan",
  "slug": "pro",
  "description": "...",
  "monthly_price": 999,
  "yearly_price": 9999,
  "one_time_price": null,
  "duration_days": null,
  "trial_enabled": false,
  "trial_days": null,
  "features": ["Feature 1", "Feature 2"],
  "display_order": 0
}
```

### 1.3 Gateway Proxy

**File:** `apps/services/gateway/src/routes/admin.ts`

The gateway's catch-all `adminRoutes.all("/*")` handler:
1. Validates session via `getAuth(c)`
2. Keeps the **full path as-is** and forwards to Core: `${CORE_URL}/v1/admin/projects/${projectId}/apps/${appId}/plans`
3. Adds headers: `X-Proofa-S2S-Token`, `X-Proofa-User-Id` (public ID), `X-Proofa-Session-Id`
4. Proxies the response back

### 1.4 Core Service Route

**File:** `apps/services/core/src/routes/v1/admin/plans.ts`

**Routing chain:**
- `index.ts`: `app.route("/v1/admin", adminRoutes)`
- `admin/index.ts`: `router.route("/plans", plansRouter)`
- `plans.ts`: `plansRouter.post("/")`

**Effective path:** `POST /v1/admin/plans`

**🔴 PATH MISMATCH:** Frontend calls `/v1/admin/projects/:pid/apps/:aid/plans` but Core expects `/v1/admin/plans`

**Zod schema (`CreatePlanSchema`):**
```typescript
{
  appId: z.string(),                                    // 🔴 expects camelCase
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-_]+$/),
  description: z.string().optional(),
  monthlyPrice: z.number().int().nonnegative().optional().nullable(),  // 🔴 camelCase
  yearlyPrice: z.number().int().nonnegative().optional().nullable(),
  oneTimePrice: z.number().int().nonnegative().optional().nullable(),
  durationDays: z.number().int().positive().optional().nullable(),
  trialEnabled: z.boolean().optional().default(false),
  trialDays: z.number().int().positive().optional().nullable(),
  features: z.record(z.string(), z.any()).optional().default({}),      // 🔴 expects object
  isActive: z.boolean().optional().default(true),
}
```

**🔴 FIELD CASING MISMATCH:** Frontend sends `snake_case` (`monthly_price`, `trial_enabled`) but Zod expects `camelCase` (`monthlyPrice`, `trialEnabled`)

**🔴 FEATURES TYPE MISMATCH:** Frontend sends `string[]` but Zod expects `Record<string, any>`

**Business logic (if validation passed):**
1. Validates admin user exists (from `X-Proofa-User-Id` header)
2. Validates app exists via `appQueries.findByPublicId(db, validated.appId)`
3. Requires at least one pricing option (monthly, yearly, or one-time)
4. Checks slug uniqueness per app via `planQueries.findByAppAndSlug()`
5. Inserts into `plans` table with generated `public_id: id.plan()`
6. Creates audit log entry (`plan.created`)

**Response (camelCase):**
```json
{
  "plan": {
    "id": "PLN0...",
    "appId": "APP0...",
    "name": "Pro Plan",
    "slug": "pro",
    "monthlyPrice": 999,
    "yearlyPrice": 9999,
    "oneTimePrice": null,
    "durationDays": null,
    "trialEnabled": false,
    "trialDays": null,
    "features": {},
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 1.5 Database

Inserts into `plans` table. Prices stored as **integer cents**. See [Database Schema](#6-database-schema).

---

## 2. Plan Update Flow

**Frontend:** `PATCH ${GATEWAY}/v1/admin/projects/${projectId}/apps/${appId}/plans/${planId}`
**Core route:** `PATCH /v1/admin/plans/:appId/:planId`

**Same path and casing mismatches as creation.**

**Versioning logic (in Core):**
- If **pricing changed** → creates a **new plan version**:
  - Generates new slug: `{baseSlug}_v{N+1}` (e.g., `pro_v2`)
  - Marks old plan as `is_active: false`
  - Creates new plan row with updated pricing
  - Audit log: `plan.versioned`
- If **no pricing change** → updates in-place:
  - Updates name, description, trial, features, etc.
  - Audit log: `plan.updated`

---

## 3. Plan Delete Flow

**Frontend:** `DELETE ${GATEWAY}/v1/admin/projects/${projectId}/apps/${appId}/plans/${planId}`
**Core route:** `DELETE /v1/admin/plans/:appId/:planId`

**Soft delete:** Sets `is_active: false` and `deleted_at: now()`. Audit log: `plan.deleted`.

---

## 4. License Grant Flow

**File:** `apps/services/core/src/routes/v1/admin/index.ts`

**Endpoint:** `POST /v1/admin/license/grant`

**Payload:**
```json
{
  "userId": "USER0...",
  "appId": "APP0...",
  "plan": "pro",              // optional, defaults to "pro"
  "validUntil": 1735689600000 // optional, epoch ms
}
```

**Logic:**
1. Validates user exists via `userQueries.findByPublicId()`
2. Validates app exists via `appQueries.findByPublicId()`
3. Resolves plan:
   - Looks up by slug via `planQueries.findByAppAndSlug(db, app.id, planSlug)`
   - Falls back to first active plan via `planQueries.findActiveByAppId()`
   - Returns 400 if no plan found
4. Creates/updates license via `licenseQueries.upsert(db, userId, appId, {...})`
   - **Upsert:** Checks `licenses_user_app_unique` constraint — one license per user per app
   - If exists → updates `plan_id`, `status`, `valid_until`  
   - If not → inserts new license row
5. Creates audit log (`license.granted`)

**Response:**
```json
{
  "message": "License granted successfully",
  "licenseId": "LIC0...",
  "userId": "USER0...",
  "appId": "APP0...",
  "plan": "pro",
  "validUntil": null,
  "grantedAt": "..."
}
```

---

## 5. License Change Plan Flow

**File:** `apps/dashboard/admin/src/pages/AppLicenses.tsx` — `handleChangePlan()`

**Frontend:** Opens a modal with a `Select` dropdown to pick a new plan.

**🔴 HARDCODED OPTIONS:** The dropdown has hardcoded options (`free`, `trial`, `pro`, `enterprise`) instead of using the fetched plans.

**API call:** `PATCH ${GATEWAY}/v1/admin/projects/${projectId}/apps/${appId}/users/${userId}`
**Payload:** `{ "license_plan": newPlan }`

**🔴 ENDPOINT DOES NOT EXIST:** There is no `PATCH /:projectId/apps/:appId/users/:userId` route in any backend router. This will 404 through the gateway proxy. **This is a dead feature.**

---

## 6. Database Schema

### Plans Table

```sql
CREATE TABLE plans (
  id              SERIAL PRIMARY KEY,
  public_id       VARCHAR(255) NOT NULL UNIQUE,       -- PLN0...
  app_id          INTEGER NOT NULL,                    -- FK to apps.id
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL,               -- unique per app
  description     TEXT,
  monthly_price   INTEGER,                             -- cents
  yearly_price    INTEGER,                             -- cents
  one_time_price  INTEGER,                             -- cents
  duration_days   INTEGER,                             -- null = lifetime
  trial_enabled   BOOLEAN NOT NULL DEFAULT false,
  trial_days      INTEGER,
  features        JSONB,                               -- flexible structure
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMP
);

-- Indexes: plans_app_id_idx, plans_slug_idx, plans_status_idx
```

### Licenses Table

```sql
CREATE TABLE licenses (
  id          SERIAL PRIMARY KEY,
  public_id   VARCHAR(255) NOT NULL UNIQUE,           -- LIC0...
  user_id     INTEGER NOT NULL REFERENCES users(id),
  app_id      INTEGER NOT NULL REFERENCES apps(id),
  plan_id     INTEGER NOT NULL REFERENCES plans(id),
  status      VARCHAR(20) NOT NULL DEFAULT 'active',
  valid_until TIMESTAMP,                               -- null = no expiry
  is_test     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMP,

  UNIQUE (user_id, app_id)                             -- one license per user per app
);

-- Indexes: user_id, app_id, plan_id, status, (is_test, created_at)
```

### License History Table (Unused)

```sql
CREATE TABLE license_history (
  id                       SERIAL PRIMARY KEY,
  public_id                VARCHAR(255) NOT NULL UNIQUE,
  license_id               INTEGER NOT NULL REFERENCES licenses(id),
  change_type              VARCHAR(50) NOT NULL,                    -- created, plan_changed, status_changed, etc.
  old_value                JSONB,
  new_value                JSONB,
  reason                   VARCHAR(50) NOT NULL,                    -- purchase, admin_manual, etc.
  changed_by_user_id       INTEGER REFERENCES users(id),
  changed_by_system        BOOLEAN NOT NULL DEFAULT false,
  payment_transaction_id   INTEGER REFERENCES payment_transactions(id),
  notes                    TEXT,
  created_at               TIMESTAMP NOT NULL DEFAULT now()
);
```

**🟡 `license_history` is defined in schema but never written to anywhere in the codebase.**

---

## 7. Identified Issues

### 🔴 Critical (Breaking)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Path mismatch** | Frontend → Core | Frontend calls `/v1/admin/projects/:pid/apps/:aid/plans`, Core expects `/v1/admin/plans`. All plan CRUD operations (create, list, update, delete) will **404**. |
| 2 | **Field casing mismatch** | Frontend → Core | Frontend sends `snake_case` keys (`monthly_price`, `trial_enabled`, `one_time_price`), Zod schema expects `camelCase` (`monthlyPrice`, `trialEnabled`, `oneTimePrice`). Zod validation will **reject the payload**. |
| 3 | **Missing `appId` in payload** | Frontend → Core | Frontend doesn't include `appId` in the POST body. The Zod `CreatePlanSchema` requires `appId: z.string()`. Validation will **fail**. |
| 4 | **Change Plan endpoint missing** | Frontend → Core | `PATCH /v1/admin/projects/:pid/apps/:aid/users/:uid` with `{ license_plan }` — this route doesn't exist in any backend router. **Dead feature, always 404.** |

### 🟡 Moderate

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 5 | **Features type mismatch** | Frontend → Core | Frontend sends `features` as `string[]`, Zod expects `Record<string, any>`. May cause validation error depending on how Zod coerces arrays. |
| 6 | **`license_history` unused** | Database/Core | Schema is defined but no code writes to it. All license changes (grant, plan change, revocation) lack detailed audit trail. |
| 7 | **Hardcoded plan options** | Frontend | "Change Plan" modal uses hardcoded options (`free`, `trial`, `pro`, `enterprise`) instead of fetching available plans for the app. |
| 8 | **`display_order` not sent** | Frontend → Core | Frontend includes `display_order` but Zod schema doesn't accept it. Silently dropped. |

### 🟢 Minor

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 9 | **License delete is a stub** | Core (`admin/index.ts`) | `DELETE /v1/admin/licenses/:licenseId` just returns success without actually deleting. |
| 10 | **No per-app license list endpoint** | Core | `licenseManagementRouter` has `GET /:projectId/licenses` but no `GET /:projectId/apps/:appId/licenses` for filtering by app efficiently. |

---

## 8. Recommended Fixes

### Fix #1: Align API Paths (pick one approach)

**Option A — Fix frontend to match Core routes:**
```
# Plans CRUD
GET    /v1/admin/plans/:appId           → list plans
POST   /v1/admin/plans                  → create plan (appId in body)
PATCH  /v1/admin/plans/:appId/:planId   → update plan
DELETE /v1/admin/plans/:appId/:planId   → delete plan
```

**Option B — Fix Core routes to match frontend paths (preferred — RESTful):**
```
# Mount plans under the apps router
GET    /v1/admin/projects/:pid/apps/:aid/plans           → list plans
POST   /v1/admin/projects/:pid/apps/:aid/plans           → create plan
PATCH  /v1/admin/projects/:pid/apps/:aid/plans/:planId   → update plan
DELETE /v1/admin/projects/:pid/apps/:aid/plans/:planId   → delete plan
```

### Fix #2: Align Field Casing

Either:
- **Frontend sends camelCase** to match existing Zod schema, OR
- **Backend accepts snake_case** (add `.transform()` or a middleware)

### Fix #3: Add `appId` to Frontend Payload

Frontend `handleSavePlan()` should include `appId` in the POST body.

### Fix #4: Build Change Plan Endpoint

Create `PATCH /v1/admin/projects/:pid/apps/:aid/licenses/:licenseId` that:
1. Accepts `{ planId: string }`
2. Validates plan exists and belongs to the app
3. Updates `licenses.plan_id`
4. Writes to `license_history`

### Fix #5: Fix Features Type

Either:
- Frontend converts `string[]` → `Record<string, boolean>` before sending
- Backend Zod accepts `z.union([z.array(z.string()), z.record(z.string(), z.any())])`

### Fix #6: Use `license_history`

Add writes to `license_history` in:
- `license/grant` endpoint (change_type: "created")
- Future change plan endpoint (change_type: "plan_changed")
- License revocation (change_type: "deleted")

### Fix #7: Dynamic Plan Options in Change Plan Modal

Replace hardcoded plan options with the fetched `plans` array.
