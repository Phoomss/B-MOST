# syntax=docker/dockerfile:1

# Stage 1: Base runtime with pnpm
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat wget curl
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

# Copy web application source code
COPY apps/web ./apps/web

# Set build-time environment variables for Next.js bundle
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CHAIN_ID=11155111
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_CONTRACT_ADDRESS=0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a
ENV NEXT_PUBLIC_CONTRACT_ADDRESS=$NEXT_PUBLIC_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_BLOCKCHAIN_ABI_READY=false
ENV NEXT_PUBLIC_BLOCKCHAIN_ABI_READY=$NEXT_PUBLIC_BLOCKCHAIN_ABI_READY
ENV NODE_ENV=production

# Build Next.js application
WORKDIR /app/apps/web
RUN pnpm build

# Stage 3: Minimal production runner
FROM base AS runner
WORKDIR /app/apps/web

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create unprivileged system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy runtime files from builder
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next ./.next

RUN mkdir -p /app/apps/web/.next/cache && chown -R nextjs:nodejs /app/apps/web/.next

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/login || exit 1

CMD ["./node_modules/.bin/next", "start", "-p", "3000"]
