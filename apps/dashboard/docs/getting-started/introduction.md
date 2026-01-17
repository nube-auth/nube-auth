---
title: Introduction
description: Learn what Proofa is and how it can help your application
outline: deep
---

::: tip Beta
Proofa is currently in beta. We're actively developing new features and improvements. Your feedback is valuable!
:::

Proofa is an authentication, session management, and licensing platform designed for modern SaaS applications.

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

- **Simple Integration** - Get authentication running in minutes
- **Flexible** - Adapt to any business model with customizable licensing
- **Fast** - Built on Hono, Turso, and Upstash for performance
- **Modern** - Designed for SaaS applications with multi-tenant support

## Next Steps

- [Quick Start](/getting-started/quickstart/) - Get up and running in minutes
- [Installation](/getting-started/installation/) - Detailed setup instructions
- [Configuration](/getting-started/configuration/) - Configure for your needs
