---
layout: home

hero:
  name: Proofa
  text: Production-ready authentication
  tagline: Complete authentication, licensing, and user management platform with enterprise-grade security
  image:
    src: /logo.png
    alt: Proofa Logo
  actions:
    - theme: brand
      text: Quick Start →
      link: /getting-started/quickstart
    - theme: alt
      text: View on GitHub
      link: https://github.com/0xdps/proofa-core

features:
  - icon: 🔐
    title: Authentication
    details: OAuth 2.0 (Google, GitHub), Magic Links, Session management with fingerprinting, Session hijacking protection
  - icon: 🛡️
    title: Security
    details: A+ rating (94/100), IP fingerprinting, Rate limiting, CSRF protection, Security headers, Audit logging
  - icon: 📦
    title: Licensing
    details: Flexible plans (monthly, yearly, one-time, trial), Usage tracking, Automated billing, License management
  - icon: 🎨
    title: Admin Dashboard
    details: User management, Project & app management, OAuth configuration, Payment integration, Analytics
  - icon: 🚀
    title: Quick Integration
    details: Get authentication running in 5 minutes with TypeScript SDK, React hooks, and comprehensive REST API
  - icon: ⚡
    title: Performance
    details: Built on Hono, PostgreSQL, and Redis for blazing fast response times and reliable scaling
---

## 🚀 What is Proofa?

Proofa is a comprehensive authentication and licensing platform that provides secure user management, OAuth integration, session handling, and subscription licensing out of the box.

### Security Rating: A+ (94/100)

Proofa has achieved an **A+ security rating** through comprehensive security measures including session hijacking protection, rate limiting, CSRF protection, and more.

## ⚡ Quick Start

Integrate Proofa authentication into your app in 5 minutes:

```bash
# 1. Install the SDK
npm install @proofa/client @proofa/react

# 2. Get your credentials from admin.proofa.com
# - Create a project
# - Add an app
# - Copy your App ID
```

```tsx
// 3. Add to your React app
import { ProofaProvider, useProofa } from '@proofa/react';

function App() {
  return (
    <ProofaProvider
      appId="APP0abc123..."
      gatewayUrl="https://api.proofa.sh"
    >
      <YourApp />
    </ProofaProvider>
  );
}

// 4. Use authentication
function LoginButton() {
  const { login } = useProofa();
  return <button onClick={() => login({ provider: 'google' })}>Login</button>;
}
```

Visit [Integration Quick Start](/integration/quickstart) for detailed instructions.

## 🔒 Security Features

### Multi-Layered Protection

- **Session Hijacking Protection**: IP and User-Agent fingerprinting with automatic invalidation
- **Rate Limiting**: Redis-based sliding window (10 req/5min auth, 100 req/min API)
- **CSRF Protection**: Token-based protection for all state-changing operations
- **Admin Route Security**: Blocks Postman/curl, requires browser context
- **Input Validation**: 15+ Zod schemas validating all endpoints
- **SQL Injection Protection**: Drizzle ORM with no raw SQL
- **Security Headers**: CSP, HSTS, X-Frame-Options, and more

### Compliance Ready

✅ SOC 2 Type II  
✅ OWASP Top 10 (2021)  
✅ GDPR  
✅ ISO 27001

[Learn more about security →](/security/overview)

## 🏗️ Architecture

### Tech Stack

- **Backend**: Hono, Node.js 22+
- **Database**: PostgreSQL 16 (Drizzle ORM)
- **Cache**: Redis 7
- **Frontend**: React 18, TanStack Query
- **Styling**: Tailwind CSS
- **Build**: Turborepo, TypeScript, Vite

### Monorepo Structure

```
proofa-core/
├── apps/
│   ├── gateway/          # API Gateway
│   ├── core/             # Core Service
│   ├── dashboard/
│   │   ├── admin/        # Admin Dashboard
│   │   ├── user/         # User Portal
│   │   ├── home/         # Marketing Site
│   │   └── docs/         # Documentation
├── packages/
│   ├── db/               # Database Layer
│   ├── cache/            # Redis Cache
│   ├── auth/             # Authentication
│   ├── client/           # TypeScript SDK
│   └── react/            # React Hooks
```

## 🚀 Get Started

### For Developers (Integrate Proofa)

1. **Sign up** at [admin.proofa.com](https://admin.proofa.com)
2. **Create a project** and add your app
3. **Configure OAuth** providers (Google, GitHub)
4. **Install SDK** in your application
5. **Start authenticating** users

[Integration Guide →](/integration/quickstart)

### For Self-Hosting (Advanced)

Want to run Proofa on your own infrastructure? See our [Self-Hosting Guide](/self-hosting/docker) for Docker and Kubernetes deployment.

## 🤝 Support & Community

Need help integrating Proofa?

- 📧 **Email**: support@proofa.io
- 📖 **Documentation**: You're here!
- 💬 **GitHub Issues**: [Report bugs or request features](https://github.com/0xdps/proofa-core/issues)
- 🌟 **Star us on GitHub**: [github.com/0xdps/proofa-core](https://github.com/0xdps/proofa-core)

---

**Ready to integrate Proofa?** [Start with the Integration Guide →](/integration/quickstart)
