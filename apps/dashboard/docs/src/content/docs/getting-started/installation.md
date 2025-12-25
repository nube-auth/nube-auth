---
title: Installation
description: Install and set up Proofa for your project
---

Choose how you want to use Proofa: with our hosted service or self-hosted.

## Using Hosted Proofa

The easiest way to get started is with hosted Proofa:

1. Create an account at [proofa.dev](https://proofa.dev)
2. Create a new app and get your App ID
3. Install the SDK and start building

```bash
npm install @proofa/sdk
```

## Self-Hosting with Docker

For full control, self-host Proofa using Docker:

```bash
# Clone the repository
git clone https://github.com/0xdps/proofa-core.git
cd proofa-core

# Copy environment template
cp .env.example .env

# Start services
docker compose up -d
```

### Requirements

- Docker and Docker Compose
- Node.js 20+ (for development)
- PostgreSQL or Turso database
- Redis or Upstash (for sessions)

## Development Setup

For contributing or local development:

```bash
# Clone repository
git clone https://github.com/0xdps/proofa-core.git
cd proofa-core

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

### Services

After running `pnpm dev`, you'll have:

| Service | URL | Description |
|---------|-----|-------------|
| Gateway | http://localhost:3000 | API Gateway |
| Core | http://localhost:3001 | Core API |
| Dashboard | http://localhost:4321 | Admin UI |

## Next Steps

- [Configuration](/getting-started/configuration/) - Configure your environment
- [Docker](/self-hosting/docker/) - Production Docker setup
