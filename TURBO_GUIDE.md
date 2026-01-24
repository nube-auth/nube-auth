# Turbo Monorepo Guide

## ✅ Setup Complete

Turborepo is installed and configured for your Proofa monorepo with:
- **Version**: 2.7.3
- **UI Mode**: TUI (terminal user interface)
- **Concurrency**: 20 parallel tasks
- **Caching**: Enabled for build, test, lint, typecheck tasks

---

## 📦 Workspace Structure

```
proofa-core/
├── apps/
│   ├── dashboard/
│   │   ├── admin/           @proofa/dashboard-admin
│   │   ├── admin-v2/        @proofa/dashboard-admin-v2
│   │   ├── user/            @proofa/dashboard-user
│   │   ├── home/            @proofa/dashboard-home
│   │   └── docs/            @proofa/dashboard-docs
│   ├── packages/
│   │   ├── auth/            @proofa/auth
│   │   ├── cache/           @proofa/cache
│   │   ├── client/          @proofa/client
│   │   ├── components/      @proofa/components (Selia UI)
│   │   ├── db/              @proofa/db
│   │   ├── queue/           @proofa/queue
│   │   ├── react/           @proofa/react
│   │   ├── shared/          @proofa/shared
│   │   └── ui/              @proofa/ui
│   └── services/
│       ├── core/            @proofa/core
│       ├── gateway/         @proofa/gateway
│       └── workers/         @proofa/workers
```

---

## 🚀 Common Commands

### Build All Packages
```bash
# Build everything
pnpm run build

# Build only workspace packages (libs)
pnpm run build:packages

# Force rebuild (ignore cache)
pnpm exec turbo run build --force
```

### Development
```bash
# Run all dev servers
pnpm run dev

# Run specific dashboard
pnpm run dev:admin      # Admin dashboard (port 3004)
pnpm run dev:user       # User dashboard (port 3005)
pnpm run dev:home       # Home/landing page
pnpm run dev:docs       # Documentation site

# Run specific service
pnpm run dev:gateway    # Gateway API (port 3001)
pnpm run dev:core       # Core service (port 3003)
pnpm run dev:workers    # Background workers
```

### Type Checking
```bash
# Type check all packages
pnpm run typecheck

# Type check specific package
pnpm exec turbo run typecheck --filter='@proofa/auth'
```

### Linting & Formatting
```bash
# Lint all files (Biome)
pnpm run lint

# Fix lint issues
pnpm run lint:fix

# Format all files
pnpm run format

# Check + fix everything
pnpm run check:fix
```

---

## 🎯 Turbo Filters

### Filter by Package Name
```bash
# Build a specific package
turbo run build --filter='@proofa/components'

# Build multiple packages
turbo run build --filter='@proofa/auth' --filter='@proofa/client'
```

### Filter by Path Pattern
```bash
# Build all dashboards
turbo run build --filter='./apps/dashboard/*'

# Build all packages (libs)
turbo run build --filter='./apps/packages/*'

# Build all services
turbo run build --filter='./apps/services/*'
```

### Filter by Dependencies
```bash
# Build a package and all its dependencies
turbo run build --filter='@proofa/dashboard-admin-v2...'

# Build all packages that depend on @proofa/components
turbo run build --filter='...@proofa/components'
```

### Filter by Changed Files
```bash
# Only affected by git changes
turbo run build --filter='...[HEAD^1]'

# Affected by working directory changes
turbo run test --filter='...[HEAD]'
```

---

## 🏃 Running Specific Packages

### Using pnpm --filter
```bash
# Run dev in specific package
pnpm --filter @proofa/dashboard-admin-v2 dev

# Install package in specific workspace
pnpm --filter @proofa/components add react-icons

# Run any script
pnpm --filter @proofa/db run db:push
```

### Using Turbo --filter
```bash
# Build with dependencies
turbo run build --filter='@proofa/dashboard-admin-v2...'

# Run without dependencies
turbo run dev --filter='@proofa/gateway' --no-deps
```

---

## 🔧 Turbo Configuration (turbo.json)

### Configured Tasks

| Task | Cache | Depends On | Outputs |
|------|-------|------------|---------|
| `dev` | ❌ | `^build` | - |
| `build` | ✅ | `^build`, `typecheck` | `dist/**`, `.next/**`, `.astro/**` |
| `typecheck` | ✅ | - | - |
| `test` | ✅ | - | `coverage/**` |
| `lint` | ✅ | - | - |
| `format` | ❌ | - | - |
| `db:migrate` | ❌ | - | - |
| `db:seed` | ❌ | `db:migrate` | - |

### Task Options Explained

- **`cache: true`**: Results are cached and reused if inputs haven't changed
- **`dependsOn: ["^build"]`**: Wait for dependencies to build first
- **`outputs`**: Files Turbo should cache
- **`persistent: true`**: Task keeps running (dev servers)
- **`interactive: true`**: Task needs terminal input

---

## 📊 Viewing Build Graph

### Dry Run (See what will execute)
```bash
# JSON output
pnpm exec turbo run build --dry-run=json

# Summary output
pnpm exec turbo run build --dry-run
```

### Generate Dependency Graph
```bash
# Create visual graph
pnpm exec turbo run build --graph=graph.html

# Open in browser
open graph.html
```

---

## ⚡️ Performance Tips

### 1. Use Filters Wisely
```bash
# ❌ Slow - rebuilds everything
pnpm run build

# ✅ Fast - only what you need
turbo run build --filter='@proofa/dashboard-admin-v2...'
```

### 2. Leverage Cache
```bash
# Check cache status
turbo run build --summarize

# Clear cache if needed
rm -rf node_modules/.cache/turbo
```

### 3. Parallel Execution
Turbo automatically runs up to 20 tasks in parallel (configured in `turbo.json`).

### 4. Watch Mode
```bash
# Build and watch for changes
turbo run build --watch
```

---

## 🐛 Troubleshooting

### "turbo: command not found"
```bash
# Always use pnpm exec
pnpm exec turbo --version

# Or install globally (optional)
pnpm add -g turbo
```

### Cache Issues
```bash
# Force rebuild (ignore cache)
turbo run build --force

# Clear Turbo cache
rm -rf node_modules/.cache/turbo

# Clear all caches
pnpm run clean  # If you have this script
```

### Type Errors Block Build
```bash
# Skip typecheck temporarily (NOT recommended for production)
TURBO_FORCE=true turbo run build

# Better: Fix types first
pnpm run typecheck
```

### Dependency Issues
```bash
# Reinstall all dependencies
rm -rf node_modules
pnpm install

# Rebuild workspace packages
pnpm run build:packages
```

---

## 📈 CI/CD Integration

### GitHub Actions Example
```yaml
name: Build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          cache: 'pnpm'
      
      # Turbo cache
      - uses: actions/cache@v3
        with:
          path: node_modules/.cache/turbo
          key: turbo-${{ runner.os }}-${{ github.sha }}
          restore-keys: turbo-${{ runner.os }}-
      
      - run: pnpm install
      - run: pnpm exec turbo run build test lint
```

---

## 🎓 Key Concepts

### Task Dependencies
- **`^build`**: Wait for dependencies to build first
- **`build`**: Run `build` in this package
- **`dependsOn`**: Defines task execution order

### Workspace Dependencies
Packages use `workspace:*` protocol:
```json
{
  "dependencies": {
    "@proofa/auth": "workspace:*",
    "@proofa/components": "workspace:*"
  }
}
```

### Build Pipeline Example
```
@proofa/shared#build
  ↓
@proofa/auth#build
  ↓
@proofa/client#build
  ↓
@proofa/react#build
  ↓
@proofa/dashboard-admin-v2#build
```

---

## 🔗 Useful Links

- **Turbo Docs**: https://turbo.build/repo/docs
- **Filtering**: https://turbo.build/repo/docs/core-concepts/monorepos/filtering
- **Caching**: https://turbo.build/repo/docs/core-concepts/caching
- **Running Tasks**: https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks

---

## ✨ Quick Reference

```bash
# Build everything
pnpm run build

# Build one package + deps
turbo run build --filter='@proofa/dashboard-admin-v2...'

# Dev mode for specific service
pnpm run dev:gateway

# Type check all
pnpm run typecheck

# Lint and format
pnpm run check:fix

# Clear cache
rm -rf node_modules/.cache/turbo

# See what will run
turbo run build --dry-run

# Force rebuild
turbo run build --force
```

---

**Your Turbo setup is ready! 🎉**

For detailed Proofa-specific commands, see [SETUP.md](./SETUP.md)
