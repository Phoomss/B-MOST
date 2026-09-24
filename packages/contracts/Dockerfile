# syntax=docker/dockerfile:1

FROM node:22-alpine
RUN apk add --no-cache libc6-compat curl python3 make g++
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy smart contract workspace
COPY packages/contracts ./packages/contracts

WORKDIR /app/packages/contracts
RUN pnpm compile

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8545

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e ' \
    const http = require("http"); \
    const postData = JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }); \
    const req = http.request({ host: "127.0.0.1", port: 8545, method: "POST", headers: { "Content-Type": "application/json" } }, (res) => process.exit(res.statusCode === 200 ? 0 : 1)); \
    req.on("error", () => process.exit(1)); \
    req.write(postData); \
    req.end(); \
  ' || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
