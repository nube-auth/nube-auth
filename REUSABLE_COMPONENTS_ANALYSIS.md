# Reusable Components Analysis

## Overview
Identified common UI patterns in user dashboard that should be extracted into reusable components for use across all dashboards (user, admin, docs, etc.).

---

## Tier 1: Essential UI Components (High Priority)

### 1. **Card Component**
**Current Implementation:** CSS classes in dashboard/user/src/index.css
```css
.card { /* base card */ }
.card-header { /* header with background */ }
.card-title { /* title styling */ }
.card-body { /* content padding */ }
```

**Current Usage:**
- Profile.tsx: Form cards, account info cards
- Sessions.tsx: Session card display
- Multiple cards in every page

**Reusability:** ⭐⭐⭐⭐⭐
```tsx
<Card>
  <Card.Header>
    <Card.Title>Personal Information</Card.Title>
  </Card.Header>
  <Card.Body>
    {/* content */}
  </Card.Body>
</Card>
```

**Benefit:** Eliminates need for `.card-header`, `.card-body` CSS classes

---

### 2. **Tabs Component**
**Current Implementation:** CSS classes in dashboard/user/src/index.css
```css
.tabs { /* container */ }
.tab { /* individual tab */ }
.tab-active { /* active state */ }
.tab-badge { /* count badge */ }
```

**Current Usage:**
- Profile.tsx: Profile/Sessions/Security tabs
- Sessions.tsx: Same tab set

**Reusability:** ⭐⭐⭐⭐⭐
```tsx
<Tabs value={activeTab} onChange={setActiveTab}>
  <Tabs.Item label="Profile" badge={0}>
    <ProfileContent />
  </Tabs.Item>
  <Tabs.Item label="Sessions" badge={7}>
    <SessionsContent />
  </Tabs.Item>
</Tabs>
```

**Benefit:** Cleaner markup, consistent active states across dashboards

---

### 3. **Badge Component**
**Current Implementation:** CSS classes in dashboard/user/src/index.css
```css
.badge { /* base */ }
.badge-success { /* green */ }
.badge-danger { /* red */ }
.badge-info { /* blue */ }
```

**Current Usage:**
- Profile.tsx: "Verified" badge, "Google" auth badge
- Sessions.tsx: "Active", "Current", "Expired" badges
- Many places throughout both dashboards

**Reusability:** ⭐⭐⭐⭐⭐
```tsx
<Badge variant="success">Verified</Badge>
<Badge variant="danger">Expired</Badge>
<Badge variant="info">Active</Badge>
```

**Benefit:** Type-safe variants, consistent styling, reusable everywhere

---

### 4. **Alert Component**
**Current Implementation:** CSS classes in dashboard/user/src/index.css
```css
.alert { /* base */ }
.alert-success { /* success state */ }
.alert-bar { /* info bar */ }
```

**Current Usage:**
- Profile.tsx: Success alerts
- Sessions.tsx: Info bar ("You have X active sessions")

**Reusability:** ⭐⭐⭐⭐⭐
```tsx
<Alert variant="success" icon={CheckIcon}>
  Profile updated successfully!
</Alert>

<Alert variant="info" icon={InfoIcon} dismissible>
  You have 7 active sessions across your devices.
</Alert>
```

**Benefit:** Consistent notifications, built-in dismissal, type-safe

---

### 5. **Table Component**
**Current Implementation:** CSS + HTML in dashboard/user/src/index.css
```css
.table-container { /* wrapper */ }
.table-account { /* row cell with icon */ }
.table-account-name { /* primary text */ }
.table-account-email { /* secondary text */ }
.table-date { /* date styling */ }
```

**Current Usage:**
- Sessions.tsx: "All Sessions" table

**Reusability:** ⭐⭐⭐⭐⭐
```tsx
<Table>
  <Table.Head>
    <Table.Row>
      <Table.Header>Device</Table.Header>
      <Table.Header>Location</Table.Header>
      <Table.Header>Created</Table.Header>
      <Table.Header>Status</Table.Header>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    {sessions.map((session) => (
      <Table.Row key={session.id}>
        <Table.Cell>{session.device}</Table.Cell>
        <Table.Cell>{session.location}</Table.Cell>
        <Table.Cell>{session.created}</Table.Cell>
        <Table.Cell><Badge>{session.status}</Badge></Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```

**Benefit:** Removes table styling from dashboard CSS, reusable across all dashboards

---

## Tier 2: Form Components (High Priority)

### 6. **Form Group Component**
**Current Implementation:** CSS classes in dashboard/user/src/index.css
```css
.form-group { /* container */ }
.form-label { /* label styling */ }
.form-hint { /* helper text */ }
.input-group { /* input + addon */ }
```

**Current Usage:**
- Profile.tsx: Email input, display name input
- Will be used in admin forms

**Reusability:** ⭐⭐⭐⭐⭐
```tsx
<FormGroup>
  <FormGroup.Label htmlFor="name">Display Name</FormGroup.Label>
  <FormGroup.Input
    id="name"
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Enter your name"
  />
  <FormGroup.Hint>This name will be displayed across all apps</FormGroup.Hint>
</FormGroup>
```

**Benefit:** Consistent form styling, built-in spacing, reusable

---

### 7. **Button Component**
**Current Implementation:** CSS classes in dashboard/user/src/index.css
```css
.btn-primary { /* primary action */ }
.btn-danger { /* destructive */ }
.btn-sm { /* small variant */ }
```

**Current Usage:**
- Profile.tsx: "Save Changes" button
- Sessions.tsx: "Logout All" button
- Login.tsx: "Continue with Google" button

**Reusability:** ⭐⭐⭐⭐⭐
```tsx
<Button variant="primary" size="md" loading={isLoading}>
  Save Changes
</Button>

<Button variant="danger" size="sm">
  Logout All
</Button>
```

**Benefit:** Consistent button styling, loading states, size variants

---

## Tier 3: Layout Components (Medium Priority)

### 8. **Breadcrumbs Component**
**Current Implementation:** CSS classes in dashboard/user/src/index.css
```css
.breadcrumbs { /* container */ }
.breadcrumb-item { /* item */ }
.breadcrumb-divider { /* separator */ }
.breadcrumb-current { /* current page */ }
```

**Current Usage:**
- Profile.tsx: Account / Profile
- Sessions.tsx: Account / Sessions

**Reusability:** ⭐⭐⭐⭐
```tsx
<Breadcrumbs>
  <Breadcrumbs.Item to="/profile">Account</Breadcrumbs.Item>
  <Breadcrumbs.Item>Profile</Breadcrumbs.Item>
</Breadcrumbs>
```

**Benefit:** Cleaner markup, reusable navigation aid

---

### 9. **Empty State Component**
**Current Implementation:** CSS classes in dashboard/user/src/index.css
```css
.empty-state { /* container */ }
.empty-state-icon { /* icon background */ }
.empty-state-title { /* title */ }
.empty-state-desc { /* description */ }
```

**Current Usage:**
- Profile.tsx: "User not found" state
- Sessions.tsx: "No active sessions" state

**Reusability:** ⭐⭐⭐⭐
```tsx
<EmptyState
  icon={<ComputerIcon />}
  title="No active sessions"
  description="You don't have any active sessions at the moment."
/>
```

**Benefit:** Consistent empty state UX across all dashboards

---

### 10. **Loading Component**
**Current Implementation:** CSS classes in dashboard/user/src/index.css
```css
.loading { /* container */ }
.loading-text { /* text */ }
.spinner { /* animation */ }
```

**Current Usage:**
- Profile.tsx: Loading profile
- Sessions.tsx: Loading sessions
- Login.tsx: Loading/redirecting states

**Reusability:** ⭐⭐⭐⭐⭐
```tsx
<Loading text="Loading profile..." />

<Loading variant="inline" size="small" />
```

**Benefit:** Consistent loading UX, animation, reusable

---

## Tier 4: Data Display Components (Medium Priority)

### 11. **Info Grid Component**
**Current Implementation:** CSS in dashboard/user/src/index.css
```css
.info-grid { /* 4 column grid */ }
.info-item { /* item */ }
.info-label { /* label */ }
.info-value { /* value */ }
```

**Current Usage:**
- Profile.tsx: Email, Status, Account Type, Joined date display
- Sessions.tsx: Total Sessions, Active, Current Expires, Last Activity

**Reusability:** ⭐⭐⭐⭐
```tsx
<InfoGrid>
  <InfoGrid.Item label="Email">{user.email}</InfoGrid.Item>
  <InfoGrid.Item label="Status">
    <StatusDot /> Active
  </InfoGrid.Item>
  <InfoGrid.Item label="Account Type">
    <UserIcon /> User
  </InfoGrid.Item>
</InfoGrid>
```

**Benefit:** Responsive layout, consistent styling

---

### 12. **Status Dot Component**
**Current Implementation:** CSS class in dashboard/user/src/index.css
```css
.status-dot { /* green dot */ }
```

**Current Usage:**
- Profile.tsx: Status indicator
- Sessions.tsx: Active session indicator

**Reusability:** ⭐⭐⭐
```tsx
<StatusDot variant="success" />
```

---

## Tier 5: Advanced Components (Lower Priority)

### 13. **Info List Component**
**Current Implementation:** CSS in dashboard/user/src/index.css
```css
.info-list { /* container */ }
.info-list-item { /* item */ }
.info-list-label { /* label with description */ }
.info-list-value { /* value */ }
```

**Current Usage:**
- Profile.tsx: Account ID, Account Created, Authentication method

**Reusability:** ⭐⭐⭐
```tsx
<InfoList>
  <InfoList.Item
    label="Account ID"
    description="Your unique identifier"
    value={user.id}
  />
</InfoList>
```

---

### 14. **Session Card Component**
**Current Implementation:** CSS + JSX in Sessions.tsx
```css
.current-session-card { /* green left border */ }
.current-session-header { /* header */ }
.current-session-meta { /* 2-column metadata */ }
```

**Current Usage:**
- Sessions.tsx: Current Session display

**Reusability:** ⭐⭐⭐
```tsx
<SessionCard session={currentSession} />
```

---

### 15. **Profile Header Component**
**Current Implementation:** CSS + JSX in Profile.tsx and Sessions.tsx
```css
.profile-header { /* container */ }
.profile-avatar { /* avatar */ }
.profile-info { /* name + meta */ }
.profile-meta { /* subtitle */ }
```

**Current Usage:**
- Profile.tsx: Header with initials
- Sessions.tsx: Same header

**Reusability:** ⭐⭐⭐⭐
```tsx
<ProfileHeader
  name={user.name}
  email={user.email}
  meta="Last updated recently"
/>
```

---

## Implementation Priority

### **Phase 1 (Immediate)** - Extract High-Reuse Components
1. ✅ Badge Component
2. ✅ Alert Component
3. ✅ Button Component
4. ✅ Card Component
5. ✅ Tabs Component
6. ✅ Table Component

### **Phase 2 (Soon)** - Extract Medium-Reuse Components
7. FormGroup Component
8. Loading Component
9. Empty State Component
10. Info Grid Component

### **Phase 3 (Later)** - Extract Specialized Components
11. Breadcrumbs Component
12. Profile Header Component
13. Session Card Component
14. Info List Component
15. Status Dot Component

---

## Proposed Package Structure

```
apps/packages/components/
├── src/
│   ├── Card/
│   │   ├── Card.tsx
│   │   ├── CardHeader.tsx
│   │   ├── CardTitle.tsx
│   │   ├── CardBody.tsx
│   │   └── index.ts
│   ├── Tabs/
│   │   ├── Tabs.tsx
│   │   ├── TabsItem.tsx
│   │   └── index.ts
│   ├── Badge/
│   │   ├── Badge.tsx
│   │   └── index.ts
│   ├── Alert/
│   │   ├── Alert.tsx
│   │   ├── AlertBar.tsx
│   │   └── index.ts
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── index.ts
│   ├── Table/
│   │   ├── Table.tsx
│   │   ├── TableHead.tsx
│   │   ├── TableBody.tsx
│   │   ├── TableRow.tsx
│   │   ├── TableHeader.tsx
│   │   ├── TableCell.tsx
│   │   └── index.ts
│   ├── Form/
│   │   ├── FormGroup.tsx
│   │   ├── FormLabel.tsx
│   │   ├── FormHint.tsx
│   │   ├── FormInput.tsx
│   │   └── index.ts
│   ├── Loading/
│   │   ├── Loading.tsx
│   │   ├── Spinner.tsx
│   │   └── index.ts
│   ├── EmptyState/
│   │   ├── EmptyState.tsx
│   │   └── index.ts
│   └── index.ts (main export)
├── package.json
└── tsconfig.json
```

---

## Next Steps

1. **Create component library** in `@proofa/ui` package
2. **Extract Phase 1 components** from user dashboard
3. **Update user dashboard** to import components from library
4. **Remove CSS classes** from dashboard index.css
5. **Apply to admin dashboard** using same components
6. **Document each component** with storybook or similar

---

## Benefits of Extraction

✅ **DRY** - No code duplication across dashboards
✅ **Consistency** - All dashboards use identical components
✅ **Maintainability** - Single source of truth for each component
✅ **Scalability** - Easy to add new dashboards
✅ **Type Safety** - Full TypeScript support
✅ **Testing** - Components tested once, work everywhere
✅ **Documentation** - Centralized component documentation
✅ **Performance** - Smaller individual dashboard bundles

