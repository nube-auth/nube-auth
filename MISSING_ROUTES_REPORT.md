# Missing Routes Report

## Summary

After auditing all API calls from the admin dashboard against the Gateway/Core route definitions, I found **CRITICAL MISSING ROUTES** that will cause 404 errors.

---

## ❌ MISSING ROUTES IN GATEWAY

### 1. OAuth Provider CRUD Routes
Frontend calls these but they DON'T EXIST in Gateway:

```typescript
// ❌ NOT DEFINED
POST   /v1/admin/oauth-providers
PATCH  /v1/admin/oauth-providers/:providerId  
DELETE /v1/admin/oauth-providers/:providerId
```

**Frontend usage:**
- `hooks/api.ts` line 583: `useCreateOAuthProvider()`
- `hooks/api.ts` line 608: `useUpdateOAuthProvider()`
- `hooks/api.ts` line 626: `useDeleteOAuthProvider()`

**These routes ARE defined in Core** (`apps/core/src/routes/v1/admin/index.ts` lines 132-136) but NOT proxied through Gateway!

---

### 2. Payment Provider CRUD Routes  
Frontend calls these but they DON'T EXIST in Gateway:

```typescript
// ❌ NOT DEFINED
POST   /v1/admin/payment-providers
PATCH  /v1/admin/payment-providers/:providerId
DELETE /v1/admin/payment-providers/:providerId
```

**Frontend usage:**
- `hooks/api.ts` line 721: `useCreatePaymentProvider()`
- `hooks/api.ts` line 744: `useUpdatePaymentProvider()`
- `hooks/api.ts` line 762: `useDeletePaymentProvider()`

**These routes ARE defined in Core** (`apps/core/src/routes/v1/admin/index.ts` lines 139-145) but NOT proxied through Gateway!

---

### 3. Payment Provider Selection Routes
Frontend calls these but they DON'T EXIST in Gateway:

```typescript
// ❌ NOT DEFINED  
GET  /v1/admin/apps/:appId/payment/available
GET  /v1/admin/apps/:appId/payment/selected
POST /v1/admin/apps/:appId/payment/select
```

**Frontend usage:**
- `hooks/api.ts` line 685: `useAvailablePaymentProviders()`
- `hooks/api.ts` line 700: `useSelectedPaymentProvider()`
- `hooks/api.ts` line 779: `useSelectPaymentProvider()`

**These routes ARE defined in Core** (`apps/core/src/routes/v1/admin/index.ts` lines 140-145) but NOT proxied through Gateway!

---

## ⚠️ WRONG PATH PREFIX IN FRONTEND

### Files using `/api/` instead of `/v1/`

1. **`apps/dashboard/admin/src/pages/AppApiKeys.tsx`**
   - Line 27: `/api/admin/projects/.../api-keys` → Should be `/v1/admin/...`
   - Line 66: `/api/admin/projects/.../regenerate-secret` → Should be `/v1/admin/...`
   - Line 96: `/api/admin/projects/.../regenerate-token` → Should be `/v1/admin/...`
   
   **Status:** ✅ Gateway routes EXIST at correct path `/v1/admin/...`

2. **`apps/dashboard/admin/src/pages/ProjectSettings.tsx`**
   - Line 292: `/api/admin/projects/:projectId` → Should be `/v1/admin/...`
   
   **Status:** ✅ Gateway route EXISTS at `/v1/admin/projects/:projectId`

3. **`apps/dashboard/admin/src/pages/AppSettings.tsx`**
   - Line 487: `/api/admin/projects/:projectId/apps/:appId` → Should be `/v1/admin/...`
   
   **Status:** ✅ Gateway route EXISTS at `/v1/admin/projects/:projectId/apps/:appId`

4. **`apps/dashboard/admin/src/pages/Login.tsx`**
   - Line 27: `/api/auth/login` → Should use OAuth flow
   - Line 39, 82: `/api/admin/invitations/:code/accept` → Should be `/v1/admin/...`
   - Line 76: `/api/admin/me` → Should be `/v1/admin/me`
   
   **Status:** ⚠️ Needs refactoring to use proper OAuth flow

---

## ✅ CORRECTLY DEFINED ROUTES

These routes are properly defined in Gateway and called correctly by frontend:

- ✅ All project routes (`/v1/admin/projects/*`)
- ✅ All app routes (`/v1/admin/projects/:projectId/apps/*`)
- ✅ All user routes (`/v1/admin/projects/:projectId/apps/:appId/users/*`)
- ✅ All plan routes (`/v1/admin/projects/:projectId/apps/:appId/plans/*`)
- ✅ All team member routes (`/v1/admin/projects/:projectId/members/*`)
- ✅ All invitation routes (`/v1/admin/projects/:projectId/invitations/*`)
- ✅ Payment config routes (`/v1/admin/projects/:projectId/payment-config`)
- ✅ OAuth selection routes (`/v1/admin/apps/:appId/oauth/available`, `/oauth/selected`, `/oauth/select`)
- ✅ API keys routes (`/v1/admin/projects/:projectId/apps/:appId/api-keys`, `/regenerate-secret`, `/regenerate-token`)

---

## 🔧 FIXES NEEDED

### Priority 1: Add Missing Gateway Routes (CRITICAL)

Gateway needs to proxy these Core routes:

```typescript
// Add to apps/gateway/src/routes/admin.ts

// OAuth Provider CRUD
adminRoutes.post("/oauth-providers", proxyToCoreAdmin);
adminRoutes.patch("/oauth-providers/:providerId", proxyToCoreAdmin);
adminRoutes.delete("/oauth-providers/:providerId", proxyToCoreAdmin);

// Payment Provider CRUD
adminRoutes.post("/payment-providers", proxyToCoreAdmin);
adminRoutes.patch("/payment-providers/:providerId", proxyToCoreAdmin);
adminRoutes.delete("/payment-providers/:providerId", proxyToCoreAdmin);

// Payment Provider Selection
adminRoutes.get("/apps/:appId/payment/available", proxyToCoreAdmin);
adminRoutes.get("/apps/:appId/payment/selected", proxyToCoreAdmin);
adminRoutes.post("/apps/:appId/payment/select", proxyToCoreAdmin);
```

### Priority 2: Fix Frontend Path Prefixes

Update these files to use `/v1/` instead of `/api/`:

1. `apps/dashboard/admin/src/pages/AppApiKeys.tsx` (3 occurrences)
2. `apps/dashboard/admin/src/pages/ProjectSettings.tsx` (1 occurrence)
3. `apps/dashboard/admin/src/pages/AppSettings.tsx` (1 occurrence)
4. `apps/dashboard/admin/src/pages/Login.tsx` (4 occurrences)

---

## 📊 Statistics

- **Total admin routes in Gateway:** 53
- **Total API calls from frontend:** 61
- **Missing routes:** 9 (OAuth/Payment provider CRUD + selection)
- **Wrong path prefix:** 9 occurrences across 4 files
- **Correctly defined:** 43 routes

---

## Next Steps

1. ✅ Add missing proxy routes to Gateway
2. ✅ Fix frontend path prefixes from `/api/` to `/v1/`
3. ✅ Test all OAuth provider operations
4. ✅ Test all Payment provider operations
5. ✅ Test API keys operations
6. ✅ Test delete operations for projects and apps
