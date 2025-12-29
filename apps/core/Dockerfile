# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages ./packages
COPY apps/core ./apps/core

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages and core
RUN pnpm --filter @proofa/shared build
RUN pnpm --filter @proofa/db build
RUN pnpm --filter @proofa/cache build
RUN pnpm --filter @proofa/auth build
RUN pnpm --filter @proofa/core build

# Production stage
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/core ./apps/core
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

WORKDIR /app/apps/core

CMD ["node", "dist/index.js"]
