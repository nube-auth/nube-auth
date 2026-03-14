# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY apps/packages ./apps/packages
COPY apps/services/gateway ./apps/services/gateway

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages and gateway
RUN pnpm --filter @nube-auth/cache build
RUN pnpm --filter @nube-auth/shared build
RUN pnpm --filter @nube-auth/db build
RUN pnpm --filter @nube-auth/auth build
RUN pnpm --filter @nube-auth/gateway build

# Production stage
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/apps/packages ./apps/packages
COPY --from=builder /app/apps/services/gateway ./apps/services/gateway
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

WORKDIR /app/apps/services/gateway

CMD ["node", "dist/index.js"]
