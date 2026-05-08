# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Nube Auth – All-in-One App (staging)
#
# Runs all 4 application services in a single container managed by supervisord:
#   - core    → port 3003 (internal, Node.js)
#   - gateway → port 3004 (internal, Node.js; exposed publicly via nginx proxy)
#   - workers → port 3005 (internal health-check only, no public traffic)
#   - nginx   → port 8080 (Railway public port; dashboards + reverse proxy)
#
# Internal service URLs baked in as Dockerfile ENV defaults:
#   GATEWAY_INTERNAL_URL=http://localhost:3004
#   CORE_INTERNAL_URL=http://localhost:3003
#
# Intended for staging only to minimise Railway service count.
# Production runs each service in its own Railway container for independent
# scaling, deploys, and observability.
#
# Build from REPO ROOT:
#   docker build -f deployment/Dockerfile.app \
#     --build-arg VITE_GATEWAY_URL=https://s-api.yourdomain.com \
#     --build-arg VITE_ENV_TAG=Staging \
#     -t nube-auth-app .
#
# Railway config: Root Directory = /,  Dockerfile Path = deployment/Dockerfile.app
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install all workspace deps (cached until lockfile changes) ───────
FROM node:22-alpine AS installer
WORKDIR /app

RUN apk update && apk add --no-cache git && npm install -g pnpm@9

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Shared packages
COPY apps/packages/shared/package.json      ./apps/packages/shared/
COPY apps/packages/auth/package.json        ./apps/packages/auth/
COPY apps/packages/cache/package.json       ./apps/packages/cache/
COPY apps/packages/db/package.json          ./apps/packages/db/
COPY apps/packages/queue/package.json       ./apps/packages/queue/
COPY apps/packages/billing/package.json     ./apps/packages/billing/
COPY apps/packages/react/package.json       ./apps/packages/react/
COPY apps/packages/client/package.json      ./apps/packages/client/
COPY apps/packages/components/package.json  ./apps/packages/components/

# Services
COPY apps/services/core/package.json        ./apps/services/core/
COPY apps/services/gateway/package.json     ./apps/services/gateway/
COPY apps/services/workers/package.json     ./apps/services/workers/

# Dashboards
COPY apps/dashboard/admin/package.json      ./apps/dashboard/admin/
COPY apps/dashboard/user/package.json       ./apps/dashboard/user/
COPY apps/dashboard/home/package.json       ./apps/dashboard/home/
COPY apps/dashboard/docs/package.json       ./apps/dashboard/docs/

RUN pnpm install --frozen-lockfile

# ── Stage 2: build all shared packages (reused by every service/dashboard) ───
FROM installer AS shared_builder

COPY tsconfig.json ./
COPY apps/packages/ ./apps/packages/

RUN pnpm --filter @nube-auth/cache build \
 && pnpm --filter @nube-auth/shared build \
 && pnpm --filter @nube-auth/auth build \
 && pnpm --filter @nube-auth/db build \
 && pnpm --filter @nube-auth/queue build \
 && pnpm --filter @nube-auth/billing build \
 && pnpm --filter @nube-auth/client build \
 && pnpm --filter @nube-auth/react build \
 && pnpm --filter @nube-auth/components build

# ── Stage 3: build core + extract prod bundle ─────────────────────────────────
FROM shared_builder AS core_builder

COPY apps/services/core/ ./apps/services/core/

RUN pnpm --filter @nube-auth/core build \
 && pnpm --filter @nube-auth/core deploy --prod /deploy-core

# ── Stage 4: build gateway + extract prod bundle ──────────────────────────────
FROM shared_builder AS gateway_builder

COPY apps/services/gateway/ ./apps/services/gateway/

RUN pnpm --filter @nube-auth/gateway build \
 && pnpm --filter @nube-auth/gateway deploy --prod /deploy-gateway

# ── Stage 5: build workers + extract prod bundle ──────────────────────────────
FROM shared_builder AS workers_builder

COPY apps/services/workers/ ./apps/services/workers/

RUN pnpm --filter @nube-auth/workers build \
 && pnpm --filter @nube-auth/workers deploy --prod /deploy-workers

# ── Stage 6: build admin dashboard ────────────────────────────────────────────
FROM shared_builder AS admin_builder

COPY apps/dashboard/admin/ ./apps/dashboard/admin/

ARG VITE_GATEWAY_URL
ARG VITE_HOME_URL
ARG VITE_DOCS_URL
ARG VITE_ENV_TAG=Staging
ARG VITE_COOKIE_NAMESPACE

RUN VITE_GATEWAY_URL=${VITE_GATEWAY_URL} \
    VITE_HOME_URL=${VITE_HOME_URL} \
    VITE_DOCS_URL=${VITE_DOCS_URL} \
    VITE_ENV_TAG=${VITE_ENV_TAG} \
    VITE_COOKIE_NAMESPACE=${VITE_COOKIE_NAMESPACE} \
    pnpm --filter @nube-auth/dashboard-admin build

# ── Stage 7: build user dashboard ─────────────────────────────────────────────
FROM shared_builder AS user_builder

COPY apps/dashboard/user/ ./apps/dashboard/user/

ARG VITE_GATEWAY_URL
ARG VITE_HOME_URL
ARG VITE_DOCS_URL
ARG VITE_ENV_TAG=Staging
ARG VITE_COOKIE_NAMESPACE

RUN VITE_GATEWAY_URL=${VITE_GATEWAY_URL} \
    VITE_HOME_URL=${VITE_HOME_URL} \
    VITE_DOCS_URL=${VITE_DOCS_URL} \
    VITE_ENV_TAG=${VITE_ENV_TAG} \
    VITE_COOKIE_NAMESPACE=${VITE_COOKIE_NAMESPACE} \
    pnpm --filter @nube-auth/dashboard-user build

# ── Stage 8: build home (Astro) ───────────────────────────────────────────────
FROM shared_builder AS home_builder

COPY apps/dashboard/home/ ./apps/dashboard/home/

ARG PUBLIC_DOCS_URL
ARG PUBLIC_ENV_TAG=Staging

RUN PUBLIC_DOCS_URL=${PUBLIC_DOCS_URL} \
    PUBLIC_ENV_TAG=${PUBLIC_ENV_TAG} \
    pnpm --filter @nube-auth/dashboard-home build

# ── Stage 9: build docs (VitePress) ───────────────────────────────────────────
FROM shared_builder AS docs_builder

COPY apps/dashboard/docs/ ./apps/dashboard/docs/

ARG VITE_ENV_TAG=Staging

RUN VITE_ENV_TAG=${VITE_ENV_TAG} \
    pnpm --filter @nube-auth/dashboard-docs build

# ── Stage 10: runtime — Node + nginx + supervisord ────────────────────────────
FROM node:22-alpine AS runner

# nginx, supervisord (python3-based), gettext (envsubst)
RUN apk add --no-cache nginx supervisor gettext \
 && mkdir -p /run/nginx /var/log/supervisor \
              /var/www/admin /var/www/user /var/www/home /var/www/docs \
              /etc/nginx/conf.d /etc/nginx/templates

# Process supervisor config
COPY deployment/supervisord.conf /etc/supervisord.conf

# Combined entrypoint: generates nginx config then hands off to supervisord
COPY deployment/docker-entrypoint.app.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# App-specific nginx template: uses direct proxy_pass (no resolver/set pattern)
# since all services are co-located on 127.0.0.1 in this container.
COPY deployment/nginx/subdomains-app.conf.template /etc/nginx/templates/subdomains.conf.template

# Built Node.js service bundles
COPY --from=core_builder    /deploy-core    /app/core
COPY --from=gateway_builder /deploy-gateway /app/gateway
COPY --from=workers_builder /deploy-workers /app/workers

# Built dashboard static files
COPY --from=admin_builder /app/apps/dashboard/admin/dist                    /var/www/admin
COPY --from=user_builder  /app/apps/dashboard/user/dist                     /var/www/user
COPY --from=home_builder  /app/apps/dashboard/home/dist                      /var/www/home
COPY --from=docs_builder  /app/apps/dashboard/docs/.vitepress/dist          /var/www/docs

# ── Runtime env defaults ──────────────────────────────────────────────────────
# Services run on internal ports; nginx is the single Railway-facing port (8080).
# CORE_PORT / GATEWAY_PORT override the service's PORT fallback.
# GATEWAY_INTERNAL_URL / CORE_INTERNAL_URL are read by docker-entrypoint.app.sh
# and injected into the nginx config — pointing back to localhost.
# Railway injects PORT=8080 which would conflict with nginx; each service uses
# its own named port var so PORT is ignored by core and gateway.
ENV NODE_ENV=production \
    CORE_PORT=3003 \
    GATEWAY_PORT=3004 \
    GATEWAY_INTERNAL_URL=http://127.0.0.1:3004 \
    CORE_INTERNAL_URL=http://127.0.0.1:3003 \
    WORKERS_INTERNAL_URL=http://127.0.0.1:1

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["/docker-entrypoint.sh"]
