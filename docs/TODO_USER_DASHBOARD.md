# TODO: User Dashboard — Implement API Routes & Frontend

**Priority**: 🟡 High (blocks v1 release)  
**Effort**: ~4-5 days  
**Owner**: @devendra

---

## Overview

The user dashboard UI exists (4 pages: Login, Profile, Sessions, Security) but ALL 6 Gateway user routes are TODO stubs returning placeholder JSON. The user dashboard is completely non-functional.

---

## Phase 1: Backend — Implement Gateway User Routes

### 1. GET /me — Get Current User Profile
**File**: `apps/services/gateway/src/routes/user.ts:15`  
**Status**: ⬜ Not Started

**Current**: Returns `{ userId, appId, message: "User profile" }` (hardcoded).

**Implementation**:
1. Extract `auth` context (userId) from middleware
2. Call Core: `GET /v1/users/{userId}` (via `coreClient`)
3. Return actual user data

**Response Schema**:
```json
{
  "userId": "USR0xxx",
  "email": "user@example.com",
  "name": "John Doe",
  "avatarUrl": "https://...",
  "emailVerified": true,
  "identities": [
    { "id": "IDN0xxx", "provider": "google", "email": "...", "verified": true }
  ],
  "createdAt": "2026-01-15T..."
}
```

**Effort**: 3 hours

---

### 2. PATCH /me/profile — Update User Profile
**File**: `apps/services/gateway/src/routes/user.ts:38`  
**Status**: ⬜ Not Started

**Current**: Returns `{ userId, message: "Profile updated", data: body }` (echo only).

**Implementation**:
1. Validate input with Zod schema (name: 1-100 chars, avatar_url: valid URL or null)
2. Call Core: `PATCH /v1/users/{userId}` with validated body
3. Return updated user data

**Validation Schema**:
```typescript
const UpdateProfileSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    avatarUrl: z.string().url().nullable().optional(),
});
```

**Effort**: 2 hours

---

### 3. GET /me/sessions — List Active Sessions
**File**: `apps/services/gateway/src/routes/user.ts:63`  
**Status**: ⬜ Not Started

**Current**: Returns `{ userId, sessions: [], message: "User sessions" }` (empty array).

**Implementation**:
1. Get userId from auth context
2. Call Core: `GET /v1/users/{userId}/sessions` (needs Core endpoint)
3. Add pagination support (limit, offset)
4. Mark current session

**Response Schema**:
```json
{
  "sessions": [
    {
      "id": "SES0xxx",
      "createdAt": "2026-02-26T...",
      "lastSeenAt": "2026-02-26T...",
      "expiresAt": "2027-02-26T...",
      "ipAddress": "1.2.3.4",
      "userAgent": "Chrome/120...",
      "country": "US",
      "isCurrent": true
    }
  ],
  "total": 3
}
```

**Prerequisite**: Need Core endpoint to list user sessions. Check if `GET /v1/admin/users/:userId/sessions` already exists and can be reused.

**Effort**: 4 hours

---

### 4. DELETE /me/sessions/:session_id — Revoke a Session
**File**: `apps/services/gateway/src/routes/user.ts:91`  
**Status**: ⬜ Not Started

**Current**: Returns placeholder JSON.

**Implementation**:
1. Validate session_id format (must be valid public ID)
2. Prevent revoking current session (return error)
3. Call Core: `DELETE /v1/users/{userId}/sessions/{sessionId}`
4. Also delete from Gateway Redis cache
5. Return success

**Effort**: 2 hours

---

### 5. POST /me/logout — Logout Current User
**File**: `apps/services/gateway/src/routes/user.ts:110`  
**Status**: ⬜ Not Started

**Current**: Returns placeholder JSON.

**Implementation**:
1. Get current session ID from auth context
2. Delete app session from Gateway Redis
3. Clear session cookie (both user and admin variants)
4. Optionally revoke Core session
5. Return success

**Effort**: 2 hours

---

### 6. Core Service: User Session Endpoints (if missing)
**Status**: ⬜ Not Started

**Check if these Core endpoints exist**:
- `GET /v1/users/:userId/sessions` — List sessions
- `DELETE /v1/users/:userId/sessions/:sessionId` — Revoke session
- `GET /v1/users/:userId/identities` — List linked identities

**If missing, implement them in Core** (`apps/services/core/src/routes/v1/`):
- Use existing `sessionQueries` and `identityQueries` from `@proofa/db`
- Apply `s2sMiddleware`
- Return public IDs only

**Effort**: 4 hours (if needed)

---

## Phase 2: Frontend — Setup & Hooks

### 7. Add QueryClientProvider to User Dashboard
**File**: `apps/dashboard/user/src/App.tsx`  
**Status**: ⬜ Not Started

**Problem**: Missing TanStack Query setup. Any `useQuery` hook will crash.

**Fix**:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: 1, staleTime: 30_000 },
    },
});

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            {/* existing routes */}
        </QueryClientProvider>
    );
}
```

**Effort**: 30 minutes

---

### 8. Implement Toast Notification System
**Status**: ⬜ Not Started

**Problem**: No user feedback for any action.

**Implementation**: Install `sonner` and add `<Toaster />` to App root.
```bash
cd apps/dashboard/user && pnpm add sonner
```
```typescript
import { Toaster, toast } from 'sonner';
// In App.tsx: <Toaster position="top-right" />
// In hooks: toast.success("Profile updated"), toast.error("Failed to ...")
```

**Effort**: 1 hour

---

### 9. Create API Hooks
**Status**: ⬜ Not Started

Create hooks in `apps/dashboard/user/src/hooks/`:

| Hook | Endpoint | Type |
|------|----------|------|
| `useUser()` | `GET /me` | `useQuery` |
| `useUpdateProfile()` | `PATCH /me/profile` | `useMutation` |
| `useSessions()` | `GET /me/sessions` | `useQuery` |
| `useRevokeSession()` | `DELETE /me/sessions/:id` | `useMutation` |
| `useLogout()` | `POST /me/logout` | `useMutation` |

All hooks use `pingpong` from `@proofa/auth` for HTTP calls.

**Effort**: 3 hours

---

## Phase 3: Frontend — Page Implementations

### 10. Update Profile Page
**File**: `apps/dashboard/user/src/pages/Profile.tsx`  
**Status**: ⬜ Not Started

**Implementation**:
- Use `useUser()` to fetch real data
- Use `useUpdateProfile()` for save action
- Add loading state (Selia `Spinner`)
- Add error state
- Add toast feedback on save success/failure
- Show linked identities (Google, GitHub icons)

**Effort**: 3 hours

---

### 11. Update Sessions Page
**File**: `apps/dashboard/user/src/pages/Sessions.tsx`  
**Status**: ⬜ Not Started

**Implementation**:
- Use `useSessions()` to fetch real session list
- Mark current session with "Current" chip
- Add "Revoke" button with confirmation dialog
- Use `useRevokeSession()` for revoke action
- Show IP, user agent, location
- Add toast feedback

**Effort**: 3 hours

---

### 12. Add Error Boundaries
**Status**: ⬜ Not Started

**Implementation**: Add ErrorBoundary component wrapping main layout.
```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
    return (
        <Alert variant="danger">
            <p>Something went wrong</p>
            <Button onClick={resetErrorBoundary}>Try again</Button>
        </Alert>
    );
}

// In App.tsx:
<ErrorBoundary FallbackComponent={ErrorFallback}>
    <Routes>...</Routes>
</ErrorBoundary>
```

**Effort**: 1 hour

---

## Implementation Order

```
Day 1 (Backend):
  1. Implement GET /me route — 3 hours
  2. Implement PATCH /me/profile — 2 hours
  3. Implement POST /me/logout — 2 hours

Day 2 (Backend + Core):
  4. Check/implement Core session endpoints — 4 hours
  5. Implement GET /me/sessions — 4 hours
  6. Implement DELETE /me/sessions/:id — 2 hours

Day 3 (Frontend Setup):
  7. Add QueryClientProvider — 30 min
  8. Add Toast system — 1 hour
  9. Create API hooks — 3 hours
  12. Add Error Boundaries — 1 hour

Day 4 (Frontend Pages):
  10. Update Profile page — 3 hours
  11. Update Sessions page — 3 hours
  Polish & testing — 2 hours
```

---

## Definition of Done

- [ ] All 6 Gateway user routes return real data from Core
- [ ] Input validated with Zod schemas
- [ ] QueryClientProvider set up in user dashboard
- [ ] Toast notifications working for all actions
- [ ] Profile page shows real user data with edit capability
- [ ] Sessions page shows real sessions with revoke capability
- [ ] Current session marked and protected from revocation
- [ ] Error boundaries prevent white-screen crashes
- [ ] All changes pass TypeScript compilation
- [ ] Manual test: full user flow works end-to-end
