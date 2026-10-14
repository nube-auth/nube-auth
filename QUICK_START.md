# Quick Start - Fix Deployment Issues

This guide will help you fix the identified deployment issues and get production working properly.

## TL;DR

```bash
# 1. Run the automated fix script
./scripts/fix-deployment-issues.sh

# 2. Test locally
pnpm dev:gateway
pnpm dev:admin

# 3. Commit and push
git add .
git commit -m "fix: security vulnerabilities and production build config"
git push origin staging

# 4. After testing, merge to trunk
git checkout trunk
git merge staging --no-ff
git push origin trunk

# 5. Trigger production build
gh workflow run docker-build.yml --ref trunk -f branch=trunk
```

---

## What Was Wrong?

### 1. 🔴 Security Vulnerabilities
- **Astro**: Critical RCE and XSS vulnerabilities
- **React Router**: High XSS vulnerability via open redirects
- **Hono**: JWT algorithm confusion vulnerability
- **tar**: DoS vulnerability in dependencies

### 2. 🔴 Missing Build Arguments
Production dashboard builds were missing critical environment variables:
- `VITE_GATEWAY_URL` - API endpoint URL
- `VITE_HOME_URL` - Home page URL
- `VITE_DOCS_URL` - Documentation URL
- `VITE_ENV_TAG` - Environment badge

This caused dashboards to:
- ❌ Fail to connect to the API
- ❌ Show broken navigation links
- ❌ Display "undefined" instead of "Production"

### 3. 🟡 Deprecated pnpm Configuration
The `pnpm.overrides` in `package.json` was using deprecated syntax.

---

## What We Fixed

### ✅ Updated Files

1. **`.github/workflows/docker-build.yml`**
   - Added `build_args` to staging build
   - Added `build_args` to production dashboards build
   - Added `build_args` to production all-in-one build
   - Uses GitHub Variables with sensible defaults

2. **`package.json`**
   - Removed deprecated `pnpm.overrides` section

3. **`.npmrc`**
   - Added `overrides.ioredis=5.8.2` in modern format

4. **Created Helper Scripts**
   - `scripts/fix-deployment-issues.sh` - Automated vulnerability fixes
   - `DEPLOYMENT_ANALYSIS.md` - Detailed analysis report
   - `QUICK_START.md` - This guide

---

## Step-by-Step Instructions

### Step 1: Review Changes

Check what was modified:

```bash
git status
git diff
```

You should see changes in:
- `.github/workflows/docker-build.yml`
- `package.json`
- `.npmrc`
- Plus new files in `scripts/` and docs

### Step 2: Set GitHub Variables (IMPORTANT!)

Before deploying, set these in your GitHub repository:

**Go to:** Repository → Settings → Secrets and variables → Actions → Variables

#### For Staging (Optional - has defaults):
```
VITE_GATEWAY_URL_STAGING=https://s-api.nubeauth.app
VITE_HOME_URL_STAGING=https://s-nubeauth.app
VITE_DOCS_URL_STAGING=https://s-docs.nubeauth.app
```

#### For Production (REQUIRED):
```
VITE_GATEWAY_URL_PRODUCTION=https://api.nubeauth.com
VITE_HOME_URL_PRODUCTION=https://nubeauth.com
VITE_DOCS_URL_PRODUCTION=https://docs.nubeauth.com
```

**Note:** If you don't set these, the workflow will use the defaults shown above.

### Step 3: Fix Security Vulnerabilities

Run the automated fix script:

```bash
./scripts/fix-deployment-issues.sh
```

This will:
- ✅ Update Astro to latest (fixes RCE + XSS)
- ✅ Update React Router to latest (fixes XSS)
- ✅ Update Hono to latest (fixes JWT issue)
- ✅ Update tar dependencies
- ✅ Run security audit
- ✅ Build packages to verify
- ✅ Run type checks

### Step 4: Test Locally

Start the services locally to verify everything works:

```bash
# Terminal 1 - Gateway
pnpm dev:gateway

# Terminal 2 - Admin Dashboard
pnpm dev:admin

# Terminal 3 - User Dashboard
pnpm dev:user
```

Open in browser:
- Admin: http://localhost:5174
- User: http://localhost:5173
- API: http://localhost:3004/health

### Step 5: Commit & Push to Staging

```bash
git add .
git commit -m "fix: security vulnerabilities and production build config

- Update Astro, React Router, Hono, tar dependencies
- Add build args for dashboard builds in CI/CD
- Migrate pnpm overrides to .npmrc
- Add deployment analysis and fix scripts"

git push origin staging
```

### Step 6: Verify Staging Build

Watch the GitHub Action:

```bash
gh run watch
```

Or check manually:
- Go to GitHub → Actions
- Wait for "Build & Publish" to complete
- Check that all jobs pass (especially "Staging (all-in-one)")

### Step 7: Test Staging Deployment

Once deployed, test staging:

```bash
# Check API health
curl https://s-api.nubeauth.app/health

# Check dashboards load
curl -I https://s-manage.nubeauth.app
curl -I https://s-me.nubeauth.app
```

Open in browser:
- Admin: https://s-manage.nubeauth.app
- User: https://s-me.nubeauth.app
- Home: https://s-nubeauth.app

**Verify:**
- ✅ Dashboards load without errors
- ✅ API calls work (check browser console)
- ✅ Login/signup flows work
- ✅ Environment badge shows "Staging"

### Step 8: Merge to Trunk

If staging looks good, merge to production:

```bash
git checkout trunk
git pull origin trunk  # Ensure you're up to date
git merge staging --no-ff -m "chore: merge staging to trunk - deployment fixes"
git push origin trunk
```

### Step 9: Deploy to Production

Trigger the production build:

```bash
# Option 1: Via GitHub CLI
gh workflow run docker-build.yml --ref trunk -f branch=trunk

# Option 2: Via GitHub UI
# Go to Actions → Build & Publish → Run workflow → Select "trunk"
```

### Step 10: Verify Production Deployment

Monitor the build:

```bash
gh run watch
```

Once complete, test production:

```bash
# Check all services
curl https://api.nubeauth.com/health
curl -I https://manage.nubeauth.com
curl -I https://me.nubeauth.com
```

Open dashboards:
- Admin: https://manage.nubeauth.com
- User: https://me.nubeauth.com
- Home: https://nubeauth.com
- Docs: https://docs.nubeauth.com

**Verify:**
- ✅ All services healthy
- ✅ Dashboards load
- ✅ API connectivity works
- ✅ Environment badge shows "Production"
- ✅ No console errors

---

## If Something Goes Wrong

### Build Fails

```bash
# Check the logs
gh run view --log

# Common issues:
# 1. Missing GitHub Variables → Set them in repo settings
# 2. Merge conflict → Resolve conflicts manually
# 3. Type errors → Run `pnpm typecheck` locally first
```

### Deployment Fails

```bash
# Check Railway logs via their dashboard
# Or check GitHub Action deploy step

# Common issues:
# 1. Railway service IDs wrong → Check GitHub Variables
# 2. Railway token expired → Update secret
# 3. Image pull failed → Check GHCR permissions
```

### Dashboards Don't Load

**Check browser console for errors:**

```
VITE_GATEWAY_URL is undefined
→ Build args weren't passed correctly
→ Rebuild with correct variables
```

**Fix:** Re-run workflow after setting GitHub Variables

### API Calls Fail

**Check CORS errors in browser console:**

```
CORS error: https://wrong-url.com
→ VITE_GATEWAY_URL points to wrong domain
```

**Fix:** Update GitHub Variables and rebuild

---

## Rollback Procedure

If production is broken, rollback immediately:

### Option 1: Redeploy Previous Image

```bash
# Deploy the previous working image by tag
gh workflow run deploy-railway.yml \
  -f environment=production \
  -f service=dashboards \
  -f tag=trunk-PREVIOUS_SHA \
  -f wait=true
```

### Option 2: Revert Commit

```bash
# Revert to previous commit
git revert HEAD
git push origin trunk

# Trigger rebuild
gh workflow run docker-build.yml --ref trunk -f branch=trunk
```

### Option 3: Emergency Fix

```bash
# Make a hotfix on trunk directly
git checkout trunk
# ... make fixes ...
git commit -m "hotfix: emergency production fix"
git push origin trunk
gh workflow run docker-build.yml --ref trunk -f branch=trunk
```

---

## Monitoring & Health Checks

### Service Health Endpoints

```bash
# Core
curl https://api.nubeauth.com/health

# Gateway  
curl https://api.nubeauth.com/health

# Dashboards (nginx)
curl https://manage.nubeauth.com/health
```

### Expected Response

```json
{
  "status": "ok",
  "timestamp": "2026-10-14T12:00:00.000Z"
}
```

### Set Up Monitoring

Consider setting up:
1. **Uptime monitoring** (UptimeRobot, Pingdom)
2. **Error tracking** (Sentry, Bugsnag)
3. **Log aggregation** (Datadog, Logtail)
4. **Alerts** (PagerDuty, Slack webhooks)

---

## Post-Deployment Checklist

After successful deployment:

- [ ] All services return 200 on `/health`
- [ ] Dashboards load without errors
- [ ] User can sign up/login
- [ ] Admin panel accessible
- [ ] No CORS errors in console
- [ ] Environment badges correct
- [ ] SSL certificates valid
- [ ] DNS records pointing correctly
- [ ] Rate limiting working
- [ ] OAuth providers configured
- [ ] Email sending working
- [ ] Database connections stable
- [ ] Redis connections stable
- [ ] Background jobs processing

---

## Next Steps

### Recommended Improvements

1. **Set up automated security scanning**
   ```bash
   # Add Dependabot
   # Enable GitHub Code Scanning
   # Add Snyk or similar
   ```

2. **Improve CI/CD**
   - Add integration tests
   - Add E2E tests with Playwright
   - Add smoke tests after deploy

3. **Monitoring & Observability**
   - Add structured logging
   - Set up error tracking
   - Configure alerts

4. **Documentation**
   - Document deployment process
   - Create runbook for common issues
   - Document environment variables

---

## Need Help?

### Resources

- **Full Analysis:** `DEPLOYMENT_ANALYSIS.md`
- **Fix Script:** `scripts/fix-deployment-issues.sh`
- **GitHub Actions:** `.github/workflows/`
- **Docker Files:** `nube-scripts/deploy/docker/`

### Common Commands

```bash
# View recent builds
gh run list --limit 10

# View specific run
gh run view RUN_ID

# Watch live build
gh run watch

# List Railway services (via deploy script)
cat nube-scripts/dev/scripts/railway-deploy.ts

# Check pnpm audit
pnpm audit --prod

# Update all dependencies
pnpm update --latest

# Rebuild packages
pnpm build:packages
```

---

## Summary

**What we fixed:**
- ✅ 5 security vulnerabilities (critical + high)
- ✅ Missing production build arguments
- ✅ Deprecated pnpm configuration
- ✅ Added helper scripts and documentation

**What you need to do:**
1. Set GitHub Variables for production URLs
2. Run the fix script
3. Test staging
4. Merge to trunk
5. Deploy to production
6. Verify everything works

**Time estimate:** 30-60 minutes (including testing)

Good luck! 🚀
