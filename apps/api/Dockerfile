# syntax=docker/dockerfile:1

# Stage 1: Base runtime with pnpm & system dependencies
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl netcat-openbsd curl
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
WORKDIR /app

# Stage 2: Workspace dependency resolution and building
FROM base AS builder
WORKDIR /app

# Copy monorepo configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy package manifests for workspace graph resolution
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/

# Install workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy api application source code
COPY apps/api ./apps/api

# Generate Prisma client and compile TypeScript
WORKDIR /app/apps/api
RUN pnpm prisma:generate
RUN pnpm build

# Stage 3: Minimal production runner
FROM base AS runner
WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV API_PORT=4000

# Create unprivileged system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy runtime files from builder
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:4000/api || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
