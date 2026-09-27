# Environment configuration

The root [`.env.example`](../.env.example) is the committed template. The API loads `../../.env` and `.env` through NestJS config. The web app reads its `NEXT_PUBLIC_*` values at build/start time; Compose passes them as build arguments. There are no `apps/api/.env.example` or `apps/web/.env.example` files.

## Backend and infrastructure

| Variable | Used by | Meaning |
| --- | --- | --- |
| `API_PORT` | API, Compose | API listener or published port; default 4000 |
| `DATABASE_URL` | Prisma, Compose | PostgreSQL connection URL for runtime |
| `DIRECT_URL` | Prisma | Direct database URL for migrations; required by schema |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | Compose | Local PostgreSQL container settings |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | API | Token signing secret and expiry |
| `BLOCKCHAIN_RPC_URL` | API, Compose, Hardhat config | Sepolia RPC for the app; Hardhat uses it for its Sepolia network setting |
| `BLOCKCHAIN_ABI_READY` | API | Must be `true` for contract reads/actions |
| `SEED_DATABASE`, `AUTO_SEED` | API container entrypoint | Opt-in seed on startup |
| `NEXT_PUBLIC_WEB_URL`, `WEB_URL` | API product service | Base URL for generated verification links; fallback is localhost:3000 |

The API's Sepolia contract address and chain ID are fixed in `blockchain.config.ts`; `CONTRACT_ADDRESS` and `BLOCKCHAIN_CHAIN_ID` appear in the template/Compose but do not override those fixed app values. Avoid treating them as a way to switch networks.

## Frontend

| Variable | Meaning |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API base URL, default `http://localhost:4000/api` |
| `NEXT_PUBLIC_CHAIN_ID` | Must be `11155111` for writes |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Must match `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a` |
| `NEXT_PUBLIC_BLOCKCHAIN_ABI_READY` | Must be `true` for writes |

These values are public. The browser uses the MetaMask provider for signing; do not add a private key to frontend configuration. Use a private Sepolia RPC URL only in backend/secret configuration; the browser wallet provider is separate.

## Example local settings

```env
BLOCKCHAIN_RPC_URL=<your-sepolia-rpc-url>
JWT_SECRET=<new-random-secret>
DATABASE_URL=postgresql://<user>:<password>@localhost:5433/<database>?schema=public
DIRECT_URL=postgresql://<user>:<password>@localhost:5433/<database>?schema=public
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a
NEXT_PUBLIC_BLOCKCHAIN_ABI_READY=true
```

For Compose, the API `DATABASE_URL` is built from the PostgreSQL service values; set `BLOCKCHAIN_RPC_URL` in the root `.env` before starting. The `.env.example` currently has two `DATABASE_URL` assignments: select one in your working `.env` and remove the other.
