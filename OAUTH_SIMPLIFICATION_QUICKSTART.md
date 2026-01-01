# Quick Start: Apply OAuth Simplification

## 1. Review Changes
Read the comprehensive summary:
```bash
cat OAUTH_SIMPLIFICATION_SUMMARY.md
```

## 2. Backup Database (IMPORTANT!)
```bash
# PostgreSQL backup
pg_dump -U your_user -d proofa_db > backup_before_oauth_simplification.sql

# Or using Docker
docker exec -t your_postgres_container pg_dump -U postgres proofa > backup.sql
```

## 3. Apply Migration

### Option A: Using Drizzle Kit (Recommended)
```bash
cd packages/db
pnpm drizzle-kit push
```

### Option B: Manual SQL
```bash
psql -U your_user -d proofa_db -f packages/db/drizzle/0001_oauth_simplification.sql
```

### Option C: Using Docker
```bash
docker exec -i your_postgres_container psql -U postgres -d proofa < packages/db/drizzle/0001_oauth_simplification.sql
```

## 4. Regenerate Database Types
```bash
cd packages/db
pnpm generate
```

## 5. Verify Migration
```bash
psql -U your_user -d proofa_db -c "\d apps"
# Should see 'enabled_providers' column
# Should NOT see oauth_inherit_source or OAuth credential columns

psql -U your_user -d proofa_db -c "\dt"
# Should NOT see oauth_providers or app_oauth_selections tables
```

## 6. Test API Changes
```bash
# Start the development servers
pnpm dev

# Test app creation (should include enabledProviders)
curl -X POST http://localhost:3000/v1/admin/projects/PRJ0xxx/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test App",
    "description": "Testing OAuth simplification",
    "redirectUris": ["http://localhost:3001/callback"],
    "allowedHosts": ["localhost:3001"]
  }'

# Response should include: "enabledProviders": ["google"]
# Response should NOT include: oauthInheritSource, googleClientId, etc.
```

## 7. Update Frontend (if applicable)

### Files to Update:
- `apps/dashboard/admin/src/pages/ProjectSettings.tsx` (or similar)
- `apps/dashboard/admin/src/pages/AppSettings.tsx` (or similar)
- `apps/dashboard/admin/src/components/OAuthSettings.tsx` (if exists)

### Changes Needed:
1. Remove project OAuth configuration UI
2. Replace app OAuth credentials with provider selector
3. Update API calls to use `enabledProviders` field

## 8. Environment Variables
Ensure these are set in your environment:
```bash
# .env or deployment config
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GITHUB_CLIENT_ID=your_github_client_id_here  # Optional
GITHUB_CLIENT_SECRET=your_github_client_secret_here  # Optional
```

## 9. Run Tests
```bash
# Run your test suite
pnpm test

# Or specific tests
pnpm test:integration
```

## 10. Deploy
Once everything is tested locally:
```bash
# Apply migration to production database first
psql -U prod_user -d prod_proofa_db -f packages/db/drizzle/0001_oauth_simplification.sql

# Then deploy your application
pnpm deploy
# or
fly deploy
# or whatever your deployment process is
```

---

## Rollback (if needed)
```bash
# Restore database from backup
psql -U your_user -d proofa_db < backup_before_oauth_simplification.sql

# Revert code changes
git checkout HEAD~1 packages/db/src/schema.ts
git checkout HEAD~1 packages/db/src/providers.ts
git checkout HEAD~1 packages/db/src/index.ts
git checkout HEAD~1 apps/gateway/src/routes/admin.ts
git checkout HEAD~1 packages/shared/src/types/schemas/admin.ts

# Regenerate types
cd packages/db && pnpm generate
```

---

## Troubleshooting

### "Column 'enabled_providers' does not exist"
- Migration not applied. Run step 3 again.

### "Cannot find module '@proofa/db'"
- Types not regenerated. Run step 4 again.

### "OAuth authentication not working"
- Check environment variables (step 8)
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly

### "TypeScript errors in admin.ts"
- Clear TypeScript cache: `rm -rf node_modules/.cache`
- Rebuild: `pnpm build`

---

## Success Checklist
- [ ] Database backup created
- [ ] Migration applied successfully
- [ ] Drizzle types regenerated
- [ ] No TypeScript compilation errors
- [ ] API returns `enabledProviders` in app responses
- [ ] API does NOT return OAuth credentials
- [ ] OAuth authentication still works
- [ ] Frontend updated (if applicable)
- [ ] Tests passing
- [ ] Deployed to production

---

**Need Help?**
- See detailed changes: `OAUTH_SIMPLIFICATION_SUMMARY.md`
- See technical details: `OAUTH_SIMPLIFICATION_CHANGES.md`
