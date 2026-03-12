---
title: Introduction
description: Learn what Nube Auth is and how it can help your application
---

import { Aside } from '@astrojs/starlight/components';

<Aside type="note" title="Beta">
  Nube Auth is currently in beta. We're actively developing new features and improvements. Your feedback is valuable!
</Aside>

Nube Auth is an authentication, session management, and licensing platform designed for modern SaaS applications.

## What is Nube Auth?

Nube Auth provides everything you need to handle user authentication, manage sessions, and implement flexible licensing in your applications:

- **Authentication** - OAuth providers (Google, GitHub), magic links, and more
- **Sessions** - Rolling sessions with Redis caching and configurable TTLs
- **Licensing** - Plans, tiers, entitlements, and usage tracking
- **Multi-tenant** - Projects, apps, and team management with RBAC

## Architecture

Nube Auth consists of several components:

| Component | Description |
|-----------|-------------|
| **Gateway** | API gateway handling auth flows and request routing |
| **Core** | Main API server for users, sessions, and licenses |
| **Dashboard** | Admin and user interfaces |
| **SDK** | Client libraries for easy integration |

## Why Nube Auth?

- **Simple Integration** - Get authentication running in minutes
- **Flexible** - Adapt to any business model with customizable licensing
- **Fast** - Built on Hono with PostgreSQL and Redis
- **Modern** - Designed for SaaS applications with multi-tenant support

## Next Steps

- [Quick Start](/getting-started/quickstart/) - Get up and running in minutes
- [Installation](/getting-started/installation/) - Detailed setup instructions
- [Configuration](/getting-started/configuration/) - Configure for your needs
