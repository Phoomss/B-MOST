# Environment Configuration

This reference documents all configuration options for B-MOST, covering both backend server environment variables and frontend client build-time parameters.

---

## 1. Configuration Overview

The committed root template is [`.env.example`](../../.env.example). When running the system locally, copy `.env.example` to `.env` in the project root. NestJS and Docker Compose automatically load variables from this file.

> [!WARNING]
> Never commit real secrets, private keys, or seed phrases to version control. Public variables are prefixed with `NEXT_PUBLIC_` and will be baked directly into the frontend JavaScript client bundle.

---

## 2. Backend Environment Variables (`apps/api`)

These variables are consumed by the NestJS API and the Prisma ORM runtime:

| Variable | Type | Default / Example | Purpose / Description |
| --- | --- | --- | --- |
| `API_PORT` | Number | `4000` | Port on which the NestJS HTTP listener binds. |
| `DATABASE_URL` | String (URI) | `postgresql://postgres:postgres@localhost:5433/bmost_db?schema=public` | PostgreSQL connection pool string used by Prisma Client during application runtime. |
| `DIRECT_URL` | String (URI) | `postgresql://postgres:postgres@localhost:5433/bmost_db?schema=public` | Direct database connection string bypassing connection poolers (required for Prisma schema migrations). |
| `JWT_SECRET` | String | `<generate-a-random-secret>` | Secret key used to sign and verify HMAC-SHA256 authentication tokens. |
| `JWT_EXPIRES_IN` | String | `7d` | Expiration lifespan for user authentication JWT tokens (e.g., `7d`, `24h`). |
| `BLOCKCHAIN_RPC_URL` | String (URL) | `https://ethereum-sepolia-rpc.publicnode.com` | Ethereum Sepolia JSON-RPC endpoint. Keep private RPC keys secret on backend. |
| `CONTRACT_ADDRESS` | String (Hex) | `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a` | Address of the deployed `SupplyChainRegistry` smart contract on Sepolia. |
| `BLOCKCHAIN_CHAIN_ID` | Number | `11155111` | Sepolia chain ID. Used to validate transaction network contexts. |
| `BLOCKCHAIN_ABI_READY` | Boolean | `true` | Gatekeeper flag. Must be `true` for contract calls to proceed. |
| `AUTO_SEED` | Boolean | `false` | When set to `true`, the Docker container entrypoint runs `prisma/seed.ts` automatically on startup. |
| `WEB_URL` | String (URL) | `http://localhost:3000` | Base URL used to construct consumer verification and QR code links. |

---

## 3. Database Infrastructure Variables (`docker-compose.yml`)

These variables define the local PostgreSQL container parameters:

| Variable | Default | Description |
| --- | --- | --- |
| `POSTGRES_USER` | `postgres` | Database superuser username |
| `POSTGRES_PASSWORD` | `postgres` | Database superuser password |
| `POSTGRES_DB` | `bmost_db` | Initial database name |
| `POSTGRES_PORT` | `5433` | Host port mapped to container port 5432 (avoids collisions with local PostgreSQL instances) |

---

## 4. Frontend Client Variables (`apps/web`)

All variables accessed by Next.js in the browser must begin with `NEXT_PUBLIC_`. These are evaluated during build time or server startup:

| Variable | Expected Value | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Base URL for REST API requests from the browser |
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` | Required network ID. The browser validates that MetaMask is connected to this chain |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a` | Address of `SupplyChainRegistry` passed to `viem.writeContract` |
| `NEXT_PUBLIC_BLOCKCHAIN_ABI_READY` | `true` | Enables blockchain interaction UI buttons and confirms ABI availability |

---

## 5. Deployment Environment Templates

Reference templates for cloud hosting providers are maintained under `deploy/`:

### 5.1 Render Web Service (API Backend)
Documented in [`deploy/render.env.example`](../../deploy/render.env.example):
- Root directory: repo root; Dockerfile: `apps/api/Dockerfile`.
- Requires setting `DATABASE_URL` (Supabase pooler / hosted Postgres with `pgbouncer=true`) and `DIRECT_URL` (direct port 5432 for migrations).
- Requires `BLOCKCHAIN_RPC_URL`, `JWT_SECRET`, and `WEB_URL`.

### 5.2 Vercel Project (Web Frontend)
Documented in [`deploy/vercel.env.example`](../../deploy/vercel.env.example):
- Root directory: `apps/web`.
- Requires setting `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, and `NEXT_PUBLIC_BLOCKCHAIN_ABI_READY`.

---

## 6. Example Local `.env` Template

```env
# Application Ports
API_PORT=4000
WEB_PORT=3000

# Database Configuration (Local PostgreSQL)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bmost_db
POSTGRES_PORT=5433
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bmost_db?schema=public
DIRECT_URL=postgresql://postgres:postgres@localhost:5433/bmost_db?schema=public

# Authentication
JWT_SECRET=replace_this_with_a_long_random_entropy_secret_key_32_chars_min
JWT_EXPIRES_IN=7d

# Blockchain Configuration (Sepolia Testnet)
BLOCKCHAIN_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CONTRACT_ADDRESS=0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a
BLOCKCHAIN_CHAIN_ID=11155111
BLOCKCHAIN_ABI_READY=true
WEB_URL=http://localhost:3000

# Next.js Public Client Parameters
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a
NEXT_PUBLIC_BLOCKCHAIN_ABI_READY=true
```
