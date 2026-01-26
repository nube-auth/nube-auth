# Admin Dashboard to Selia Migration Plan

**Version:** 2.0
**Date:** 2026-01-26
**Status:** Planning
**Approach:** Complete Overhaul with Pre-built Dashboard Layout

---

## 🎯 Key Discovery: Selia Dashboard Block

**Selia provides a production-ready dashboard block** that we can adopt as the foundation for our admin dashboard!

- **Live Demo:** https://selia.earth/block/dashboard/
- **Source Code:** https://github.com/nauvalazhar/selia/tree/master/components/blocks/dashboard

This pre-built dashboard includes:
- ✅ **Complete layout system** with responsive sidebar
- ✅ **Navigation structure** with collapsible sections
- ✅ **Stat card components** for metrics display
- ✅ **Data table examples** for recent orders
- ✅ **User profile menu** in sidebar footer
- ✅ **Mobile-responsive** behavior with sidebar toggle
- ✅ **Search integration** with keyboard shortcut

### 🎯 What We'll Use (Core Building Blocks Only)

**✅ ADOPTING:**
1. **layout.tsx** → Complete responsive layout with sidebar
2. **app-sidebar.tsx** → Navigation structure and patterns
3. **stat-card.tsx** → Metrics display component
4. **page.tsx** → As reference for layout usage patterns

**❌ SKIPPING (Focus on Core):**
1. **chart.tsx** → No charts/data visualization for now
2. **data.ts** → No mock data needed
3. **recharts dependency** → Not installing additional packages

**Why?** We're focusing on **core building blocks** (layout, navigation, basic components) to complete the migration faster. Charts can be added later as a separate enhancement if needed.

**Impact:** This reduces our migration effort by ~40% since we don't need to design the layout from scratch, and keeps dependencies minimal!

---

## Executive Summary

This document outlines the comprehensive migration plan to transition the Proofa Admin Dashboard from custom CSS-heavy implementation to 100% utilization of the Selia component library, **leveraging Selia's pre-built dashboard block as the foundation**. The migration will touch **26 pages**, replace **280+ custom CSS classes** with Selia components, and reduce custom CSS from **1,650 lines to ~100-150 lines** (even less than originally planned).

### Goals
- ✅ Achieve 100% Selia component utilization across all admin pages
- ✅ Eliminate custom CSS component classes (`.btn`, `.card`, `.badge`, `.alert`, etc.)
- ✅ Maintain existing wrapper components (Modal, Toast) as convenience abstractions
- ✅ Improve design consistency with user dashboard
- ✅ Reduce maintenance burden and technical debt
- ✅ Preserve all existing functionality and user experience

### Scope
- **26 pages** across 3 contexts (Global, Project, App)
- **5 custom components** to refactor
- **1,650 lines** of custom CSS to reduce to **~100-150 lines**
- All admin dashboard features (no pages excluded)
- **New:** Adopt and customize Selia dashboard block

---

## 🏗️ Selia Dashboard Block Analysis

### What's Included

The Selia dashboard block provides a complete admin dashboard implementation:

#### File Structure
```
components/blocks/dashboard/
├── layout.tsx          # Main layout with sidebar
├── app-sidebar.tsx     # Sidebar navigation component
├── page.tsx            # Dashboard home page example
├── stat-card.tsx       # Statistics card component
├── chart.tsx           # Recharts integration
└── data.ts             # Sample data structure
```

#### Layout Component (layout.tsx)

**Features:**
- Two-column layout (sidebar + main content)
- Responsive sidebar (auto-closes on mobile < 1024px)
- Backdrop overlay for mobile
- Fixed sidebar with smooth transitions (288px width)
- Top navigation bar (64px height) with:
  - Sidebar toggle button
  - Page title/heading area
- Main content area with proper spacing

**Key Implementation:**
```tsx
<Layout sidebar={<AppSidebar />}>
  {children}
</Layout>
```

**Responsive Behavior:**
- Desktop (≥1024px): Sidebar always visible, main content has left margin
- Tablet/Mobile (<1024px): Sidebar hidden by default, toggle button shows, backdrop overlay on open

#### Sidebar Component (app-sidebar.tsx)

**Structure:**
1. **Header Section**
   - Logo/branding display
   - Search input with keyboard shortcut indicator (/)

2. **Navigation Menu**
   - Primary navigation links (Dashboard, Products, Categories, Orders)
   - Collapsible sections with submenu (Reports → Sales, Traffic, Conversion)
   - Active state highlighting

3. **Footer Section**
   - User profile display (avatar, name, email)
   - Dropdown menu (Profile, Settings, Logout)

**Selia Components Used:**
- `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`
- `SidebarMenu`, `SidebarList`, `SidebarItem`, `SidebarItemButton`
- `SidebarCollapsible`, `SidebarSubmenu` (for nested navigation)
- `Input` (for search with keyboard shortcut)
- `Menu`, `MenuItem` (for user profile dropdown)
- `Avatar` (for user profile image)
- `Icon` (for navigation icons)

#### Dashboard Page (page.tsx)

**Page Structure:**

1. **Statistics Grid** (4 stat cards in responsive grid)
   - Total Sales ($12,340, +8.2%)
   - Customers (3,210, +4.1%)
   - Orders (1,520, -2.3%)
   - Revenue ($24,580, +6.9%)

2. **Two-Column Section**
   - Left (8/12 width): Chart component with area graph
   - Right (4/12 width): Best-selling products list (5 items with images, prices, sales count)

3. **Recent Orders Table**
   - Data table with 7 orders
   - Columns: Order ID, Customer, Date, Amount, Status
   - Status badges (Completed, Pending, Processing, Canceled)

**Responsive Grid:**
```tsx
// Stat cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

// Chart + Products
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
  <div className="lg:col-span-8">{/* Chart */}</div>
  <div className="lg:col-span-4">{/* Products */}</div>
</div>
```

#### Stat Card Component (stat-card.tsx)

**Props Interface:**
```tsx
{
  icon: React.ReactNode,
  title: string,          // e.g., "Total Sales"
  value: string,          // e.g., "$12,340"
  change: string,         // e.g., "8.2%"
  changeType: 'increase' | 'decrease'
}
```

**Features:**
- `IconBox` with "lg" size and "info-subtle" styling
- Title displayed as medium-weight heading
- Large value (4xl font size)
- Color-coded badge:
  - Green (`success`) for increase
  - Red (`danger`) for decrease
- Comparison text ("Compared to last month")

**Example Usage:**
```tsx
<StatCard
  icon={<Icon type="dollar" />}
  title="Total Sales"
  value="$12,340"
  change="8.2%"
  changeType="increase"
/>
```

#### Chart Component (chart.tsx)

**Features:**
- **Recharts integration** (requires `recharts` package)
- Wrapped in `Card` component with header
- Time period selector (Select dropdown: Last Week, Last Month, Last Year)
- Responsive `AreaChart`:
  - Mobile: 200px height
  - Desktop: 480px height
- Gradient fills for visual appeal
- Customized axis styling
- Theme-aware using CSS variables

**Data Structure:**
```tsx
// data.ts
export const data = [
  { name: 'Mon', orders: 800 },
  { name: 'Tue', orders: 1200 },
  // ... more days
];
```

**Chart Configuration:**
- CartesianGrid with custom styling
- XAxis with day names
- YAxis with order counts
- Area with gradient (stroke + fill)
- Tooltip with custom styling

**Dependencies Required:**
```json
{
  "recharts": "^2.12.0"
}
```

### How We'll Adapt the Dashboard Block

#### 1. Copy and Customize Layout

**Steps:**
1. Copy Selia dashboard block files to our admin dashboard:
   ```
   apps/dashboard/admin/src/
   ├── layouts/
   │   ├── DashboardLayout.tsx    # From layout.tsx
   │   └── AppSidebar.tsx          # From app-sidebar.tsx
   ├── components/
   │   ├── StatCard.tsx            # From stat-card.tsx
   │   └── Chart.tsx               # From chart.tsx (adapt as needed)
   ```

2. Customize branding:
   - Replace "Selia" logo with "Proofa" branding
   - Update color scheme if needed
   - Add theme toggle to top navigation bar

3. Integrate with existing routing:
   - Wrap all pages with `DashboardLayout`
   - Pass dynamic sidebar based on context

#### 2. Implement Dynamic Context-Aware Sidebar

**Challenge:** Admin dashboard has 3 different contexts (Global, Project, App) that need different navigation items.

**Solution:** Create dynamic sidebar that changes based on route:

```tsx
// AppSidebar.tsx (customized)
function AppSidebar() {
  const location = useLocation();
  const { projectId, appId } = useParams();

  // Detect context from URL
  const context = getContext(location.pathname, projectId, appId);

  return (
    <Sidebar>
      <SidebarHeader>
        <Logo>Proofa</Logo>
        <Input placeholder="Search..." />
      </SidebarHeader>

      <SidebarContent>
        {context === 'global' && <GlobalNav />}
        {context === 'project' && <ProjectNav projectId={projectId} />}
        {context === 'app' && <AppNav projectId={projectId} appId={appId} />}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
```

**Navigation Structures:**

**Global Context:**
- Dashboard (/)
- Projects (/projects)
- Billing (/billing)
- Licenses (/licenses)
- Admin Tools (collapsible)
  - Webhooks
  - Refunds
  - Export
  - Playground

**Project Context:**
- Project selector dropdown (with icon)
- ← Back to Projects
- Overview (/projects/:id)
- Statistics
- Team
- Apps
- Payment Providers
- Settings

**App Context:**
- App selector dropdown (with icon)
- ← Back to Apps
- Overview (/projects/:id/apps/:appId)
- Users
- Licenses
- API Keys
- OAuth
- Payment Settings
- Developers
- Settings

#### 3. Reusable Components from Dashboard Block

**StatCard Component:**
Use on multiple pages for displaying metrics:
- **Dashboard:** Overall platform stats
- **ProjectDetail:** Project-specific metrics
- **AppDetail:** App-specific metrics
- **BillingDashboard:** Revenue metrics

**Chart Component:**
Integrate for data visualization:
- **ProjectStats:** Project analytics
- **BillingDashboard:** Revenue trends
- **AppDetail:** Usage trends
- Install `recharts` dependency: `pnpm add recharts`

**Table Pattern:**
Apply the recent orders table pattern to:
- **AppUsers:** User management table
- **AppLicenses:** License management
- **ProjectTeam:** Team members table
- **WebhookMonitoring:** Webhook logs

#### 4. Layout Integration

**All 26 pages will use the same layout wrapper:**

```tsx
// App.tsx
import { DashboardLayout } from './layouts/DashboardLayout';
import { AppSidebar } from './layouts/AppSidebar';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<DashboardLayout sidebar={<AppSidebar />} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        {/* ... all other pages */}
      </Route>
    </Routes>
  );
}
```

#### 5. Customizations Needed

**Layout Customizations:**
- [x] Add theme toggle button to top navigation bar
- [x] Add breadcrumb navigation below top bar
- [x] Customize sidebar width if needed (default: 288px)
- [x] Add project/app context switcher in sidebar
- [x] Integrate with existing authentication

**Sidebar Customizations:**
- [x] Replace static navigation with dynamic context-aware menu
- [x] Add project selector dropdown (with icon picker integration)
- [x] Add app selector dropdown
- [x] Update user menu to use actual user data from `useMe()` hook
- [x] Customize search functionality (or remove if not needed initially)

**Component Customizations:**
- [x] Adapt StatCard for our metric types
- [x] Customize Chart component for our data structures
- [x] Apply table styling to all data tables
- [x] Ensure all components work with dark mode

### Benefits of Using Dashboard Block

1. **Time Savings:** ~40% reduction in development time (2-3 weeks saved)
2. **Production-Ready:** Pre-tested, responsive layout
3. **Consistent Design:** Follows Selia design patterns
4. **Mobile-First:** Built-in responsive behavior
5. **Accessibility:** Selia components are accessible by default
6. **Maintainability:** Less custom code to maintain
7. **Best Practices:** Layout structure follows industry standards

---

## Available Selia Components

### Complete Component Inventory (52 Components)

#### Form & Input Components (14)
| Component | Purpose | Key Features |
|-----------|---------|--------------|
| `Input` | Text input | Variants: default, subtle; file upload support |
| `Textarea` | Multi-line input | Variants: default, subtle |
| `Label` | Form labels | Disabled states, cursor handling |
| `Checkbox` | Single/grouped checkboxes | Indeterminate state |
| `Radio` | Radio buttons | Group support |
| `Switch` | Toggle switches | Checked states |
| `Slider` | Range slider | Thumb control |
| `Select` | Dropdown select | Icons, groups, separators |
| `Combobox` | Multi-select searchable | Chip display |
| `Autocomplete` | Auto-completing input | Search functionality |
| `Field` | Form field wrapper | Label, description, error, control |
| `Fieldset` | Field grouping | Related field container |
| `Form` | Form container | Form element wrapper |
| `Number Field` | Numeric input | Number validation |

#### Layout & Container Components (9)
| Component | Purpose | Sub-components |
|-----------|---------|----------------|
| `Card` | Content container | CardHeader, CardTitle, CardDescription, CardBody, CardFooter, CardHeaderAction |
| `Stack` | Flexbox layout | Direction (row/column), spacing variants |
| `Sidebar` | Navigation sidebar | SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarList, SidebarItem, SidebarItemButton, SidebarCollapsible |
| `Dialog` | Modal dialogs | DialogTrigger, DialogPopup, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose |
| `Alert Dialog` | Confirmation dialogs | Pre-styled for confirmations |
| `Popover` | Floating content | Positioned overlay |
| `Tooltip` | Hover tooltips | Arrow support |
| `Scroll Area` | Scrollable container | Custom scrollbar |
| `Divider` | Horizontal separator | Section divider |

#### Data Display & Navigation (15)
| Component | Purpose | Sub-components |
|-----------|---------|----------------|
| `Table` | Data tables | TableContainer, TableHeader, TableHead, TableBody, TableRow, TableCell, TableFooter, TableCaption |
| `Tabs` | Tab navigation | TabsList, TabsItem, TabsPanel (animated indicator) |
| `Accordion` | Expandable sections | AccordionItem, AccordionHeader, AccordionTrigger, AccordionPanel |
| `Breadcrumb` | Navigation path | Breadcrumb links |
| `Pagination` | Page navigation | PaginationList, PaginationItem, PaginationButton |
| `Menu` | Context menus | MenuItem, MenuSeparator, MenuSubmenu, MenuGroup, MenuCheckboxItem, MenuRadioItem |
| `Menubar` | Menu bar | Multiple menu support |
| `Command` | Command palette | Search interface |
| `Item` | Generic list item | Flexible list items |
| `Collapsible` | Expandable content | Height animation |
| `Preview Card` | Preview functionality | Card with preview |

#### UI Elements & Indicators (11)
| Component | Variants | Features |
|-----------|----------|----------|
| `Button` | primary, secondary, tertiary, danger, outline, plain | Sizes: xs, sm, md, lg; pill, block, progress states |
| `Badge` | primary, secondary, tertiary, success, info, warning, danger (+ outline) | Sizes: sm, md, lg; pill option |
| `Chip` | default, primary, success, warning, info, danger, outline, plain | Close button (ChipButton) |
| `Avatar` | User avatars | Image/initials display |
| `Spinner` | Loading indicator | Animation support |
| `Progress` | Progress bar | ProgressLabel, ProgressValue |
| `Meter` | Measurement display | Visual meter |
| `Toggle` | Toggle button | Pressed state |
| `Toggle Group` | Button group | Multiple toggles |
| `Toolbar` | Button toolbar | Button container |

#### Typography (3)
| Component | Purpose | Variants |
|-----------|---------|----------|
| `Heading` | Semantic headings | h1-h6, sizes: sm, md, lg |
| `Text` | Paragraph text | TextLink, Strong, Code variants |
| `Kbd` | Keyboard keys | Key display |

#### Other (3)
| Component | Purpose |
|-----------|---------|
| `Icon Box` | Icon container |
| `Input Group` | Grouped inputs with prefix/suffix |
| `Toast` | Toast notifications |

---

## Current State Analysis

### Admin Dashboard Structure

**Location:** `/apps/dashboard/admin/`

#### Pages by Context (26 total)

**Global Pages (6):**
- [Login.tsx](apps/dashboard/admin/src/pages/Login.tsx) - OAuth authentication
- [Onboarding.tsx](apps/dashboard/admin/src/pages/Onboarding.tsx) - User onboarding flow
- [Profile.tsx](apps/dashboard/admin/src/pages/Profile.tsx) - User profile management
- [Projects.tsx](apps/dashboard/admin/src/pages/Projects.tsx) - Project list with create
- [CreateProject.tsx](apps/dashboard/admin/src/pages/CreateProject.tsx) - Project creation form
- [BillingDashboard.tsx](apps/dashboard/admin/src/pages/BillingDashboard.tsx) - Billing overview

**Project Context Pages (6):**
- [ProjectDetail.tsx](apps/dashboard/admin/src/pages/ProjectDetail.tsx) - Project overview
- [ProjectStats.tsx](apps/dashboard/admin/src/pages/ProjectStats.tsx) - Analytics dashboard
- [ProjectTeam.tsx](apps/dashboard/admin/src/pages/ProjectTeam.tsx) - Team management
- [ProjectSettings.tsx](apps/dashboard/admin/src/pages/ProjectSettings.tsx) - Project settings
- [ProjectPaymentProviders.tsx](apps/dashboard/admin/src/pages/ProjectPaymentProviders.tsx) - Payment config
- [ProjectApps.tsx](apps/dashboard/admin/src/pages/ProjectApps.tsx) - App list

**App Context Pages (9):**
- [AppDetail.tsx](apps/dashboard/admin/src/pages/AppDetail.tsx) - App overview
- [AppSetup.tsx](apps/dashboard/admin/src/pages/AppSetup.tsx) - App configuration
- [AppUsers.tsx](apps/dashboard/admin/src/pages/AppUsers.tsx) - User management table
- [AppLicenses.tsx](apps/dashboard/admin/src/pages/AppLicenses.tsx) - License management table
- [AppApiKeys.tsx](apps/dashboard/admin/src/pages/AppApiKeys.tsx) - API key management
- [AppOAuth.tsx](apps/dashboard/admin/src/pages/AppOAuth.tsx) - OAuth configuration
- [AppPaymentSettings.tsx](apps/dashboard/admin/src/pages/AppPaymentSettings.tsx) - Payment settings
- [AppDevelopers.tsx](apps/dashboard/admin/src/pages/AppDevelopers.tsx) - Developer access
- [AppSettings.tsx](apps/dashboard/admin/src/pages/AppSettings.tsx) - App settings

**Admin Utility Pages (5):**
- [WebhookMonitoring.tsx](apps/dashboard/admin/src/pages/WebhookMonitoring.tsx) - Webhook logs
- [RefundProcessing.tsx](apps/dashboard/admin/src/pages/RefundProcessing.tsx) - Refund management
- [TransactionExport.tsx](apps/dashboard/admin/src/pages/TransactionExport.tsx) - Data export
- [PaymentTestingPlayground.tsx](apps/dashboard/admin/src/pages/PaymentTestingPlayground.tsx) - Payment testing
- [Licenses.tsx](apps/dashboard/admin/src/pages/Licenses.tsx) - License overview

#### Custom Components (6)

**Modal System:**
- [Modal.tsx](apps/dashboard/admin/src/components/Modal.tsx) - Wrapper around Selia Dialog
  - `ModalHeader`, `ModalBody`, `ModalFooter` sub-components
  - **Status:** Keep as convenience wrapper ✅

**Form Components:**
- [Select.tsx](apps/dashboard/admin/src/components/Select.tsx) - Wrapper around Selia Select
  - **Status:** Refactor to use Selia Select more directly

**Utility Components:**
- [ConfirmModal.tsx](apps/dashboard/admin/src/components/ConfirmModal.tsx) - Confirmation dialog with captcha
  - **Status:** Refactor as Selia AlertDialog wrapper
- [InviteUserModal.tsx](apps/dashboard/admin/src/components/InviteUserModal.tsx) - Domain-specific modal
  - **Status:** Keep, update to use refactored Modal
- [InviteTeamMemberModal.tsx](apps/dashboard/admin/src/components/InviteTeamMemberModal.tsx) - Domain-specific modal
  - **Status:** Keep, update to use refactored Modal
- [IconPicker.tsx](apps/dashboard/admin/src/components/IconPicker.tsx) - Icon selection utility
  - **Status:** Keep, refactor with Selia components

**Toast System:**
- [Toast.tsx](apps/dashboard/admin/src/components/Toast.tsx) - Context-based (console logging only)
  - **Status:** Implement with Selia Toast component ⚠️

### CSS Analysis

**File:** [apps/dashboard/admin/src/index.css](apps/dashboard/admin/src/index.css)
**Lines:** 1,650
**Target:** ~200-300 lines (layout only)

#### Custom CSS Classes to Replace (280+)

**Buttons (25 classes):**
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.btn-outline`
- `.btn-sm`, `.btn-lg`, `.btn-block`, `.btn-icon`, etc.
- **Replace with:** Selia `Button` component variants

**Cards (15 classes):**
- `.card`, `.card-header`, `.card-body`, `.card-footer`, `.card-title`
- **Replace with:** Selia `Card`, `CardHeader`, `CardTitle`, `CardBody`, `CardFooter`

**Badges/Status (20 classes):**
- `.badge`, `.badge-primary`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-info`
- **Replace with:** Selia `Badge` or `Chip` components

**Tables (30 classes):**
- `.table`, `.table-header`, `.table-row`, `.table-cell`, `.table-hover`
- **Replace with:** Selia `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`

**Forms (40 classes):**
- `.form-group`, `.form-label`, `.form-input`, `.form-error`, `.form-help`
- **Replace with:** Selia `Field`, `Label`, `Input`, `Textarea`

**Alerts (15 classes):**
- `.alert`, `.alert-info`, `.alert-success`, `.alert-warning`, `.alert-danger`
- **Replace with:** Selia `Alert` component

**Layout (30 classes):**
- `.page`, `.page-header`, `.page-title`, `.page-content`, `.page-actions`
- `.sidebar`, `.sidebar-menu`, `.sidebar-item`
- **Keep some, refactor others with Selia Stack/Card**

**Loading States (10 classes):**
- `.loading`, `.spinner`, `.skeleton`, `.loading-overlay`
- **Replace with:** Selia `Spinner`, create custom `Skeleton` if needed

**Modals (15 classes):**
- `.modal`, `.modal-header`, `.modal-body`, `.modal-footer`, `.modal-backdrop`
- **Replace with:** Selia `Dialog` components (already wrapped in Modal.tsx)

**Navigation (25 classes):**
- `.breadcrumb`, `.breadcrumb-item`, `.tabs`, `.tab-item`, `.tab-active`
- **Replace with:** Selia `Breadcrumb`, `Tabs`

**Utilities (55+ classes):**
- Various margin, padding, text utilities that duplicate Tailwind
- **Remove:** Use Tailwind utilities directly

### Current Selia Usage

**Already Using:**
- ✅ `Dialog` system (via Modal.tsx wrapper)
- ✅ `Select` component (via Select.tsx wrapper)
- ✅ `Button`, `Input`, `Label`, `Spinner` (in ConfirmModal.tsx)
- ✅ `Icon`, `IconType` (throughout)
- ✅ `AuthLoginCard` (Login page)

**Not Using (Need to Add):**
- ❌ `Card` component (using `.card` CSS)
- ❌ `Badge`/`Chip` components (using `.badge` CSS)
- ❌ `Alert` component (using `.alert` CSS)
- ❌ `Table` components (using HTML tables + CSS)
- ❌ `Form`/`Field` wrappers (using custom `.form-group` CSS)
- ❌ `Toast` component (placeholder implementation)
- ❌ `Tabs` component (custom CSS tabs)
- ❌ `Breadcrumb` component (custom CSS)
- ❌ Typography components (`Heading`, `Text`)

---

## Migration Strategy

### Approach: Complete Overhaul with Dashboard Block Foundation

**Duration:** 3-4 weeks (reduced from 4-6 weeks due to pre-built layout)
**Team Size:** 1-2 developers
**Risk Level:** Low-Medium (leveraging production-tested layout reduces risk)

### Revised Phases

```
Phase 0: Dashboard Block Adoption (Week 1)
  ├─ Copy Selia dashboard block files to our codebase
  ├─ Set up DashboardLayout component
  ├─ Implement dynamic context-aware sidebar
  ├─ Add project/app context selectors
  ├─ Integrate theme toggle
  └─ Install recharts dependency

Phase 1: Foundation & Components (Week 1-2)
  ├─ Replace core UI primitives (Card, Badge, Button, Alert)
  ├─ Implement StatCard component for metrics
  ├─ Refactor custom components (Modal, Toast)
  ├─ Set up Chart component with recharts
  └─ Update CSS to remove replaced classes

Phase 2: Forms & Data (Week 2)
  ├─ Migrate form layouts to Selia Field/Form
  ├─ Implement Table component for data pages
  └─ Refactor Select component wrapper

Phase 3: Pages (Week 2-3)
  ├─ Wrap all pages with DashboardLayout
  ├─ Migrate Global pages (6 pages)
  ├─ Migrate Project context pages (6 pages)
  ├─ Migrate App context pages (9 pages)
  └─ Migrate Admin utility pages (5 pages)

Phase 4: Polish & Testing (Week 3-4)
  ├─ Add breadcrumb navigation
  ├─ Implement empty states
  ├─ Comprehensive testing
  ├─ CSS cleanup (reduce to ~100-150 lines)
  └─ Documentation update
```

### Principles

1. **Layout-First:** Start with Selia dashboard block as foundation
2. **Component-First:** Always use Selia components before writing custom CSS
3. **Preserve Wrappers:** Keep Modal.tsx and Toast.tsx as convenience abstractions
4. **Test Continuously:** Test each page after migration before moving to next
5. **Parallel Work:** Pages can be migrated in parallel by different developers
6. **CSS Cleanup:** Remove old CSS classes immediately after component replacement
7. **Context-Aware:** Sidebar adapts to current route context
8. **Backward Compatibility:** Ensure no breaking changes to API/behavior

---

## Phase-by-Phase Implementation Plan

### Phase 0: Dashboard Block Adoption (Week 1, Day 1-5)

**Goal:** Adopt Selia's pre-built dashboard block as the foundation for our admin dashboard

#### 0.1 Copy Dashboard Block Files (Day 1)

**Action:** Copy Selia dashboard block files to our admin dashboard

**Files to Create:**
```
apps/dashboard/admin/src/
├── layouts/
│   ├── DashboardLayout.tsx
│   └── AppSidebar.tsx
├── components/
│   ├── StatCard.tsx
│   └── Chart.tsx (optional for now)
└── data/ (for type definitions)
```

**Steps:**
1. Download files from https://github.com/nauvalazhar/selia/tree/master/components/blocks/dashboard
2. Copy `layout.tsx` → `layouts/DashboardLayout.tsx`
3. Copy `app-sidebar.tsx` → `layouts/AppSidebar.tsx`
4. Copy `stat-card.tsx` → `components/StatCard.tsx`
5. Copy `chart.tsx` → `components/Chart.tsx` (if using charts immediately)
6. Update imports to match our project structure

**Example DashboardLayout.tsx:**
```tsx
import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
}

export function DashboardLayout({ children, sidebar }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative flex min-h-screen">
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-72 bg-background border-r z-50',
          'transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebar}
      </aside>

      {/* Main Content */}
      <div className={cn('flex-1', 'lg:ml-72')}>
        {/* Top Nav Bar */}
        <nav className="h-16 border-b flex items-center px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            <Icon type="menu" />
          </button>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          {/* Theme toggle will go here */}
        </nav>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### 0.2 Implement Dynamic Sidebar (Day 2-3)

**Goal:** Create context-aware sidebar that adapts based on current route

**Challenge:** Admin dashboard has 3 navigation contexts:
- **Global:** Dashboard, Projects, Billing, Licenses
- **Project:** Project-specific navigation
- **App:** App-specific navigation

**Solution: Context Detection Pattern:**

```tsx
// layouts/AppSidebar.tsx
import { useLocation, useParams } from 'react-router-dom';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarList,
  SidebarItem,
  SidebarItemButton,
  SidebarCollapsible,
  Input,
  Avatar,
  Menu,
  MenuItem,
  Icon,
} from '@proofa/components';

type NavigationContext = 'global' | 'project' | 'app';

function getNavigationContext(pathname: string): NavigationContext {
  if (pathname.includes('/projects/') && pathname.includes('/apps/')) {
    return 'app';
  }
  if (pathname.includes('/projects/')) {
    return 'project';
  }
  return 'global';
}

export function AppSidebar() {
  const location = useLocation();
  const { projectId, appId } = useParams();
  const context = getNavigationContext(location.pathname);
  const { data: user } = useMe();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold">Proofa</h1>
        </div>
        <div className="px-4 pb-3">
          <Input
            type="search"
            placeholder="Search..."
            prefix={<Icon type="search" />}
            suffix={<Kbd>/</Kbd>}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {context === 'global' && <GlobalNavigation />}
        {context === 'project' && <ProjectNavigation projectId={projectId} />}
        {context === 'app' && <AppNavigation projectId={projectId} appId={appId} />}
      </SidebarContent>

      <SidebarFooter>
        <UserProfileMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

// Global Navigation Component
function GlobalNavigation() {
  return (
    <SidebarMenu>
      <SidebarList>
        <SidebarItem>
          <SidebarItemButton
            href="/"
            active={location.pathname === '/'}
          >
            <Icon type="dashboard" />
            Dashboard
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton
            href="/projects"
            active={location.pathname === '/projects'}
          >
            <Icon type="folder" />
            Projects
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton
            href="/billing"
            active={location.pathname === '/billing'}
          >
            <Icon type="credit-card" />
            Billing
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton
            href="/licenses"
            active={location.pathname === '/licenses'}
          >
            <Icon type="key" />
            Licenses
          </SidebarItemButton>
        </SidebarItem>

        <SidebarCollapsible>
          <SidebarItemButton>
            <Icon type="settings" />
            Admin Tools
          </SidebarItemButton>
          <SidebarSubmenu>
            <SidebarItem>
              <SidebarItemButton href="/webhooks">
                Webhooks
              </SidebarItemButton>
            </SidebarItem>
            <SidebarItem>
              <SidebarItemButton href="/refunds">
                Refunds
              </SidebarItemButton>
            </SidebarItem>
            <SidebarItem>
              <SidebarItemButton href="/export">
                Export
              </SidebarItemButton>
            </SidebarItem>
          </SidebarSubmenu>
        </SidebarCollapsible>
      </SidebarList>
    </SidebarMenu>
  );
}

// Project Navigation Component
function ProjectNavigation({ projectId }: { projectId?: string }) {
  const { data: project } = useProject(projectId);

  return (
    <SidebarMenu>
      {/* Project Selector */}
      <div className="px-4 pb-3 border-b">
        <ProjectSelector currentProjectId={projectId} />
      </div>

      <SidebarList>
        <SidebarItem>
          <SidebarItemButton href="/projects">
            <Icon type="arrow-left" />
            Back to Projects
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton
            href={`/projects/${projectId}`}
            active={location.pathname === `/projects/${projectId}`}
          >
            <Icon type="dashboard" />
            Overview
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/stats`}>
            <Icon type="chart" />
            Statistics
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/team`}>
            <Icon type="users" />
            Team
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/apps`}>
            <Icon type="grid" />
            Apps
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/payment-providers`}>
            <Icon type="credit-card" />
            Payment Providers
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/settings`}>
            <Icon type="settings" />
            Settings
          </SidebarItemButton>
        </SidebarItem>
      </SidebarList>
    </SidebarMenu>
  );
}

// App Navigation Component
function AppNavigation({ projectId, appId }: { projectId?: string; appId?: string }) {
  const { data: app } = useApp(projectId, appId);

  return (
    <SidebarMenu>
      {/* App Selector */}
      <div className="px-4 pb-3 border-b">
        <AppSelector currentAppId={appId} projectId={projectId} />
      </div>

      <SidebarList>
        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/apps`}>
            <Icon type="arrow-left" />
            Back to Apps
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton
            href={`/projects/${projectId}/apps/${appId}`}
            active={location.pathname === `/projects/${projectId}/apps/${appId}`}
          >
            <Icon type="dashboard" />
            Overview
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/apps/${appId}/users`}>
            <Icon type="users" />
            Users
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/apps/${appId}/licenses`}>
            <Icon type="key" />
            Licenses
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/apps/${appId}/api-keys`}>
            <Icon type="lock" />
            API Keys
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/apps/${appId}/oauth`}>
            <Icon type="shield" />
            OAuth
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/apps/${appId}/payment`}>
            <Icon type="credit-card" />
            Payment Settings
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/apps/${appId}/developers`}>
            <Icon type="code" />
            Developers
          </SidebarItemButton>
        </SidebarItem>

        <SidebarItem>
          <SidebarItemButton href={`/projects/${projectId}/apps/${appId}/settings`}>
            <Icon type="settings" />
            Settings
          </SidebarItemButton>
        </SidebarItem>
      </SidebarList>
    </SidebarMenu>
  );
}

// User Profile Menu
function UserProfileMenu({ user }: { user: User }) {
  return (
    <Menu>
      <Menu.Trigger>
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-lg">
          <Avatar src={user?.avatar} alt={user?.name} />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{user?.name}</div>
            <div className="text-sm text-gray-500 truncate">{user?.email}</div>
          </div>
          <Icon type="chevron-up" />
        </div>
      </Menu.Trigger>
      <Menu.Content>
        <MenuItem href="/profile">
          <Icon type="user" />
          Profile
        </MenuItem>
        <MenuItem href="/profile#settings">
          <Icon type="settings" />
          Settings
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={handleLogout}>
          <Icon type="logout" />
          Logout
        </MenuItem>
      </Menu.Content>
    </Menu>
  );
}
```

#### 0.3 Add Theme Toggle & Integrate Layout (Day 3-4)

**Add Theme Toggle to Top Navigation:**

```tsx
// layouts/DashboardLayout.tsx (update nav section)
import { ThemeToggle } from '../components/ThemeToggle';

<nav className="h-16 border-b flex items-center px-6 gap-4 justify-between">
  <div className="flex items-center gap-4">
    <button
      onClick={() => setSidebarOpen(!sidebarOpen)}
      className="lg:hidden"
    >
      <Icon type="menu" />
    </button>
    <h1 className="text-xl font-semibold">Dashboard</h1>
  </div>

  <div className="flex items-center gap-2">
    <ThemeToggle />
  </div>
</nav>
```

**Integrate Layout with Routing:**

```tsx
// App.tsx
import { DashboardLayout } from './layouts/DashboardLayout';
import { AppSidebar } from './layouts/AppSidebar';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Protected routes with dashboard layout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout sidebar={<AppSidebar />}>
              <Outlet />
            </DashboardLayout>
          </ProtectedRoute>
        }
      >
        {/* Global routes */}
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/new" element={<CreateProject />} />
        <Route path="billing" element={<BillingDashboard />} />
        <Route path="licenses" element={<Licenses />} />

        {/* Project routes */}
        <Route path="projects/:projectId" element={<ProjectDetail />} />
        <Route path="projects/:projectId/stats" element={<ProjectStats />} />
        <Route path="projects/:projectId/team" element={<ProjectTeam />} />
        {/* ... other project routes */}

        {/* App routes */}
        <Route path="projects/:projectId/apps/:appId" element={<AppDetail />} />
        <Route path="projects/:projectId/apps/:appId/users" element={<AppUsers />} />
        {/* ... other app routes */}

        {/* Admin utility routes */}
        <Route path="webhooks" element={<WebhookMonitoring />} />
        <Route path="refunds" element={<RefundProcessing />} />
        <Route path="export" element={<TransactionExport />} />
      </Route>
    </Routes>
  );
}
```

#### 0.4 Create StatCard Component (Day 4)

**Copy and customize StatCard:**

```tsx
// components/StatCard.tsx
import {
  Card,
  CardBody,
  IconBox,
  Heading,
  Text,
  Badge,
  Icon,
  type IconType,
} from '@proofa/components';

interface StatCardProps {
  icon: IconType;
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease';
  subtitle?: string;
}

export function StatCard({
  icon,
  title,
  value,
  change,
  changeType,
  subtitle = 'Compared to last month',
}: StatCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="space-y-3">
          <IconBox size="lg" variant="info-subtle">
            <Icon type={icon} />
          </IconBox>

          <div>
            <Heading as="h3" size="sm" className="font-medium text-gray-600">
              {title}
            </Heading>
            <Text className="text-4xl font-bold mt-1">{value}</Text>
          </div>

          {change && (
            <div className="flex items-center gap-2">
              <Badge
                variant={changeType === 'increase' ? 'success' : 'danger'}
                size="sm"
              >
                {changeType === 'increase' ? '↑' : '↓'} {change}
              </Badge>
              <Text size="sm" className="text-gray-500">
                {subtitle}
              </Text>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
```

**Usage Example:**

```tsx
// pages/Dashboard.tsx
import { StatCard } from '../components/StatCard';

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <StatCard
    icon="dollar"
    title="Total Revenue"
    value="$12,340"
    change="8.2%"
    changeType="increase"
  />
  <StatCard
    icon="users"
    title="Total Users"
    value="3,210"
    change="4.1%"
    changeType="increase"
  />
  <StatCard
    icon="shopping-cart"
    title="Active Licenses"
    value="1,520"
    change="2.3%"
    changeType="decrease"
  />
  <StatCard
    icon="chart"
    title="Monthly Growth"
    value="24.5%"
    change="6.9%"
    changeType="increase"
  />
</div>
```

#### 0.5 Install Dependencies & Test Layout (Day 5)

**Install required dependencies:**

```bash
# If using charts
pnpm add recharts

# Ensure all Selia components are available
pnpm install
```

**Create test dashboard page:**

```tsx
// pages/Dashboard.tsx
import { StatCard } from '../components/StatCard';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's what's happening with your projects.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="dollar"
          title="Total Revenue"
          value="$12,340"
          change="8.2%"
          changeType="increase"
        />
        {/* ... more stat cards */}
      </div>

      {/* Additional content sections */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardBody>
          {/* Activity content */}
        </CardBody>
      </Card>
    </div>
  );
}
```

**Test the layout:**
- ✅ Sidebar opens/closes on mobile
- ✅ Sidebar persists on desktop
- ✅ Navigation context switches correctly
- ✅ Theme toggle works
- ✅ User menu displays correctly
- ✅ All routes wrapped with layout
- ✅ StatCard displays properly

---

### Phase 1: Foundation & Components (Week 1-2, Day 6-12)

**Goal:** Replace core UI primitives and set up reusable components

#### 1.1 Button Migration (Day 6-7)

**Files to Update:** 24+ pages using buttons

**Current:**
```css
/* index.css */
.btn { ... }
.btn-primary { ... }
.btn-secondary { ... }
.btn-danger { ... }
.btn-ghost { ... }
.btn-sm { ... }
```

**Migration:**
```tsx
// Before
<button className="btn btn-primary">Click me</button>
<button className="btn btn-secondary btn-sm">Cancel</button>

// After
import { Button } from '@proofa/components';

<Button variant="primary">Click me</Button>
<Button variant="secondary" size="sm">Cancel</Button>
```

**Variant Mapping:**
| Old Class | Selia Variant |
|-----------|---------------|
| `.btn-primary` | `variant="primary"` |
| `.btn-secondary` | `variant="secondary"` |
| `.btn-danger` | `variant="danger"` |
| `.btn-ghost` | `variant="plain"` |
| `.btn-outline` | `variant="outline"` |
| `.btn-sm` | `size="sm"` |
| `.btn-lg` | `size="lg"` |
| `.btn-block` | `block={true}` |

**Pages to Update:**
- All 26 pages (search for `className.*btn`)
- [ConfirmModal.tsx](apps/dashboard/admin/src/components/ConfirmModal.tsx) (already uses Selia Button ✅)

#### 1.2 Card Migration (Day 2-3)

**Files to Update:** 20+ pages using cards

**Current:**
```tsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Title</h3>
  </div>
  <div className="card-body">Content</div>
</div>
```

**Migration:**
```tsx
import { Card, CardHeader, CardTitle, CardBody } from '@proofa/components';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

**Priority Pages:**
- [Projects.tsx](apps/dashboard/admin/src/pages/Projects.tsx)
- [ProjectDetail.tsx](apps/dashboard/admin/src/pages/ProjectDetail.tsx)
- [AppDetail.tsx](apps/dashboard/admin/src/pages/AppDetail.tsx)
- [BillingDashboard.tsx](apps/dashboard/admin/src/pages/BillingDashboard.tsx)

#### 1.3 Badge/Chip Migration (Day 3-4)

**Files to Update:** 15+ pages using badges

**Current:**
```tsx
<span className="badge badge-success">Active</span>
<span className="badge badge-warning">Pending</span>
```

**Migration:**
```tsx
import { Badge, Chip } from '@proofa/components';

// For status indicators
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>

// For removable items
<Chip variant="primary" onRemove={() => {}}>Tag</Chip>
```

**Decision Guide:**
- Use `Badge` for: Status indicators, counts, labels (non-interactive)
- Use `Chip` for: Tags, filters, removable items (interactive)

**Pages to Update:**
- [Projects.tsx](apps/dashboard/admin/src/pages/Projects.tsx) - project status
- [AppUsers.tsx](apps/dashboard/admin/src/pages/AppUsers.tsx) - user status
- [AppLicenses.tsx](apps/dashboard/admin/src/pages/AppLicenses.tsx) - license status
- [ProjectTeam.tsx](apps/dashboard/admin/src/pages/ProjectTeam.tsx) - role badges

#### 1.4 Alert Migration (Day 4)

**Files to Update:** 10+ pages using alerts

**Current:**
```tsx
<div className="alert alert-danger">Error message</div>
<div className="alert alert-warning">Warning message</div>
```

**Migration:**
```tsx
import { Alert } from '@proofa/components';

<Alert variant="danger">Error message</Alert>
<Alert variant="warning">Warning message</Alert>
```

**Pages to Update:**
- [Login.tsx](apps/dashboard/admin/src/pages/Login.tsx) - error alerts
- [CreateProject.tsx](apps/dashboard/admin/src/pages/CreateProject.tsx) - validation alerts
- [AppSetup.tsx](apps/dashboard/admin/src/pages/AppSetup.tsx) - info alerts

#### 1.5 Loading State Migration (Day 5)

**Files to Update:** 25+ pages using loading states

**Current:**
```tsx
<div className="loading">
  <div className="spinner"></div>
</div>
```

**Migration:**
```tsx
import { Spinner } from '@proofa/components';

{isLoading && <Spinner />}
```

**Pages to Update:**
- All pages with loading states (search for `.loading`, `.spinner`)

#### 1.6 Toast Component Implementation (Day 6-7)

**File:** [apps/dashboard/admin/src/components/Toast.tsx](apps/dashboard/admin/src/components/Toast.tsx)

**Current State:**
```tsx
// Currently just logs to console
console.log('TODO: Implement toast notifications', message);
```

**Implementation Plan:**

```tsx
// 1. Create Toast Provider component
import { Toast as SeliaToast } from '@proofa/components';
import { createContext, useContext, useState } from 'react';

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  }>>([]);

  const addToast = (message: string, variant: 'success' | 'error' | 'warning' | 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  return (
    <ToastContext.Provider
      value={{
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info'),
      }}
    >
      {children}
      {toasts.map(toast => (
        <SeliaToast
          key={toast.id}
          variant={toast.variant}
          onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
        >
          {toast.message}
        </SeliaToast>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
```

**Integration:**
```tsx
// App.tsx
import { ToastProvider } from './components/Toast';

<ToastProvider>
  {/* existing app structure */}
</ToastProvider>
```

#### 1.7 Modal Component Refactor (Day 7)

**File:** [apps/dashboard/admin/src/components/Modal.tsx](apps/dashboard/admin/src/components/Modal.tsx)

**Current:** Already wraps Selia Dialog ✅

**Action:** Review and ensure consistent API

```tsx
// Ensure Modal.tsx exports match Selia Dialog API
export { Modal, ModalHeader, ModalBody, ModalFooter };

// Usage remains the same
<Modal open={isOpen} onClose={handleClose}>
  <ModalHeader>Title</ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>
    <Button onClick={handleClose}>Cancel</Button>
    <Button variant="primary" onClick={handleSave}>Save</Button>
  </ModalFooter>
</Modal>
```

#### 1.8 CSS Cleanup - Phase 1 (Day 8)

**File:** [apps/dashboard/admin/src/index.css](apps/dashboard/admin/src/index.css)

**Remove:**
- All `.btn*` classes (~25 classes)
- All `.card*` classes (~15 classes)
- All `.badge*` classes (~20 classes)
- All `.alert*` classes (~15 classes)
- All `.loading`, `.spinner` classes (~10 classes)

**Expected Reduction:** ~85 classes, ~400 lines

---

### Phase 2: Forms & Data (Week 2-3)

**Goal:** Migrate form layouts and data tables to Selia components

#### 2.1 Form Layout Migration (Day 9-11)

**Pattern:** Replace custom `.form-group` with Selia `Field`

**Current:**
```tsx
<div className="form-group">
  <label className="form-label">Name</label>
  <input className="form-input" type="text" />
  <span className="form-error">Error message</span>
</div>
```

**Migration:**
```tsx
import { Field, Label, Input } from '@proofa/components';

<Field error="Error message">
  <Label>Name</Label>
  <Input type="text" />
</Field>
```

**Pages with Heavy Form Usage:**
- [CreateProject.tsx](apps/dashboard/admin/src/pages/CreateProject.tsx)
- [ProjectSettings.tsx](apps/dashboard/admin/src/pages/ProjectSettings.tsx)
- [AppSetup.tsx](apps/dashboard/admin/src/pages/AppSetup.tsx)
- [AppSettings.tsx](apps/dashboard/admin/src/pages/AppSettings.tsx)
- [AppOAuth.tsx](apps/dashboard/admin/src/pages/AppOAuth.tsx)
- [AppPaymentSettings.tsx](apps/dashboard/admin/src/pages/AppPaymentSettings.tsx)

#### 2.2 Textarea Migration (Day 11)

**Current:**
```tsx
<textarea className="form-input" rows={4} />
```

**Migration:**
```tsx
import { Textarea } from '@proofa/components';

<Field>
  <Label>Description</Label>
  <Textarea rows={4} />
</Field>
```

#### 2.3 Select Component Refactor (Day 12)

**File:** [apps/dashboard/admin/src/components/Select.tsx](apps/dashboard/admin/src/components/Select.tsx)

**Current:** Custom wrapper around Selia Select

**Refactor Plan:**
1. Review current Select.tsx API
2. Simplify to be thinner wrapper if possible
3. Ensure all Selia Select features are exposed
4. Update all usages to leverage Selia features (icons, groups)

**Example Enhancement:**
```tsx
// Support icon in select options
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Choose option" />
  </SelectTrigger>
  <SelectPopup>
    <SelectList>
      <SelectItem value="option1" icon={<Icon type="check" />}>
        Option 1
      </SelectItem>
    </SelectList>
  </SelectPopup>
</Select>
```

#### 2.4 Table Component Migration (Day 13-15)

**Files to Update:** 4 major pages with tables

**Priority Pages:**
1. [AppUsers.tsx](apps/dashboard/admin/src/pages/AppUsers.tsx) - User management table
2. [AppLicenses.tsx](apps/dashboard/admin/src/pages/AppLicenses.tsx) - License table
3. [ProjectTeam.tsx](apps/dashboard/admin/src/pages/ProjectTeam.tsx) - Team members table
4. [WebhookMonitoring.tsx](apps/dashboard/admin/src/pages/WebhookMonitoring.tsx) - Webhook logs

**Current:**
```tsx
<table className="table">
  <thead className="table-header">
    <tr>
      <th>Column</th>
    </tr>
  </thead>
  <tbody>
    <tr className="table-row">
      <td className="table-cell">Data</td>
    </tr>
  </tbody>
</table>
```

**Migration:**
```tsx
import {
  TableContainer,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@proofa/components';

<TableContainer>
  <TableHeader>
    <TableRow>
      <TableHead>Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</TableContainer>
```

**AppUsers.tsx Example:**
```tsx
// User management table
<TableContainer>
  <TableHeader>
    <TableRow>
      <TableHead>User</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>License</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {users.map(user => (
      <TableRow key={user.id}>
        <TableCell>
          <div className="flex items-center gap-2">
            <Avatar src={user.avatar} />
            {user.name}
          </div>
        </TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <Badge variant={user.status === 'active' ? 'success' : 'warning'}>
            {user.status}
          </Badge>
        </TableCell>
        <TableCell>{user.license}</TableCell>
        <TableCell>
          <Button size="sm" variant="plain">
            <Icon type="more" />
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</TableContainer>
```

#### 2.5 CSS Cleanup - Phase 2 (Day 16)

**Remove:**
- All `.form*` classes (~40 classes)
- All `.table*` classes (~30 classes)
- All `.select*` custom classes (~15 classes)

**Expected Reduction:** ~85 classes, ~400 lines

**Running Total:** ~170 classes removed, ~800 lines reduced

---

### Phase 3: Page Migration (Week 3-5)

**Goal:** Migrate all 26 pages to use Selia components

**Strategy:** Migrate by context grouping for consistency

#### 3.1 Global Pages (Day 17-20)

**Pages:** 6 pages

##### Day 17: Login & Onboarding
- [Login.tsx](apps/dashboard/admin/src/pages/Login.tsx)
  - Already uses `AuthLoginCard` ✅
  - Update error alerts to Selia `Alert`
  - Replace any custom buttons

- [Onboarding.tsx](apps/dashboard/admin/src/pages/Onboarding.tsx)
  - Replace cards with Selia `Card`
  - Update form fields to use `Field` wrapper
  - Replace buttons

##### Day 18: Profile & Projects List
- [Profile.tsx](apps/dashboard/admin/src/pages/Profile.tsx)
  - Reference user dashboard Profile.tsx as example
  - Use `Card`, `Field`, `Button`
  - Add avatar with Selia `Avatar` if not present

- [Projects.tsx](apps/dashboard/admin/src/pages/Projects.tsx)
  - Replace project cards with Selia `Card`
  - Update status badges to Selia `Badge`
  - Replace buttons
  - Add empty state if needed

##### Day 19: Create Project
- [CreateProject.tsx](apps/dashboard/admin/src/pages/CreateProject.tsx)
  - Multi-step form with Selia components
  - Use `Card` for form container
  - Use `Field` for all form fields
  - Use `Button` for navigation
  - Add `Spinner` for loading states
  - Use `Alert` for validation errors

##### Day 20: Billing Dashboard
- [BillingDashboard.tsx](apps/dashboard/admin/src/pages/BillingDashboard.tsx)
  - Replace stat cards with Selia `Card`
  - Use `Table` for transaction history
  - Use `Badge` for status indicators
  - Add `Progress` bars for usage metrics

#### 3.2 Project Context Pages (Day 21-24)

**Pages:** 6 pages

##### Day 21: Project Detail & Stats
- [ProjectDetail.tsx](apps/dashboard/admin/src/pages/ProjectDetail.tsx)
  - Overview cards with Selia `Card`
  - Info grid layout
  - Status badges
  - Action buttons

- [ProjectStats.tsx](apps/dashboard/admin/src/pages/ProjectStats.tsx)
  - Stat cards with Selia `Card`
  - Chart containers
  - Date range selectors with Selia components

##### Day 22: Project Team
- [ProjectTeam.tsx](apps/dashboard/admin/src/pages/ProjectTeam.tsx)
  - Team member table with Selia `Table`
  - Role badges with Selia `Badge`
  - Invite button with Selia `Button`
  - Use `InviteTeamMemberModal` (update to use refactored Modal)
  - Avatar display with Selia `Avatar`

##### Day 23: Project Settings & Payment Providers
- [ProjectSettings.tsx](apps/dashboard/admin/src/pages/ProjectSettings.tsx)
  - Settings form with Selia `Field`
  - Danger zone with Selia `Alert`
  - Save/cancel buttons

- [ProjectPaymentProviders.tsx](apps/dashboard/admin/src/pages/ProjectPaymentProviders.tsx)
  - Provider cards with Selia `Card`
  - Connection status with Selia `Badge`
  - Configuration form with Selia `Field`

##### Day 24: Project Apps
- [ProjectApps.tsx](apps/dashboard/admin/src/pages/ProjectApps.tsx)
  - App cards with Selia `Card`
  - App status badges
  - Create app button
  - Empty state if no apps

#### 3.3 App Context Pages (Day 25-30)

**Pages:** 9 pages

##### Day 25: App Detail & Setup
- [AppDetail.tsx](apps/dashboard/admin/src/pages/AppDetail.tsx)
  - Overview cards
  - Quick stats
  - Recent activity

- [AppSetup.tsx](apps/dashboard/admin/src/pages/AppSetup.tsx)
  - Setup wizard with Selia components
  - Configuration form
  - Step indicators

##### Day 26: App Users & Licenses
- [AppUsers.tsx](apps/dashboard/admin/src/pages/AppUsers.tsx)
  - User table with Selia `Table` (migrated in Phase 2)
  - Filters with Selia `Select`
  - Invite user button
  - Use `InviteUserModal`

- [AppLicenses.tsx](apps/dashboard/admin/src/pages/AppLicenses.tsx)
  - License table with Selia `Table` (migrated in Phase 2)
  - Status filters
  - Create license button

##### Day 27: App API Keys & OAuth
- [AppApiKeys.tsx](apps/dashboard/admin/src/pages/AppApiKeys.tsx)
  - API key list with Selia components
  - Copy button with Selia `Button`
  - Revoke confirmation with Selia `AlertDialog`

- [AppOAuth.tsx](apps/dashboard/admin/src/pages/AppOAuth.tsx)
  - OAuth configuration form
  - Callback URL display
  - Save button

##### Day 28: App Payment & Developers
- [AppPaymentSettings.tsx](apps/dashboard/admin/src/pages/AppPaymentSettings.tsx)
  - Payment configuration form
  - Pricing tiers with Selia `Card`
  - Toggle switches with Selia `Switch`

- [AppDevelopers.tsx](apps/dashboard/admin/src/pages/AppDevelopers.tsx)
  - Developer access list
  - Add developer form
  - Permission badges

##### Day 29: App Settings
- [AppSettings.tsx](apps/dashboard/admin/src/pages/AppSettings.tsx)
  - General settings form
  - Danger zone
  - Archive/delete app confirmation

#### 3.4 Admin Utility Pages (Day 30-32)

**Pages:** 5 pages

##### Day 30: Webhook Monitoring & Refunds
- [WebhookMonitoring.tsx](apps/dashboard/admin/src/pages/WebhookMonitoring.tsx)
  - Webhook log table
  - Status indicators
  - Retry button

- [RefundProcessing.tsx](apps/dashboard/admin/src/pages/RefundProcessing.tsx)
  - Refund form
  - Transaction search
  - Confirmation dialog

##### Day 31: Transaction Export & Playground
- [TransactionExport.tsx](apps/dashboard/admin/src/pages/TransactionExport.tsx)
  - Export configuration form
  - Date range selector
  - Download button

- [PaymentTestingPlayground.tsx](apps/dashboard/admin/src/pages/PaymentTestingPlayground.tsx)
  - Test payment form
  - Result display
  - Debug information

##### Day 32: Licenses Overview
- [Licenses.tsx](apps/dashboard/admin/src/pages/Licenses.tsx)
  - License overview cards
  - License statistics
  - Action buttons

---

### Phase 4: Polish & Testing (Week 5-6)

**Goal:** Final polish, comprehensive testing, and documentation

#### 4.1 Navigation Enhancement (Day 33-34)

##### Breadcrumb Implementation
**Files to Update:** All pages

**Current:**
```tsx
<div className="breadcrumb">
  <span className="breadcrumb-item">Home</span>
  <span className="breadcrumb-separator">/</span>
  <span className="breadcrumb-item active">Current</span>
</div>
```

**Migration:**
```tsx
import { Breadcrumb } from '@proofa/components';

<Breadcrumb>
  <Breadcrumb.Item href="/projects">Projects</Breadcrumb.Item>
  <Breadcrumb.Item href={`/projects/${projectId}`}>
    {projectName}
  </Breadcrumb.Item>
  <Breadcrumb.Item active>Settings</Breadcrumb.Item>
</Breadcrumb>
```

**Hierarchy Examples:**
- Global: `Dashboard → Page Name`
- Project: `Dashboard → Projects → Project Name → Page Name`
- App: `Dashboard → Projects → Project Name → Apps → App Name → Page Name`

##### Tab Navigation (if applicable)
**Use Selia `Tabs` for section switching within pages**

```tsx
import { Tabs, TabsList, TabsItem, TabsPanel } from '@proofa/components';

<Tabs defaultValue="general">
  <TabsList>
    <TabsItem value="general">General</TabsItem>
    <TabsItem value="advanced">Advanced</TabsItem>
  </TabsList>
  <TabsPanel value="general">
    {/* General settings */}
  </TabsPanel>
  <TabsPanel value="advanced">
    {/* Advanced settings */}
  </TabsPanel>
</Tabs>
```

#### 4.2 Typography Standardization (Day 35)

**Goal:** Replace custom heading/text styles with Selia typography components

**Current:**
```tsx
<h1 className="page-title">Page Title</h1>
<h2 className="section-heading">Section</h2>
<p className="text-muted">Description</p>
```

**Migration:**
```tsx
import { Heading, Text } from '@proofa/components';

<Heading as="h1" size="lg">Page Title</Heading>
<Heading as="h2" size="md">Section</Heading>
<Text muted>Description</Text>
```

**Apply to:** All page titles and section headings

#### 4.3 Empty State Implementation (Day 36)

**Pages Needing Empty States:**
- [Projects.tsx](apps/dashboard/admin/src/pages/Projects.tsx) - No projects
- [ProjectApps.tsx](apps/dashboard/admin/src/pages/ProjectApps.tsx) - No apps
- [AppUsers.tsx](apps/dashboard/admin/src/pages/AppUsers.tsx) - No users
- [AppLicenses.tsx](apps/dashboard/admin/src/pages/AppLicenses.tsx) - No licenses

**Pattern:**
```tsx
{data.length === 0 ? (
  <Card>
    <CardBody className="text-center py-12">
      <Icon type="folder-empty" size={48} className="mx-auto mb-4 text-gray-400" />
      <Heading size="md" className="mb-2">No projects yet</Heading>
      <Text muted className="mb-6">
        Get started by creating your first project
      </Text>
      <Button variant="primary" onClick={handleCreate}>
        Create Project
      </Button>
    </CardBody>
  </Card>
) : (
  // Regular content
)}
```

#### 4.4 IconPicker Component Refactor (Day 36)

**File:** [apps/dashboard/admin/src/components/IconPicker.tsx](apps/dashboard/admin/src/components/IconPicker.tsx)

**Refactor with:**
- Selia `Popover` for icon dropdown
- Selia `Input` for search
- Selia `Button` for icon selection
- Selia `Icon` for display

#### 4.5 ConfirmModal Component Refactor (Day 37)

**File:** [apps/dashboard/admin/src/components/ConfirmModal.tsx](apps/dashboard/admin/src/components/ConfirmModal.tsx)

**Current:** Custom implementation with captcha

**Refactor Plan:**
```tsx
import { AlertDialog, Field, Input, Button } from '@proofa/components';

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  requireCaptcha = false,
  captchaText = '',
}) {
  const [value, setValue] = useState('');
  const canConfirm = !requireCaptcha || value === captchaText;

  return (
    <AlertDialog open={open} onClose={onClose}>
      <AlertDialog.Header>
        <AlertDialog.Title>{title}</AlertDialog.Title>
      </AlertDialog.Header>
      <AlertDialog.Body>
        <Text>{message}</Text>
        {requireCaptcha && (
          <Field className="mt-4">
            <Label>Type "{captchaText}" to confirm</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={captchaText}
            />
          </Field>
        )}
      </AlertDialog.Body>
      <AlertDialog.Footer>
        <Button variant="plain" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={!canConfirm}
        >
          {confirmText}
        </Button>
      </AlertDialog.Footer>
    </AlertDialog>
  );
}
```

#### 4.6 CSS Final Cleanup (Day 38)

**File:** [apps/dashboard/admin/src/index.css](apps/dashboard/admin/src/index.css)

**Remove All Remaining Component Classes:**
- `.breadcrumb*` classes
- `.tabs*` classes
- Any remaining utility classes that duplicate Tailwind

**Keep Only:**
- Layout structure classes (`.app-layout`, `.main-content`)
- Page container classes (`.page`, `.page-container`)
- Custom animations or transitions not provided by Selia
- Dark mode overrides if needed
- Print styles

**Target:** 200-300 lines of essential CSS only

#### 4.7 Comprehensive Testing (Day 39-42)

##### Day 39: Smoke Testing
- Navigate through all 26 pages
- Verify no visual regressions
- Check all interactive elements work
- Test theme toggle (light/dark mode)

##### Day 40: Functional Testing
- Test all forms (create, update, delete)
- Test all modals and dialogs
- Test table interactions (sorting, filtering if applicable)
- Test navigation (breadcrumbs, sidebar)
- Test loading states
- Test error states

##### Day 41: Responsive Testing
- Test on mobile viewport (375px)
- Test on tablet viewport (768px)
- Test on desktop viewport (1920px)
- Verify all components are responsive
- Check sidebar behavior on mobile

##### Day 42: Cross-browser Testing
- Test in Chrome
- Test in Firefox
- Test in Safari
- Test in Edge
- Document any browser-specific issues

#### 4.8 Documentation Update (Day 43)

**Create/Update Documentation:**

1. **Component Usage Guide**
   - How to use Selia components in admin dashboard
   - Common patterns and examples
   - Variant reference

2. **Migration Completion Report**
   - Components migrated
   - CSS lines reduced
   - Before/after comparisons
   - Known issues or limitations

3. **Developer Guidelines**
   - Always use Selia components first
   - When to create custom components
   - How to extend Selia components
   - Styling conventions

4. **Update README.md**
   - Note Selia component usage
   - Link to component documentation
   - Development setup instructions

---

## Component Mapping Guide

### Quick Reference: Old → New

| Old Pattern | Selia Component | Notes |
|-------------|-----------------|-------|
| `.btn` | `Button` | Use `variant` prop |
| `.btn-primary` | `Button variant="primary"` | |
| `.btn-secondary` | `Button variant="secondary"` | |
| `.btn-danger` | `Button variant="danger"` | |
| `.btn-ghost` | `Button variant="plain"` | |
| `.btn-sm` | `Button size="sm"` | |
| `.card` | `Card` | Use composition |
| `.card-header` | `CardHeader` | |
| `.card-title` | `CardTitle` | |
| `.card-body` | `CardBody` | |
| `.badge-success` | `Badge variant="success"` | |
| `.badge-warning` | `Badge variant="warning"` | |
| `.badge-danger` | `Badge variant="danger"` | |
| `.alert-info` | `Alert variant="info"` | |
| `.alert-danger` | `Alert variant="danger"` | |
| `.form-group` | `Field` | |
| `.form-label` | `Label` | |
| `.form-input` | `Input` or `Textarea` | |
| `.form-error` | `Field error` prop | |
| `<table>` | `TableContainer` | Use full suite |
| `<thead>` | `TableHeader` | |
| `<th>` | `TableHead` | |
| `<tbody>` | `TableBody` | |
| `<tr>` | `TableRow` | |
| `<td>` | `TableCell` | |
| `.loading` | `Spinner` | |
| `.spinner` | `Spinner` | |
| `.breadcrumb` | `Breadcrumb` | |
| `.tabs` | `Tabs` | Use with TabsList, TabsItem |
| Custom modal | `Dialog` or `AlertDialog` | Via Modal.tsx wrapper |

### Component Selection Decision Tree

**Need a button?**
→ Use `Button` with appropriate variant

**Need a container?**
→ Use `Card` (with CardHeader, CardBody, etc.)

**Need a status indicator?**
- Non-interactive → `Badge`
- Removable → `Chip`

**Need a notification?**
- Temporary → `Toast` (via useToast hook)
- Persistent → `Alert`

**Need user input?**
- Single line → `Input`
- Multi-line → `Textarea`
- Dropdown → `Select`
- Searchable → `Combobox` or `Autocomplete`
- Toggle → `Switch` or `Checkbox`
- Number → `Number Field` or `Slider`

**Need a data table?**
→ Use `Table` components (`TableContainer`, `TableHeader`, etc.)

**Need a dialog?**
- Content → `Dialog` (via Modal.tsx)
- Confirmation → `AlertDialog` (via ConfirmModal.tsx)

**Need navigation?**
- Tabs → `Tabs` with TabsList/TabsItem
- Breadcrumb → `Breadcrumb`
- Menu → `Menu` or `Menubar`

**Need feedback?**
- Loading → `Spinner`
- Progress → `Progress`
- Empty state → Custom with `Card` + `Icon` + `Text`

---

## Implementation Guidelines

### 1. Code Style & Conventions

#### Import Organization
```tsx
// 1. React imports
import { useState, useEffect } from 'react';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';

// 3. Selia components (via @proofa/components)
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Input,
  Label,
  Field,
} from '@proofa/components';

// 4. Local components
import { Modal, ModalHeader, ModalBody } from '../components/Modal';

// 5. Hooks and utilities
import { useToast } from '../components/Toast';
import { api } from '../api';

// 6. Types
import type { User, Project } from '../types';
```

#### Component Usage
```tsx
// ✅ Good: Use semantic variants
<Button variant="primary">Save</Button>
<Button variant="danger">Delete</Button>

// ❌ Bad: Custom classes
<Button className="bg-red-500">Delete</Button>

// ✅ Good: Composition pattern
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardBody>Content</CardBody>
</Card>

// ❌ Bad: Monolithic structure
<Card title="Title" body="Content" />

// ✅ Good: Use Selia props
<Button size="sm" pill>Small Pill Button</Button>

// ❌ Bad: Tailwind overrides
<Button className="rounded-full px-2">Button</Button>
```

### 2. Variant Selection

#### Button Variants
- `primary` - Main actions (Save, Create, Submit)
- `secondary` - Secondary actions (Cancel, Back)
- `danger` - Destructive actions (Delete, Remove)
- `outline` - Alternative actions
- `plain` - Tertiary actions (icon buttons, menu triggers)

#### Badge/Chip Variants
- `success` - Active, approved, completed states
- `warning` - Pending, in-progress states
- `danger` - Error, rejected, failed states
- `info` - Informational, neutral states
- `primary` - Highlighted items

#### Alert Variants
- `info` - General information
- `success` - Success messages
- `warning` - Warning messages
- `danger` - Error messages

### 3. Responsive Design

**Use Tailwind responsive utilities with Selia components:**

```tsx
// Mobile-first approach
<Card className="p-4 md:p-6 lg:p-8">
  <CardHeader>
    <CardTitle className="text-lg md:text-xl lg:text-2xl">
      Title
    </CardTitle>
  </CardHeader>
</Card>

// Responsive button layout
<div className="flex flex-col md:flex-row gap-2 md:gap-4">
  <Button variant="primary" block className="md:block">
    Save
  </Button>
  <Button variant="secondary" block className="md:block">
    Cancel
  </Button>
</div>

// Responsive table (consider mobile cards on small screens)
<div className="hidden md:block">
  <TableContainer>{/* Table for desktop */}</TableContainer>
</div>
<div className="md:hidden">
  {/* Card layout for mobile */}
  {items.map(item => (
    <Card key={item.id}>{/* Item details */}</Card>
  ))}
</div>
```

### 4. Accessibility

**Ensure all interactive elements are accessible:**

```tsx
// ✅ Good: Semantic button
<Button onClick={handleDelete} aria-label="Delete project">
  <Icon type="trash" />
</Button>

// ❌ Bad: Div with onClick
<div onClick={handleDelete}>
  <Icon type="trash" />
</div>

// ✅ Good: Form with labels
<Field>
  <Label htmlFor="project-name">Project Name</Label>
  <Input id="project-name" type="text" />
</Field>

// ✅ Good: Alert with role
<Alert variant="danger" role="alert">
  Error message
</Alert>

// ✅ Good: Table with caption
<TableContainer>
  <TableCaption>List of all users</TableCaption>
  {/* ... */}
</TableContainer>
```

### 5. Loading & Error States

**Consistent patterns for async operations:**

```tsx
function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        Failed to load data: {error.message}
      </Alert>
    );
  }

  return (
    <Card>
      {/* Success state */}
    </Card>
  );
}
```

### 6. Form Patterns

**Standard form layout with validation:**

```tsx
function MyForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validation
      const newErrors: Record<string, string> = {};
      if (!name) newErrors.name = 'Name is required';
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Submit
      await api.post('/endpoint', data);
      toast.success('Saved successfully');
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Form Title</CardTitle>
        </CardHeader>
        <CardBody>
          <Stack direction="column" spacing="md">
            <Field error={errors.name}>
              <Label>Name</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field error={errors.email}>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </Stack>
        </CardBody>
        <CardFooter>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
```

### 7. Modal Patterns

**Use wrapper components for consistency:**

```tsx
// Simple modal
<Modal open={isOpen} onClose={() => setIsOpen(false)}>
  <ModalHeader>Title</ModalHeader>
  <ModalBody>
    <Text>Content here</Text>
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleSave}>
      Save
    </Button>
  </ModalFooter>
</Modal>

// Confirmation modal
<ConfirmModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  title="Delete Project"
  message="Are you sure you want to delete this project?"
  confirmText="Delete"
  requireCaptcha
  captchaText={projectName}
/>
```

---

## Testing Strategy

### 1. Unit Testing

**Test individual components after migration:**

```typescript
// Example: Button migration test
describe('Button', () => {
  it('renders with primary variant', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('variant-primary');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 2. Integration Testing

**Test page-level interactions:**

```typescript
describe('Projects Page', () => {
  it('displays projects list', async () => {
    render(<Projects />);
    await waitFor(() => {
      expect(screen.getByText('My Project')).toBeInTheDocument();
    });
  });

  it('opens create project modal', async () => {
    render(<Projects />);
    fireEvent.click(screen.getByText('Create Project'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

### 3. Visual Regression Testing

**Capture screenshots before and after migration:**

- Use Playwright or Cypress for visual testing
- Compare screenshots at key breakpoints (mobile, tablet, desktop)
- Test light and dark modes
- Focus on high-traffic pages first

### 4. Manual Testing Checklist

#### Per-Page Checklist
- [ ] Page loads without errors
- [ ] All buttons are clickable and functional
- [ ] All forms submit correctly
- [ ] All modals open and close
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Empty states display correctly
- [ ] Navigation works (breadcrumbs, links)
- [ ] Responsive on mobile (375px)
- [ ] Responsive on tablet (768px)
- [ ] Works in light mode
- [ ] Works in dark mode
- [ ] No console errors
- [ ] No visual regressions

#### Global Checklist
- [ ] Theme toggle works
- [ ] Toast notifications display
- [ ] Sidebar navigation works
- [ ] User authentication flow works
- [ ] All modals are consistent
- [ ] All buttons use Selia variants
- [ ] All forms use Selia Field/Input
- [ ] All tables use Selia Table
- [ ] Custom CSS reduced to <300 lines
- [ ] No `.btn`, `.card`, `.badge` classes remain

### 5. Performance Testing

**Ensure no performance regressions:**

- Measure page load times before and after
- Check bundle size impact
- Test with React DevTools Profiler
- Monitor for unnecessary re-renders
- Test table performance with large datasets

---

## Success Metrics

### Quantitative Metrics

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| Custom CSS Lines | 1,650 | 200-300 | Line count in index.css |
| Custom CSS Classes | 280+ | <30 | Grep for class definitions |
| Selia Component Usage | ~15% | 100% | Count Selia imports vs custom |
| Pages Migrated | 0/26 | 26/26 | Checklist completion |
| Components Refactored | 0/6 | 6/6 | Checklist completion |
| Bundle Size Impact | Baseline | <5% increase | Webpack bundle analyzer |
| Lighthouse Score | Baseline | Maintain or improve | Chrome Lighthouse |

### Qualitative Metrics

- **Design Consistency:** All pages use same components and variants
- **Code Maintainability:** Reduced complexity, easier to update
- **Developer Experience:** Faster development with pre-built components
- **User Experience:** Consistent interactions across all pages

### Validation Criteria

**Migration is complete when:**
1. ✅ All 26 pages use Selia components exclusively
2. ✅ Custom CSS reduced to <300 lines (layout only)
3. ✅ No custom `.btn`, `.card`, `.badge`, `.alert` classes remain
4. ✅ Toast system implemented with Selia Toast
5. ✅ All tables use Selia Table components
6. ✅ All forms use Selia Field/Input components
7. ✅ Modal and ConfirmModal wrappers refactored
8. ✅ Breadcrumb navigation implemented
9. ✅ All manual tests pass
10. ✅ No visual regressions
11. ✅ No performance regressions
12. ✅ Documentation updated

---

## Risk Mitigation

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Visual regressions | Medium | Medium | Screenshot testing, thorough review |
| Breaking changes | Low | High | Incremental migration, testing per page |
| Performance issues | Low | Medium | Performance monitoring, profiling |
| User disruption | Low | High | Feature flags, gradual rollout |
| Timeline overrun | Medium | Medium | Buffer time, parallel work |
| Incomplete migration | Low | High | Strict checklist, code review |

### Rollback Plan

**If critical issues are discovered:**

1. **Feature Flag Approach**
   - Use environment variable to toggle between old/new UI
   - Can roll back instantly without code changes

2. **Git Strategy**
   - Each phase in separate branch
   - Can revert specific phases if needed
   - Main branch always stable

3. **Gradual Rollout**
   - Deploy to staging first
   - Monitor for 24-48 hours
   - Deploy to production page-by-page if needed

---

## Timeline & Milestones

### Week-by-Week Breakdown (Revised with Dashboard Block)

**Week 1: Dashboard Block Adoption & Foundation**
- Day 1: Copy Selia dashboard block files
- Day 2-3: Implement dynamic context-aware sidebar
- Day 3-4: Add theme toggle, integrate layout with routing
- Day 4: Create StatCard component
- Day 5: Install dependencies, test layout
- Day 6-7: Button migration across all pages

**Milestone:** Dashboard layout foundation complete, context-aware navigation working ✅

**Week 2: Components & Forms**
- Day 8-9: Card & Badge migration
- Day 10: Alert & Loading migration
- Day 11-12: Form layout migration with Selia Field/Form
- Day 13-14: Table component migration
- Day 15: Toast implementation, Modal refactor
- Day 16: CSS cleanup (remove replaced classes)

**Milestone:** Core UI components migrated, forms and tables use Selia ✅

**Week 3: Page Migration**
- Day 17-18: Wrap all pages with DashboardLayout
- Day 19-20: Migrate Global pages (6 pages: Dashboard, Projects, CreateProject, Profile, Billing, Licenses)
- Day 21-22: Migrate Project context pages (6 pages: ProjectDetail, ProjectStats, ProjectTeam, ProjectSettings, ProjectPaymentProviders, ProjectApps)
- Day 23-24: Migrate App context pages Part 1 (5 pages: AppDetail, AppSetup, AppUsers, AppLicenses, AppApiKeys)
- Day 25-26: Migrate App context pages Part 2 (4 pages: AppOAuth, AppPaymentSettings, AppDevelopers, AppSettings)
- Day 27: Migrate Admin utility pages (5 pages: WebhookMonitoring, RefundProcessing, TransactionExport, PaymentTestingPlayground, Licenses)

**Milestone:** All 26 pages migrated and using DashboardLayout ✅

**Week 4: Polish, Testing & Documentation**
- Day 28: Add breadcrumb navigation
- Day 29: Implement empty states for all relevant pages
- Day 30: Typography standardization, IconPicker refactor
- Day 31: ConfirmModal refactor with AlertDialog
- Day 32: Final CSS cleanup (reduce to ~100-150 lines)
- Day 33-35: Comprehensive testing (smoke, functional, responsive, cross-browser)
- Day 36: Documentation update, migration completion report

**Milestone:** Migration complete, tested, documented ✅

### Checkpoint Reviews

**End of Week 1:** Review dashboard layout, sidebar navigation, StatCard implementation
**End of Week 2:** Review all component migrations, forms, and tables
**End of Week 3:** Review all page migrations, ensure consistent layout usage
**End of Week 4:** Final approval and launch

### Time Savings Summary

| Original Plan | Revised Plan | Savings |
|---------------|--------------|---------|
| 6 weeks (43 days) | 4 weeks (28 days) | 2 weeks (15 days) |
| Custom layout design | Pre-built dashboard block | ~40% time reduction |
| 200-300 lines custom CSS | 100-150 lines custom CSS | 50% less custom CSS |

---

## Appendix

### A. File Structure Reference

```
apps/dashboard/admin/
├── src/
│   ├── pages/                    # 26 pages
│   │   ├── Login.tsx
│   │   ├── Onboarding.tsx
│   │   ├── Profile.tsx
│   │   ├── Projects.tsx
│   │   ├── CreateProject.tsx
│   │   ├── BillingDashboard.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── ProjectStats.tsx
│   │   ├── ProjectTeam.tsx
│   │   ├── ProjectSettings.tsx
│   │   ├── ProjectPaymentProviders.tsx
│   │   ├── ProjectApps.tsx
│   │   ├── AppDetail.tsx
│   │   ├── AppSetup.tsx
│   │   ├── AppUsers.tsx
│   │   ├── AppLicenses.tsx
│   │   ├── AppApiKeys.tsx
│   │   ├── AppOAuth.tsx
│   │   ├── AppPaymentSettings.tsx
│   │   ├── AppDevelopers.tsx
│   │   ├── AppSettings.tsx
│   │   ├── WebhookMonitoring.tsx
│   │   ├── RefundProcessing.tsx
│   │   ├── TransactionExport.tsx
│   │   ├── PaymentTestingPlayground.tsx
│   │   └── Licenses.tsx
│   ├── components/               # 6 components
│   │   ├── Modal.tsx
│   │   ├── Select.tsx
│   │   ├── ConfirmModal.tsx
│   │   ├── InviteUserModal.tsx
│   │   ├── InviteTeamMemberModal.tsx
│   │   ├── Toast.tsx
│   │   └── IconPicker.tsx
│   ├── hooks/
│   │   └── api.ts
│   ├── lib/
│   ├── App.tsx
│   ├── main.tsx
│   ├── api.ts
│   ├── config.ts
│   ├── index.css              # Target for reduction
│   └── styles.css
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### B. Selia Component Import Reference

```typescript
// Layout & Container
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
  CardHeaderAction,
  Stack,
  Divider,
} from '@proofa/components';

// Buttons & Actions
import {
  Button,
  Toggle,
  ToggleGroup,
} from '@proofa/components';

// Form Elements
import {
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectList,
  SelectItem,
  Checkbox,
  Radio,
  Switch,
  Slider,
  Field,
  Label,
  Fieldset,
  Form,
} from '@proofa/components';

// Data Display
import {
  TableContainer,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableFooter,
  TableCaption,
  Badge,
  Chip,
  ChipButton,
  Avatar,
} from '@proofa/components';

// Feedback
import {
  Alert,
  Spinner,
  Progress,
  ProgressLabel,
  ProgressValue,
  Toast,
} from '@proofa/components';

// Overlay
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogClose,
  AlertDialog,
  Popover,
  Tooltip,
} from '@proofa/components';

// Navigation
import {
  Tabs,
  TabsList,
  TabsItem,
  TabsPanel,
  Breadcrumb,
  Menu,
  MenuItem,
  MenuSeparator,
} from '@proofa/components';

// Typography
import {
  Heading,
  Text,
  TextLink,
  Strong,
  Code,
  Kbd,
} from '@proofa/components';

// Icons
import {
  Icon,
  IconBox,
  type IconType,
} from '@proofa/components';
```

### C. CSS Class Migration Lookup

**Quick reference for find-and-replace:**

| Search | Replace | Notes |
|--------|---------|-------|
| `className="btn btn-primary"` | `<Button variant="primary">` | Convert to component |
| `className="btn btn-secondary"` | `<Button variant="secondary">` | |
| `className="card"` | `<Card>` | Convert to component |
| `className="badge badge-success"` | `<Badge variant="success">` | |
| `className="alert alert-danger"` | `<Alert variant="danger">` | |
| `className="form-group"` | `<Field>` | |
| `className="table"` | `<TableContainer>` | |
| `className="loading"` | `{loading && <Spinner />}` | Convert to conditional |

### D. Common Patterns Cheat Sheet

**Loading State:**
```tsx
{isLoading ? <Spinner /> : <Content />}
```

**Error State:**
```tsx
{error && <Alert variant="danger">{error.message}</Alert>}
```

**Empty State:**
```tsx
{data.length === 0 ? (
  <Card><CardBody>Empty state</CardBody></Card>
) : (
  <List>{data.map(...)}</List>
)}
```

**Confirmation:**
```tsx
<ConfirmModal
  open={open}
  onClose={() => setOpen(false)}
  onConfirm={handleConfirm}
  title="Confirm"
  message="Are you sure?"
/>
```

**Toast:**
```tsx
const toast = useToast();
toast.success('Operation successful');
toast.error('Operation failed');
```

---

## 🎉 Key Benefits Summary

### What Changed with Dashboard Block Adoption

| Aspect | Original Plan | With Dashboard Block | Improvement |
|--------|---------------|---------------------|-------------|
| **Timeline** | 6 weeks (43 days) | 4 weeks (28 days) | **2 weeks faster** |
| **Custom CSS** | Reduce to 200-300 lines | Reduce to 100-150 lines | **50% less custom CSS** |
| **Layout Design** | Design from scratch | Pre-built production layout | **Zero layout design time** |
| **Navigation** | Build custom sidebar | Customize Selia sidebar | **Context-aware built-in** |
| **Components** | Create custom stat cards | Use Selia StatCard | **Ready-made metrics display** |
| **Responsive** | Implement manually | Built-in responsive behavior | **Mobile-first by default** |
| **Testing** | Test custom layout | Test proven layout | **Lower risk** |
| **Maintenance** | More custom code | Less custom code | **Easier to maintain** |

### What We Get Out of the Box

✅ **Complete Layout System**
- Responsive sidebar with mobile toggle
- Top navigation bar with space for theme toggle
- Backdrop overlay for mobile
- Smooth transitions and animations
- Proper spacing and padding

✅ **Production-Ready Components**
- StatCard for metrics display
- Chart integration (with Recharts)
- Data table patterns
- User profile menu
- Search integration with keyboard shortcuts

✅ **Best Practices**
- Accessibility built-in (Selia components are accessible)
- Mobile-first responsive design
- Dark mode support
- Clean component composition
- Industry-standard patterns

✅ **Time Savings**
- **Week 1:** Instead of designing layout, we customize existing one
- **Week 2:** Focus on component migration, not layout building
- **Week 3:** All pages adopt same proven layout pattern
- **Week 4:** Polish and test, not still building

### Implementation Highlights

**Phase 0: Dashboard Block Adoption (5 days)**
- Copy Selia dashboard files
- Implement context-aware sidebar (Global, Project, App navigation)
- Add project/app selectors
- Integrate theme toggle
- Create reusable StatCard component

**Reduced Effort Areas:**
- ❌ No need to design sidebar layout
- ❌ No need to implement responsive behavior from scratch
- ❌ No need to create navigation patterns
- ❌ No need to build user profile menu
- ❌ No need to handle mobile/desktop transitions

**Focus Areas:**
- ✅ Customizing navigation items for our routes
- ✅ Implementing dynamic context detection
- ✅ Migrating page content to Selia components
- ✅ Integrating with existing API/auth
- ✅ Testing and polish

### Success Metrics (Updated)

| Metric | Target | Status |
|--------|--------|--------|
| Timeline | 4 weeks | On track |
| Custom CSS | <150 lines | Achievable |
| Component Usage | 100% Selia | Planned |
| Layout Consistency | All pages use DashboardLayout | Planned |
| Context-Aware Nav | 3 contexts implemented | Planned |
| Mobile Responsive | All pages | Built-in |
| Testing Coverage | Comprehensive | Week 4 |

---

## Document Approval

**Prepared by:** Development Team
**Review required by:**
- [ ] Engineering Lead
- [ ] Product Manager
- [ ] Design Lead
- [ ] QA Lead

**Approved by:**
- [ ] Name, Title, Date

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-26 | Development Team | Initial migration plan |
| 2.0 | 2026-01-26 | Development Team | **Major update:** Added Selia dashboard block adoption strategy, reduced timeline from 6 weeks to 4 weeks, updated all phases to leverage pre-built layout, added Phase 0 for dashboard block integration, reduced custom CSS target from 200-300 lines to 100-150 lines |

---

## Next Steps

1. **Review this plan** with the team
2. **Approve dashboard block adoption** approach
3. **Start Phase 0** (copy and customize Selia dashboard block)
4. **Set up project tracking** (create issues/tickets for each phase)
5. **Schedule weekly check-ins** for progress review

---

**End of Migration Plan**

For questions or clarifications, please contact the development team.

**Quick Links:**
- [Selia Dashboard Block Demo](https://selia.earth/block/dashboard/)
- [Selia Dashboard Block Source](https://github.com/nauvalazhar/selia/tree/master/components/blocks/dashboard)
- [Selia Documentation](https://selia.earth/docs/)
- [Selia Component Library](https://selia.earth/components/)
