# @proofa/components - UI Component Library

## Overview

The `@proofa/components` package is a centralized, reusable component library for Proofa dashboards. It exports:

- **Selia Design System**: 52 production-ready UI primitives (Button, Card, Badge, Input, Table, Dialog, etc.)
- **Icon System**: 57+ icons from HugeIcons + brand logos (Google, GitHub, Stripe, NextJS, React, etc.)
- **11 Proofa Composite Components**: Built on Selia for Proofa-specific use cases
- **Type-Safe**: Full TypeScript support with proper interfaces
- **Theme-Aware**: Supports light/dark modes using CSS variables
- **Compound Components**: Support for complex component hierarchies (LoginCard, FormGroup)
- **Well-Organized**: Categorized structure for easy navigation and scalability

> **Note:** This package uses Selia as the base design system. All Selia components are re-exported from `@proofa/components` for convenience.

## Package Structure

```
src/
├── base/                   # Selia primitives (52 components)
│   ├── forms/             # Input, Select, Checkbox, etc. (15)
│   ├── layout/            # Card, Dialog, Sidebar, etc. (9)
│   ├── display/           # Table, Tabs, Menu, etc. (11)
│   ├── feedback/          # Button, Badge, Alert, etc. (13)
│   └── typography/        # Heading, Text, Kbd (4)
├── components/             # Proofa composites (11)
│   ├── auth/              # Authentication components
│   ├── display/           # Display components
│   ├── forms/             # Form components
│   └── feedback/          # Feedback components
├── icons/                  # Icon system
├── lib/                    # Utilities (cn)
└── styles/                 # CSS files
```

---

## Installation

```bash
pnpm add @proofa/components
```

---

## Component Inventory

### Selia UI Components (52 Components)

For basic UI components, use Selia components directly. They're automatically available from `@proofa/components`:

```tsx
import {
  Button, Card, Badge, Input, Label, Textarea, Select,
  Table, Dialog, Alert, Spinner, Tabs, Menu, Avatar,
  // ... and 38 more components
} from '@proofa/components';

// Button - Multiple variants
<Button variant="primary">Save</Button>
<Button variant="danger" size="sm">Delete</Button>
<Button variant="outline" pill>Outline</Button>

// Card - Compound component
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardBody>Content</CardBody>
  <CardFooter>Footer actions</CardFooter>
</Card>

// Badge - Status indicators
<Badge variant="success">Active</Badge>
<Badge variant="danger" size="lg">Error</Badge>
<Chip variant="primary">Tag</Chip>
```

**See Selia documentation for all 52 components:**
- Forms: Input, Textarea, Select, Checkbox, Radio, Switch, Field, Label
- Layout: Card, Stack, Sidebar, Dialog, Popover, Tooltip, Divider
- Display: Table, Tabs, Accordion, Breadcrumb, Menu, Pagination
- Feedback: Alert, Spinner, Progress, Toast
- And more...

---

### Proofa Composite Components (11 Components)

These are Proofa-specific components built on top of Selia primitives:

#### 1. **LoginCard** (Compound)
- `Card` - Container
- `CardHeader` - Header with border
- `CardTitle` - Title text
- `CardBody` - Content area

---

#### 2. **LoginCard** (Compound)
Specialized login form container with loading/error states.

```tsx
import { 
  LoginCard, 
  LoginCardLogo, 
  LoginCardTitle, 
  LoginCardSubtitle,
  LoginCardBody, 
  LoginCardTerms, 
  LoginCardError 
} from '@proofa/components';

<LoginCard error="Invalid credentials" loading={isLoading}>
  <LoginCardLogo>
    <img src="/logo.png" alt="Logo" />
  </LoginCardLogo>
  <LoginCardTitle>Sign In</LoginCardTitle>
  <LoginCardSubtitle>Enter your credentials</LoginCardSubtitle>
  <LoginCardBody>
    {/* Form fields */}
  </LoginCardBody>
  <LoginCardTerms>
    By signing in, you agree to our Terms of Service
  </LoginCardTerms>
</LoginCard>
```

**Subcomponents**:
- `LoginCard` - Container (handles error + loading overlay)
- `LoginCardLogo` - Logo section
- `LoginCardTitle` - Main title
- `LoginCardSubtitle` - Subtitle text
- `LoginCardBody` - Form content area
- `LoginCardTerms` - Terms text
- `LoginCardError` - Error message (auto-rendered in `LoginCard`)

---

#### 3. **FormGroup** (Compound)
Form field wrapper with label, input, and hint text.

```tsx
import { FormGroup, FormLabel, FormInput, FormHint } from '@proofa/components';

<FormGroup>
  <FormLabel required>Email</FormLabel>
  <FormInput 
    type="email" 
    placeholder="user@example.com"
    defaultValue={email}
  />
  <FormHint error={hasError}>
    {hasError ? 'Invalid email' : 'We\'ll never share your email'}
  </FormHint>
</FormGroup>
```

**Subcomponents**:
- `FormGroup` - Container
- `FormLabel` - Label with optional required indicator
- `FormInput` - Input field with focus states
- `FormHint` - Help text (error or info state)

---

#### 4. **Loading**
Loading spinner with optional text.

```tsx
import { Loading } from '@proofa/components';

// Just spinner
<Loading />

// With text
<Loading text="Loading..." />

// Different sizes
<Loading size="sm" />
<Loading size="md" />
<Loading size="lg" />
```

**Props**:
- `size?: 'sm' | 'md' | 'lg'` - Spinner size
- `text?: string` - Optional loading text
- `className?: string` - Additional CSS

---

---

#### 5. **AuthLoginCard**
Modern authentication card with OAuth support (built on LoginCard).

```tsx
import { AuthLoginCard } from '@proofa/components';

<AuthLoginCard
  logoSrc="/logo.png"
  title="Welcome to Proofa"
  subtitle="Sign in to continue"
  errorMessage={error}
  buttonLabel="Sign in with Google"
  buttonVariant="primary"
  buttonIcon="google"
  onAuthClick={() => window.location.href = '/auth/google'}
/>
```

**Props**:
- `logoSrc?: string` - Logo image URL
- `title?: string` - Card title
- `subtitle?: string` - Subtitle text
- `errorMessage?: string` - Error message to display
- `buttonLabel?: string` - Auth button text
- `buttonVariant?: string` - Button variant
- `buttonIcon?: IconType` - Icon for button
- `onAuthClick?: () => void` - Auth button click handler

---

### Data Display Components

These components handle common data display patterns.

#### 6. **EmptyState**
Empty state display with icon, title, description, and optional action.

```tsx
import { EmptyState } from '@proofa/components';
import { Button } from '@proofa/components';

<EmptyState
  icon="InformationCircleIcon"
  title="No sessions"
  description="You have no active sessions"
  action={<Button>Create Session</Button>}
/>
```

**Props**:
- `icon?: IconTypeName` - HugeIcon to display
- `title: string` - Main text
- `description?: string` - Optional description
- `action?: ReactNode` - Optional CTA button

---

#### 7. **InfoGrid**
4-column key-value grid for displaying metadata.

```tsx
import { InfoGrid } from '@proofa/components';

<InfoGrid
  columns={4}
  items={[
    { label: 'Status', value: 'Active' },
    { label: 'Created', value: '2024-01-15' },
    { label: 'Users', value: '42' },
    { label: 'Usage', value: '2.5 GB' },
  ]}
/>
```

**Props**:
- `items: Array<{ label: string; value: ReactNode }>` - Data items
- `columns?: number` - Grid columns (1-4)

---

#### 8. **ProfileHeader**
User profile header with name, email, and optional meta.

```tsx
import { ProfileHeader } from '@proofa/components';

<ProfileHeader
  name="John Doe"
  email="john@example.com"
  meta="Member since January 2024"
  avatar={<img src="/avatar.jpg" alt="John" className="w-16 h-16 rounded-full" />}
/>
```

**Props**:
- `name: string` - User name
- `email: string` - User email
- `meta?: string` - Optional metadata
- `avatar?: ReactNode` - Optional avatar element

---

#### 9. **InfoList**
Detailed information list with labels, descriptions, and values.

```tsx
import { InfoList } from '@proofa/components';

<InfoList
  items={[
    { 
      label: 'Email', 
      description: 'Used for sign in',
      value: 'user@example.com' 
    },
    { 
      label: '2FA', 
      description: 'Two-factor authentication',
      value: 'Disabled' 
    },
  ]}
/>
```

**Props**:
- `items: InfoListItemProps[]` - Array of items with label, description, value

---

### Specialized Components

These are purpose-built for specific dashboard features.

#### 10. **SessionCard**
Current session display with metadata and action buttons.

```tsx
import { SessionCard } from '@proofa/components';
import { Button } from '@proofa/components';

<SessionCard
  title="Current Session"
  isCurrent={true}
  metadata={[
    { label: 'IP Address', value: '192.168.1.1' },
    { label: 'Location', value: 'New York' },
    { label: 'Device', value: 'Chrome' },
    { label: 'Last Active', value: 'Now' },
  ]}
  action={<Button variant="danger" size="sm">Sign Out</Button>}
/>
```

**Props**:
- `title: string` - Session name/description
- `isCurrent?: boolean` - Highlight as current session
- `metadata: Array<{ label, value }>` - Session info grid
- `action?: ReactNode` - Optional action button

---

#### 11. **StatusDot**
Small visual status indicator (colored dot + label).

```tsx
import { StatusDot } from '@proofa/components';

<StatusDot variant="success" label="Active" />
<StatusDot variant="danger" label="Inactive" />
<StatusDot variant="info" label="Pending" />
```

**Props**:
- `variant?: 'success' | 'danger' | 'info' | 'warning' | 'neutral'` - Color
- `label?: string` - Optional text label

---

## Icon System

Access 57+ icons from HugeIcons or brand logos.

```tsx
import { Icon } from '@proofa/components';

// HugeIcons (all have "Icon" suffix)
<Icon icon="UserIcon" size={24} />
<Icon icon="SettingsIcon" size={24} bold />
<Icon icon="HomeIcon" size={20} />

// Brand logos
<Icon icon="Google" size={24} />
<Icon icon="GitHub" size={24} />
<Icon icon="Stripe" size={24} />
<Icon icon="NextJS" size={24} />
<Icon icon="React" size={24} />

// Available icons:
// Brands: Google, GitHub, Stripe, NextJS, React, JavaScript, Flutter, NodeJS, 
//         Tailwind, TypeScript, Python, PostgreSQL, MongoDB, AWS, Vercel, Figma
//
// HugeIcons: UserIcon, SettingsIcon, HomeIcon, Add, Cancel01Icon, 
//           Lock, KeyIcon, SecurityCheckIcon, CheckCircle, ... (40+ more)
```

**Props**:
- `icon: IconTypeName` - Icon name
- `size?: number` - Icon size in pixels (default: 20)
- `bold?: boolean` - Bold stroke weight
- `color?: string` - SVG color
- `className?: string` - CSS classes

---

## Usage Examples

### Complete Login Page

```tsx
import {
  LoginCard,
  LoginCardLogo,
  LoginCardTitle,
  LoginCardSubtitle,
  LoginCardBody,
  LoginCardTerms,
  FormGroup,
  FormLabel,
  FormInput,
  FormHint,
  Button,
} from '@proofa/components';
import { Icon } from '@proofa/components';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    try {
      // API call
      setError('');
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
      <LoginCard error={error} loading={loading}>
        <LoginCardLogo>
          <Icon icon="Google" size={32} />
        </LoginCardLogo>
        <LoginCardTitle>Sign In to Proofa</LoginCardTitle>
        <LoginCardSubtitle>Enter your email to continue</LoginCardSubtitle>

        <LoginCardBody>
          <FormGroup>
            <FormLabel required>Email Address</FormLabel>
            <FormInput
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormHint>We'll send you a verification code</FormHint>
          </FormGroup>

          <Button
            variant="primary"
            className="w-full"
            loading={loading}
            onClick={handleLogin}
          >
            Continue
          </Button>
        </LoginCardBody>

        <LoginCardTerms>
          By signing in, you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </a>
        </LoginCardTerms>
      </LoginCard>
    </div>
  );
}
```

### Profile Page with Sessions

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  ProfileHeader,
  Badge,
  SessionCard,
  Button,
  EmptyState,
} from '@proofa/components';

export function ProfilePage() {
  const user = {
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active',
  };

  const sessions = [
    {
      id: 1,
      title: 'Chrome on macOS',
      isCurrent: true,
      metadata: [
        { label: 'IP', value: '192.168.1.1' },
        { label: 'Location', value: 'NYC' },
        { label: 'Last Active', value: 'Now' },
      ],
    },
    {
      id: 2,
      title: 'Safari on iPhone',
      isCurrent: false,
      metadata: [
        { label: 'IP', value: '203.0.113.42' },
        { label: 'Location', value: 'NYC' },
        { label: 'Last Active', value: '2h ago' },
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* User Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <Button size="sm">Edit</Button>
        </CardHeader>
        <CardBody>
          <ProfileHeader
            name={user.name}
            email={user.email}
            meta={`Status: ${user.status}`}
            avatar={<div className="w-16 h-16 bg-gray-300 rounded-full" />}
          />
        </CardBody>
      </Card>

      {/* Sessions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <Badge variant="info">{sessions.length} active</Badge>
        </CardHeader>
        <CardBody className="space-y-3">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                title={session.title}
                isCurrent={session.isCurrent}
                metadata={session.metadata}
                action={<Button variant="danger" size="sm">Sign Out</Button>}
              />
            ))
          ) : (
            <EmptyState
              title="No active sessions"
              description="Your session history is empty"
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
```

---

## Styling & Theming

All components use CSS variables from `@proofa/components/styles/theme.css`:

### Light Theme (Default)
```css
--primary: #3b82f6 (blue-600)
--bg-primary: #ffffff (white)
--text-primary: #111827 (gray-900)
--border-color: #e5e7eb (gray-200)
```

### Dark Theme
```css
[data-theme="dark"] {
  --bg-primary: #111827 (gray-900)
  --text-primary: #f3f4f6 (gray-100)
  --border-color: #374151 (gray-700)
}
```

All components respect these variables automatically.

---

## Migration Guide: Using Components in Dashboards

### Before (CSS-heavy)
```tsx
export function Profile() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Profile</h3>
      </div>
      <div className="card-body">
        {/* Content */}
      </div>
    </div>
  );
}
```

### After (Component-based)
```tsx
import { Card, CardHeader, CardTitle, CardBody } from '@proofa/components';

export function Profile() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardBody>
        {/* Content */}
      </CardBody>
    </Card>
  );
}
```

---

## Build Status

✅ All 12 components compile successfully  
✅ TypeScript strict mode compatible  
✅ Zero external component dependencies (only HugeIcons)  
✅ Tree-shakeable exports  

```bash
pnpm build --filter @proofa/components
# ✓ 1 successful task
```

---

## Next Steps

1. **Migrate User Dashboard** → Import components from `@proofa/components`
2. **Migrate Admin Dashboard** → Use same component library
3. **Remove Duplicate CSS** → Delete component styles from `dashboard/*/src/index.css`
4. **Extract Shared Utilities** → Create reusable helper hooks/functions
5. **Add Storybook** → Interactive component documentation (optional)

---

## File Structure

```
apps/packages/components/
├── src/
│   ├── components/
│   │   ├── icons.tsx              (57+ icons)
│   │   └── ui/
│   │       ├── Badge/             (Phase 1)
│   │       ├── Button/            (Phase 1)
│   │       ├── Card/              (Phase 1)
│   │       ├── LoginCard/         (Phase 1)
│   │       ├── FormGroup/         (Phase 1)
│   │       ├── Loading/           (Phase 1)
│   │       ├── EmptyState/        (Phase 2)
│   │       ├── InfoGrid/          (Phase 2)
│   │       ├── ProfileHeader/     (Phase 2)
│   │       ├── InfoList/          (Phase 2)
│   │       ├── SessionCard/       (Phase 3)
│   │       └── StatusDot/         (Phase 3)
│   ├── utils/
│   │   └── cn.ts                  (classname utils)
│   └── index.ts                   (main exports)
├── package.json
├── tsconfig.json
└── README.md
```

---

**Status**: ✅ Complete  
**Last Updated**: January 2025  
**Maintainers**: Proofa Core Team
