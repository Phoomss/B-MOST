# B-MOST

<p align="center">
  <img src="assets/brand_logo.png" alt="B-MOST brand logo" width="520" />
</p>

B-MOST (Blockchain-Based Multi-Organization Supply Chain Traceability Platform) is an enterprise supply-chain provenance platform. It combines a Next.js web application, a NestJS REST API with PostgreSQL, and an Ethereum Sepolia smart contract (`SupplyChainRegistry`) to provide tamper-proof custody tracking and unauthenticated consumer QR verification.

---

## Key Features

- **Multi-Tenant RBAC & Isolation**: Distinct roles for Manufacturer, Distributor, Warehouse, Retailer, Auditor, and Super Admin.
- **Product Lifecycle Tracking**: Draft creation, on-chain registration, quality inspection, multi-leg logistics, warehouse storage, retail sale, and recall.
- **Client-Side MetaMask Signing**: Non-custodial state changes signed directly via MetaMask and `viem`, backed by a two-phase action protocol (`prepare` → sign → `confirm`).
- **Cryptographic Verification**: Backend independently validates on-chain transaction receipts and emitted events before updating PostgreSQL.
- **Public Consumer Verification**: Instant verification via product code or QR code at `/verify/[code]` with live blockchain sanity checks.
- **Real-Time Indexer & Explorer**: On-chain block and transaction explorer with background event synchronization.

The typical custody progression is **Manufacturer → Distributor → Warehouse → Retailer → Customer Verification**. The Manufacturer registers the product once; downstream organizations receive and forward the exact same product record. See the [Supply Chain Demo Flow](docs/guides/demo-flow.md).

---

## Technology Stack

| Tier | Technologies |
| --- | --- |
| **Web Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS 4, `viem` v2, MetaMask |
| **REST API** | NestJS 11, TypeScript, Prisma ORM 6, `ethers` v6, Swagger / OpenAPI |
| **Database** | PostgreSQL 16 |
| **Blockchain** | Solidity 0.8.24, OpenZeppelin AccessControl 5.2.0, Hardhat, Ethereum Sepolia |
| **DevOps & Containers** | Docker & Docker Compose with Compose Watch, pnpm workspaces |

```text
apps/web → MetaMask (viem) → Ethereum Sepolia (SupplyChainRegistry)
    ↓                                      ↑
apps/api → PostgreSQL (Prisma) ────────────┘ (Read & Receipt Verification)
```

The backend prepares simulated transactions and independently verifies mined receipts; client wallets sign all state-modifying business transactions. See [System Architecture](docs/architecture/system-architecture.md).

---

## Repository Structure

```text
apps/
  api/                  NestJS REST API and Prisma database schema
  web/                  Next.js App Router web application
packages/
  contracts/            Solidity smart contracts, Hardhat tests, and shared ABI
docs/                   Comprehensive technical documentation
docker-compose.yml      Base PostgreSQL, API, and Web container services
docker-compose.dev.yml  Development override with Docker Compose Watch hot-sync
```

---

## Quick Start

### Prerequisites
- **Node.js** `>= 20.18.0`
- **pnpm** `11.1.1` (or `>= 10.x`)
- **Docker & Docker Compose**
- **MetaMask Extension** with Sepolia testnet ETH

### 1. Environment Configuration
Copy the template and configure your `BLOCKCHAIN_RPC_URL` and `JWT_SECRET`:
```powershell
Copy-Item .env.example .env
pnpm install
```
See the [Environment Configuration Guide](docs/development/environment.md) for details on all variables.

### 2. Run with Docker (Recommended)
Launch the entire stack with Docker Compose Watch enabled for live code sync:
```powershell
pnpm docker:dev
```
*Shorthand for:*
```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --watch
```

Once running, access the services:
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **REST API**: [http://localhost:4000/api](http://localhost:4000/api)
- **Swagger Documentation**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **PostgreSQL**: `localhost:5433`

For host-based development without containers, see [Getting Started](docs/development/getting-started.md).

---

## Blockchain Specification

- **Target Network**: Ethereum Sepolia Testnet
- **Chain ID**: `11155111` (`0xaa36a7`)
- **Contract Address**: [`0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a`](https://sepolia.etherscan.io/address/0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a)
- **Shared ABI Package**: `@b-most/contracts/abi`

Contract addresses, ABIs, public wallet addresses, and transaction hashes are public. Private keys, seed phrases, database credentials, and JWT secrets are confidential and never committed. See [Blockchain Architecture](docs/architecture/blockchain-architecture.md).

---

## Verified Monorepo Commands

| Command | Action |
| --- | --- |
| `pnpm dev` | Start API and Web concurrently on host |
| `pnpm build` | Compile API (`nest build`) and Web (`next build`) |
| `pnpm lint` | Run ESLint across all workspace packages |
| `pnpm typecheck` | Run TypeScript validation without JS emit |
| `pnpm test` | Run unit tests across packages |
| `pnpm test:e2e` | Run API end-to-end test suite |
| `pnpm test:integration`| Run complete flow integration test |
| `pnpm docker:dev` | Start Docker stack with Compose Watch |
| `pnpm docker:up` | Start production Docker containers in background |
| `pnpm docker:down` | Stop and remove running containers |
| `pnpm db:migrate` | Apply Prisma schema migrations |
| `pnpm db:seed` | Seed demo organizations, users, and products |
| `pnpm blockchain:test` | Run Hardhat smart contract test suite |

---

## Documentation Index

Explore the comprehensive documentation in [`docs/`](docs/README.md):

- **Architecture**:
  - [System Architecture](docs/architecture/system-architecture.md)
  - [Blockchain Architecture](docs/architecture/blockchain-architecture.md)
  - [Data Flow & Database Identifiers](docs/architecture/data-flow.md)
- **Development**:
  - [Getting Started](docs/development/getting-started.md)
  - [Environment Configuration](docs/development/environment.md)
  - [Docker & Containers](docs/development/docker.md)
  - [Troubleshooting Guide](docs/development/troubleshooting.md)
- **Blockchain**:
  - [Smart Contract Specification](docs/blockchain/smart-contract.md)
  - [Roles & Permissions Matrix](docs/blockchain/roles.md)
  - [Product & Shipment Lifecycles](docs/blockchain/product-lifecycle.md)
  - [Transaction Protocol & Flow](docs/blockchain/transaction-flow.md)
- **API & Security**:
  - [REST API Overview](docs/api/overview.md)
  - [End-to-End Demo Guide](docs/guides/demo-flow.md)
  - [Security Controls & Policy](docs/security/security.md)
- **Reference**:
  - [Product Requirements (PRD)](docs/reference/prd.md)
  - [Development Plan](docs/reference/development-plan.md)
  - [System Test Dataset](docs/reference/system-test-dataset.md)
