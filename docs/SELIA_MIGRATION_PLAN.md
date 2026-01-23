# Selia Migration Plan - Admin Dashboard

**Status**: Planning Phase  
**Target**: Migrate admin dashboard from custom CSS to Selia component library  
**Timeline**: 2-3 weeks (phased approach)  
**Benefits**: Reduce CSS from 120 lines to ~20, gain 50+ tested components, maintain design consistency

---

## Executive Summary

### What We're Building

**Selia-First Component Architecture**:

1. **Selia Components** (50+ UI Primitives) - USE FOR EVERYTHING
   - All UI building blocks: Dialog, Select, Table, Input, Button, Badge, Card, Tabs, etc.
   - Copied into `src/components/selia/ui/` via CLI
   - Full control, fully customizable
   - **Rule**: If Selia has it, use Selia (even if we have our own version)

2. **@proofa/components** (Specialized Only) - KEEP ONLY UNIQUE
   - Keep ONLY components Selia doesn't provide:
     - Icon (HugeIcons integration)
     - LoginCard (specialized login pattern)
     - SessionCard (specialized session display)
     - EmptyState (specialized empty states)
     - ProfileHeader, InfoGrid, InfoList (specialized layouts)
   - Located in `apps/packages/components/`

3. **Admin Components** (Business Logic) - REBUILD WITH SELIA
   - Admin-specific components: IconPicker, InviteUserModal, ConfirmModal
   - Rebuild using ONLY Selia components
   - Located in `apps/dashboard/admin/src/components/`

### What Changes vs What Stays

**Replace with Selia** (Everything Selia offers):
- ❌ Admin Modal.tsx → ✅ Selia Dialog
- ❌ Admin Select.tsx → ✅ Selia Select
- ❌ Admin Toast.tsx → ✅ Selia Toast
- ❌ @proofa/components Button → ✅ Selia Button
- ❌ @proofa/components Badge → ✅ Selia Badge
- ❌ @proofa/components Card → ✅ Selia Card
- ❌ @proofa/components FormGroup → ✅ Selia Form + Input + Label
- ❌ @proofa/components Loading → ✅ Selia Spinner

**Rebuild with Selia** (Admin business components):
- 🔄 IconPicker → Selia Popover + Command
- 🔄 InviteUserModal → Selia Dialog + Select + Input
- 🔄 InviteTeamMemberModal → Selia Dialog + Form
- 🔄 ConfirmModal → Selia AlertDialog

**Keep from @proofa/components** (Only what Selia doesn't have):
- ✅ Icon (HugeIcons wrapper - Selia uses Lucide, we use HugeIcons)
- ✅ LoginCard (specialized auth pattern)
- ✅ SessionCard (specialized session display)
- ✅ EmptyState (specialized empty states)
- ✅ ProfileHeader, InfoGrid, InfoList (specialized layouts)
- ✅ StatusDot (custom status indicator)

### Why This Approach?

**Benefits**:
- ✅ Selia is production-tested with 50+ components (better quality than our custom ones)
- ✅ Consistent component API across entire admin dashboard
- ✅ Eliminates duplicate component logic (Button, Badge, Card)
- ✅ Reduces maintenance burden (Selia handles common components)
- ✅ "Own the code" philosophy - all Selia components are in our codebase
- ✅ Keep only specialized @proofa/components that provide unique value

**Result**:
- Admin dashboard CSS: 120 lines → <20 lines (83% reduction)
- Component duplication: Eliminated (no more @proofa Button vs Selia Button)
- Component library: Selia 50+ (all UI primitives) + @proofa 8 (specialized) = 58+ total
- Better DX: Single source of truth for each component type

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Selia Overview](#selia-overview)
3. [Phase-by-Phase Plan](#phase-by-phase-plan)
4. [Component Mapping](#component-mapping)
5. [Configuration Changes](#configuration-changes)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)

---

## Current State Analysis

### Admin Dashboard Architecture

**Location**: `apps/dashboard/admin/`

**Current Stack**:
- React 18.2.0
- Vite 5.0.8
- TypeScript 5.3.3
- Custom CSS (120 lines in `index.css`)
- Custom components:
  - Modal.tsx (custom dialog wrapper)
  - Select.tsx (custom dropdown)
  - Toast.tsx (custom notifications)
  - ConfirmModal.tsx
  - IconPicker.tsx
  - InviteUserModal.tsx
  - InviteTeamMemberModal.tsx

**Current CSS**:
- Theme variables from `@proofa/styles/theme.css` (already migrated)
- 3 custom CSS classes: `.header-btn`, `.theme-label`, `.btn`
- Rest is resets and base typography
- Using CSS variables for theming (light/dark mode support)

**Pages** (26 total):
- Authentication: Login, Onboarding
- Project Management: Projects, ProjectDetail, ProjectSettings, ProjectTeam, ProjectStats
- App Management: ProjectApps, AppDetail, AppSettings, AppSetup, AppDevelopers
- App Features: AppApiKeys, AppOAuth, AppPaymentSettings, AppLicenses, AppUsers
- Billing: BillingDashboard, CreateProject, Licenses, PaymentTestingPlayground, RefundProcessing, TransactionExport
- User: Profile
- Monitoring: WebhookMonitoring

**Icon Library**: HugeIcons (currently using `@hugeicons/react`)

### Component Usage Patterns

```typescript
// Current Modal Pattern
<Modal isOpen={isOpen} onClose={onClose} size="lg">
  <ModalHeader onClose={onClose}>Title</ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>Actions</ModalFooter>
</Modal>

// Current Select Pattern
<Select
  value={value}
  onChange={setValue}
  options={[...]}
  placeholder="Select..."
/>

// Custom className patterns
className="btn btn-primary"  // DaisyUI-style naming
className="text-14px"        // Inline sizing
className="max-w-600px"      // Arbitrary values
```

---

## Selia Overview

### Key Features

**What is Selia?**
- Opinionated React component library built on Tailwind CSS v4 and Base UI
- 50+ production-ready components
- "Own the code" philosophy: components copied into codebase (not npm package)
- Full TypeScript support
- Designed for Inter and JetBrains Mono fonts

**Component List** (50+ available):
- Overlays: Dialog, Drawer, Popover, Tooltip, Menu, Dropdown
- Tables: Table, Pagination
- Forms: Input, Textarea, Select, Checkbox, Radio, Switch, Form
- Navigation: Sidebar, Breadcrumb, Tabs, Stepper
- Feedback: Alert, Badge, Avatar, Progress, Skeleton, Toast, Spinner
- Content: Card, Accordion, Collapsible
- Plus: Button, Link, Command (search), Code, Copy

**Installation Approach**:
```bash
# One-time setup
npx selia@latest init

# Add components on demand
npx selia@latest add button
npx selia@latest add dialog
npx selia@latest add select
```

**Output Structure**:
```
src/components/selia/
├── ui/
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── select.tsx
│   └── ...
└── lib/
    ├── cn.ts
    └── ...
```

### Technology Stack

- **CSS**: Tailwind CSS v4 (with `@import 'tailwindcss'` directive)
- **Vite Plugin**: `@tailwindcss/vite` (for CSS-in-JS compilation)
- **Headless UI**: Base UI (keyboard navigation, accessibility)
- **Styling**: Tailwind CSS utilities + CSS variables for theming
- **Type Safety**: Full TypeScript with JSDoc comments

### Design Philosophy

**"Own the Code"**
- Components are copied into your codebase, not installed as npm package
- Full control over component behavior and styling
- No version lock-in to Selia
- Easy to customize components incrementally
- Components become your responsibility (but starting from production-ready code)

**Benefits for Proofa**:
- ✅ Aligns with "own the code" philosophy already in place
- ✅ Components can be customized to match Proofa design system
- ✅ No external package updates to worry about
- ✅ Full TypeScript integration
- ✅ All components themed with CSS variables (matches current approach)

---

## Phase-by-Phase Plan

### Phase 1: Setup & Dependencies (Day 1-2)

**Goal**: Prepare project for Selia integration

#### Step 1.1: Add Tailwind CSS v4

Update `apps/dashboard/admin/package.json`:
```json
{
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.17"
  }
}
```

Run: `pnpm install`

#### Step 1.2: Update Vite Config

Modify `apps/dashboard/admin/vite.config.ts`:
```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite"; // ADD THIS

export default defineConfig({
	css: {
		postcss: path.resolve(__dirname, "postcss.config.cjs"),
	},
	plugins: [
		tailwindcss(), // ADD THIS
		react(),
	],
	resolve: {
		alias: {
			// ... existing aliases ...
			"@": path.resolve(__dirname, "src"), // ADD THIS for Selia
		},
	},
	// ... rest of config
});
```

#### Step 1.3: Update TypeScript Paths

Add to `apps/dashboard/admin/tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      // ... existing paths ...
    }
  }
}
```

#### Step 1.4: Update PostCSS Config

Modify `apps/dashboard/admin/postcss.config.cjs`:
```javascript
module.exports = {
	plugins: {
		autoprefixer: {},
		// Tailwind CSS v4 uses Vite plugin, not PostCSS plugin
	},
};
```

#### Step 1.5: Initialize Selia

Run:
```bash
cd apps/dashboard/admin
npx selia@latest init
```

This creates:
- `src/components/selia/` directory structure
- Tailwind CSS v4 configuration
- Base component utilities

### Phase 2: Core Component Integration (Day 3-7)

**Goal**: Add Selia components and create @proofa/components wrappers

#### Step 2.1: Add Priority Components to Admin

All Selia components are copied to `src/components/selia/ui/` (this happens automatically via `npx selia@latest init`).

#### Step 2.2: Create Wrapper Components in @proofa/components

Create wrapper files in `apps/packages/components/src/components/ui/`:

**Critical Wrappers** (needed for Phase 2):
- [ ] Button wrapper
- [ ] Card wrapper (Card, CardHeader, CardContent, CardFooter)
- [ ] Input wrapper
- [ ] Label wrapper
- [ ] Select wrapper (Select, SelectTrigger, SelectValue, SelectContent, SelectItem)
- [ ] Dialog wrapper (Dialog, DialogContent, DialogHeader, DialogFooter)
- [ ] Alert wrapper (Alert, AlertDescription)
- [ ] Badge wrapper
- [ ] Checkbox wrapper
- [ ] Spinner wrapper (for LoadingState)
- [ ] Toast wrapper

**Implementation Order**:
1. Create wrapper files following pattern above
2. Export from `@proofa/components/index.ts`
3. Test wrappers in admin dashboard pages
4. Add more wrappers as needed (Avatar, Separator, etc.)

**Example: Create Button Wrapper**

File: `apps/packages/components/src/components/ui/Button/Button.tsx`
```typescript
import React from 'react';
import {
  Button as SeliaButton,
  type ButtonProps as SeliaButtonProps,
} from '@/components/selia/ui/button';

export type ButtonProps = SeliaButtonProps;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <SeliaButton ref={ref} {...props} />
);

Button.displayName = 'Button';
```

File: `apps/packages/components/src/components/ui/Button/index.ts`
```typescript
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

**Repeat for**: Card, Input, Dialog, Select, Alert, Badge, Checkbox, Spinner, Toast, Avatar, Separator, Tabs, etc.

#### Step 2.3: Update @proofa/components Index

File: `apps/packages/components/src/index.ts`
```typescript
// Selia Wrappers
export { Button } from './components/ui/Button';
export type { ButtonProps } from './components/ui/Button';

export { Card, CardHeader, CardContent, CardFooter } from './components/ui/Card';
export type { CardProps } from './components/ui/Card';

export { Input } from './components/ui/Input';
export type { InputProps } from './components/ui/Input';

export { Label } from './components/ui/Label';
export type { LabelProps } from './components/ui/Label';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './components/ui/Select';
export type { SelectProps } from './components/ui/Select';

export { Dialog, DialogContent, DialogHeader, DialogFooter } from './components/ui/Dialog';
export type { DialogProps } from './components/ui/Dialog';

export { Alert, AlertDescription } from './components/ui/Alert';
export type { AlertProps, AlertDescriptionProps } from './components/ui/Alert';

export { Badge } from './components/ui/Badge';
export type { BadgeProps } from './components/ui/Badge';

export { Checkbox } from './components/ui/Checkbox';
export type { CheckboxProps } from './components/ui/Checkbox';

export { Spinner } from './components/ui/Spinner';
export type { SpinnerProps } from './components/ui/Spinner';

export { Toast, useToast } from './components/ui/Toast';
export type { ToastProps } from './components/ui/Toast';

// ... more wrappers

// Specialized Components
export { Icon, IconType } from './icons';
export type { IconProps, IconTypeName } from './icons';

export { LoginCard, LoginCardLogo, LoginCardTitle, LoginCardSubtitle, LoginCardBody, LoginCardTerms, LoginCardError } from './components/ui/LoginCard';
export { SessionCard } from './components/ui/SessionCard';
export { EmptyState } from './components/ui/EmptyState';
export { ProfileHeader } from './components/ui/ProfileHeader';
export { InfoGrid } from './components/ui/InfoGrid';
export { InfoList } from './components/ui/InfoList';
export { StatusDot } from './components/ui/StatusDot';

export { cn } from './utils/cn';
```

#### Step 2.4: Update CSS Imports in Admin

Replace `apps/dashboard/admin/src/index.css`:
```css
/* Tailwind CSS v4 */
@import 'tailwindcss';

/* Admin Dark Theme Overrides */
[data-theme="dark"] {
  --card-bg: #1a2235;
  --bg-surface: #141b30;
  --bg-muted: #0f1624;
  --border: #2a3a52;
  --card-border: #2a3a52;
  --card-hover-border: #3a4a62;
  --surface-secondary: #141b30;
  --surface-hover: #1f2a3d;
  --text-primary: #f5f7fa;
  --text-secondary: #a0adc4;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --card-bg: #1a2235;
    --bg-surface: #141b30;
    --bg-muted: #0f1624;
    --border: #2a3a52;
    --card-border: #2a3a52;
    --card-hover-border: #3a4a62;
    --surface-secondary: #141b30;
    --surface-hover: #1f2a3d;
    --text-primary: #f5f7fa;
    --text-secondary: #a0adc4;
  }
}

/* Minimal admin-specific styles (target <20 lines) */
html, body, #root {
  height: 100%;
  width: 100%;
}

body {
  background: var(--card-bg);
}
```

#### Step 2.5: Migrate Custom Components to Use Wrappers

**Modal** (`src/components/Modal.tsx`):
```typescript
// Replace with wrapper imports from @proofa/components
export { Dialog as Modal } from '@proofa/components';
export { DialogContent as ModalBody } from '@proofa/components';
export { DialogHeader as ModalHeader } from '@proofa/components';
export { DialogFooter as ModalFooter } from '@proofa/components';
```

Or migrate pages directly to use @proofa/components Dialog.

**Select** (`src/components/Select.tsx`):
```typescript
// Replace with Selia Select via @proofa/components wrapper
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@proofa/components';
```

**Toast** (`src/components/Toast.tsx`):
```typescript
// Replace with Selia Toast via @proofa/components wrapper
export { Toast, useToast } from '@proofa/components';
```

#### Step 2.6: Test Core Flows

**Old**: `src/components/Modal.tsx` (custom)
**New**: Use Selia Dialog via @proofa/components wrapper

**Migration pattern** (use wrappers):
```typescript
// Before (custom Modal)
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/Modal';

<Modal isOpen={isOpen} onClose={onClose} size="lg">
  <ModalHeader onClose={onClose}>Settings</ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>
    <button onClick={onClose}>Cancel</button>
    <button onClick={handleSave}>Save</button>
  </ModalFooter>
</Modal>

// After (Selia Dialog via @proofa/components wrapper)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@proofa/components';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Settings</DialogTitle>
    </DialogHeader>
    <div className="py-4">Content</div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Step 2.4: Replace Select Component

**Old**: `src/components/Select.tsx` (custom)
**New**: Use Selia Select via @proofa/components wrapper

```typescript
// Before (custom Select)
import { Select } from '@/components/Select';

<Select
  value={provider}
  onChange={setProvider}
  options={[
    { value: 'stripe', label: 'Stripe' },
    { value: 'lemonsqueezy', label: 'LemonSqueezy' },
  ]}
  placeholder="Select provider..."
/>

// After (Selia Select via @proofa/components wrapper)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proofa/components';

<Select value={provider} onValueChange={setProvider}>
  <SelectTrigger>
    <SelectValue placeholder="Select provider..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="stripe">Stripe</SelectItem>
    <SelectItem value="lemonsqueezy">LemonSqueezy</SelectItem>
  </SelectContent>
</Select>
```

#### Step 2.5: Replace Toast Component

**Old**: `src/components/Toast.tsx` (custom)
**New**: Use Selia Toast via @proofa/components wrapper

```typescript
// Before (custom Toast)
import { showToast } from '@/components/Toast';

showToast('Success', 'Settings saved');

// After (Selia Toast via @proofa/components wrapper)
import { useToast } from '@proofa/components';

const { toast } = useToast();

toast({
  title: "Success",
  description: "Settings saved",
});
```

#### Step 2.6: Replace @proofa/components Primitives

**Replace Button** (now wrapper):
```typescript
// No change needed - just use Button from @proofa/components
import { Button } from '@proofa/components';

<Button variant="default">Save</Button>

// If Button was from old @proofa/components:
// import { Button } from '@proofa/components'; // OLD
// Now it's the Selia wrapper
// import { Button } from '@proofa/components'; // NEW (same import!)
```

**Replace Badge** (now wrapper):
```typescript
import { Badge } from '@proofa/components';

<Badge variant="success">Active</Badge>
```

**Replace Card** (now wrapper):
```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@proofa/components';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

**Replace FormGroup/FormInput** (now individual wrappers):
```typescript
import { Label, Input } from '@proofa/components';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
</div>
```

**Replace Loading** (now Spinner wrapper):
```typescript
import { Spinner } from '@proofa/components';

<Spinner size="lg" />
```

#### Step 2.7: Rebuild IconPicker

**Old**: `src/components/IconPicker.tsx` (custom dropdown with icons)
**New**: Selia `Popover` + `Command` + `@proofa/components` Icon

```typescript
import { Popover, PopoverTrigger, PopoverContent } from '@/components/selia/ui/popover';
import { Command, CommandInput, CommandList, CommandItem } from '@/components/selia/ui/command';
import { Button } from '@/components/selia/ui/button';
import { Icon } from '@proofa/components'; // Keep Icon from @proofa

export function IconPicker({ selectedIconId, onSelect }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Icon icon={selectedIcon.iconName} size={20} />
          {selectedIcon.name}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Command>
          <CommandInput placeholder="Search icons..." />
          <CommandList>
            {AVAILABLE_ICONS.map((icon) => (
              <CommandItem
                key={icon.id}
                onSelect={() => {
                  onSelect(icon.id);
                  setOpen(false);
                }}
              >
                <Icon icon={icon.iconName} size={20} />
                {icon.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

**Key Components**:
- ✅ Selia `Popover` for dropdown positioning
- ✅ Selia `Command` for searchable list
- ✅ Selia `Button` for trigger
- ✅ @proofa `Icon` for HugeIcons rendering (only specialized component we keep)

#### Step 2.8: Rebuild Business Modals

**InviteUserModal**: Complex form with plan selection
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Select, SelectTrigger, SelectContent, SelectItem, SelectValue, Input, Label, Checkbox, Button } from '@proofa/components';

export function InviteUserModal({ isOpen, onClose, projectId, appId }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger id="plan">
                <SelectValue placeholder="Select plan..." />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.public_id} value={plan.public_id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox 
              id="grant-license"
              checked={grantLicense} 
              onCheckedChange={setGrantLicense} 
            />
            <Label htmlFor="grant-license">Grant license immediately</Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleInvite}>Send Invitation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Key Points**:
- ✅ All imports from `@proofa/components` (wrappers)
- ✅ No direct Selia imports in admin code
- ✅ Consistent component API
- ✅ Easy to update if wrapper changes

#### Step 2.9: Test Core Flows

Test these critical paths:
- [ ] Modal/Dialog open/close with form submission
- [ ] Select dropdown with multiple options
- [ ] Toast notifications (success/error)
- [ ] Button variants and states
- [ ] Dark/light theme switching
- [ ] Accessibility: keyboard navigation

### Phase 3: Page-by-Page Migration (Day 8-16)

**Goal**: Migrate all 26 pages to use Selia components

**Priority Order**:

**Tier 1 - Critical User Flows** (Days 8-9):
- [ ] Login.tsx
- [ ] Onboarding.tsx
- [ ] ProjectDetail.tsx
- [ ] BillingDashboard.tsx

**Tier 2 - Core Pages** (Days 10-12):
- [ ] ProjectSettings.tsx
- [ ] AppSettings.tsx
- [ ] AppDetail.tsx
- [ ] ProjectTeam.tsx

**Tier 3 - Feature Pages** (Days 13-15):
- [ ] ProjectPaymentProviders.tsx
- [ ] PaymentTestingPlayground.tsx
- [ ] WebhookMonitoring.tsx
- [ ] Others (remaining 13 pages)

**Tier 4 - Edge Pages** (Day 16):
- [ ] Profile.tsx
- [ ] Less-used admin pages

#### Migration Checklist Per Page:

```typescript
// For each page, replace:
1. Custom Modal → Selia Dialog
2. Custom Select → Selia Select
3. Custom Toast → Selia Toast
4. Custom Button → Selia Button
5. Custom styling → Tailwind utilities
6. Forms → Selia Form component
7. Tables → Selia Table component
```

### Phase 4: Final Polish (Day 17-18)

**Goal**: Verify everything works, clean up

- [ ] Remove custom component files (`Modal.tsx`, `Select.tsx`, `Toast.tsx`)
- [ ] Delete unused CSS from `index.css` (keep only 20 lines max)
- [ ] Run full test suite
- [ ] Verify all pages load
- [ ] Test dark/light theme
- [ ] Check accessibility (keyboard nav, screen readers)
- [ ] Performance audit (no regressions)
- [ ] Update component library documentation

---

## Component Strategy

### Selia-First Architecture with Wrapper Pattern

**Core Principle**: Create wrapper components for all Selia primitives in @proofa/components. Admin code imports from @proofa/components, not directly from Selia.

**Benefits of Wrapper Pattern**:
- ✅ Single point of customization
- ✅ Easier to update Selia components later
- ✅ Can add Proofa-specific defaults
- ✅ Consistent API across all dashboards
- ✅ Easy to swap UI library in future (just update wrappers)

**Tier 1: Selia Components** (50+ UI Primitives - SOURCE)
- **Source**: `src/components/selia/ui/` (copied via Selia CLI)
- **What**: Headless UI primitives from Selia
- **Direct Usage**: NEVER import directly in admin code
- **Wrapper**: Wrap with @proofa/components
- **Examples**: selia Button, Dialog, Input, Select, Card, etc.

**Tier 2: @proofa/components** (ALL UI Components via Wrappers)
- **Source**: `apps/packages/components/src/` (maintained by us)
- **What**: Wrappers around Selia components + specialized components
  
  **Selia Wrappers** (re-export with Proofa defaults):
  - ✅ Button (wraps Selia Button)
  - ✅ Card, CardHeader, CardContent, CardFooter (wraps Selia Card)
  - ✅ Input, Label (wraps Selia Input/Label)
  - ✅ Select, SelectTrigger, SelectValue, SelectContent, SelectItem (wraps Selia Select)
  - ✅ Dialog, DialogContent, DialogHeader, DialogFooter (wraps Selia Dialog)
  - ✅ Alert, AlertDescription (wraps Selia Alert)
  - ✅ Badge (wraps Selia Badge)
  - ✅ Avatar, AvatarImage, AvatarFallback (wraps Selia Avatar)
  - ✅ And all other commonly used Selia components
  
  **Specialized Components** (no Selia equivalent):
  - ✅ Icon (HugeIcons wrapper - unique to Proofa)
  - ✅ LoginCard (specialized auth flow)
  - ✅ SessionCard (specialized session display)
  - ✅ EmptyState (specialized empty state)
  - ✅ ProfileHeader (specialized header layout)
  - ✅ InfoGrid, InfoList (specialized info displays)
  - ✅ StatusDot (custom status indicator)
  - ✅ cn() utility

**Tier 3: Admin Components** (Business Logic)
- **Source**: `apps/dashboard/admin/src/components/` (admin-only)
- **What**: Admin-specific business components
- **Import from**: @proofa/components ONLY (never directly from selia)
- **Examples**: IconPicker, InviteUserModal, ConfirmModal

### Migration Decision Matrix

| Component | Selia Has? | @proofa Has? | Decision |
|-----------|-----------|--------------|----------|
| Button | ✅ Yes | ✅ Yes | Use Selia, deprecate @proofa |
| Badge | ✅ Yes | ✅ Yes | Use Selia, deprecate @proofa |
| Card | ✅ Yes | ✅ Yes | Use Selia, deprecate @proofa |
| Input | ✅ Yes | ✅ (FormInput) | Use Selia, deprecate @proofa |
| Form | ✅ Yes | ✅ (FormGroup) | Use Selia, deprecate @proofa |
| Loading | ✅ (Spinner) | ✅ Yes | Use Selia Spinner, deprecate @proofa |
| Icon | ❌ (Lucide only) | ✅ Yes | Keep @proofa (HugeIcons) |
| LoginCard | ❌ No | ✅ Yes | Keep @proofa (specialized) |
| SessionCard | ❌ No | ✅ Yes | Keep @proofa (specialized) |
| EmptyState | ❌ No | ✅ Yes | Keep @proofa (specialized) |
| ProfileHeader | ❌ No | ✅ Yes | Keep @proofa (specialized) |
| InfoGrid/InfoList | ❌ No | ✅ Yes | Keep @proofa (specialized) |
| StatusDot | ❌ No | ✅ Yes | Keep @proofa (specialized) |

### Migration Decision Matrix

| Component | Selia Has? | @proofa Has? | Decision |
|-----------|-----------|--------------|----------|
| Button | ✅ Yes | - | Create wrapper in @proofa |
| Badge | ✅ Yes | - | Create wrapper in @proofa |
| Card | ✅ Yes | - | Create wrapper in @proofa |
| Input | ✅ Yes | - | Create wrapper in @proofa |
| Form | ✅ Yes | - | Create wrapper in @proofa |
| Dialog | ✅ Yes | - | Create wrapper in @proofa |
| Select | ✅ Yes | - | Create wrapper in @proofa |
| Alert | ✅ Yes | - | Create wrapper in @proofa |
| Avatar | ✅ Yes | - | Create wrapper in @proofa |
| Toast | ✅ Yes | - | Create wrapper in @proofa |
| And 40+ more Selia components | ✅ Yes | - | Create wrapper in @proofa |
| Icon | ❌ No | ✅ Yes | Keep (HugeIcons wrapper) |
| LoginCard | ❌ No | - | Create (built from Selia) |
| SessionCard | ❌ No | - | Create (built from Selia) |
| EmptyState | ❌ No | - | Create (built from Selia) |
| ProfileHeader | ❌ No | - | Create (built from Selia) |
| InfoGrid/InfoList | ❌ No | - | Create (built from Selia) |
| StatusDot | ❌ No | - | Create (built from Selia) |

---

## Wrapper Component Pattern

### Why Wrappers?

Instead of this (❌ BAD):
```typescript
// Direct Selia import - hard to update later
import { Button } from '@/components/selia/ui/button';
import { Card } from '@/components/selia/ui/card';
import { Input } from '@/components/selia/ui/input';

export function Page() {
  return (
    <Card>
      <Input placeholder="Name" />
      <Button>Submit</Button>
    </Card>
  );
}

// If you need to change Selia Button, you update in 100+ places!
```

Do this (✅ GOOD):
```typescript
// Import from @proofa/components - single point of update
import { Button, Card, Input } from '@proofa/components';

export function Page() {
  return (
    <Card>
      <Input placeholder="Name" />
      <Button>Submit</Button>
    </Card>
  );
}

// If you need to change Button, you update @proofa/components/Button once!
```

### Wrapper Implementation Pattern

**File Structure**:
```
apps/packages/components/src/components/ui/
├── Button/
│   ├── Button.tsx       (wrapper around Selia Button)
│   └── index.ts
├── Card/
│   ├── Card.tsx         (wrapper around Selia Card)
│   ├── CardHeader.tsx
│   ├── CardContent.tsx
│   └── index.ts
├── Input/
│   ├── Input.tsx        (wrapper around Selia Input)
│   └── index.ts
├── Dialog/
│   ├── Dialog.tsx
│   ├── DialogContent.tsx
│   ├── DialogHeader.tsx
│   ├── DialogFooter.tsx
│   └── index.ts
└── ... (all other wrappers)
```

**Example: Button Wrapper**:
```typescript
// apps/packages/components/src/components/ui/Button/Button.tsx

import React from 'react';
import {
  Button as SeliaButton,
  type ButtonProps as SeliaButtonProps,
} from '@/components/selia/ui/button';

export type ButtonProps = SeliaButtonProps;

/**
 * Button component - Proofa wrapper around Selia Button
 * 
 * Provides consistent Button API across all Proofa dashboards.
 * If updating to a different UI library, update only this file.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <SeliaButton ref={ref} {...props} />
);

Button.displayName = 'Button';
```

**Example: Card Wrapper**:
```typescript
// apps/packages/components/src/components/ui/Card/Card.tsx

import React from 'react';
import {
  Card as SeliaCard,
  CardHeader as SeliaCardHeader,
  CardContent as SeliaCardContent,
  CardFooter as SeliaCardFooter,
  type CardProps as SeliaCardProps,
} from '@/components/selia/ui/card';

export type CardProps = SeliaCardProps;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (props, ref) => <SeliaCard ref={ref} {...props} />
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, SeliaCardProps>(
  (props, ref) => <SeliaCardHeader ref={ref} {...props} />
);
CardHeader.displayName = 'CardHeader';

export const CardContent = React.forwardRef<HTMLDivElement, SeliaCardProps>(
  (props, ref) => <SeliaCardContent ref={ref} {...props} />
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, SeliaCardProps>(
  (props, ref) => <SeliaCardFooter ref={ref} {...props} />
);
CardFooter.displayName = 'CardFooter';
```

**With Proofa Customization**:
```typescript
// apps/packages/components/src/components/ui/Button/Button.tsx

import React from 'react';
import {
  Button as SeliaButton,
  type ButtonProps as SeliaButtonProps,
} from '@/components/selia/ui/button';

export type ButtonProps = SeliaButtonProps & {
  /** Proofa-specific: compact size for dense UIs */
  compact?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ compact = false, className = '', ...props }, ref) => {
    const compactClass = compact ? 'h-8 px-2 text-xs' : '';
    return (
      <SeliaButton
        ref={ref}
        className={`${compactClass} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
```

### Updated Package Exports

```typescript
// apps/packages/components/src/index.ts

// Re-export all Selia wrappers from @proofa/components
export { Button } from './components/ui/Button';
export type { ButtonProps } from './components/ui/Button';

export { Card, CardHeader, CardContent, CardFooter } from './components/ui/Card';
export type { CardProps } from './components/ui/Card';

export { Input, Label } from './components/ui/Input';
export type { InputProps, LabelProps } from './components/ui/Input';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './components/ui/Select';
export type { SelectProps } from './components/ui/Select';

export { Dialog, DialogContent, DialogHeader, DialogFooter } from './components/ui/Dialog';
export type { DialogProps } from './components/ui/Dialog';

export { Alert, AlertDescription } from './components/ui/Alert';
export type { AlertProps } from './components/ui/Alert';

export { Badge } from './components/ui/Badge';
export type { BadgeProps } from './components/ui/Badge';

export { Avatar, AvatarImage, AvatarFallback } from './components/ui/Avatar';
export type { AvatarProps } from './components/ui/Avatar';

export { Toast } from './components/ui/Toast';
export type { ToastProps } from './components/ui/Toast';

// ... export all other Selia wrappers

// Specialized components (not Selia-based)
export { Icon, IconType } from './icons';
export type { IconProps, IconTypeName } from './icons';

export { LoginCard, LoginCardLogo, LoginCardTitle, LoginCardSubtitle, LoginCardBody, LoginCardTerms, LoginCardError } from './components/ui/LoginCard';
export { SessionCard } from './components/ui/SessionCard';
export { EmptyState } from './components/ui/EmptyState';
export { ProfileHeader } from './components/ui/ProfileHeader';
export { InfoGrid } from './components/ui/InfoGrid';
export { InfoList } from './components/ui/InfoList';
export { StatusDot } from './components/ui/StatusDot';

export { cn } from './utils/cn';
```

### Admin Dashboard Usage

**Before** (direct Selia imports):
```typescript
import { Button } from '@/components/selia/ui/button';
import { Card, CardContent } from '@/components/selia/ui/card';
import { Input } from '@/components/selia/ui/input';
```

**After** (wrapper imports):
```typescript
import { Button, Card, CardContent, Input } from '@proofa/components';
```

**Complete Page Example**:
```typescript
import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, Input, Label, Dialog, DialogContent, DialogHeader, DialogFooter } from '@proofa/components';

export function ProjectSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>Project Settings</CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Project Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={() => setIsOpen(true)}>Edit</Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>Edit Project</DialogHeader>
          <div className="space-y-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### Benefits of This Approach

| Benefit | Why It Matters |
|---------|----------------|
| **Single Point of Update** | Change Button once in @proofa/components, updates everywhere |
| **Easy to Customize** | Add Proofa-specific props/defaults in wrapper |
| **Future-Proof** | Switch UI libraries by updating wrappers only |
| **Consistent API** | All dashboards use same components from @proofa |
| **Type Safety** | Full TypeScript support, no import confusion |
| **Clean Code** | Admin code imports from familiar @proofa namespace |
| **Reduced Coupling** | Admin doesn't know about Selia internals |
| **Gradual Migration** | Can update Selia components one wrapper at a time |

---

#### Form Components

| Current | Selia | Action |
|---------|-------|--------|
| Select (admin custom) | Select | Replace |
| @proofa FormInput | Input | Replace |
| @proofa FormGroup | Form + Label | Replace |
| N/A | Textarea | New |
| N/A | Checkbox | New |
| N/A | Radio | New |
| N/A | Switch | New |
| IconPicker (admin) | Popover + Command | Rebuild |

#### Layout & Display

| Current | Selia | Action |
|---------|-------|--------|
| @proofa Card | Card | Replace |
| @proofa Badge | Badge | Replace |
| @proofa Button | Button | Replace |
| @proofa Loading | Spinner | Replace |
| DIV-based tables | Table | Replace |
| DIV-based tabs | Tabs | New |
| DIV-based sidebar | Sidebar | New |
| N/A | Accordion | New |
| N/A | ScrollArea | New |
| N/A | Separator | New |

#### Feedback & Status

| Current | Selia | Action |
|---------|-------|--------|
| Toast (admin custom) | Toast | Replace |
| @proofa Badge | Badge | Replace |
| N/A | Alert | New |
| N/A | Avatar | New |
| N/A | Progress | New |
| N/A | Skeleton | New |

#### Keep from @proofa (Specialized)

| Component | Reason | Used Where |
|-----------|--------|------------|
| Icon | HugeIcons wrapper (Selia uses Lucide) | Everywhere |
| LoginCard | Specialized auth pattern | Login pages |
| SessionCard | Specialized session display | Session management |
| EmptyState | Specialized empty states | List views |
| ProfileHeader | Specialized header layout | Profile pages |
| InfoGrid, InfoList | Specialized info displays | Detail pages |
| StatusDot | Custom status indicator | Status displays |

### Icon Changes

**Current Icons**:
- `@proofa/components` exports unified `Icon` component + `IconType` enum
- Uses `@hugeicons/react` as source (HugeIcons library)
- Already standardized across all dashboards

**Selia Default**: Uses Lucide icons

**Our Strategy**: **Keep HugeIcons, No Changes**

**Why?**
- ✅ `@proofa/components` Icon is shared design system (user, admin, home dashboards)
- ✅ Already have 50+ icons mapped in IconType enum
- ✅ Changing would break user dashboard, home dashboard, docs dashboard
- ✅ Selia components can easily accept any icon component via props

**Implementation**:
```typescript
// Selia components accept icon props, we pass our Icon
import { Dialog, DialogHeader } from '@/components/selia/ui/dialog';
import { Icon, IconType } from '@proofa/components';

<Dialog>
  <DialogHeader>
    <Icon icon={IconType.Settings} size={20} />
    Settings
  </DialogHeader>
</Dialog>
```

**Action Required**: None - keep existing icon system unchanged

---

## Post-Migration: @proofa/components Cleanup

### Deprecate Duplicate Components

After migration, these @proofa/components will be **deprecated** (marked as unused, eventually removed):

**UI Primitives** (replaced by Selia):
- ❌ Button → Use Selia Button
- ❌ Badge → Use Selia Badge
- ❌ Card, CardHeader, CardTitle, CardBody → Use Selia Card
- ❌ FormGroup, FormLabel, FormInput, FormHint → Use Selia Form + Label + Input
- ❌ Loading → Use Selia Spinner

**Rebuild Using Selia** (@proofa/components Specialized):
- 🔄 Icon (HugeIcons wrapper - keep as unique wrapper)
- 🔄 LoginCard (rebuild using Selia: Card, Alert, Spinner)
- 🔄 SessionCard (rebuild using Selia: Card, Badge)
- 🔄 EmptyState (rebuild using Selia: Card)
- 🔄 ProfileHeader (rebuild using Selia: Avatar)
- 🔄 InfoGrid, InfoList (rebuild using Selia: Grid/Flex)
- 🔄 StatusDot (rebuild using simple div + Selia Badge)
- ✅ cn() utility (shared with Selia)

### Package Structure After Migration

```
apps/packages/components/src/
├── components/
│   ├── ui/
│   │   ├── Icon.tsx              ✅ Keep (HugeIcons wrapper)
│   │   ├── LoginCard.tsx         ✅ Keep (specialized)
│   │   ├── SessionCard.tsx       ✅ Keep (specialized)
│   │   ├── EmptyState.tsx        ✅ Keep (specialized)
│   │   ├── ProfileHeader.tsx     ✅ Keep (specialized)
│   │   ├── InfoGrid.tsx          ✅ Keep (specialized)
│   │   ├── InfoList.tsx          ✅ Keep (specialized)
│   │   ├── StatusDot.tsx         ✅ Keep (specialized)
│   │   ├── Button.tsx            ❌ Deprecate (use Selia)
│   │   ├── Badge.tsx             ❌ Deprecate (use Selia)
│   │   ├── Card.tsx              ❌ Deprecate (use Selia)
│   │   ├── FormGroup.tsx         ❌ Deprecate (use Selia)
│   │   └── Loading.tsx           ❌ Deprecate (use Selia)
├── icons/
│   └── index.ts                  ✅ Keep (IconType enum)
├── utils/
│   └── cn.ts                     ✅ Keep (shared utility)
└── index.ts                      🔄 Update exports
```

### Updated Package Exports

```typescript
// apps/packages/components/src/index.ts

// Icons (KEEP - unique to Proofa)
export { Icon, IconType } from './icons';
export type { IconProps, IconTypeName } from './icons';

// Utilities (KEEP - shared)
export { cn } from './utils/cn';

// Specialized Components (KEEP - no Selia equivalent)
export { LoginCard, LoginCardLogo, LoginCardTitle, LoginCardSubtitle, LoginCardBody, LoginCardTerms, LoginCardError } from './components/ui/LoginCard';
export { SessionCard } from './components/ui/SessionCard';
export { EmptyState } from './components/ui/EmptyState';
export { ProfileHeader } from './components/ui/ProfileHeader';
export { InfoGrid } from './components/ui/InfoGrid';
export { InfoList } from './components/ui/InfoList';
export { StatusDot } from './components/ui/StatusDot';

// DEPRECATED - Use Selia instead (mark for removal in v2.0)
// export { Button } from './components/ui/Button';
// export { Badge } from './components/ui/Badge';
// export { Card } from './components/ui/Card';
// export { FormGroup } from './components/ui/FormGroup';
// export { Loading } from './components/ui/Loading';
```

### Migration Impact on Other Dashboards

**User Dashboard** (`apps/dashboard/user/`):
- Already uses Tailwind CSS v3
- Can optionally adopt Selia components later
- @proofa/components still available (Icon, LoginCard, etc.)
- No breaking changes required

**Home Dashboard** (`apps/dashboard/home/`):
- Uses Astro + Tailwind CSS
- @proofa/components still available (Icon, etc.)
- No breaking changes required

**Docs Dashboard** (`apps/dashboard/docs/`):
- Uses VitePress
- @proofa/components still available (Icon, etc.)
- No breaking changes required

**Strategy**: Admin dashboard migrates fully to Selia. Other dashboards continue using @proofa/components (specialized only) or can optionally adopt Selia later.

---

## Configuration Changes

### File: `apps/dashboard/admin/package.json`

**Add**:
```json
{
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.17"
  }
}
```

**Remove** (if applicable):
- UnoCSS packages (none currently)
- Other CSS framework packages

### File: `apps/dashboard/admin/vite.config.ts`

**Changes**:
1. Add `@tailwindcss/vite` plugin before `react()`
2. Add `@/*` path alias for component imports

**Complete updated file**:
```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	css: {
		postcss: path.resolve(__dirname, "postcss.config.cjs"),
	},
	plugins: [
		tailwindcss(),
		react(),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			"@proofa/react": path.resolve(__dirname, "../../packages/react/dist/index.js"),
			"@proofa/client": path.resolve(__dirname, "../../packages/client/dist/index.js"),
			"@proofa/shared": path.resolve(__dirname, "../../packages/shared/dist/index.js"),
			"@proofa/auth": path.resolve(__dirname, "../../packages/auth/dist"),
			"@proofa/cache": path.resolve(__dirname, "../../packages/cache/dist/index.js"),
			"@proofa/db": path.resolve(__dirname, "../../packages/db/dist/index.js"),
			"@proofa/queue": path.resolve(__dirname, "../../packages/queue/dist/index.js"),
		},
	},
	server: {
		port: 5174,
		host: true,
		allowedHosts: ["localhost"],
		proxy: {
			"/api": {
				target: "http://localhost:3004",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, "/v1"),
			},
		},
	},
	define: {
		"import.meta.env.VITE_GATEWAY_URL": JSON.stringify(process.env.VITE_GATEWAY_URL || "http://localhost:3004"),
		"import.meta.env.VITE_CORE_URL": JSON.stringify(process.env.VITE_CORE_URL || "http://localhost:3003"),
		"import.meta.env.VITE_HOME_URL": JSON.stringify(process.env.VITE_HOME_URL || "http://localhost:4321"),
		"import.meta.env.VITE_DOCS_URL": JSON.stringify(process.env.VITE_DOCS_URL || "http://localhost:4322"),
	},
});
```

### File: `apps/dashboard/admin/tsconfig.json`

**Add to compilerOptions**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@proofa/auth": ["../../packages/auth/src"],
      "@proofa/auth/*": ["../../packages/auth/src/*"],
      "@proofa/cache": ["../../packages/cache/src"],
      "@proofa/cache/*": ["../../packages/cache/src/*"],
      "@proofa/client": ["../../packages/client/src"],
      "@proofa/client/*": ["../../packages/client/src/*"],
      "@proofa/db": ["../../packages/db/src"],
      "@proofa/db/*": ["../../packages/db/src/*"],
      "@proofa/queue": ["../../packages/queue/src"],
      "@proofa/queue/*": ["../../packages/queue/src/*"],
      "@proofa/react": ["../../packages/react/src"],
      "@proofa/react/*": ["../../packages/react/src/*"],
      "@proofa/shared": ["../../packages/shared/src"],
      "@proofa/shared/*": ["../../packages/shared/src/*"]
    }
  }
}
```

### File: `apps/dashboard/admin/postcss.config.cjs`

**Update to**:
```javascript
module.exports = {
	plugins: {
		autoprefixer: {},
		// Tailwind CSS v4 uses Vite plugin, not PostCSS plugin
	},
};
```

### File: `apps/dashboard/admin/src/index.css`

**Replace entire file with**:
```css
/* Tailwind CSS v4 */
@import 'tailwindcss';

/* Admin Dark Theme Overrides */
[data-theme="dark"] {
  --card-bg: #1a2235;
  --bg-surface: #141b30;
  --bg-muted: #0f1624;
  --border: #2a3a52;
  --card-border: #2a3a52;
  --card-hover-border: #3a4a62;
  --surface-secondary: #141b30;
  --surface-hover: #1f2a3d;
  --text-primary: #f5f7fa;
  --text-secondary: #a0adc4;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --card-bg: #1a2235;
    --bg-surface: #141b30;
    --bg-muted: #0f1624;
    --border: #2a3a52;
    --card-border: #2a3a52;
    --card-hover-border: #3a4a62;
    --surface-secondary: #141b30;
    --surface-hover: #1f2a3d;
    --text-primary: #f5f7fa;
    --text-secondary: #a0adc4;
  }
}

/* Minimal admin-specific styles (target <20 lines) */
html, body, #root {
  height: 100%;
  width: 100%;
}

body {
  background: var(--card-bg);
}
```

---

## Testing Strategy

### Unit Testing

For each replaced component, verify:
```typescript
describe('Selia Dialog Migration', () => {
  it('renders dialog when open', () => {
    render(<AppSettings isOpen={true} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('closes on cancel button', () => {
    const onClose = vi.fn();
    render(<AppSettings isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('submits form on save', () => {
    const onSave = vi.fn();
    render(<AppSettings isOpen={true} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalled();
  });
});
```

### Integration Testing

Per page test checklist:
- [ ] All forms render without errors
- [ ] All buttons are clickable
- [ ] All modals open/close correctly
- [ ] All selects show options
- [ ] All tables display data
- [ ] Dark/light theme switch works

### Manual QA Checklist

- [ ] All 26 pages load without console errors
- [ ] All forms submit successfully
- [ ] All data displays correctly
- [ ] All buttons have appropriate hover states
- [ ] All modals are keyboard-accessible (Tab, Escape)
- [ ] All selects work with keyboard (arrow keys, Enter)
- [ ] All tables are responsive
- [ ] Accessibility: ARIA attributes present
- [ ] Performance: No visible lag
- [ ] Theme switching works instantly

### Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Rollback Plan

### If Critical Issues Arise

**Option 1: Partial Rollback** (Component-level)

If a specific Selia component causes issues:
1. Revert that component to custom implementation
2. Keep other Selia components
3. Continue with rest of migration

Example:
```typescript
// If Selia Dialog has issues, revert to custom Modal
// pages/AppSettings.tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/Modal'; // custom
import { SeliaDialog } from '@/components/selia/ui/dialog'; // Selia

// Use custom Modal temporarily
<Modal isOpen={isOpen} onClose={onClose}>
  {/* content */}
</Modal>
```

**Option 2: Full Project Rollback** (Complete abort)

If fundamental issues with Tailwind CSS v4:
1. Remove Tailwind CSS and Selia
2. Revert to original custom components
3. Keep documented learnings for future migration

Steps:
```bash
# Remove Tailwind/Selia
pnpm remove tailwindcss @tailwindcss/vite

# Revert config files
git checkout apps/dashboard/admin/vite.config.ts
git checkout apps/dashboard/admin/tsconfig.json
git checkout apps/dashboard/admin/src/index.css

# Restore custom components (if deleted)
git checkout apps/dashboard/admin/src/components/Modal.tsx
git checkout apps/dashboard/admin/src/components/Select.tsx
git checkout apps/dashboard/admin/src/components/Toast.tsx

# Revert pages to custom components
git checkout apps/dashboard/admin/src/pages/
```

### Risk Mitigation

**Before Starting Migration**:
- [ ] Create feature branch: `feature/selia-migration`
- [ ] Tag current version: `pre-selia-migration`
- [ ] Ensure all tests pass before starting
- [ ] Have rollback commands documented

**During Migration**:
- [ ] Commit after each phase
- [ ] Test each page before moving to next
- [ ] Keep custom components until all pages migrated
- [ ] Run tests regularly

**Exit Criteria** (If migration should stop):
- Timeline extends beyond 3 weeks
- Breaking changes in Selia components discovered
- Unacceptable performance regression
- Accessibility requirements not met

---

## Success Metrics

### Completion Criteria

- [x] All 26 pages migrated to Selia components
- [x] CSS reduced from 120 lines to <20 lines
- [x] All tests passing
- [x] No console errors in dev/prod
- [x] Accessibility (WCAG 2.1 AA)
- [x] Performance: Core Web Vitals maintained
- [x] Dark/light theme working perfectly
- [x] Custom component files deleted

### Performance Targets

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| CSS Size | 120 lines | <20 lines | ✅ 83% reduction |
| Build Time | ~2s | ~2s | No regression |
| Bundle Size | TBD | TBD | <10% increase |
| First Paint | TBD | TBD | <50ms change |
| LCP | TBD | TBD | <100ms change |

### Accessibility Targets

- [ ] Keyboard navigation: All interactive elements accessible
- [ ] Screen reader: All content announced correctly
- [ ] Color contrast: WCAG AAA for UI text (4.5:1)
- [ ] Focus management: Visible focus indicators
- [ ] ARIA: Proper roles, states, properties

---

## Rebuilding Specialized @proofa/components with Selia

### Philosophy

Even specialized components should be built from Selia primitives:
- ✅ **Selia-first**: Use Selia components as building blocks
- ✅ **Maximum reuse**: No custom CSS or DOM structures
- ✅ **Consistency**: All components follow Selia's patterns
- ✅ **Maintainability**: Easier to update, fewer dependencies

### 1. EmptyState

**Rebuilt with Selia wrappers** (from @proofa/components):
```typescript
import React from 'react';
import { Card, CardContent } from '@proofa/components';
import { Icon } from '@proofa/components';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: IconTypeName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon = 'Info', title, description, action, className = '', ...props }, ref) => {
    return (
      <Card ref={ref} className={`flex flex-col items-center justify-center py-12 px-4 ${className}`} {...props}>
        <CardContent className="flex flex-col items-center text-center">
          {icon && (
            <div className="mb-4 p-3 bg-muted rounded-full">
              <Icon icon={icon} size={32} className="text-muted-foreground" />
            </div>
          )}
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          {description && <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>}
          {action && <div>{action}</div>}
        </CardContent>
      </Card>
    );
  }
);

EmptyState.displayName = 'EmptyState';
```

**Key**: Uses Card wrapper (from Selia via @proofa/components)

### 2. LoginCard

**Rebuilt with Selia wrappers**:
```typescript
import React from 'react';
import { Card, CardContent, Alert, AlertDescription, Spinner } from '@proofa/components';
import { AlertCircle } from 'lucide-react';

export const LoginCard = React.forwardRef<HTMLDivElement, LoginCardProps>(
  ({ className = '', children, error, loading, ...props }, ref) => {
    return (
      <div className="relative">
        {error && (
          <div className="mb-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        <Card
          ref={ref}
          className={`w-full max-w-md mx-auto ${className}`}
          {...props}
        >
          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50 rounded-lg">
              <Spinner />
            </div>
          )}
          <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
            {children}
          </div>
        </Card>
      </div>
    );
  }
);

// ... rest of LoginCard components
```

**Key**: Uses Card, Alert, Spinner wrappers (all from @proofa/components)

### 3. SessionCard

**Rebuilt with Selia wrappers**:
```typescript
import React from 'react';
import { Card, CardContent, CardHeader, Badge } from '@proofa/components';
import { Icon, IconType } from '@proofa/components';

export const SessionCard = React.forwardRef<HTMLDivElement, SessionCardProps>(
  ({ title, isCurrent = false, metadata, action, className = '', ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={`border-l-4 ${isCurrent ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : ''} ${className}`}
        {...props}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold m-0">{title}</h4>
            {isCurrent && (
              <Badge variant="success" className="text-xs">
                <Icon icon={IconType.Check} size={12} className="mr-1" />
                Current
              </Badge>
            )}
          </div>
          {action && <div>{action}</div>}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {metadata.map((item, idx) => (
              <div key={idx}>
                <p className="text-muted-foreground mb-1">{item.label}</p>
                <p className="font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
);

SessionCard.displayName = 'SessionCard';
```

**Key**: Uses Card, CardHeader, CardContent, Badge wrappers (all from @proofa/components)

### 4. ProfileHeader

**Rebuilt with Selia wrapper**:
```typescript
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@proofa/components';

export const ProfileHeader = React.forwardRef<HTMLDivElement, ProfileHeaderProps>(
  ({ name, email, meta, avatar, className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={`flex items-start gap-4 ${className}`} {...props}>
        {avatar && (
          <Avatar className="h-12 w-12">
            <AvatarImage src={typeof avatar === 'string' ? avatar : undefined} alt={name} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold m-0">{name}</h2>
          <p className="text-muted-foreground mt-1 mb-0">{email}</p>
          {meta && <p className="text-xs text-muted-foreground mt-2 mb-0">{meta}</p>}
        </div>
      </div>
    );
  }
);

ProfileHeader.displayName = 'ProfileHeader';
```

**Key**: Uses Avatar wrapper (from @proofa/components)

### 5. InfoGrid

**Rebuilt with Tailwind utilities**:
```typescript
import React from 'react';

export const InfoGrid = React.forwardRef<HTMLDivElement, InfoGridProps>(
  ({ items, columns = 4, className = '', ...props }, ref) => {
    const gridColsClass = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    }[Math.min(columns, 4)] || 'grid-cols-4';

    return (
      <div
        ref={ref}
        className={`grid ${gridColsClass} gap-4 md:gap-6 ${className}`}
        {...props}
      >
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {item.label}
            </p>
            <p className="text-sm font-medium">{item.value}</p>
          </div>
        ))}
      </div>
    );
  }
);

InfoGrid.displayName = 'InfoGrid';
```

**Key**: Pure Tailwind utilities (no Selia wrapper needed)

### 6. InfoList

**Rebuilt with Selia wrapper**:
```typescript
import React from 'react';
import { Separator } from '@proofa/components';

export const InfoList = React.forwardRef<HTMLDivElement, InfoListProps>(
  ({ items, className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {items.map((item, idx) => (
          <div key={idx}>
            <div className="flex justify-between py-3">
              <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
              <span className="text-sm font-semibold">{item.value}</span>
            </div>
            {idx < items.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    );
  }
);

InfoList.displayName = 'InfoList';
```

**Key**: Uses Separator wrapper (from @proofa/components)

### 7. StatusDot

**Rebuilt with Selia wrapper**:
```typescript
import React from 'react';
import { Badge } from '@proofa/components';

export const StatusDot = React.forwardRef<HTMLDivElement, StatusDotProps>(
  ({ variant = 'neutral', label, className = '', ...props }, ref) => {
    if (label) {
      return (
        <Badge ref={ref} variant={variantToBadgeVariant[variant]} className={className} {...props}>
          <span className="h-2 w-2 rounded-full bg-current mr-2" />
          {label}
        </Badge>
      );
    }

    return (
      <div
        ref={ref}
        className={`flex items-center gap-2 ${className}`}
        {...props}
      >
        <div className={`h-2 w-2 rounded-full ${
          {
            success: 'bg-emerald-500',
            danger: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-amber-500',
            neutral: 'bg-gray-400',
          }[variant]
        }`} />
      </div>
    );
  }
);

StatusDot.displayName = 'StatusDot';
```

**Key**: Uses Badge wrapper (from @proofa/components)

### 8. Icon (Keep as Wrapper)

**Keep unchanged** - this is the unique HugeIcons integration point:
```typescript
// No changes to Icon - it's already a wrapper around HugeIcons
import { Icon, IconType } from '@proofa/components';

<Icon icon={IconType.Settings} size={20} />
```

---

## Summary: All Components Use @proofa/components

```
Week 1 (Days 1-2): Setup & Dependencies
├─ Add Tailwind CSS v4
├─ Update Vite config
├─ Initialize Selia
└─ Add core components

Week 1 (Days 3-7): Core Integration
├─ Day 3-4: Dialog/Modal
├─ Day 5-6: Forms (Select, Input)
├─ Day 6-7: Tables & Lists
└─ Testing & fixes

Week 2 (Days 8-16): Page Migration
├─ Tier 1 (4 pages): Days 8-9
├─ Tier 2 (4 pages): Days 10-12
├─ Tier 3 (12 pages): Days 13-15
└─ Tier 4 (2 pages): Day 16

Week 3 (Days 17-18): Polish
├─ Cleanup unused files
├─ Final testing
├─ Performance audit
└─ Documentation update

Total: 18 days (~2.5 weeks)
```

---

## Next Steps

1. **Approve Plan**: Review and confirm migration approach
2. **Create Feature Branch**: `git checkout -b feature/selia-migration`
3. **Start Phase 1**: Dependencies and setup
4. **Weekly Reviews**: Monitor progress and adjust timeline
5. **Document Learnings**: Update CSS guide with Selia patterns

---

## References

- [Selia Documentation](https://selia.earth)
- [Selia Installation (Vite)](https://selia.earth/docs/installation/vite)
- [Tailwind CSS v4](https://tailwindcss.com/docs/upgrade-guide)
- [Base UI Documentation](https://base-ui.com)
- Current CSS Guide: [docs/CSS_GUIDE.md](./CSS_GUIDE.md)

---

**Status**: Ready for Implementation  
**Last Updated**: January 23, 2026  
**Version**: 1.0
