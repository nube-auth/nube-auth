# Configuration Unit Standardization

**Date**: January 2026  
**Status**: COMPLETED  
**Scope**: All TTL and duration configurations

---

## Summary

Standardized all time-based configuration variables to use **seconds** as the base unit. This eliminates confusion from mixing hours, days, and seconds across the codebase.

---

## Changes Made

### 1. Core Service (`apps/services/core`)

#### `/src/config/env.ts`
- ❌ `CORE_SESSION_TTL_DAYS` → ✅ `CORE_SESSION_TTL_SECONDS`
  - Default: `31536000` (365 days)
  - Controls how long the global core session lasts

- ❌ `SESSION_REFRESH_THRESHOLD_HOURS` → ✅ `SESSION_REFRESH_THRESHOLD_SECONDS`
  - Default: `2592000` (30 days)
  - Only extend session TTL if last activity was more than this threshold ago

#### `/src/routes/v1/auth/index.ts`
- Updated to use `env.CORE_SESSION_TTL_SECONDS * 1000` (milliseconds for Date)
- Removed manual conversion: `* 24 * 60 * 60 * 1000`

---

### 2. Gateway Service (`apps/services/gateway`)

#### `/src/config/env.ts`
- ❌ `INVITATION_EXPIRY_DAYS` → ✅ `INVITATION_EXPIRY_SECONDS`
  - Default: `604800` (7 days)
  - Controls how long project invitations remain valid

#### `/src/config/constants.ts`
- Updated export: `INVITATION_EXPIRY_SECONDS`

---

### 3. Shared Package (`apps/packages/shared`)

#### `/src/constants/index.ts`
- ❌ `CORE_SESSION_TTL_DAYS` (removed) → ✅ `CORE_SESSION_TTL_SECONDS`
  - Value: `31536000` (365 days)
  - Calculation: `365 * 24 * 60 * 60`

- ❌ `CORE_SESSION_REFRESH_INTERVAL_HOURS` → ✅ `CORE_SESSION_REFRESH_INTERVAL_SECONDS`
  - Value: `2592000` (30 days)
  - Calculation: `30 * 24 * 60 * 60`

#### `/src/index.ts`
- Updated exports to use new constant names
- Removed deprecated `CORE_SESSION_TTL_DAYS` export

---

### 4. Environment Configuration

#### `/.env.example`
- Removed duplicate/deprecated entries:
  - ❌ `CORE_SESSION_TTL_DAYS=7`
  - ❌ `INVITATION_EXPIRY_DAYS=7`

- All TTL variables now use seconds with helpful comments:
  ```env
  # Core session TTL in seconds (default: 31536000 = 365 days)
  CORE_SESSION_TTL_SECONDS=31536000

  # Session refresh threshold in seconds (default: 2592000 = 30 days)
  SESSION_REFRESH_THRESHOLD_SECONDS=2592000

  # User session TTL in seconds (default: 31536000 = 365 days)
  SESSION_TTL_SECONDS=31536000

  # Admin session TTL in seconds (default: 7200 = 2 hours)
  ADMIN_SESSION_TTL_SECONDS=7200

  # Admin inactivity timeout in seconds (default: 900 = 15 minutes)
  ADMIN_INACTIVITY_TIMEOUT_SECONDS=900

  # Invitation expiry in seconds (default: 604800 = 7 days)
  INVITATION_EXPIRY_SECONDS=604800
  ```

---

## Migration Checklist

For developers updating their local environments:

- [ ] Pull latest code from `trunk` branch
- [ ] Update `.env` file with new variable names:
  - `CORE_SESSION_TTL_DAYS` → `CORE_SESSION_TTL_SECONDS`
  - `SESSION_REFRESH_THRESHOLD_HOURS` → `SESSION_REFRESH_THRESHOLD_SECONDS`
  - `INVITATION_EXPIRY_DAYS` → `INVITATION_EXPIRY_SECONDS`
- [ ] Use seconds-based values (see conversion table below)
- [ ] Restart all services

---

## Conversion Reference

| Days | Hours | Seconds |
|------|-------|---------|
| 1 day | 24 hours | 86400 |
| 7 days | 168 hours | 604800 |
| 30 days | 720 hours | 2592000 |
| 365 days | 8760 hours | 31536000 |

| Minutes | Seconds |
|---------|---------|
| 1 minute | 60 |
| 5 minutes | 300 |
| 10 minutes | 600 |
| 15 minutes | 900 |
| 30 minutes | 1800 |

| Hours | Seconds |
|-------|---------|
| 1 hour | 3600 |
| 2 hours | 7200 |
| 24 hours | 86400 |

---

## Rationale

### Why Seconds?

1. **Consistency**: Single unit across all configurations
2. **Precision**: Most granular unit, no loss of precision
3. **Industry Standard**: JWT expiry, Redis TTL, HTTP cache all use seconds
4. **Code Simplicity**: No conversion math in application logic
5. **Error Prevention**: Mixing units (hours/days/seconds) causes bugs

### Example Bug Prevented

```typescript
// ❌ BEFORE - Mixed units, easy to make mistakes
const sessionTtl = CORE_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000; // milliseconds
const refreshThreshold = SESSION_REFRESH_THRESHOLD_HOURS * 60 * 60 * 1000; // milliseconds
// Easy to forget conversions or use wrong multiplier

// ✅ AFTER - Consistent units, clear intent
const sessionTtl = env.CORE_SESSION_TTL_SECONDS * 1000; // milliseconds
const refreshThreshold = env.SESSION_REFRESH_THRESHOLD_SECONDS * 1000; // milliseconds
// Clear: always multiply seconds by 1000 for milliseconds
```

---

## Verification

All old variable names removed:
```bash
# Should return no results
grep -r "CORE_SESSION_TTL_DAYS" apps/ packages/
grep -r "SESSION_REFRESH_THRESHOLD_HOURS" apps/ packages/
grep -r "INVITATION_EXPIRY_DAYS" apps/ packages/
grep -r "CORE_SESSION_REFRESH_INTERVAL_HOURS" apps/ packages/
```

---

## Related Documentation

- [ADMIN_SESSION_SECURITY.md](./ADMIN_SESSION_SECURITY.md) - Admin session TTL rationale (2 hours)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Session architecture overview
- `.env.example` - Complete configuration reference

---

## Files Modified

1. `/apps/services/core/src/config/env.ts` - Interface and config
2. `/apps/services/core/src/routes/v1/auth/index.ts` - Usage update
3. `/apps/services/gateway/src/config/env.ts` - Interface and config
4. `/apps/services/gateway/src/config/constants.ts` - Export update
5. `/apps/packages/shared/src/constants/index.ts` - Constant definitions
6. `/apps/packages/shared/src/index.ts` - Export update
7. `/.env.example` - Documentation and defaults

---

**Status**: ✅ COMPLETE  
**Breaking Change**: YES - requires `.env` update  
**Backward Compatible**: NO - old variable names removed
