# Admin Dashboard v2 Migration Plan

**Goal**: Build fresh admin dashboard using Selia components, porting functionality from existing admin.

**Timeline**: ~3 weeks  
**Status**: 🟡 Planning

---

## 📦 Phase 1: Foundation & Setup (Week 1) ✅ COMPLETED

### 1.1 Project Scaffold ✅
- [x] Create `apps/dashboard/admin-v2/` directory structure
- [x] Copy and configure `package.json` from old admin
- [x] Setup `vite.config.ts` with proper aliases
- [x] Configure `tailwind.config.js` to use @proofa/components
- [x] Setup `tsconfig.json` with path mappings
- [x] Create `index.html` entry point
- [x] Create `src/main.tsx` with providers

### 1.2 Minimal CSS Strategy ✅
- [x] Create `src/index.css` with theme import and Tailwind directives
- [x] Define ONLY layout classes (`.app-layout`, `.sidebar`, `.main-content`)
- [x] Remove all component CSS classes (no `.card`, `.btn-*`, etc.)
- [x] Document: All components must use Selia or Tailwind utilities

### 1.3 Core Dependencies ✅
- [x] Add `@proofa/components` workspace dependency
- [x] Add `@proofa/auth` workspace dependency
- [x] Add `@tanstack/react-query` for state management
- [x] Add `react-router-dom` for routing
- [x] Add `@base-ui/react` (peer dependency)
- [x] Run `pnpm install` to verify all dependencies

### 1.4 Layout Components ✅
- [x] Create `src/layouts/AppLayout.tsx` (Sidebar + Header structure)
- [x] Create `src/layouts/AuthLayout.tsx` (Login page layout)
- [x] Create `src/components/Sidebar.tsx` with navigation
- [x] Create `src/components/Header.tsx` with breadcrumbs & theme toggle
- [x] Create `src/components/ProjectSelector.tsx` dropdown
- [x] Create `src/components/Breadcrumbs.tsx` navigation trail

### 1.5 Routing Setup ✅
- [x] Create `src/App.tsx` with React Router
- [x] Define route structure (auth, projects, apps)
- [x] Setup protected routes with auth check
- [x] Create placeholder pages for all routes
- [x] Add redirect logic for unauthenticated users

**Phase 1 Summary:**
- ✅ Project scaffolding complete
- ✅ Build successful (292 KB bundle size)
- ✅ Zero component CSS classes (layout only)
- ✅ TypeScript strict mode enabled
- ✅ Theme system integrated from @proofa/components
- ✅ Responsive layout with mobile sidebar support
- ✅ Protected routes with auth checks

---

## 🔐 Phase 2: Authentication (Days 1-2)

### 2.1 API Client
- [ ] Create `src/lib/api.ts` with base API functions
- [ ] Configure `src/lib/pingpong.ts` HTTP client
- [ ] Setup gateway URL from environment variables
- [ ] Add error handling middleware
- [ ] Add request/response logging for dev mode

### 2.2 Auth Hooks
- [ ] Create `src/hooks/useAuth.ts` for user session
- [ ] Create `src/hooks/useLogout.ts` for logout logic
- [ ] Setup React Query for auth state management
- [ ] Add session persistence logic

### 2.3 Login Page
- [ ] Port `Login.tsx` from old admin
- [ ] **Replace** custom CSS with Selia components:
  - [ ] Use `Button variant="primary"` for Google OAuth button
  - [ ] Use `Alert variant="danger"` for error messages
  - [ ] Use `Spinner` for loading state
  - [ ] Use Tailwind utilities for layout (`flex`, `items-center`, etc.)
- [ ] Test OAuth flow with Google provider
- [ ] Verify error handling
- [ ] Test responsive design

---

## 📂 Phase 3: Projects Management (Days 3-5)

### 3.1 Project Hooks
- [ ] Create `src/hooks/useProjects.ts` for fetching projects
- [ ] Create `src/hooks/useCreateProject.ts` for creating projects
- [ ] Create `src/hooks/useUpdateProject.ts` for updates
- [ ] Create `src/hooks/useDeleteProject.ts` for deletion
- [ ] Add optimistic updates with React Query

### 3.2 Projects List Page
- [ ] Port `pages/Projects.tsx` logic
- [ ] **Replace** `.card` with Tailwind + Selia:
  - [ ] Use `<div className="bg-background border border-border rounded-lg p-6">`
  - [ ] Use `Button variant="primary"` for "Create Project"
  - [ ] Use `Chip` for project status badges
  - [ ] Use `Spinner` for loading state
- [ ] Add project grid layout with Tailwind
- [ ] Implement search/filter functionality
- [ ] Test empty state display

### 3.3 Create Project Page
- [ ] Port `pages/CreateProject.tsx` form logic
- [ ] **Replace** form elements with Selia:
  - [ ] Use `Input` for text fields
  - [ ] Use `Label` for form labels
  - [ ] Use `Select` for dropdowns
  - [ ] Use `Button variant="primary"` for submit
  - [ ] Use `Button variant="secondary"` for cancel
- [ ] Add form validation
- [ ] Add icon picker component
- [ ] Test form submission

### 3.4 Project Detail Page
- [ ] Port `pages/ProjectDetail.tsx` overview logic
- [ ] Replace stat cards with Tailwind utilities
- [ ] Use `Alert` for notifications
- [ ] Display project metadata
- [ ] Add quick action buttons
- [ ] Test navigation to apps

---

## 🎯 Phase 4: Core App Pages (Days 6-10)

### 4.1 App Hooks
- [ ] Create `src/hooks/useApps.ts` for fetching apps
- [ ] Create `src/hooks/useCreateApp.ts` for app creation
- [ ] Create `src/hooks/useUpdateApp.ts` for updates
- [ ] Create `src/hooks/useDeleteApp.ts` for deletion

### 4.2 Apps List Page (P0)
- [ ] Port `pages/ProjectApps.tsx` logic
- [ ] Replace card grid with Selia components
- [ ] Use `Button` for "Create App"
- [ ] Display app cards with metadata
- [ ] Test navigation to app detail

### 4.3 App Setup Page (P1 - Most Complex)
- [ ] Port `pages/AppSetup.tsx` multi-step form
- [ ] **Simplify** 850 lines → ~400 lines
- [ ] Step 1: Basic Info
  - [ ] Use `Input` for app name
  - [ ] Use `Select` for app type
  - [ ] Use icon picker
- [ ] Step 2: OAuth Providers
  - [ ] Use `Checkbox` for provider selection
  - [ ] Use `Input` for client IDs
  - [ ] Use `Alert` for configuration hints
- [ ] Step 3: Redirect URIs
  - [ ] Use `Input` for URI input
  - [ ] Use dynamic list with add/remove
- [ ] Step 4: Review & Create
  - [ ] Display summary
  - [ ] Use `Button` for submit
- [ ] Add step navigation with progress indicator
- [ ] Test full app creation flow

### 4.4 App Detail Page (P1)
- [ ] Port `pages/AppDetail.tsx` dashboard
- [ ] Display app overview with stats
- [ ] Use `Chip` for status indicators
- [ ] Add quick action buttons
- [ ] Test navigation to sub-pages

### 4.5 API Keys Page (P1)
- [ ] Port `pages/AppApiKeys.tsx` logic
- [ ] Display API keys table
- [ ] Use `Button` for "Generate Key"
- [ ] Use `Dialog` for key generation modal
- [ ] Add copy-to-clipboard functionality
- [ ] Show/hide key with toggle
- [ ] Test key generation and revocation

---

## 👥 Phase 5: User & License Management (Days 11-13)

### 5.1 App Users Page (P2)
- [ ] Port `pages/AppUsers.tsx` logic
- [ ] Display users table with Tailwind
- [ ] Use `Button` for "Invite User"
- [ ] Use `Dialog` for invite modal
- [ ] Use `Input` for email input
- [ ] Add user search/filter
- [ ] Test invite flow

### 5.2 App Licenses Page (P2)
- [ ] Port `pages/AppLicenses.tsx` logic
- [ ] Display licenses table
- [ ] Use `Button` for "Create Plan"
- [ ] Use `Dialog` for plan creation
- [ ] Use `Input` for plan details
- [ ] Add license activation/deactivation
- [ ] Test license management

### 5.3 OAuth Config Page (P2)
- [ ] Port `pages/AppOAuth.tsx` configuration
- [ ] Display OAuth settings form
- [ ] Use `Input` for client IDs/secrets
- [ ] Use `Checkbox` for enabled providers
- [ ] Use `Alert` for security warnings
- [ ] Test OAuth provider updates

### 5.4 Payment Settings Page (P2)
- [ ] Port `pages/AppPaymentSettings.tsx` logic
- [ ] Display payment provider selection
- [ ] Use `Select` for provider dropdown
- [ ] Use `Input` for API keys
- [ ] Use `Alert` for setup instructions
- [ ] Test payment provider connection

---

## 🛠️ Phase 6: Additional Features (Days 14-16)

### 6.1 App Settings Page (P2)
- [ ] Port `pages/AppSettings.tsx` logic
- [ ] General settings form
- [ ] Security settings
- [ ] Danger zone (delete app)
- [ ] Use appropriate Selia components

### 6.2 Project Team Page (P2)
- [ ] Port `pages/ProjectTeam.tsx` logic
- [ ] Display team members table
- [ ] Use `Dialog` for invite modal
- [ ] Add role management
- [ ] Test team operations

### 6.3 Project Settings Page (P2)
- [ ] Port `pages/ProjectSettings.tsx` logic
- [ ] General settings form
- [ ] Danger zone (delete project)
- [ ] Test project updates

### 6.4 Project Stats Page (P3)
- [ ] Port `pages/ProjectStats.tsx` charts
- [ ] Add chart library if needed
- [ ] Display usage metrics
- [ ] Test data visualization

---

## 💰 Phase 7: Billing & Webhooks (Days 17-18)

### 7.1 Billing Dashboard (P3)
- [ ] Port `pages/BillingDashboard.tsx` logic
- [ ] Display subscription status
- [ ] Show usage metrics
- [ ] Add upgrade/downgrade buttons
- [ ] Test billing operations

### 7.2 Webhook Monitoring (P3)
- [ ] Port `pages/WebhookMonitoring.tsx` logic
- [ ] Display webhook events table
- [ ] Add filtering by status
- [ ] Show event details
- [ ] Test webhook log viewing

### 7.3 Refund Processing (P3)
- [ ] Port `pages/RefundProcessing.tsx` logic
- [ ] Display refund requests
- [ ] Add refund approval flow
- [ ] Test refund operations

### 7.4 Transaction Export (P3)
- [ ] Port `pages/TransactionExport.tsx` logic
- [ ] Add export filters
- [ ] Generate CSV/Excel downloads
- [ ] Test export functionality

---

## 🧪 Phase 8: Testing & Polish (Days 19-21)

### 8.1 Component Replacement Audit
- [ ] Scan all files for `.card` usage → should be 0
- [ ] Scan all files for `.btn-` usage → should be 0
- [ ] Scan all files for `.badge` usage → should be 0
- [ ] Verify all components use Selia or Tailwind
- [ ] Check no custom CSS beyond layout

### 8.2 Functionality Testing
- [ ] Test all OAuth flows (Google, GitHub, etc.)
- [ ] Test project CRUD operations
- [ ] Test app CRUD operations
- [ ] Test API key generation
- [ ] Test user invitations
- [ ] Test license management
- [ ] Test payment provider setup
- [ ] Test team management
- [ ] Test webhook monitoring
- [ ] Test billing operations

### 8.3 Responsive Design
- [ ] Test mobile layout (< 768px)
- [ ] Test tablet layout (768px - 1024px)
- [ ] Test desktop layout (> 1024px)
- [ ] Fix any layout issues

### 8.4 Accessibility
- [ ] Test keyboard navigation
- [ ] Verify ARIA labels
- [ ] Test screen reader compatibility
- [ ] Ensure proper focus indicators

### 8.5 Dark Mode
- [ ] Test all pages in dark mode
- [ ] Verify theme persistence
- [ ] Fix any contrast issues

### 8.6 Performance
- [ ] Measure bundle size (should be smaller than v1)
- [ ] Check for unnecessary re-renders
- [ ] Optimize images and assets
- [ ] Test loading performance

---

## 🚀 Phase 9: Deployment (Day 22)

### 9.1 Preparation
- [ ] Update environment variables
- [ ] Update CI/CD configuration
- [ ] Create deployment documentation
- [ ] Update README

### 9.2 Cutover
- [ ] Backup database (if needed)
- [ ] Rename `admin` → `admin-v1-backup`
- [ ] Rename `admin-v2` → `admin`
- [ ] Update workspace references
- [ ] Update pnpm-workspace.yaml

### 9.3 Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Monitor for errors

### 9.4 Cleanup
- [ ] Delete `admin-v1-backup` folder after 2 weeks
- [ ] Remove old CSS files
- [ ] Remove deprecated components
- [ ] Update documentation

---

## � Selia Reference Code Blocks

### Dashboard Layout with Sidebar

**Reference**: `nauvalazhar/selia/components/blocks/dashboard/layout.tsx`

```tsx
// Complete dashboard layout pattern from Selia
export function Layout({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const windowResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    windowResize();
    window.addEventListener('resize', windowResize);
    return () => window.removeEventListener('resize', windowResize);
  }, []);

  function handleSidebarOpen() {
    setSidebarOpen(!sidebarOpen);
  }

  return (
    <>
      {/* Backdrop overlay for mobile */}
      <div
        className={cn(
          'fixed inset-0 bg-black backdrop-blur-sm z-10 transition-all',
          'max-lg:block hidden',
          sidebarOpen ? 'opacity-40 visible' : 'opacity-0 invisible',
        )}
        onClick={handleSidebarOpen}
      />
      
      {/* Sidebar container */}
      <div
        className={cn(
          'fixed top-0 z-50 w-full max-w-72 md:w-72 h-dvh *:h-full transition-all',
          sidebarOpen ? 'left-0' : '-left-full',
        )}
      >
        {sidebar}
      </div>
      
      {/* Main content area */}
      <main
        className={cn('transition-all', sidebarOpen ? 'xl:ml-72' : 'xl:ml-0')}
      >
        {/* Top navigation bar */}
        <nav
          className={cn(
            'h-16 flex items-center gap-2.5 max-lg:px-4',
            sidebarOpen ? 'xl:pr-4' : 'xl:px-4',
          )}
        >
          <Button
            variant="secondary-plain"
            size="sm-icon"
            onClick={handleSidebarOpen}
          >
            {sidebarOpen ? <SidebarCloseIcon /> : <SidebarOpenIcon />}
          </Button>
          <Heading size="sm">Dashboard</Heading>
        </nav>
        
        {/* Page content */}
        <div
          className={cn(
            'min-h-[calc(100vh-4rem)] flex flex-col gap-6 max-lg:px-4 pb-6',
            sidebarOpen ? 'xl:pr-4' : 'xl:px-4',
          )}
        >
          {children}
        </div>
      </main>
    </>
  );
}
```

### Sidebar Component Structure

**Reference**: `nauvalazhar/selia/components/blocks/dashboard/app-sidebar.tsx`

```tsx
// Complete sidebar pattern from Selia
export function AppSidebar() {
  return (
    <Sidebar
      size="loose"
      className="bg-background xl:bg-transparent max-lg:border-r border-border"
    >
      {/* Logo and search */}
      <SidebarHeader>
        <SidebarLogo>
          <img src="/selia.png" alt="Selia" className="size-8" />
          <span className="font-semibold">Selia</span>
        </SidebarLogo>
        <InputGroup className="mt-4">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <Input placeholder="Search" />
          <InputGroupAddon align="end">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        </InputGroup>
      </SidebarHeader>
      
      {/* Navigation menu */}
      <SidebarContent>
        <SidebarMenu>
          <SidebarGroup>
            <SidebarGroupTitle>Navigation</SidebarGroupTitle>
            <SidebarList>
              <SidebarItem>
                <SidebarItemButton active>
                  <HomeIcon />
                  Dashboard
                </SidebarItemButton>
              </SidebarItem>
              <SidebarItem>
                <SidebarItemButton>
                  <ShoppingBagIcon />
                  Products
                </SidebarItemButton>
              </SidebarItem>
              
              {/* Collapsible submenu */}
              <SidebarCollapsible>
                <SidebarCollapsibleTrigger
                  render={
                    <SidebarItemButton>
                      <ChartAreaIcon />
                      Reports
                    </SidebarItemButton>
                  }
                />
                <SidebarCollapsiblePanel>
                  <SidebarSubmenu>
                    <SidebarList>
                      <SidebarItem>
                        <SidebarItemButton>Sales</SidebarItemButton>
                      </SidebarItem>
                      <SidebarItem>
                        <SidebarItemButton>Traffic</SidebarItemButton>
                      </SidebarItem>
                    </SidebarList>
                  </SidebarSubmenu>
                </SidebarCollapsiblePanel>
              </SidebarCollapsible>
            </SidebarList>
          </SidebarGroup>
        </SidebarMenu>
      </SidebarContent>
      
      {/* User profile in footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarList>
            <SidebarItem>
              <Menu>
                <MenuTrigger
                  data-slot="sidebar-item-button"
                  nativeButton={false}
                  render={
                    <SidebarItemButton className="border border-border">
                      <Avatar>
                        <AvatarImage src="/user.jpg" alt="Avatar" />
                        <AvatarFallback>AT</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">Anna Thompson</span>
                        <span className="text-sm text-muted">
                          anna@example.com
                        </span>
                      </div>
                      <ChevronsUpDownIcon className="ml-auto" />
                    </SidebarItemButton>
                  }
                />
                <MenuPopup className="w-(--anchor-width)" side="top">
                  <MenuItem>
                    <UserIcon />
                    Profile
                  </MenuItem>
                  <MenuItem>
                    <SettingsIcon />
                    Settings
                  </MenuItem>
                  <MenuItem>
                    <LogOutIcon />
                    Logout
                  </MenuItem>
                </MenuPopup>
              </Menu>
            </SidebarItem>
          </SidebarList>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
```

### Login Card Pattern

**Reference**: `nauvalazhar/selia/components/blocks/login.tsx`

```tsx
// Complete login card pattern from Selia
export default function LoginBlock() {
  const [pending, setPending] = useState(false);

  return (
    <div className="w-full lg:h-screen flex items-center justify-center p-4">
      <Card className="w-full lg:w-5/12 xl:w-md">
        <CardHeader align="center">
          <CardTitle>Sign in to your account</CardTitle>
          <CardDescription>
            Login with your Google or GitHub account
          </CardDescription>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          {/* OAuth buttons */}
          <div className="flex flex-col gap-2.5">
            <Button variant="secondary" block size="lg">
              <GoogleIcon />
              Login with Google
            </Button>
            <Button variant="secondary" block size="lg">
              <GitHubIcon />
              Login with GitHub
            </Button>
          </div>
          
          {/* Divider */}
          <Divider variant="center" className="my-2">
            Or continue with email
          </Divider>
          
          {/* Email/password form */}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" placeholder="Enter your email" />
          </Field>
          <Field>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <TextLink href="#" className="ml-auto">
                Forgot password?
              </TextLink>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
            />
          </Field>
          
          {/* Submit button with loading state */}
          <Button
            variant="primary"
            block
            size="lg"
            progress={pending}
            onClick={() => {
              setPending(true);
              setTimeout(() => setPending(false), 2000);
            }}
          >
            Sign In
          </Button>
          
          {/* Sign up link */}
          <Text className="text-center">
            Don't have an account? <TextLink href="#">Sign up</TextLink>
          </Text>
        </CardBody>
      </Card>
    </div>
  );
}
```

### Form with Card Pattern

**Reference**: `nauvalazhar/selia/components/examples/card/basic.tsx`

```tsx
// Card with form fields pattern
export default function CardExample() {
  return (
    <Card className="2xl:w-8/12 xl:w-10/12 w-full">
      <CardHeader>
        <CardTitle>User Settings</CardTitle>
      </CardHeader>
      <CardBody>
        <Fieldset>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input placeholder="Enter your name" />
          </Field>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input placeholder="Enter your email" />
          </Field>
          <Field>
            <FieldLabel>Password</FieldLabel>
            <Input placeholder="Enter your password" />
          </Field>
        </Fieldset>
        <Button variant="primary" size="lg" block className="mt-6">
          Save Changes
        </Button>
      </CardBody>
    </Card>
  );
}
```

### Team/User List Card

**Reference**: `nauvalazhar/selia/components/examples/card/team-card.tsx`

```tsx
// List of items with avatars in a card
export default function TeamCardExample() {
  return (
    <Card className="w-full xl:w-8/12">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>Members can access this workspace.</CardDescription>
      </CardHeader>
      <CardBody>
        <Stack>
          <Item variant="plain">
            <ItemMedia>
              <Avatar>
                <AvatarImage src="/user1.jpg" alt="Avatar" />
                <AvatarFallback>JR</AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Jane Randy</ItemTitle>
              <ItemDescription>jane@example.com</ItemDescription>
            </ItemContent>
            <ItemAction>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </ItemAction>
          </Item>
          <Separator />
          <Item variant="plain">
            <ItemMedia>
              <Avatar>
                <AvatarImage src="/user2.jpg" alt="Avatar" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Andy Daniel</ItemTitle>
              <ItemDescription>andy@example.com</ItemDescription>
            </ItemContent>
            <ItemAction>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </ItemAction>
          </Item>
        </Stack>
      </CardBody>
    </Card>
  );
}
```

### Contact Form with Sections

**Reference**: `nauvalazhar/selia/components/blocks/contact.tsx`

```tsx
// Multi-column form layout pattern
export default function ContactBlock() {
  return (
    <div className="flex flex-wrap lg:flex-nowrap gap-6">
      {/* Info section */}
      <div className="w-full lg:w-5/12">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <IconBox variant="primary-subtle" circle>
              <MailIcon />
            </IconBox>
            <div>
              <Heading level={4} size="sm">
                Email
              </Heading>
              <Text className="text-dimmed">hello@example.com</Text>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <IconBox variant="primary-subtle" circle>
              <PhoneIcon />
            </IconBox>
            <div>
              <Heading level={4} size="sm">
                Phone
              </Heading>
              <Text className="text-dimmed">+1 (123) 456-7890</Text>
            </div>
          </div>
        </div>
      </div>
      
      {/* Form section */}
      <Card className="w-full">
        <CardHeader align="center">
          <CardTitle>Send us a message</CardTitle>
          <CardDescription>We'll respond as soon as we can.</CardDescription>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <Form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-5">
              <Field>
                <FieldLabel htmlFor="first-name">First Name</FieldLabel>
                <Input id="first-name" placeholder="John" required />
                <FieldError match="valueMissing">This is required</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
                <Input id="last-name" placeholder="Doe" required />
                <FieldError match="valueMissing">This is required</FieldError>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="message">Message</FieldLabel>
              <Textarea
                id="message"
                placeholder="Your message"
                rows={4}
                required
              />
              <FieldError match="valueMissing">This is required</FieldError>
            </Field>
            <Button type="submit" block>
              Send Message
            </Button>
          </Form>
        </CardBody>
      </Card>
    </div>
  );
}
```

### Stat Cards Grid

**Reference**: `nauvalazhar/selia/components/blocks/dashboard/page.tsx`

```tsx
// Dashboard stat cards pattern
export default function Dashboard() {
  return (
    <Layout sidebar={<AppSidebar />}>
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<ShoppingBagIcon />}
          title="Total Sales"
          value="$12,340"
          change="+8.2%"
          changeType="increase"
        />
        <StatCard
          icon={<Users2Icon />}
          title="Customers"
          value="3,210"
          change="+4.1%"
          changeType="increase"
        />
        <StatCard
          icon={<Package2Icon />}
          title="Orders"
          value="1,520"
          change="-2.3%"
          changeType="decrease"
        />
        <StatCard
          icon={<TagsIcon />}
          title="Revenue"
          value="$24,580"
          change="+6.9%"
          changeType="increase"
        />
      </div>
      
      {/* Content cards */}
      <div className="flex gap-4 lg:flex-nowrap flex-wrap">
        <div className="w-full lg:w-8/12">
          <Chart />
        </div>
        <div className="w-full lg:w-4/12">
          <Card>
            <CardHeader>
              <CardTitle>Best Selling</CardTitle>
            </CardHeader>
            <CardBody>
              {/* Product list */}
            </CardBody>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
```

---

## �📊 Success Metrics

### Code Quality
- [ ] Zero custom CSS classes (`.card`, `.btn-*`, etc.)
- [ ] 100% Selia component usage for UI primitives
- [ ] < 100 lines of custom CSS (layout only)
- [ ] No TypeScript errors
- [ ] No ESLint warnings

### Bundle Size
- [ ] Admin v2 bundle < Admin v1 bundle
- [ ] CSS bundle < 50KB
- [ ] JavaScript bundle < 500KB

### User Experience
- [ ] All 26 pages functional
- [ ] No visual regressions
- [ ] < 2s page load time
- [ ] Mobile-responsive

---

## 🎓 Key Learnings

### What to Keep from Old Admin
- [ ] API integration patterns
- [ ] Authentication flow
- [ ] Form validation logic
- [ ] Business logic and data transformations
- [ ] Error handling patterns

### What to Discard
- [ ] 1,628 lines of custom CSS
- [ ] Legacy component wrappers (LegacyButton, Badge, Card)
- [ ] Inline styles where Tailwind suffices
- [ ] Custom modal/dialog implementations
- [ ] Custom dropdown implementations

### Selia Adoption Principles
- [ ] Always use Selia `Button` instead of custom buttons
- [ ] Always use Selia `Input` instead of custom inputs
- [ ] Always use Selia `Select` instead of custom dropdowns
- [ ] Always use Selia `Dialog` instead of custom modals
- [ ] Always use Selia `Alert` instead of custom alerts
- [ ] Always use Tailwind utilities for layout
- [ ] Only write CSS for layout scaffold

---

## 📝 Notes

### Architecture Decisions
- **No CSS classes for components**: Use Selia components or Tailwind utilities directly
- **Atomic design**: Build pages from Selia primitives
- **Minimal custom CSS**: < 100 lines, layout only
- **Type-safe**: Full TypeScript from day 1
- **Performance**: Code-splitting by route

### Component Mapping Reference
| Old Pattern | New Pattern |
|-------------|-------------|
| `className="card"` | `className="bg-background border border-border rounded-lg p-6"` |
| `className="btn btn-primary"` | `<Button variant="primary">` |
| `className="btn btn-secondary"` | `<Button variant="secondary">` |
| `className="btn btn-danger"` | `<Button variant="danger">` |
| `className="badge"` | `<Chip>` |
| `className="alert alert-danger"` | `<Alert variant="danger">` |
| `className="loading"` | `<Spinner />` |
| Custom input | `<Input />` |
| Custom select | `<Select>` with `<SelectItem>` |
| Custom modal | `<Dialog>` with `<DialogPopup>` |

---

## 🐛 Known Issues to Address

- [ ] Icon component exports need verification
- [ ] Theme persistence across page reloads
- [ ] Custom components (FormGroup, Loading) need Selia migration
- [ ] Legacy Button/Badge exports create confusion
- [ ] Toast notifications need Selia integration

---

## ✅ Completion Checklist

- [ ] All 26 pages migrated
- [ ] Zero custom component CSS classes
- [ ] Bundle size smaller than v1
- [ ] All tests passing
- [ ] Deployed to production
- [ ] Old admin backup removed
- [ ] Documentation updated
- [ ] Team trained on new patterns

---

**Last Updated**: January 24, 2026  
**Status**: Ready to start Phase 1
