# Proofa Authentication Flows — Clarifications

**Version:** 1.0  
**Date:** December 14, 2025  
**Purpose:** Implementation guide for login, identity collision, and session handling

---

## 1. First-Time Login (No Existing Account)

### Flow: Create Account via Google

```
User → mockly.codes (first time)
  ↓
Click "Login" → Redirect to core auth pages
  ↓
Click "Create Account" → "Sign in with Google"
  ↓
[OAuth with Google]
  ↓
Core receives callback:
  1. Extract: provider=google, provider_user_id=xxxx, email=john@example.com
  2. Query: (provider='google', provider_user_id='xxxx') in identities
  3. Result: ❌ NOT FOUND (new identity)
  4. Check core session: ❌ NONE (user not logged in)
  5. Check collision: email 'john@example.com' in users table?
     - ❌ NO → Proceed with new user
     - ✅ YES → Collision! (see Rule 2 below)
  6. ✅ Create new user (john@example.com)
  7. ✅ Create identity (google, xxxx)
  8. ✅ Create core session
  9. Auto-create license for app (mockly)
  10. Issue auth_code (120s TTL)
  ↓
Core redirects to Gateway: /auth/callback?code=XXX
  ↓
Gateway exchanges code with Core (S2S)
  ↓
Gateway creates mockly session (pp_app_session)
  ↓
Gateway redirects to mockly.codes
  ↓
✅ User logged in to mockly
```

**Sessions created:**
- ✅ `proofa_session` (core, global, 7 days rolling)
- ✅ `pp_app_session` (gateway, mockly-scoped, configurable 1-365 days)

---

## 2. Returning User, Same App

### Flow: Continue as <username>

```
User → mockly.codes (has proofa_session)
  ↓
Core detects valid proofa_session
  ↓
UI shows: "Continue as John Doe" + "Switch account"
  ↓
Click "Continue as John Doe"
  ↓
Core sends user to app via fast path
  ↓
Gateway creates NEW mockly session (pp_app_session)
  ↓
✅ User logged in to mockly (no provider re-auth needed)
```

**Why fast path?**
- Identity already verified via existing core session
- No need to re-authenticate with provider

---

## 3. Returning User, Different App (Same Core Session)

### Flow: Continue as <username>, then Link New Provider

```
User → pingpong.codes (has proofa_session from before)
  ↓
Core detects valid proofa_session
  ↓
UI shows: "Continue as John Doe"
  ↓
Click "Continue as John Doe"
  ↓
App says: "required_providers: [github]"
  ↓
[OAuth with GitHub]
  ↓
Core receives callback:
  1. Extract: provider=github, provider_user_id=yyyy, email=john@github.com
  2. Query: (provider='github', provider_user_id='yyyy') in identities
  3. Result: ❌ NOT FOUND (new GitHub identity)
  4. Check core session: ✅ VALID (user is John Doe)
  5. ✅ Auto-link GitHub to existing user_id
  6. Auto-create license for app (pingpong)
  7. Issue auth_code
  ↓
Core redirects to Gateway: /auth/callback?code=XXX
  ↓
Gateway exchanges code with Core
  ↓
Gateway creates pingpong session (pp_app_session)
  ↓
✅ User logged in to pingpong with GitHub identity
```

**Key point:**
- No OTP needed (user already authenticated via core session)
- GitHub identity automatically linked to existing user
- New identity row created: `user_id=123 | provider=github | provider_user_id=yyyy`

---

## 4. Identity Collision (The Only Case)

### Flow: Create Account, Email Already Exists

```
User → pingpong.codes (NO core session, first time)
  ↓
Click "Create Account" → "Sign in with GitHub"
  ↓
[OAuth with GitHub]
  ↓
Core receives callback:
  1. Extract: provider=github, provider_user_id=yyyy, email=john@example.com
  2. Query: (provider='github', provider_user_id='yyyy') in identities
  3. Result: ❌ NOT FOUND (new GitHub identity)
  4. Check core session: ❌ NONE (user not logged in)
  5. Check collision: email 'john@example.com' in users table?
     - ❌ NO → Create new user (normal flow, skip to step 10)
     - ✅ YES → COLLISION DETECTED! Continue below...
  6. ⚠️ Email already exists (owned by another account)
  7. Store in Redis: pending_link:{email}={user_id_matching_email},{provider},{provider_user_id} (TTL 10 min)
  8. ❌ Do NOT create identity yet
  9. ❌ Do NOT create session yet
  10. Return response: { collision: true, email: 'john@example.com', message: 'Email already in use. Verify to link.' }
  ↓
Frontend receives collision response
  ↓
UI shows: "Email john@example.com is already registered. Verify with OTP?"
  ↓
Click "Verify with OTP"
  ↓
Core sends OTP to john@example.com (POST /v1/email/start)
  ↓
User enters OTP (POST /v1/email/verify)
  ↓
Core validates OTP:
  1. Lookup email_verifications by email
  2. Verify OTP hash
  3. Mark consumed
  4. ✅ Email verified
  5. ✅ Now we know GitHub identity belongs to john@example.com
  6. Link GitHub identity to existing user
  7. ✅ Create core session
  8. Auto-create license for app (pingpong)
  9. Issue auth_code
  ↓
Core redirects to Gateway: /auth/callback?code=XXX
  ↓
Gateway exchanges code with Core
  ↓
Gateway creates pingpong session (pp_app_session)
  ↓
✅ User logged in to pingpong with GitHub identity linked
```

**Why OTP required?**
- Prevent account takeover
- Verify that GitHub identity belongs to john@example.com
- Only then link to existing account

**Identity created:**
- `user_id=123 | provider=github | provider_user_id=yyyy`
- (Same user now has Google + GitHub identities)

---

## 5. Key Decision Points

### Question: What if core session expires?

**Answer:**
- Core session expires after 7 days of inactivity
- User must re-authenticate with provider (full OAuth flow)
- App session can still be valid (per-app TTL)
- If app session valid but core expired: user sees login screen, redirected to core auth

### Question: Can user have multiple identities with same provider?

**Answer:**
- NO. `UNIQUE(provider, provider_user_id)` constraint
- Each provider identity belongs to exactly one user
- But one user can have multiple providers (Google + GitHub)

### Question: What if email changes on provider side?

**Answer:**
- Identity is keyed on `provider_user_id` (stable, never changes)
- Email stored on identity is informational only
- If email changes on provider: we still link to existing identity (no collision)

### Question: Can user delete an identity?

**Answer:**
- Phase 2 feature
- For MVP: no deletion (once linked, stays linked)

---

## 6. Session State Matrix

| User State | Core Session | App Session | Status |
|-----------|--------------|-------------|--------|
| First login | ✅ Created | ✅ Created | Logged in to app |
| App session expires | ✅ Active | ❌ Expired | Must re-login to app (fast path) |
| Core session expires | ❌ Expired | ✅ Active | Core invalid, app still has session (edge case) |
| Both expire | ❌ Expired | ❌ Expired | Must re-authenticate (full flow) |
| Multiple apps | ✅ 1 global | ✅ 1 per app | Can access all apps |

---

## 7. Implementation Checklist

### Core Routes

- [ ] `GET /v1/auth/start` — Initiate OAuth flow
- [ ] `GET /v1/auth/callback/:provider` — OAuth callback (with collision detection)
- [ ] `POST /v1/auth/exchange` — Code exchange (S2S)
- [ ] `POST /v1/email/start` — Send OTP
- [ ] `POST /v1/email/verify` — Verify OTP

### Core Logic (In callback/:provider)

- [ ] Extract provider profile (provider, provider_user_id, email)
- [ ] Rule 1: Check if identity exists → login
- [ ] Rule 2: Check for email collision (if no core session)
- [ ] Rule 3: Auto-link if core session valid
- [ ] Rule 4: Create new user if no collision
- [ ] Create/refresh core session
- [ ] Auto-create license
- [ ] Issue auth_code

### Gateway Routes

- [ ] `GET /auth/start` → Redirect to core
- [ ] `GET /auth/callback` → Code exchange + session creation

### Frontend (Auth Pages at Core)

- [ ] Show "Continue as <username>" if core session valid
- [ ] Show "Create account" + "Sign in" if no core session
- [ ] Handle collision detection → OTP verification
- [ ] Show OTP entry screen during collision flow

---

## 8. Database Queries Needed

### Core Queries

```sql
-- Rule 1: Find existing identity
SELECT user_id FROM identities 
WHERE provider = ? AND provider_user_id = ?

-- Rule 2a: Check email collision
SELECT id FROM users WHERE primary_email = ?

-- Rule 2b: Get user for collision
SELECT id, primary_email FROM users WHERE primary_email = ?

-- Rule 3: Create/update identity
INSERT INTO identities (...) VALUES (...)
ON CONFLICT DO UPDATE ...

-- Rule 4: Create new user
INSERT INTO users (...) VALUES (...)

-- Create core session
INSERT INTO sessions (...) VALUES (...)

-- Auto-create license
INSERT INTO licenses (...) VALUES (...)
```

---

**End of Clarifications Document**
