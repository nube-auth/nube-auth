# Admin Dashboard Migration Plan - Updates for Core Building Blocks Only

## Summary of Changes

**Focus:** Use only core building blocks from Selia dashboard, ignore charts/recharts

## Files to Use from Selia Dashboard Block

### ✅ WILL USE:
1. **layout.tsx** → DashboardLayout.tsx
   - Two-column layout (sidebar + main content)
   - Responsive behavior
   - Mobile toggle
   - Top navigation bar

2. **app-sidebar.tsx** → AppSidebar.tsx
   - Sidebar navigation structure
   - Collapsible sections
   - User profile menu
   - Search input with keyboard shortcut

3. **stat-card.tsx** → StatCard.tsx
   - Metrics display component
   - With icon, title, value, change indicator

4. **page.tsx** → Reference only
   - Use as example for layout patterns
   - Grid structure for stats
   - Table patterns

### ❌ WILL NOT USE:
1. **chart.tsx** - Skip entirely (no data visualization for now)
2. **data.ts** - Skip (sample data not needed)

## Key Removals from Migration Plan

1. Remove all references to "recharts"
2. Remove "Chart component" implementation steps
3. Remove "pnpm add recharts" from dependencies
4. Update Phase 0 to not include chart setup
5. Update component list to exclude charts
6. Update benefits summary to focus on layout/navigation only

## Updated File Structure

```
apps/dashboard/admin/src/
├── layouts/
│   ├── DashboardLayout.tsx    # ✅ Core layout
│   └── AppSidebar.tsx          # ✅ Navigation
└── components/
    └── StatCard.tsx             # ✅ Metrics only
```

**Not creating:**
- ❌ Chart.tsx
- ❌ data.ts or mock data files

## Updated Phase 0 (Day 1-5)

### Day 1: Copy Core Files
- layout.tsx → DashboardLayout.tsx
- app-sidebar.tsx → AppSidebar.tsx
- stat-card.tsx → StatCard.tsx
- ❌ Skip chart.tsx

### Day 2-3: Implement Dynamic Sidebar
- Context detection (global, project, app)
- Navigation items for each context
- Project/app selectors

### Day 3-4: Integrate Layout
- Add theme toggle to top nav
- Wrap routes with DashboardLayout
- Test responsive behavior

### Day 4: StatCard Component
- Copy and customize for our metrics
- Add to pages that need metrics display

### Day 5: Test & Validate
- ❌ No chart dependencies to install
- ✅ Test layout responsiveness
- ✅ Test sidebar navigation
- ✅ Test StatCard display

## What We Get (Core Building Blocks)

✅ **Layout System**
- Responsive sidebar
- Top navigation bar
- Mobile toggle with backdrop
- Smooth transitions

✅ **Navigation**
- Sidebar with collapsible sections
- Context-aware menu items
- User profile dropdown
- Search input

✅ **Components**
- StatCard for metrics
- Table patterns (using Selia Table)
- Card layouts
- Navigation structure

❌ **Not Including**
- Charts/data visualization
- Recharts library
- Mock data structures

## Benefits (Updated)

| Aspect | Benefit |
|--------|---------|
| **Timeline** | Still 4 weeks (no change) |
| **Layout** | Pre-built responsive structure |
| **Navigation** | Context-aware sidebar ready |
| **Components** | StatCard + Selia components |
| **Dependencies** | No additional packages needed |
| **Complexity** | Simpler without chart integration |

## What to Add Later (Optional)

If charts are needed in the future:
- Can use any charting library (Recharts, Chart.js, D3, etc.)
- Add to ProjectStats page
- Add to BillingDashboard
- Independent of core layout migration

---

This keeps the migration focused on **core building blocks** only:
1. Layout structure
2. Navigation patterns
3. Basic components (Cards, Stats, Tables, Forms, Buttons)
4. Responsive behavior

Charts can be added as a separate enhancement later if needed.
