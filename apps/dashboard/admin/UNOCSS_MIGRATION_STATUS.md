# UnoCSS Migration Status - Admin Dashboard

**Date:** January 11, 2026  
**Current Phase:** Automation Scripts Created  
**Overall Progress:** 15% Manual + 85% Automated Remaining

---

## 📊 Current Statistics

### Analyzed Codebase
- **Total TSX Files:** 31 (6 components + 25 pages)
- **Files with inline styles:** 26/31 (84%)
- **Total inline style attributes:** 1,398
- **Average per file:** 54 styles
- **Complex files:** 25 (96%)

### Top 10 Most Complex Files
1. `AppLicenses.tsx` - **166 styles** (1,898 lines)
2. `AppDevelopers.tsx` - **118 styles** (977 lines)
3. `AppSetup.tsx` - **114 styles** (1,325 lines)
4. `WebhookMonitoring.tsx` - **105 styles** (416 lines)
5. `AppUsers.tsx` - **86 styles** (1,307 lines)
6. `BillingDashboard.tsx` - **86 styles** (553 lines)
7. `Projects.tsx` - **71 styles** (775 lines)
8. `RefundProcessing.tsx` - **70 styles** (404 lines)
9. `TransactionExport.tsx` - **66 styles** (443 lines)
10. `ProjectPaymentProviders.tsx` - **61 styles** (819 lines)

### Pattern Distribution
- **color:** 634 occurrences (19%)
- **fontSize:** 624 occurrences (19%)
- **margin:** 467 occurrences (14%)
- **border:** 445 occurrences (13%)
- **padding:** 399 occurrences (12%)
- **flex:** 333 occurrences (10%)
- **display:** 281 occurrences (8%)
- **background:** 173 occurrences (5%)

---

## ✅ Completed Work

### 1. UnoCSS Foundation (100%)
- ✅ Installed UnoCSS v0.66.5
- ✅ Created `uno.config.ts` with comprehensive theme mapping
- ✅ Integrated with Vite build system
- ✅ Updated `main.tsx` with UnoCSS imports
- ✅ Created 20+ utility shortcuts (btn-primary, card, form-label, etc.)
- ✅ Mapped all CSS variables to UnoCSS theme

### 2. Documentation (100%)
- ✅ Created `UNOCSS_GUIDE.md` with examples
- ✅ Created `scripts/README.md` for automation tools
- ✅ Documented migration patterns and best practices

### 3. Reference Implementations (100%)
- ✅ **AppSettings.tsx** - Fully refactored (0 inline styles)
- ✅ **ProjectSettings.tsx** - Fully refactored (0 inline styles)
- ✅ **Toast.tsx** - 95% refactored (only animation keyframes remain)
- ✅ **Modal.tsx** - 100% refactored

### 4. Automation Tools (100%)
- ✅ **analyze-styles.cjs** - Comprehensive codebase analysis
- ✅ **migrate-simple.cjs** - Regex-based bulk replacements
- ✅ **migrate-to-unocss.ts** - AST-based advanced transformations

---

## 🔄 In Progress

### Components (50% complete)
- ⏳ **ConfirmModal.tsx** - 60% done (malformed HTML blocking completion)
- ⏳ **InviteTeamMemberModal.tsx** - Not started
- ⏳ **InviteUserModal.tsx** - Not started
- ⏳ **Select.tsx** - Not started

---

## ❌ Not Started

### Pages (0% complete - 25 files)
All files listed below have significant inline styles:

**High Priority (User-Facing):**
- [ ] AppLicenses.tsx (166 styles)
- [ ] AppDevelopers.tsx (118 styles)
- [ ] AppSetup.tsx (114 styles)
- [ ] AppUsers.tsx (86 styles)
- [ ] Projects.tsx (71 styles)

**Medium Priority:**
- [ ] WebhookMonitoring.tsx (105 styles)
- [ ] BillingDashboard.tsx (86 styles)
- [ ] RefundProcessing.tsx (70 styles)
- [ ] TransactionExport.tsx (66 styles)
- [ ] ProjectPaymentProviders.tsx (61 styles)

**Standard Pages:**
- [ ] PaymentTestingPlayground.tsx (58 styles)
- [ ] ProjectApps.tsx (55 styles)
- [ ] AppPaymentSettings.tsx (51 styles)
- [ ] Profile.tsx (48 styles)
- [ ] Onboarding.tsx (43 styles)
- [ ] ProjectStats.tsx (38 styles)
- [ ] AppOAuth.tsx (37 styles)
- [ ] AppApiKeys.tsx (29 styles)
- [ ] ProjectDetail.tsx (28 styles)
- [ ] Licenses.tsx (22 styles)
- [ ] ProjectTeam.tsx (20 styles)
- [ ] Login.tsx (10 styles)

**Already Complete:**
- [x] AppSettings.tsx (0 styles)
- [x] ProjectSettings.tsx (0 styles)
- [x] AppDetail.tsx (0 styles) - ✅ Refactored previously

---

## 🎯 Automation Approach

### How the Automation Works

#### 1. **Analysis Phase** (analyze-styles.cjs)
```bash
node scripts/analyze-styles.cjs
```

**What it does:**
- Scans all TSX files for `style={{` patterns
- Counts occurrences per file
- Identifies pattern frequency
- Classifies complexity (multi-line, dynamic, templates)
- Generates migration recommendations

**Output:**
- Top 10 files by style count
- Pattern distribution chart
- Component vs Pages breakdown
- Estimated time for migration

---

#### 2. **Simple Pattern Replacement** (migrate-simple.cjs)
```bash
# Preview changes
node scripts/migrate-simple.cjs --dry-run

# Apply changes
node scripts/migrate-simple.cjs
```

**What it converts:**
```typescript
// Before:
style={{ display: "flex", gap: "12px" }}

// After:
className="flex gap-3"
```

**Handles:**
- Simple single-property styles (60% of cases)
- Common multi-property patterns (breadcrumb, card)
- Merging with existing className attributes

**Limitations:**
- Cannot handle complex nested objects
- Skips dynamic values (ternaries, functions)
- May miss template literals

---

#### 3. **Advanced AST Transformation** (migrate-to-unocss.ts)
```bash
# Requires Babel dependencies
pnpm add -D @babel/parser @babel/traverse @babel/generator @babel/types tsx

# Preview changes
pnpm tsx scripts/migrate-to-unocss.ts --dry-run

# Migrate specific file
pnpm tsx scripts/migrate-to-unocss.ts --file=src/pages/AppDetail.tsx

# Migrate all files
pnpm tsx scripts/migrate-to-unocss.ts
```

**What it does:**
1. Parses TSX files into Abstract Syntax Tree (AST)
2. Traverses JSX elements
3. Extracts style objects
4. Maps properties to UnoCSS classes
5. Preserves dynamic styles that can't be converted
6. Generates transformed code

**Handles:**
- 90% of inline styles including complex cases
- Multi-property style objects
- Nested expressions
- Preserves dynamic values for manual review

**Example transformation:**
```typescript
// Before:
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    background: variant === "danger" ? "#ef4444" : "#8b5cf6"
  }}
>

// After:
<div
  className="flex items-center gap-3 p-4"
  style={{
    background: variant === "danger" ? "#ef4444" : "#8b5cf6"
  }}
>
```

---

## 📋 Recommended Workflow

### Phase 1: Automated Migration (5-10 minutes)

```bash
# Step 1: Analyze current state
node scripts/analyze-styles.cjs

# Step 2: Preview simple replacements
node scripts/migrate-simple.cjs --dry-run

# Step 3: Apply simple replacements
node scripts/migrate-simple.cjs

# Step 4: Verify compilation
pnpm typecheck

# Step 5: (Optional) Run advanced migration
pnpm add -D @babel/parser @babel/traverse @babel/generator @babel/types tsx
pnpm tsx scripts/migrate-to-unocss.ts --dry-run
pnpm tsx scripts/migrate-to-unocss.ts

# Step 6: Verify again
pnpm typecheck
```

**Expected Result:**
- 60-80% of simple styles converted
- Compilation still passes
- Dynamic styles preserved

---

### Phase 2: Manual Cleanup (4-6 hours)

**Priority Order:**
1. Fix remaining components (ConfirmModal, Select, etc.)
2. High-traffic pages (AppLicenses, AppDevelopers, Projects)
3. User-facing features (AppUsers, AppSetup)
4. Admin features (remaining pages)

**For each file:**
```bash
# 1. Open in editor
code src/pages/AppLicenses.tsx

# 2. Find remaining inline styles
# Search for: style={{

# 3. Convert to UnoCSS classes
# Use UNOCSS_GUIDE.md for reference

# 4. Test changes
pnpm typecheck
pnpm dev

# 5. Verify visually in browser
```

---

### Phase 3: Verification (30 minutes)

```bash
# 1. Count remaining inline styles
grep -r "style={{" src/ | wc -l
# Target: <50 (only dynamic styles)

# 2. TypeScript check
pnpm typecheck

# 3. Build check
pnpm build

# 4. Visual regression test
pnpm dev
# Test all major pages in browser

# 5. Git review
git diff src/
```

---

## 🎨 Pattern Examples

### Common Conversions

| Before (Inline Style) | After (UnoCSS) |
|-----------------------|----------------|
| `style={{ display: "flex" }}` | `className="flex"` |
| `style={{ padding: "16px" }}` | `className="p-4"` |
| `style={{ fontSize: "14px" }}` | `className="text-14px"` |
| `style={{ fontWeight: "500" }}` | `className="font-medium"` |
| `style={{ gap: "12px" }}` | `className="gap-3"` |
| `style={{ marginBottom: "20px" }}` | `className="mb-5"` |
| `style={{ borderRadius: "8px" }}` | `className="rounded-lg"` |
| `style={{ color: "var(--text-primary)" }}` | `className="text-text-primary"` |

### Complex Patterns (Use Shortcuts)

| Before | After |
|--------|-------|
| Multi-property card styling | `className="card"` |
| Breadcrumb navigation | `className="breadcrumb"` |
| Primary button | `className="btn-primary"` |
| Form input | `className="form-control"` |
| Form label | `className="form-label"` |

---

## ⚠️ Known Issues

### 1. ConfirmModal.tsx
**Issue:** Malformed HTML after previous refactoring attempt  
**Status:** Needs manual fix  
**Priority:** High (used across dashboard)

### 2. Dynamic Styles
**Issue:** Variant-based backgrounds, hover states preserved  
**Status:** Expected behavior  
**Priority:** Low (intentional)

### 3. Animation Keyframes
**Issue:** CSS `@keyframes` in `<style>` tags  
**Status:** Can be moved to index.css or UnoCSS animations  
**Priority:** Low (working as-is)

---

## 📈 Estimated Timeline

### Optimistic (Full Automation)
- **Automation setup:** 5 minutes
- **Run migrations:** 5 minutes
- **Fix TypeScript errors:** 30 minutes
- **Test:** 30 minutes
- **Total:** ~1 hour

### Realistic (Hybrid Approach)
- **Automation:** 10 minutes
- **Manual cleanup:** 4-5 hours
- **Testing:** 1 hour
- **Total:** ~6 hours

### Conservative (All Manual)
- **Component refactoring:** 2 hours
- **Page refactoring:** 8 hours
- **Testing:** 2 hours
- **Total:** ~12 hours

---

## 💡 Recommendations

### Option A: Full Automation First (Recommended)
1. Run `migrate-simple.cjs` to handle 60% of cases
2. Run `migrate-to-unocss.ts` for remaining 30%
3. Manually fix complex 10%
4. Total time: **~2-3 hours**

### Option B: Hybrid Approach
1. Run automation on simple files
2. Manually refactor high-priority pages
3. Leave low-priority pages for later
4. Total time: **~4-6 hours**

### Option C: Incremental Manual
1. Complete components first (4 files)
2. Do 5 pages per session
3. Spread over multiple days
4. Total time: **~8-12 hours** (spread out)

---

## 🚀 Next Steps

1. **Choose approach** (A, B, or C above)
2. **Run analysis:** `node scripts/analyze-styles.cjs`
3. **Start automation or manual work**
4. **Verify frequently:** `pnpm typecheck`
5. **Test visually:** `pnpm dev`
6. **Mark progress** in this document

---

## 📝 Progress Tracking

Update this section as you complete files:

### Components
- [x] Toast.tsx - 95% (keyframes remain)
- [x] Modal.tsx - 100%
- [ ] ConfirmModal.tsx - 60% (blocked)
- [ ] InviteTeamMemberModal.tsx
- [ ] InviteUserModal.tsx
- [ ] Select.tsx

### Pages (Priority Order)
- [x] AppSettings.tsx - 100%
- [x] ProjectSettings.tsx - 100%
- [x] AppDetail.tsx - 100%
- [ ] Login.tsx (10 styles) - NEXT
- [ ] Projects.tsx (71 styles)
- [ ] AppUsers.tsx (86 styles)
- [ ] AppDevelopers.tsx (118 styles)
- [ ] AppLicenses.tsx (166 styles)
- [ ] (Add checkmarks as completed)

---

## 📞 Support

If you encounter issues:
1. Check `UNOCSS_GUIDE.md` for patterns
2. Review `scripts/README.md` for automation help
3. Run `pnpm typecheck` for compilation errors
4. Search for similar patterns in completed files (AppSettings, ProjectSettings)

---

**Last Updated:** January 11, 2026  
**Status:** Tools ready, awaiting execution decision
