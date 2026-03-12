---
title: Docker Deployment
description: Deploy Nube Auth with Docker
---

Deploy Nube Auth using Docker Compose for a production-ready setup.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/0xdps/nube-auth.git
cd nube-auth

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env

# Start services
docker compose up -d
```

## Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  gateway:
    image: ghcr.io/0xdps/nube-auth-gateway:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - CORE_URL=http://core:3001
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - core

  core:
    image: ghcr.io/0xdps/nube-auth:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## Production Checklist

### Security

- [ ] Set strong `JWT_SECRET` (32+ random bytes)
- [ ] Set strong `SESSION_SECRET`
- [ ] Enable HTTPS with valid certificates
- [ ] Configure CORS for your domains
- [ ] Set up rate limiting

### Database

- [ ] Use managed database (Neon, Supabase, or self-hosted PostgreSQL)
- [ ] Enable connection pooling
- [ ] Set up backups
- [ ] Run migrations

### Monitoring

- [ ] Set up health checks
- [ ] Configure logging (structured JSON)
- [ ] Add error tracking (Sentry)
- [ ] Monitor Redis memory usage

## Health Checks

```yaml
services:
  gateway:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Scaling

For high availability:

```yaml
services:
  gateway:
    deploy:
      replicas: 3
    # ... rest of config
```

Use a load balancer (nginx, Traefik) in front of replicas.

## Next Steps

- [Environment Variables](/self-hosting/environment/) - Full configuration reference
