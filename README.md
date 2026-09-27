# B-MOST

<p align="center">
  <img src="assets/brand_logo.png" alt="B-MOST brand logo" width="520" />
</p>

B-MOST is a multi-organization supply-chain traceability application. A Next.js web app lets organizations register products, record quality checks, move custody through shipments, and let customers verify history. A NestJS API stores operational data in PostgreSQL and verifies transactions against `SupplyChainRegistry` on Ethereum Sepolia.

## Implemented features

- JWT login, application roles, organization-scoped records, and wallet address management.
- Product drafts, MetaMask-signed product and shipment milestones, quality checks, audit logs, dashboards, and public QR verification.
- Sepolia contract reads and receipt/event checks before database synchronization.

The typical flow is Manufacturer → Distributor → Warehouse → Retailer → customer verification. The Manufacturer registers a product once; subsequent organizations receive and forward the same product. See [supply-chain flow](docs/BLOCKCHAIN.md#supply-chain-flow).

## Stack and architecture

| Part | Implementation |
| --- | --- |
| Web | Next.js 16, React 19, Tailwind CSS 4, viem, MetaMask |
| API | NestJS 11, Swagger, Prisma 6, ethers 6 |
| Data | PostgreSQL 16 |
| Contract | Solidity 0.8.24, OpenZeppelin AccessControl, Hardhat for development/tests |

```text
apps/web → MetaMask → Sepolia SupplyChainRegistry
    ↓                       ↑
apps/api → PostgreSQL ──────┘
```

The API prepares actions and verifies confirmed receipts; the connected wallet signs normal business writes. Older REST write routes whose backend signer is disabled still exist. See [architecture](docs/ARCHITECTURE.md).

## Repository

```text
apps/api/           NestJS API and Prisma schema
apps/web/           Next.js application
packages/contracts/ Solidity contract and Hardhat tests
docs/               Implementation documentation
docker-compose.yml  PostgreSQL, API, and web services
```

## Quick start

Prerequisites: Node.js 20+, pnpm 11 (declared as `pnpm@11.1.1`), Docker with Compose for containers, a Sepolia RPC URL, and a funded Sepolia MetaMask wallet with the needed contract role.

Copy the root template to `.env` and set `BLOCKCHAIN_RPC_URL` and a new `JWT_SECRET`. For host development, set `DATABASE_URL` and `DIRECT_URL` for your PostgreSQL instance. The [environment guide](docs/ENVIRONMENT.md) explains each variable. Never put a private key or seed phrase in these files.

```powershell
Copy-Item .env.example .env
pnpm install
pnpm docker:dev
```

`pnpm docker:dev` runs `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --watch`. Compose defines PostgreSQL, API, and web. The API entrypoint attempts Prisma migrations; Compose currently does not pass the schema's `DIRECT_URL`, so startup may need a Compose environment override. See [development](docs/DEVELOPMENT.md#docker-development) before relying on this path. Once running, open `http://localhost:3000`, `http://localhost:4000/api`, and Swagger at `http://localhost:4000/api/docs`.

## Blockchain

Normal target: Sepolia, chain ID `11155111`, `SupplyChainRegistry` at `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a`. Contract addresses, ABIs, wallet addresses, and transaction hashes are public; private keys, seed phrases, JWT secrets, database passwords, and private RPC credentials are secrets. Local Hardhat is for contract development and tests; the running app is fixed to Sepolia.

## Verified commands

The root package defines `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm test:integration`, `pnpm docker:dev`, `pnpm docker:up`, `pnpm docker:down`, `pnpm db:migrate`, and `pnpm blockchain:test`. `pnpm lint` invokes the API's ESLint script with `--fix` and can edit source files.

## Documentation

Start with the [documentation index](docs/README.md), then consult [architecture](docs/ARCHITECTURE.md), [blockchain and lifecycles](docs/BLOCKCHAIN.md), [database IDs](docs/DATABASE.md), [API](docs/API.md), and [security](docs/SECURITY.md).
