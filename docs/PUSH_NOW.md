# Quick Deploy Commands - Copy & Paste

**Current Status:** ✅ All fixes committed locally  
**Branch:** staging  
**Ready to:** Push and deploy

---

## 🚀 Deploy Now (5 Commands)

```bash
# 1. Push submodule changes
cd nube-scripts && git push origin main && cd ..

# 2. Push main repository  
git push origin staging

# 3. Trigger build
gh workflow run docker-build.yml --ref staging -f branch=staging

# 4. Watch it build
gh run watch

# 5. After success, merge to production
git checkout trunk && git merge staging --no-ff && git push origin trunk
```

---

## ⚙️ Set GitHub Variables First (Optional)

If these aren't set yet, go to:  
**Repository → Settings → Secrets and variables → Actions → Variables**

Add these (or use the defaults in the workflow):

```
VITE_GATEWAY_URL_PRODUCTION = https://api.nubeauth.com
VITE_HOME_URL_PRODUCTION = https://nubeauth.com
VITE_DOCS_URL_PRODUCTION = https://docs.nubeauth.com
```

---

## ✅ What Was Fixed

1. **Worker health checks** - Changed `wget` to `curl`
2. **Dashboard deployment** - Added missing build args
3. **Config warnings** - Fixed deprecated pnpm settings
4. **Documentation** - Created 4 comprehensive guides

---

## 📱 Quick Status Check

After deployment:

```bash
# Check services
curl https://s-api.nubeauth.app/health
curl https://api.nubeauth.com/health

# Check dashboards
curl -I https://s-manage.nubeauth.app
curl -I https://manage.nubeauth.com
```

---

## 🆘 If Something Goes Wrong

```bash
# View logs
gh run view --log

# Revert last commit
git revert HEAD && git push origin staging

# Redeploy previous version
gh workflow run deploy-railway.yml \
  -f environment=staging \
  -f tag=PREVIOUS_SHA
```

---

## 📚 Full Documentation

- `SUMMARY.md` - Executive overview
- `HEALTHCHECK_FIX.md` - Worker health check details  
- `QUICK_START.md` - Complete deployment guide
- `DEPLOYMENT_ANALYSIS.md` - Technical analysis

---

**That's it! Just run the 5 commands above.** 🎉
