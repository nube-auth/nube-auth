---
title: Introduction
description: Learn what Proofa is and how it can help your application
---

Proofa is an open-source authentication, session management, and licensing platform designed for modern SaaS applications.

## What is Proofa?

Proofa provides everything you need to handle user authentication, manage sessions, and implement flexible licensing in your applications:

- **Authentication** - OAuth providers (Google, GitHub), magic links, and more
- **Sessions** - Rolling sessions with Redis caching and configurable TTLs
- **Licensing** - Plans, tiers, entitlements, and usage tracking
- **Multi-tenant** - Projects, apps, and team management with RBAC

## Architecture

Proofa consists of several components:

| Component | Description |
|-----------|-------------|
| **Gateway** | API gateway handling auth flows and request routing |
| **Core** | Main API server for users, sessions, and licenses |
| **Dashboard** | Admin and user interfaces |
| **SDK** | Client libraries for easy integration |

## Why Proofa?

- **Open Source** - Full control over your auth infrastructure
- **Self-Hostable** - Deploy on your own infrastructure
- **Flexible** - Adapt to any business model with customizable licensing
- **Fast** - Built on Hono, Turso, and Upstash for performance

## Next Steps

- [Quick Start](/getting-started/quickstart/) - Get up and running in minutes
- [Installation](/getting-started/installation/) - Detailed setup instructions
- [Configuration](/getting-started/configuration/) - Configure for your needs
