# Proofa Admin Dashboard

Full-featured admin interface for managing Proofa projects, applications, and licenses.

## Features

- **Project Management**: Create, view, edit, and delete projects
- **Member Management**: Manage team members and their roles
- **Application Management**: Manage applications within projects
- **License Management**: Grant, edit, and revoke licenses for applications
- **Activity Tracking**: View audit logs and activity history
- **Settings Management**: Configure admin account and preferences

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm workspace setup (already configured)

### Installation

```bash
# From workspace root
pnpm install

# Install admin dashboard dependencies
pnpm -F @proofa/dashboard-admin install
```

### Environment Setup

1. Copy `.env.example` to `.env.local`:
```bash
cp apps/dashboard/admin/.env.example apps/dashboard/admin/.env.local
```

2. Update `VITE_GATEWAY_URL` if your gateway runs on a different port:
```env
VITE_GATEWAY_URL=http://localhost:3001
```

### Development

Start the development server:

```bash
pnpm -F @proofa/dashboard-admin dev
```

The dashboard will be available at `http://localhost:5174`

### Building

Build for production:

```bash
pnpm -F @proofa/dashboard-admin build
```

Preview the production build:

```bash
pnpm -F @proofa/dashboard-admin preview
```

### Type Checking

Run TypeScript type checking:

```bash
pnpm -F @proofa/dashboard-admin type-check
```

## Project Structure

```
src/
├── main.tsx              # React 18 entry point with QueryClientProvider
├── App.tsx               # Main app layout and routing
├── index.css             # Global Tailwind styles
├── api/
│   └── index.ts          # Gateway API client functions
├── hooks/
│   └── index.ts          # TanStack Query custom hooks
├── types/
│   └── index.ts          # TypeScript type definitions
├── components/
│   ├── Header.tsx        # Top navigation header
│   ├── Sidebar.tsx       # Left sidebar navigation
│   ├── Modal.tsx         # Reusable modal component
│   ├── Button.tsx        # Button variants (primary, secondary, danger, ghost)
│   ├── Form.tsx          # Form helpers (Input, TextArea, Select)
│   └── Table.tsx         # Reusable data table
└── pages/
    ├── Projects.tsx      # Project list and creation
    ├── ProjectDetail.tsx # Project details, members, apps
    ├── AppDetail.tsx     # Application details and licenses
    ├── LicenseManagement.tsx
    └── Settings.tsx      # Admin account settings
```

## API Integration

The dashboard communicates with the Proofa Gateway at the `VITE_GATEWAY_URL` endpoint.

### Available Endpoints

**Projects**
- `GET /admin/projects` - List all projects
- `POST /admin/projects` - Create project
- `GET /admin/projects/:id` - Get project details
- `PATCH /admin/projects/:id` - Update project
- `DELETE /admin/projects/:id` - Delete project

**Members**
- `GET /admin/projects/:id/members` - List project members
- `POST /admin/projects/:id/members` - Add member
- `DELETE /admin/projects/:id/members/:userId` - Remove member

**Applications**
- `GET /admin/projects/:id/apps` - List project apps
- `POST /admin/projects/:id/apps` - Create app
- `PATCH /admin/projects/:id/apps/:appId` - Update app
- `DELETE /admin/projects/:id/apps/:appId` - Delete app

**Licenses**
- `POST /admin/projects/:id/apps/:appId/licenses` - Grant license

**Activity**
- `GET /admin/projects/:id/activity` - Get activity log

## Component Library

### Button Variants

```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="danger">Danger</Button>
<Button variant="ghost">Ghost</Button>
```

### Form Components

```tsx
import { Input, TextArea, Select } from './components/Form';

<Input label="Name" placeholder="..." />
<TextArea label="Description" placeholder="..." />
<Select label="Role" options={[...]} />
```

### Modal

```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
  actions={<Button>Submit</Button>}
>
  Content here
</Modal>
```

### Table

```tsx
<Table
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' }
  ]}
  data={items}
  loading={isLoading}
  onRowClick={(row) => {...}}
/>
```

## Styling

The dashboard uses Tailwind CSS for styling with a custom primary color scheme. Configuration is in `tailwind.config.js`.

### Custom Colors

- Primary: `primary-50` to `primary-900`
- Extends default Tailwind palette

## Development Workflow

1. **Create a feature branch** from main
2. **Implement** pages/components in `src/`
3. **Update hooks** in `src/hooks/index.ts` for data fetching
4. **Add types** to `src/types/index.ts`
5. **Run tests** with `pnpm type-check`
6. **Build** with `pnpm build` to verify no errors
7. **Submit PR** for review

## Troubleshooting

### "Cannot find module '@proofa/shared'"
Make sure the workspace is installed: `pnpm install`

### "VITE_GATEWAY_URL is undefined"
Check `.env.local` exists and contains the correct gateway URL.

### Port 5174 already in use
The dev server will automatically use the next available port. Check the console output.

## Next Steps

- [ ] Implement routing with React Router
- [ ] Add form validation with Zod
- [ ] Implement authentication guards
- [ ] Add error boundaries
- [ ] Create custom hooks for mutations (create, update, delete)
- [ ] Add loading states and error handling
- [ ] Implement search and filtering
- [ ] Add pagination to tables
- [ ] Create notification system
- [ ] Add dark mode support
