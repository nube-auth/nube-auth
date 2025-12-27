# Local Setup Fixes - Summary of Changes

## Problem Identified
The application was configured to call **production APIs** by default instead of local development servers, even though all local services are defined in docker-compose.yml.

**Before:** 
- Admin Dashboard → `https://api.proofa.sh`
- User Dashboard → `https://api.proofa.sh`
- Both dashboards → `https://auth.proofa.sh`

**After:**
- Admin Dashboard → `http://localhost:3004` (Gateway)
- User Dashboard → `http://localhost:3004` (Gateway)  
- Core API → `http://localhost:3003`
- Home/Docs → `http://localhost:4321` / `http://localhost:4322`

---

## Files Modified

### 1. **Admin Dashboard Vite Config**
📄 `apps/dashboard/admin/vite.config.ts`

Changed Vite's build-time variable definitions from production URLs to localhost:
```diff
- "import.meta.env.VITE_GATEWAY_URL": JSON.stringify(process.env.VITE_GATEWAY_URL || "https://api.proofa.sh")
+ "import.meta.env.VITE_GATEWAY_URL": JSON.stringify(process.env.VITE_GATEWAY_URL || "http://localhost:3004")

- "import.meta.env.VITE_CORE_URL": JSON.stringify(process.env.VITE_CORE_URL || "https://auth.proofa.sh")
+ "import.meta.env.VITE_CORE_URL": JSON.stringify(process.env.VITE_CORE_URL || "http://localhost:3003")

- "import.meta.env.VITE_HOME_URL": JSON.stringify(process.env.VITE_HOME_URL || "https://proofa.sh")
+ "import.meta.env.VITE_HOME_URL": JSON.stringify(process.env.VITE_HOME_URL || "http://localhost:4321")

- "import.meta.env.VITE_DOCS_URL": JSON.stringify(process.env.VITE_DOCS_URL || "https://docs.proofa.sh")
+ "import.meta.env.VITE_DOCS_URL": JSON.stringify(process.env.VITE_DOCS_URL || "http://localhost:4322")
```

### 2. **Admin Dashboard Config**
📄 `apps/dashboard/admin/src/config.ts`

Changed runtime fallback values:
```diff
- homeUrl: import.meta.env.VITE_HOME_URL || "https://proofa.sh",
+ homeUrl: import.meta.env.VITE_HOME_URL || "http://localhost:4321",

- docsUrl: import.meta.env.VITE_DOCS_URL || "https://docs.proofa.com",
+ docsUrl: import.meta.env.VITE_DOCS_URL || "http://localhost:4322",

- coreUrl: import.meta.env.VITE_CORE_URL || "https://api.proofa.sh",
+ coreUrl: import.meta.env.VITE_CORE_URL || "http://localhost:3003",
```

### 3. **User Dashboard Vite Config**
📄 `apps/dashboard/user/vite.config.ts`

Changed Vite's build-time variable definitions:
```diff
- "import.meta.env.VITE_GATEWAY_URL": JSON.stringify(process.env.VITE_GATEWAY_URL || "https://api.proofa.sh")
+ "import.meta.env.VITE_GATEWAY_URL": JSON.stringify(process.env.VITE_GATEWAY_URL || "http://localhost:3004")

- "import.meta.env.VITE_HOME_URL": JSON.stringify(process.env.VITE_HOME_URL || "https://proofa.sh")
+ "import.meta.env.VITE_HOME_URL": JSON.stringify(process.env.VITE_HOME_URL || "http://localhost:4321")

- "import.meta.env.VITE_DOCS_URL": JSON.stringify(process.env.VITE_DOCS_URL || "https://docs.proofa.sh")
+ "import.meta.env.VITE_DOCS_URL": JSON.stringify(process.env.VITE_DOCS_URL || "http://localhost:4322")
```

### 4. **User Dashboard Config**
📄 `apps/dashboard/user/src/config.ts`

Changed runtime fallback values:
```diff
- homeUrl: import.meta.env.VITE_HOME_URL || "https://proofa.sh",
+ homeUrl: import.meta.env.VITE_HOME_URL || "http://localhost:4321",

- docsUrl: import.meta.env.VITE_DOCS_URL || "https://docs.proofa.sh",
+ docsUrl: import.meta.env.VITE_DOCS_URL || "http://localhost:4322",

- gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "https://api.proofa.sh",
+ gatewayUrl: import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004",
```

### 5. **Environment Example File**
📄 `.env.example`

Updated with:
- Clear instructions about local dev vs production URLs
- Frontend variables (`VITE_*`) documented prominently
- Examples for both local and production setups
- Better comments explaining each section

### 6. **Development Guide**
📄 `DEVELOPMENT.md`

Added:
- Frontend environment variables to step 3
- New troubleshooting section for "API Calls Going to Production"
- Reference to `LOCAL_SETUP_ANALYSIS.md` for technical details

### 7. **Documentation Files (Created)**

- 📄 `LOCAL_SETUP_ANALYSIS.md` - Detailed technical analysis of the issue
- 📄 `SETUP_FIXES_SUMMARY.md` - This file

---

## How to Use After These Changes

### For Development:
```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. No changes needed - defaults are now localhost!
# Just add your OAuth credentials

# 3. Start services
pnpm docker:up
pnpm dev

# 4. Access dashboards at:
# - Admin: http://localhost:3002
# - User:  http://localhost:3001
```

### For Production:
```bash
# Set environment variables before building
export VITE_GATEWAY_URL=https://api.yourdomain.com
export VITE_CORE_URL=https://auth.yourdomain.com
export VITE_HOME_URL=https://yourdomain.com
export VITE_DOCS_URL=https://docs.yourdomain.com

pnpm build
```

---

## How It Works Now

1. **Vite Build Time:** Environment variables from `.env.local` are read
2. **Fallback:** If not set, uses new localhost defaults
3. **Runtime:** Code never needs to change between dev and prod
4. **Flexibility:** Still supports environment variable overrides

---

## Verification Steps

After applying these changes, verify everything works:

```bash
# 1. Start Docker services
pnpm docker:up

# 2. Start dev servers
pnpm dev

# 3. Open browser Network tab (DevTools)

# 4. Login to Admin Dashboard (http://localhost:3002)

# 5. Check Network tab shows:
#    ✅ Requests to http://localhost:3004 (Gateway)
#    ❌ NOT to https://api.proofa.sh
```

---

## Technical Details

For deeper understanding of why this issue occurred and how Vite's build-time replacement works, see:
- 📄 [LOCAL_SETUP_ANALYSIS.md](LOCAL_SETUP_ANALYSIS.md)

Key insight: Vite's `define` block replaces `import.meta.env.*` at **build time** with string literals, bypassing runtime code fallbacks.

---

## Related Files Not Modified

These files already had correct localhost defaults and didn't need changes:
- `apps/dashboard/admin/src/hooks/api.ts` - Uses `http://localhost:3004`
- `packages/react/src/ProofaProvider.tsx` - Accepts config parameter
- `docker-compose.yml` - Already defines correct ports
- `DEVELOPMENT.md` - Updated with new troubleshooting info

---

## Future Improvements

1. ✅ Add `.env.example` to git (done)
2. ✅ Update DEVELOPMENT.md with troubleshooting (done)
3. ✅ Change vite config defaults to localhost (done)
4. 📝 Add CI/CD configuration to set production URLs in pipelines
5. 📝 Consider using a config builder tool to eliminate duplication
6. 📝 Add a validation script to check API connectivity at startup

---

## Questions?

If you encounter any issues:
1. Check that `.env.local` exists and has the frontend URLs set
2. Run `pnpm dev` again after any env changes
3. Verify Docker services are running: `pnpm docker:status`
4. Check browser Network tab to confirm localhost URLs
5. See DEVELOPMENT.md troubleshooting section
