# @proofa/dashboard-user

A minimal, clean account management UI for Proofa end users. Built with Vite, React 18, and Tailwind CSS.

## Features

- **Profile Management**: View and manage user account information
- **Linked Identities**: Display and manage OAuth provider connections (Google, GitHub)
- **Active Sessions**: View and manage active sessions across devices
- **Responsive Design**: Clean, minimal UI with Tailwind CSS
- **Real-time Data**: TanStack Query for efficient data fetching and caching

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
cd apps/dashboard/user
pnpm install
```

### Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Update `VITE_GATEWAY_URL` if the gateway is running on a different port:

```env
VITE_GATEWAY_URL=http://localhost:3001
```

### Development

Start the development server:

```bash
pnpm dev
```

The app will open at `http://localhost:5173`

### Build

Build for production:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

### Type Checking

Run TypeScript type checking:

```bash
pnpm type-check
```

## Project Structure

```
src/
├── main.tsx              # React 18 root with QueryClientProvider
├── App.tsx               # Main app component with navigation
├── index.css             # Tailwind CSS styles
├── api/
│   └── index.ts          # Gateway API client functions
├── hooks/
│   └── index.ts          # TanStack Query custom hooks
├── components/
│   ├── Header.tsx        # Top navigation bar
│   ├── Sidebar.tsx       # Side navigation menu
│   └── LoadingSpinner.tsx # Loading state component
└── pages/
    ├── Profile.tsx       # User profile page
    ├── Identities.tsx    # Linked OAuth providers page
    └── Sessions.tsx      # Active sessions management page
```

## API Integration

The dashboard communicates with the Proofa Gateway API:

### API Endpoints

- `GET /me` - Get current user info
- `GET /profile` - Get user profile details
- `PATCH /profile` - Update profile
- `GET /sessions` - List active sessions
- `DELETE /sessions/:id` - Delete a session
- `POST /logout` - Logout user

All requests include credentials (cookies) by default.

## Dependencies

### Runtime

- **react**: ^18.2.0 - UI framework
- **react-dom**: ^18.2.0 - DOM rendering
- **@tanstack/react-query**: ^5.0.0 - Data fetching and caching
- **@proofa/shared**: workspace package - Shared utilities

### Development

- **vite**: ^5.0.0 - Build tool
- **@vitejs/plugin-react**: ^4.2.0 - React support for Vite
- **tailwindcss**: ^3.3.0 - Utility CSS framework
- **postcss**: ^8.4.31 - CSS processing
- **autoprefixer**: ^10.4.16 - Vendor prefixing
- **typescript**: ^5.3.0 - Type safety
- **@types/react**: ^18.2.0 - React type definitions
- **@types/react-dom**: ^18.2.0 - React DOM type definitions

## Component Details

### Header

Displays the Proofa branding, current user email, and logout button.

### Sidebar

Navigation menu with icons for:
- Profile
- Linked Identities
- Active Sessions

Highlights the current active page.

### Pages

#### Profile

Shows user information:
- Email
- Name
- Avatar (if available)
- Account creation date

#### Identities

Displays linked OAuth providers with:
- Provider name and logo
- Connected email
- Connection date
- Option to unlink (future feature)

#### Sessions

Lists active sessions with:
- Device/user agent info
- IP address
- Creation date
- Last activity date
- Option to delete session

### LoadingSpinner

Simple animated spinner displayed while data is loading.

## Styling

Built entirely with Tailwind CSS. Customization available in `tailwind.config.js`.

Default theme includes:
- Gray color palette for main UI
- Blue accents for active states
- Red for destructive actions

## Future Enhancements

- Profile editing form
- OAuth provider linking/unlinking
- Session device information display
- Dark mode support
- Mobile-optimized navigation
