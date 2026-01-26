# Component Package Restructure Proposal

**Current Status:** Unorganized, confusing paths
**Goal:** Clean, intuitive, scalable structure

---

## Current Structure (Problems)

```
apps/packages/components/
├── src/
│   ├── components/
│   │   ├── selia/ui/         ❌ Why nested under "selia"?
│   │   │   └── [52 files]    ❌ Flat directory with 52 files
│   │   └── ui/               ❌ Generic name, unclear purpose
│   │       └── [9 folders]   ⚠️ No categorization
│   ├── icons/                ✅ OK
│   ├── styles/               ❌ Only 1 file (selia.css)
│   │   └── selia.css
│   ├── utils/                ❌ Only 1 file (cn.ts)
│   │   └── cn.ts
│   └── index.ts              ✅ OK
├── theme.css                 ⚠️ CSS at root
├── selia-theme.css           ⚠️ CSS at root
├── tailwind.css              ⚠️ CSS at root
└── selia.json                ✅ OK (config)
```

### Problems Identified:

1. **Confusing paths:**
   - `components/selia/ui` - Why the nested "selia" folder?
   - `components/ui` - Too generic, doesn't describe what's inside

2. **Poor organization:**
   - 52 Selia components in flat directory (hard to navigate)
   - 11 Proofa components not categorized (all mixed together)

3. **Scattered files:**
   - CSS files at root and in `styles/`
   - Single-file directories (`utils/`, `styles/`)

4. **Inconsistent naming:**
   - Some folders: PascalCase (`EmptyState/`, `FormGroup/`)
   - Files: kebab-case, PascalCase mixed

---

## Proposed Structure (Clean & Organized)

### Option 1: Categorized (Recommended)

```
apps/packages/components/
├── src/
│   ├── base/                           # Selia primitive components
│   │   ├── forms/
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── radio.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── field.tsx
│   │   │   ├── label.tsx
│   │   │   └── ... (14 form components)
│   │   ├── layout/
│   │   │   ├── card.tsx
│   │   │   ├── stack.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (9 layout components)
│   │   ├── display/
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── accordion.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   └── ... (15 display components)
│   │   ├── feedback/
│   │   │   ├── alert.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── chip.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── progress.tsx
│   │   │   └── ... (11 feedback components)
│   │   ├── typography/
│   │   │   ├── heading.tsx
│   │   │   ├── text.tsx
│   │   │   └── kbd.tsx
│   │   └── index.ts              # Re-export all base components
│   │
│   ├── components/                     # Proofa composite components
│   │   ├── auth/
│   │   │   ├── login-card/
│   │   │   │   ├── login-card.tsx
│   │   │   │   └── index.ts
│   │   │   └── auth-login-card/
│   │   │       ├── auth-login-card.tsx
│   │   │       └── index.ts
│   │   ├── display/
│   │   │   ├── profile-header/
│   │   │   │   ├── profile-header.tsx
│   │   │   │   └── index.ts
│   │   │   ├── info-grid/
│   │   │   │   ├── info-grid.tsx
│   │   │   │   └── index.ts
│   │   │   ├── info-list/
│   │   │   │   ├── info-list.tsx
│   │   │   │   └── index.ts
│   │   │   ├── empty-state/
│   │   │   │   ├── empty-state.tsx
│   │   │   │   └── index.ts
│   │   │   └── session-card/
│   │   │       ├── session-card.tsx
│   │   │       └── index.ts
│   │   ├── forms/
│   │   │   └── form-group/
│   │   │       ├── form-group.tsx
│   │   │       └── index.ts
│   │   └── feedback/
│   │       ├── loading/
│   │       │   ├── loading.tsx
│   │       │   └── index.ts
│   │       └── status-dot/
│   │           ├── status-dot.tsx
│   │           └── index.ts
│   │
│   ├── icons/                          # Icon system
│   │   ├── icons.tsx                   # Icon component
│   │   └── index.ts                    # Exports Icon, IconType
│   │
│   ├── lib/                            # Utilities
│   │   ├── cn.ts                       # Class name merger
│   │   └── index.ts                    # Export utilities
│   │
│   ├── styles/                         # All CSS in one place
│   │   ├── theme.css                   # Design tokens
│   │   ├── selia.css                   # Selia component styles
│   │   ├── tailwind.css                # Tailwind config
│   │   └── index.ts                    # CSS imports (optional)
│   │
│   └── index.ts                        # Main package exports
│
├── selia-theme.css                     # Selia theme (keep at root)
├── selia.json                          # Selia config
├── package.json
└── tsconfig.json
```

### Option 2: Simple (Flat Selia)

```
apps/packages/components/
├── src/
│   ├── base/                           # Selia components (keep flat)
│   │   ├── accordion.tsx
│   │   ├── alert.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── ... (52 files flat)
│   │   └── index.ts
│   │
│   ├── components/                     # Proofa composites (categorized)
│   │   ├── auth/
│   │   │   ├── login-card/
│   │   │   └── auth-login-card/
│   │   ├── display/
│   │   │   ├── profile-header/
│   │   │   ├── info-grid/
│   │   │   ├── info-list/
│   │   │   ├── empty-state/
│   │   │   └── session-card/
│   │   ├── forms/
│   │   │   └── form-group/
│   │   └── feedback/
│   │       ├── loading/
│   │       └── status-dot/
│   │
│   ├── icons/
│   ├── lib/
│   ├── styles/
│   └── index.ts
```

---

## Naming Conventions

### Files & Folders: kebab-case
- ✅ `login-card/`, `auth-login-card.tsx`
- ❌ `LoginCard/`, `AuthLoginCard.tsx`
- **Why:** Standard in modern React/TS projects, easier to read

### Components: PascalCase
- ✅ `export function LoginCard`
- ✅ `export const AuthLoginCard`
- **Why:** React convention

### Types: PascalCase with suffix
- ✅ `LoginCardProps`, `AuthLoginCardProps`
- **Why:** TypeScript convention

---

## Migration Plan

### Phase 1: Restructure Selia Components (Day 1)
1. Create `src/base/` directory
2. **Option A (Categorized):** Create subdirectories (forms/, layout/, display/, feedback/, typography/)
3. **Option B (Flat):** Keep all files in base/
4. Move all files from `src/components/selia/ui/` to new location
5. Update `src/base/index.ts` to re-export all
6. Delete `src/components/selia/` directory

### Phase 2: Restructure Proofa Components (Day 1-2)
1. Create category directories:
   - `src/components/auth/`
   - `src/components/display/`
   - `src/components/forms/`
   - `src/components/feedback/`

2. Rename and move components (kebab-case):
   ```bash
   EmptyState/     → display/empty-state/
   FormGroup/      → forms/form-group/
   InfoGrid/       → display/info-grid/
   InfoList/       → display/info-list/
   Loading/        → feedback/loading/
   LoginCard/      → auth/login-card/
   ProfileHeader/  → display/profile-header/
   SessionCard/    → display/session-card/
   StatusDot/      → feedback/status-dot/
   ```

3. Rename files to kebab-case:
   ```bash
   LoginCard.tsx → login-card.tsx
   AuthLoginCard.tsx → auth-login-card.tsx
   (and so on...)
   ```

4. Update all imports in component files
5. Delete old `src/components/ui/` directory

### Phase 3: Organize Utilities & Styles (Day 2)
1. Move CSS files:
   ```bash
   theme.css → src/styles/theme.css
   tailwind.css → src/styles/tailwind.css
   src/styles/selia.css → src/styles/selia.css (already there)
   ```

2. Keep at root:
   - `selia-theme.css` (external dependency)
   - `selia.json` (config file)

3. Rename `utils/` to `lib/`:
   ```bash
   src/utils/ → src/lib/
   ```

4. Update imports

### Phase 4: Update Exports (Day 2)
1. Update `src/index.ts` with new paths
2. Update `src/base/index.ts` (Selia components)
3. Update category index files
4. Test all imports

### Phase 5: Update Documentation (Day 2)
1. Update `COMPONENT_LIBRARY.md` with new structure
2. Update import examples
3. Add structure diagram

---

## Updated Import Patterns

### After Restructure

```tsx
// Selia base components (no change for consumers)
import { Button, Card, Badge, Input } from '@proofa/components';

// Proofa composite components (no change for consumers)
import { AuthLoginCard, FormGroup, Loading } from '@proofa/components';

// Icons (no change)
import { Icon, IconType } from '@proofa/components';

// Utilities (no change)
import { cn } from '@proofa/components';
```

**Important:** Public API stays the same! Only internal structure changes.

---

## Benefits

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Selia path** | `components/selia/ui/` | `base/` | Clear, concise |
| **Organization** | Flat 52 files | Categorized or flat in base/ | Easy to navigate |
| **Proofa components** | Generic `ui/` | Categorized by purpose | Clear intent |
| **File naming** | Mixed case | Consistent kebab-case | Standard convention |
| **CSS files** | Scattered | All in `styles/` | Centralized |
| **Utilities** | `utils/` | `lib/` | Standard naming |
| **Scalability** | Hard to add more | Easy categorization | Future-proof |

---

## Recommendation

**Go with Option 1 (Categorized Selia)** because:
1. ✅ Easier to find components (forms, layout, feedback, etc.)
2. ✅ Scales well as more components are added
3. ✅ Matches mental model of component types
4. ✅ Selia has 52 components - flat directory is hard to navigate
5. ✅ Professional standard (shadcn/ui, Radix UI use categories)

**If you prefer simplicity:** Option 2 (Flat Selia) works too
- Selia files stay flat in `base/`
- Only Proofa components are categorized
- Less migration work

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| **Breaking imports** | Update all imports in same PR, test before merge |
| **Build failures** | Run `pnpm build` after each phase |
| **Dashboard breakage** | Public API unchanged, only internal paths change |
| **Lost files** | Use git to track all moves, create backup branch |
| **Time investment** | 2 days max, but long-term maintainability worth it |

---

## Next Steps

1. **Review this proposal** - Which option do you prefer?
2. **Create backup branch** - `git checkout -b component-restructure`
3. **Execute migration** - Follow phase-by-phase plan
4. **Test thoroughly** - Build package, test in dashboards
5. **Update docs** - Reflect new structure
6. **Merge** - Once verified working

**Decision needed:**
- ✅ Option 1 (Categorized Selia) - Recommended
- ⭕ Option 2 (Flat Selia) - Simpler
- ⭕ Hybrid approach?

Let me know which option you prefer and I'll execute the migration!
