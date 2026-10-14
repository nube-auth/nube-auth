# Health Check Fix for Worker (and All Services)

**Date:** October 14, 2026  
**Issue:** Worker build failing due to health check  
**Status:** ✅ FIXED

---

## Problem Description 🔴

All Docker health checks were failing with:

```
/bin/sh: wget: not found
```

### Root Cause

The Dockerfiles had a mismatch:

```dockerfile
# Install curl but NOT wget
RUN apk add --no-cache curl ca-certificates

# Health check tries to use wget (doesn't exist!)
HEALTHCHECK CMD wget -qO- http://localhost:8080/health || exit 1
```

**Alpine Linux** doesn't include `wget` by default. The containers only had `curl` installed.

---

## Impact

This affected **all services** in production:
- ✗ Workers
- ✗ Core
- ✗ Gateway  
- ✗ Dashboards
- ✗ All-in-one (staging)

**Symptoms:**
- Docker health checks failing
- Railway marking containers as unhealthy
- Potential automatic restarts
- Monitoring alerts triggering

---

## Solution ✅

Changed all health checks to use `curl` instead of `wget`:

### Before (Broken)
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
```

### After (Fixed)
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

**Why `curl -f`?**
- `-f` (--fail) makes curl exit with error code 22 on HTTP errors (4xx, 5xx)
- This properly fails the health check if the service returns an error
- Equivalent to wget's behavior of failing on HTTP errors

---

## Files Changed

All production Dockerfiles updated:

1. ✅ `nube-scripts/deploy/docker/Dockerfile.workers`
2. ✅ `nube-scripts/deploy/docker/Dockerfile.core`
3. ✅ `nube-scripts/deploy/docker/Dockerfile.gateway`
4. ✅ `nube-scripts/deploy/docker/Dockerfile.dashboards`
5. ✅ `nube-scripts/deploy/docker/Dockerfile.app` (staging all-in-one)

---

## Health Check Details

### Workers Service Health Endpoint

**URL:** `http://localhost:8080/health`

**Response during startup:**
```json
{
  "service": "workers",
  "status": "starting",
  "db": "not_ready",
  "redis": "not_ready",
  "workers": 0,
  "timestamp": "2026-10-14T12:00:00.000Z"
}
```

**Response when healthy:**
```json
{
  "service": "workers",
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "workers": 7,
  "timestamp": "2026-10-14T12:00:00.000Z"
}
```

**Response when degraded:**
```json
{
  "service": "workers",
  "status": "degraded",
  "db": "unreachable",
  "redis": "ok",
  "workers": 7,
  "timestamp": "2026-10-14T12:00:00.000Z"
}
```

### Health Check Configuration

```dockerfile
HEALTHCHECK \
  --interval=30s \        # Check every 30 seconds
  --timeout=5s \          # Timeout after 5 seconds
  --start-period=30s \    # Grace period for startup
  --retries=3 \           # Mark unhealthy after 3 consecutive failures
  CMD curl -f http://localhost:8080/health || exit 1
```

**Parameters explained:**
- **interval**: How often to run the check
- **timeout**: Max time to wait for response
- **start-period**: Don't count failures during this initial period
- **retries**: Consecutive failures before marking unhealthy

---

## Testing

### Test Health Check Locally

```bash
# Build the worker image
docker build -f nube-scripts/deploy/docker/Dockerfile.workers -t test-workers .

# Run with health check
docker run -d --name test-worker \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  test-workers

# Check health status
docker ps  # Shows health status in STATUS column

# Inspect detailed health
docker inspect test-worker | grep -A 20 Health

# Manual health check
docker exec test-worker curl -f http://localhost:8080/health
```

### Expected Output

**Healthy:**
```bash
$ docker ps
CONTAINER ID   IMAGE          STATUS
abc123         test-workers   Up 2 minutes (healthy)
```

**Unhealthy:**
```bash
$ docker ps
CONTAINER ID   IMAGE          STATUS
abc123         test-workers   Up 2 minutes (unhealthy)
```

---

## Deployment

### Automatic (Recommended)

The fix will automatically deploy when you push to staging/trunk:

```bash
# Commit the fix
git add nube-scripts/deploy/docker/
git commit -m "fix: use curl instead of wget in Docker health checks"

# Push to staging first
git push origin staging

# Wait for build and test
gh run watch

# If staging works, merge to trunk
git checkout trunk
git merge staging --no-ff
git push origin trunk
```

### Manual Trigger

If you need to rebuild immediately:

```bash
# Rebuild staging
gh workflow run docker-build.yml --ref staging -f branch=staging

# Rebuild production
gh workflow run docker-build.yml --ref trunk -f branch=trunk
```

---

## Verification

After deployment, verify health checks are working:

### Via Docker

If you have Docker access to Railway containers:

```bash
docker ps -a  # Look for (healthy) in STATUS
```

### Via Railway Dashboard

1. Go to Railway project
2. Select Workers service
3. Click on Deployments
4. Check "Health Checks" section
5. Should show: ✅ Healthy

### Via API

```bash
# Workers don't expose public port, but you can check via Railway Metrics
# Or check other services that do expose ports:

curl https://api.nubeauth.com/health
curl https://manage.nubeauth.com/health
```

---

## Alternative Solution (Not Used)

We could have installed `wget` instead:

```dockerfile
# Install wget
RUN apk add --no-cache wget curl ca-certificates

# Keep wget in health check
HEALTHCHECK CMD wget -qO- http://localhost:8080/health || exit 1
```

**Why we didn't do this:**
- Adds unnecessary package (8KB)
- Already using curl elsewhere
- curl is more commonly installed
- One less dependency to maintain

---

## Related Issues

This health check pattern should be consistent across:
- [x] Workers
- [x] Core
- [x] Gateway
- [x] Dashboards  
- [x] All-in-one (staging)

All are now using `curl` consistently.

---

## Monitoring Recommendations

### Set Up Health Check Alerts

Consider adding alerts for:
1. Container health check failures
2. Service returning `"status": "degraded"`
3. Multiple consecutive failed health checks

### Log Health Check Failures

Add logging in your monitoring:
```bash
# Example: Log all unhealthy containers
docker ps -a --filter "health=unhealthy" --format "{{.Names}}: {{.Status}}"
```

---

## Rollback

If this fix causes issues (unlikely), rollback:

### Option 1: Install wget

```dockerfile
RUN apk add --no-cache wget curl ca-certificates

HEALTHCHECK CMD wget -qO- http://localhost:8080/health || exit 1
```

### Option 2: Remove health checks

```dockerfile
# Comment out HEALTHCHECK temporarily
# HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1
```

---

## Summary

**Problem:** Health checks failing because `wget` wasn't installed  
**Solution:** Changed all health checks to use `curl` (already installed)  
**Impact:** All services (workers, core, gateway, dashboards)  
**Risk:** Very low - curl is drop-in replacement for this use case  
**Testing:** Build and deploy to staging first, then production

**Status:** ✅ Fixed and ready to deploy

---

## Checklist

- [x] Identified root cause (missing wget)
- [x] Fixed all Dockerfiles (5 files)
- [x] Documented the fix
- [x] Tested curl command equivalence
- [ ] Deploy to staging
- [ ] Verify staging health checks
- [ ] Deploy to production
- [ ] Verify production health checks
- [ ] Update monitoring if needed

---

*Generated: October 14, 2026*
