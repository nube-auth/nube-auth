---
title: Dashboard Overview
description: Learn about Proofa's admin and user dashboards
---

import { Card, CardGrid } from '@astrojs/starlight/components';

Proofa provides two powerful dashboards for managing your applications and user accounts.

## Dashboard Types

<CardGrid>
  <Card title="Admin Dashboard" icon="laptop">
    Manage projects, apps, users, licenses, and billing. For project owners and team members.
  </Card>
  <Card title="User Dashboard" icon="user">
    View profile, manage sessions, and see connected accounts. For end users of your apps.
  </Card>
</CardGrid>

## Admin Dashboard

**URL:** `admin.proofa.com`

The Admin Dashboard is your control center for managing all aspects of Proofa:

### Key Features

- **Project Management** - Create and manage multiple projects
- **App Configuration** - Set up OAuth, payment providers, and licensing
- **User Management** - View and manage users across all your apps
- **License Administration** - Create plans, grant licenses, track usage
- **Team Collaboration** - Invite team members with role-based access
- **Payment Integration** - Configure Stripe, LemonSqueezy, and more
- **Webhooks** - Monitor and debug webhook events
- **Analytics** - Track users, revenue, and engagement

### Access Levels

| Role | Permissions |
|------|-------------|
| **Owner** | Full access to project, can delete project |
| **Admin** | Manage apps, users, licenses, and billing |
| **Member** | Read-only access to project data |

[Learn more about the Admin Dashboard →](/dashboards/admin-dashboard)

## User Dashboard

**URL:** `account.proofa.com`

The User Dashboard provides a simple interface for end users to manage their accounts:

### Key Features

- **Profile Management** - Update name, email, and avatar
- **Session Management** - View and revoke active sessions
- **Connected Accounts** - See linked OAuth providers (Google, GitHub)
- **Security** - Monitor login activity and suspicious sessions

[Learn more about the User Dashboard →](/dashboards/user-dashboard)

## Authentication

Both dashboards use secure OAuth-based authentication:

- **Admin Sessions** - 2 hours absolute OR 15 minutes inactivity
- **User Sessions** - 365 days rolling (refreshes on activity)
- **Security** - HttpOnly cookies, HTTPS only, CSRF protection

## Getting Started

1. **Sign up** at [admin.proofa.com](https://admin.proofa.com)
2. **Create a project** to organize your apps
3. **Create an app** within your project
4. **Configure OAuth** providers for your app
5. **Integrate** with your application using the API keys

## Next Steps

- [Admin Dashboard Guide](/dashboards/admin-dashboard) - Complete feature walkthrough
- [User Dashboard Guide](/dashboards/user-dashboard) - End user features
- [Integration Guide](/integration/quickstart) - Add Proofa to your app
