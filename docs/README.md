# Proofa Core Documentation

## Core Documentation

### Architecture & Design

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, ID management, security patterns  
  *When to use: Understanding service boundaries, ID types, auth flows*

- **[PRODUCT_SPEC.md](./PRODUCT_SPEC.md)** - Product requirements and feature specifications  
  *When to use: Understanding product vision and complete feature set*

### Database & JSONB Operations

- **[JSONB.md](./JSONB.md)** - Complete JSONB atomic update patterns  
  *When to use: All JSONB operations, quick reference at top, RFC details below*

### API References

- **[ADMIN_API_QUICK_REFERENCE.md](./ADMIN_API_QUICK_REFERENCE.md)** - Admin API endpoints  
  *When to use: Integrating with admin APIs*

### Payment System

- **[PAYMENT_SYSTEM_DESIGN.md](./PAYMENT_SYSTEM_DESIGN.md)** - Complete billing/payment architecture  
  *When to use: Understanding payment flows, provider integrations*

### Roadmap

- **[PHASE_2_ROADMAP.md](./PHASE_2_ROADMAP.md)** - Future enhancements and planned features  
  *When to use: Planning next phases, understanding priorities*

## Key Coding Standards

### Critical Rules (Always Follow)

1. **IDs**: Never expose internal database IDs - always use `public_id`
2. **JSONB**: Use atomic operations (`buildJsonbMergeClause`, etc.) - never read-modify-write
3. **Environment**: Access via `config/env.ts`, never `process.env` directly
4. **Logging**: Use `createLogger()` from `@proofa/shared`, never `console.*`
5. **HTTP Client**: Use `pingpong` from `@proofa/auth` for backend requests
6. **Database**: Access via `@proofa/db` wrapper, never direct `drizzle` imports
7. **Cache**: Access via `@proofa/cache` wrapper, never direct Redis imports

### Quick Links

- GitHub Copilot Instructions: `.github/copilot-instructions.md`
- Pull Request Template: `.github/pull_request_template.md`
- Development Setup: `DEVELOPMENT.md`
- Quick Start: `QUICKSTART.md`

## Documentation Philosophy

We maintain **lean, actionable documentation**:
- ✅ Keep: Architecture, patterns, quick references
- ❌ Remove: Historical changelogs, completed work, redundant guides
- 🔄 Consolidate: Multiple docs on same topic into one authoritative source

Last cleaned: January 10, 2026
