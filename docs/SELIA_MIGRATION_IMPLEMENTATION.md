# Selia Migration Implementation Guide

**Status**: Ready for Admin Dashboard Installation  
**Created**: January 23, 2026  
**Phase**: 2 - Wrapper Component Creation (✅ Complete)

---

## Summary of Completed Work

### ✅ Phase 1: Documentation & Planning
- Updated `.github/copilot-instructions.md` with **Component Wrapper Pattern** section
- Documented wrapper implementation patterns, usage guidelines, and export structure

### ✅ Phase 2: Wrapper Component Creation
Created 24 wrapper component pairs (48 files total) to wrap all Selia components:

**Core UI Wrappers (24 components):**
1. **Button** - Re-export of Selia Button
2. **Badge** - Re-export of Selia Badge  
3. **Card** - Selia Card with CardHeader, CardTitle, CardContent (aliased as CardBody)
4. **Dialog** - Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
5. **Input** - Re-export of Selia Input
6. **Label** - Re-export of Selia Label
7. **Select** - Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel
8. **Alert** - Alert, AlertTitle, AlertDescription
9. **Checkbox** - Re-export of Selia Checkbox
10. **Spinner** - Re-export of Selia Spinner
11. **Toast** - Toast, ToastAction, ToastClose, ToastDescription, ToastTitle, ToastProvider, ToastViewport, useToast
12. **Avatar** - Avatar, AvatarImage, AvatarFallback
13. **Separator** - Re-export of Selia Separator
14. **Tabs** - Tabs, TabsList, TabsTrigger, TabsContent
15. **Popover** - Popover, PopoverTrigger, PopoverContent
16. **DropdownMenu** - DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem
17. **Drawer** - Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose
18. **Table** - Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption
19. **Pagination** - Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis
20. **Sidebar** - Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarTrigger, useSidebar, SidebarProvider
21. **Breadcrumb** - Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage
22. **Tooltip** - Tooltip, TooltipTrigger, TooltipContent, TooltipProvider
23. **Collapsible** - Collapsible, CollapsibleTrigger, CollapsibleContent
24. **FormGroup** - Kept as-is (existing composite component)

**Specialized Components (7 components):**
- EmptyState (uses Card and Icon)
- LoginCard, LoginCardLogo, LoginCardTitle, LoginCardSubtitle, LoginCardBody, LoginCardTerms, LoginCardError
- SessionCard (uses Icon)
- ProfileHeader (uses Avatar)
- InfoGrid (Tailwind utilities)
- InfoList (uses Separator)
- StatusDot (uses Badge)

### ✅ Phase 2: Index Exports Update
Updated `apps/packages/components/src/index.ts` to export all 24 wrappers plus specialized components in organized sections

### ✅ Phase 2: Core Components Refactoring
- **Button**: Converted from custom implementation to Selia wrapper
- **Card**: Converted from custom implementation to Selia wrapper with CardBody alias for CardContent
- Cleaned up type exports (removed ButtonVariant, ButtonSize, Card*Props)

---

## Next Steps: Phase 3 - Admin Dashboard Installation

### 1. Install Selia in Admin Dashboard

```bash
cd apps/dashboard/admin
npx selia@latest init
```

This will:
- Install Selia dependencies
- Create `src/components/selia/` directory structure
- Set up Tailwind CSS v4 with @tailwindcss/vite plugin
- Update vite.config.ts

### 2. Configure Admin Dashboard Path Alias

Update `apps/dashboard/admin/vite.config.ts` to add path alias:

```typescript
// For Selia components in admin
alias: {
  '@/components/selia': resolve(__dirname, './src/components/selia'),
}
```

### 3. Verify Path Aliases

Both vite.config.ts and tsconfig.json should have:

```json
// tsconfig.json paths
"@/components/selia/*": ["./src/components/selia/*"],
"@/*": ["./src/*"]
```

### 4. Update Admin Dashboard Imports

**Remove direct usage of custom components:**
- ❌ Delete `Modal.tsx` (use Dialog from @proofa/components)
- ❌ Delete `Select.tsx` (use Select from @proofa/components)
- ❌ Delete `Toast.tsx` (use Toast from @proofa/components)

**Update imports in all admin pages:**

**Before:**
```typescript
// ❌ WRONG - Custom components
import { Modal } from '@/components/Modal';
import { Select } from '@/components/Select';
import { Toast } from '@/components/Toast';
```

**After:**
```typescript
// ✅ CORRECT - Selia wrappers from @proofa/components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@proofa/components';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@proofa/components';

import {
  Toast,
  ToastProvider,
  ToastViewport,
  useToast,
} from '@proofa/components';
```

### 5. CSS Migration

After Selia installation, CSS will be handled by:
- Tailwind CSS v4 with @tailwindcss/vite plugin
- `src/index.css` with Tailwind directives and base styles
- No custom CSS needed (Selia provides all styling)

**Remove custom CSS:**
- Merge any custom styles into admin dashboard's main CSS
- Most custom 120 lines of CSS should be replaced by Selia defaults

### 6. Component Migration Examples

#### Dialog Migration
```typescript
// Before (Modal.tsx)
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>Content</Modal.Body>
  <Modal.Footer>
    <button onClick={onClose}>Close</button>
  </Modal.Footer>
</Modal>

// After (using Dialog from @proofa/components)
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    Content
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Select Migration
```typescript
// Before (Select.tsx)
<Select options={options} value={value} onChange={setValue} />

// After (using Select from @proofa/components)
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {options.map((opt) => (
      <SelectItem key={opt.value} value={opt.value}>
        {opt.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### Toast Migration
```typescript
// Before (Toast.tsx)
const { showToast } = useToast();
showToast('Success', { variant: 'success' });

// After (using Toast from @proofa/components)
const { toast } = useToast();
toast({ title: 'Success', description: 'Action completed' });
```

---

## File Structure After Migration

```
apps/dashboard/admin/
├── src/
│   ├── components/
│   │   ├── selia/          ← Installed by Selia CLI (read-only copies)
│   │   │   └── ui/
│   │   │       ├── button.tsx
│   │   │       ├── dialog.tsx
│   │   │       ├── select.tsx
│   │   │       └── ... (all Selia components)
│   │   ├── IconPicker.tsx  ← Keep (business component)
│   │   ├── InviteUserModal.tsx ← Keep (business component)
│   │   ├── InviteTeamMemberModal.tsx ← Keep (business component)
│   │   ├── ConfirmModal.tsx ← Keep (business component)
│   │   └── ❌ Modal.tsx (DELETE - use Dialog)
│   │   └── ❌ Select.tsx (DELETE - use Select from @proofa/components)
│   │   └── ❌ Toast.tsx (DELETE - use Toast from @proofa/components)
│   ├── pages/
│   │   ├── Login.tsx       ← Update imports
│   │   ├── ProjectDetail.tsx ← Update imports
│   │   └── ... (all 26 pages)
│   └── index.css           ← Tailwind with Selia

apps/packages/components/src/
├── components/ui/
│   ├── Button/             ← Selia wrapper
│   ├── Card/               ← Selia wrapper
│   ├── Dialog/             ← Selia wrapper
│   ├── Input/              ← Selia wrapper
│   ├── Label/              ← Selia wrapper
│   ├── Select/             ← Selia wrapper
│   ├── ... (all 24 wrappers)
│   ├── EmptyState/         ← Specialized (unchanged)
│   ├── LoginCard/          ← Specialized (unchanged)
│   ├── SessionCard/        ← Specialized (unchanged)
│   └── ... (other specialized)
└── index.ts                ← Exports all wrappers + specialized
```

---

## Architecture Validation

### Three-Tier Architecture
1. **Selia Components** (Tier 1)
   - Location: `admin/src/components/selia/ui/` (installed by CLI)
   - Status: Read-only, never imported directly in business code
   - Purpose: Base UI components

2. **@proofa/components Wrappers** (Tier 2)
   - Location: `apps/packages/components/src/components/ui/`
   - Status: Single point of customization
   - Purpose: Thin re-exports, optional Proofa-specific customization
   - Example: Button wrapper, Card wrapper, Dialog wrapper, etc.

3. **Admin Dashboard Code** (Tier 3)
   - Location: `apps/dashboard/admin/src/pages/`
   - Status: Business components only
   - Purpose: Page-level and feature-level components
   - Imports: Only from `@proofa/components`, never Selia directly

### Import Rules
```
✅ ALLOWED:
- @proofa/components → admin pages
- Selia → @proofa/components wrappers only

❌ FORBIDDEN:
- @/components/selia → admin pages (direct Selia imports)
- @proofa/components → not re-exporting through wrappers
```

---

## Testing Checklist After Installation

- [ ] Run `npm run build` in admin dashboard - no errors
- [ ] Run `npm run dev` - starts without errors
- [ ] All page imports update successfully
- [ ] Dialog components render correctly
- [ ] Select components work with options
- [ ] Toast notifications appear
- [ ] All 26 pages load without errors
- [ ] Dark mode works (Tailwind CSS v4)
- [ ] Custom modals (IconPicker, InviteUserModal, etc.) still work
- [ ] CSS bundle size reduces (target: <20 lines custom CSS vs 120)

---

## Rollback Plan

If issues occur:

1. **Keep git history**: All changes are tracked
2. **Revert command**: `git revert <commit-hash>`
3. **Restore custom components**: `git checkout HEAD~1 -- apps/dashboard/admin/src/components/Modal.tsx`
4. **Disable Selia**: Remove from vite.config.ts and package.json

---

## Performance Improvements Expected

- ✅ CSS reduction: 120 lines → <20 lines (83% reduction)
- ✅ Component duplication eliminated: Custom Modal, Select, Toast → Selia equivalents
- ✅ Maintainability improved: Single wrapper layer vs scattered custom implementations
- ✅ Future-proofing: Easy to swap UI libraries (only update wrappers)
- ✅ Consistency: All dashboards use same components

---

## References

- **Selia**: https://github.com/nauvalazhar/selia
- **Copilot Instructions**: `.github/copilot-instructions.md` (UI Component Architecture section)
- **Wrapper Pattern**: Documented in copilot-instructions.md
- **Component List**: 24 wrappers created in `apps/packages/components/`

---

## Implementation Status

| Phase | Task | Status |
|-------|------|--------|
| 1 | Documentation & Planning | ✅ Complete |
| 2 | Wrapper Creation | ✅ Complete |
| 2 | Index Exports | ✅ Complete |
| 2 | Button/Card Refactoring | ✅ Complete |
| **3** | **Selia Installation** | 🔄 Ready |
| 3 | Admin Imports Update | ⏳ Pending |
| 3 | Custom Component Removal | ⏳ Pending |
| 3 | CSS Cleanup | ⏳ Pending |
| 3 | Testing & Validation | ⏳ Pending |

---

**Next**: Run `npx selia@latest init` in admin dashboard to begin Phase 3
