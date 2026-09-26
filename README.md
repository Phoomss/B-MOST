# B-MOST (Blockchain Multi-Organization Supply Chain Traceability)

> **ระบบติดตามและตรวจสอบห่วงโซ่อุปทานหลายองค์กรด้วยเทคโนโลยีบล็อกเชน**
>
> A production-grade web-based multi-organization supply-chain traceability platform using Ethereum Virtual Machine (EVM) Smart Contracts and PostgreSQL to record critical supply-chain events in a transparent, tamper-resistant, verifiable, and auditable manner.

---

## 📑 Documentation Index

Comprehensive system documentation is available in the [`docs/`](file:///Users/mac/Desktop/workspace/B-MOST/docs) directory:

- [Product Requirements Document (PRD)](file:///Users/mac/Desktop/workspace/B-MOST/docs/PRD.md) — Product vision, actor personas, functional/non-functional requirements, and lifecycle state machine.
- [System Architecture](file:///Users/mac/Desktop/workspace/B-MOST/docs/ARCHITECTURE.md) — Monorepo design, dual-layer storage (PostgreSQL + EVM), indexing loop, and component interactions.
- [Database Specification](file:///Users/mac/Desktop/workspace/B-MOST/docs/DATABASE.md) — Complete Prisma schema, relational models, enums, indexes, and isolation policies.
- [Blockchain Specification](file:///Users/mac/Desktop/workspace/B-MOST/docs/BLOCKCHAIN.md) — `SupplyChainRegistry.sol` contract ABI, method specifications, event definitions, and gas benchmarks.
- [Backend API Specification](file:///Users/mac/Desktop/workspace/B-MOST/docs/API.md) — RESTful API endpoints, request/response DTOs, authentication, and HTTP status codes.
- [User Interface Specification](file:///Users/mac/Desktop/workspace/B-MOST/docs/UI.md) — Next.js 16 App Router UI routes, component hierarchy, client hooks, and responsive UX.
- [Security Specification](file:///Users/mac/Desktop/workspace/B-MOST/docs/SECURITY.md) — Multi-tenant data isolation, RBAC matrix, EVM signer protection, and Keccak-256 data integrity.
- [Development Plan & Progress](file:///Users/mac/Desktop/workspace/B-MOST/docs/DEVELOPMENT_PLAN.md) — Phased milestone tracking and Definition of Done.

---

## 🏗 Monorepo Architecture

This project is organized as a pnpm workspace monorepo:

```text
B-MOST/
├── apps/
│   ├── api/                  # NestJS 11 REST API with Swagger, Prisma, & Blockchain module
│   └── web/                  # Next.js 16 (App Router) with Tailwind CSS, Lucide, & TanStack Query
├── packages/
│   └── contracts/            # Solidity 0.8.24 Smart Contracts, Hardhat local node, & tests
├── docs/                     # Architectural, Database, API, Blockchain, and Security specs
├── docker-compose.yml        # PostgreSQL 16 container definition
├── pnpm-workspace.yaml       # Monorepo workspace configuration
└── tsconfig.base.json        # Shared TypeScript base configuration
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node v25)
- **pnpm**: v10+ or v11+
- **Docker & Docker Compose** (for PostgreSQL 16)

### 2. Environment Setup
Copy the environment variables template in the root, API, and Web directories:
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 3. Launch Full Stack with Docker (Recommended)
You can launch the entire ecosystem (PostgreSQL, Hardhat Blockchain Node, NestJS API with migrations & seed, and Next.js Web UI) with a single command:
```bash
# Build and start all 4 containers in the background
pnpm docker:up

# View aggregated logs
pnpm docker:logs

# Teardown stack
pnpm docker:down
```
Once healthy, navigate directly to:
- **Web Application**: `http://localhost:3000`
- **Backend API & Swagger**: `http://localhost:4000/api/docs`
- **Blockchain Node (RPC)**: `http://localhost:8545`

---

### 4. Alternative: Local Hybrid Development

If you prefer running services directly via Node/pnpm on your host machine:

#### Step 4.1: Start Infrastructure Containers
```bash
# Start PostgreSQL container on port 5433
pnpm docker:db

# Optionally start Hardhat blockchain container on port 8545
pnpm docker:blockchain
```

#### Step 4.2: Install Host Dependencies & Apply Schema
```bash
pnpm install
pnpm db:migrate
pnpm db:seed
```

#### Step 4.3: Deploy Smart Contract (if running local node)
```bash
# In terminal 1: start Hardhat node (if not using docker)
pnpm blockchain:node

# In terminal 2: deploy contract to localhost
pnpm blockchain:deploy
```

#### Step 4.4: Start Development Servers
```bash
# Run API and web inside Docker with automatic source sync and hot reload.
# Keep this command running; code edits do not need docker compose down/up.
pnpm docker:dev

# Or run the servers on the host:
# Concurrently run API (port 4000) and Next.js (port 3000)
pnpm dev

# Or individually:
pnpm dev:api   # NestJS API
pnpm dev:web   # Next.js Web UI
```

`docker:dev` uses `docker-compose.dev.yml` and Docker Compose Watch. Edits to
`apps/api/src` and the web app, components, hooks, lib, or public files sync
into the running containers; NestJS watch mode and Next.js Fast Refresh apply
them automatically. Changes to Prisma files, package manifests, the lockfile,
or the watched configuration files rebuild the affected service automatically.
Environment variable changes require restarting the development command.
The production `pnpm docker:up` command continues to use `docker-compose.yml`.

---

## 🌐 Endpoints & Ports

| Service | Port | URL | Description |
|---|---|---|---|
| **Frontend Web UI** | `3000` | `http://localhost:3000` | Next.js 16 Web Application & Verification |
| **Backend API** | `4000` | `http://localhost:4000/api` | NestJS 11 REST API |
| **API Docs (Swagger)** | `4000` | `http://localhost:4000/api/docs` | OpenAPI 3.0 Interactive Documentation |
| **Hardhat Blockchain Node** | `8545` | `http://localhost:8545` | EVM JSON-RPC Local Node (Chain ID: 31337) |
| **PostgreSQL Database** | `5433` | `localhost:5433` | Relational application database (Docker) |

---

## 👥 Default Demo Accounts (บัญชีทดสอบในระบบ)

Password for all pre-seeded demo accounts is: `password123`

| Role / บทบาท | Email | Organization / องค์กร | Access / สิทธิ์การเข้าถึง |
|---|---|---|---|
| **Super Admin** | `superadmin@bmost.io` | Global Platform Admin | Full system administration, audit logs, node status |
| **Manufacturer** | `manufacturer@bmost.io` | Apex Tech Manufacturing | Register products, anchor to blockchain, initiate QC |
| **Auditor** | `auditor@bmost.io` | Quality Assurance Bureau | Perform QC inspections, compliance audits |
| **Distributor** | `distributor@bmost.io` | Global Express Distribution | Create shipments, dispatch manifests, transfer custody |
| **Warehouse** | `warehouse@bmost.io` | SafeHub Logistics & Storage | Receive shipments, store products, inventory transfers |
| **Retailer** | `retailer@bmost.io` | Siam Retail & Department Store | Receive inventory, execute consumer retail sales (`SOLD`) |

*One-click quick login buttons for all these roles are available directly on the `/login` page.*

For the current public wallet addresses, application roles, and Sepolia contract roles, see [Wallet and Role Mapping](docs/WALLET_ROLES.md). Super Admin can update user and organization public addresses at `/admin/wallets`.

---

## 🛠 Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start API and Web applications concurrently |
| `pnpm dev:api` | Start NestJS API in watch mode (`http://localhost:4000`) |
| `pnpm dev:web` | Start Next.js Web UI in development mode (`http://localhost:3000`) |
| `pnpm docker:dev` | Start Docker development services with source sync and hot reload |
| `pnpm build` | Build all workspace applications for production |
| `pnpm typecheck` | Run TypeScript type checking across all monorepo workspaces |
| `pnpm test` | Run unit tests across all workspaces (Hardhat, NestJS, Vitest) |
| `pnpm test:e2e` | Run API end-to-end integration and RBAC test suites |
| `pnpm test:integration` | Execute the complete 12-stage multi-actor supply-chain lifecycle flow |
| `pnpm blockchain:node` | Run local Hardhat EVM blockchain node on port 8545 |
| `pnpm blockchain:deploy` | Compile and deploy `SupplyChainRegistry.sol` smart contract |
| `pnpm blockchain:test` | Run Hardhat smart contract test suite with 100% method coverage |
| `pnpm docker:up` | Launch full ecosystem in Docker (Postgres, Blockchain, API, Web) |
| `pnpm docker:down` | Stop and teardown all Docker containers |
| `pnpm docker:build` | Build or rebuild all Docker container images |
| `pnpm docker:logs` | Follow real-time aggregated logs across all Docker containers |
| `pnpm docker:db` | Start only the PostgreSQL database container (port 5433) |
| `pnpm docker:blockchain` | Start only the Hardhat blockchain node container (port 8545) |
| `pnpm db:migrate` | Run Prisma database migrations |
| `pnpm db:seed` | Seed initial organizations, users, and baseline products |
| `pnpm db:studio` | Launch Prisma Studio web GUI on port 5555 |

---

## 🔄 Complete Supply Chain Lifecycle Flow

```text
Manufacturer Login (Apex Manufacturing)
        ↓
Create Product (Deterministic Keccak-256 Hash Generated)
        ↓
Register on Blockchain (SupplyChainRegistry.sol)
        ↓
Quality Check Inspection (Passed -> QUALITY_CHECKED / Failed -> RECALLED)
        ↓
Create Shipment & Dispatch (READY_TO_SHIP -> SHIPPED -> IN_TRANSIT)
        ↓
Distributor Receives (Nexus Logistics confirms receipt -> RECEIVED)
        ↓
Transfer Ownership (Nexus Logistics -> Metro Warehousing)
        ↓
Warehouse Receives & Stores (STORED)
        ↓
Retailer Receives (Urban Retail Store)
        ↓
Sell Product to Consumer (POST /api/products/:id/sell -> SOLD)
        ↓
Consumer Scans QR Code (/verify/{productCode})
        ↓
Verify Traceability & Blockchain Authenticity (Keccak-256 cryptographic match)
```

---

## 📋 Implemented Modules & Features

- [x] **Phase 1 — Project Setup**: Monorepo with pnpm, Next.js 16, NestJS 11, PostgreSQL Docker container.
- [x] **Phase 2 — Database**: Prisma schema, 7 core entities, enums, relations, indexes, migrations, and seed script.
- [x] **Phase 3 — Authentication**: JWT authentication, bcrypt password hashing, Passport strategy, RBAC guards (`@Roles`), `@CurrentUser`.
- [x] **Phase 4 — Organizations**: Organization CRUD, RBAC management, multi-tenant organization isolation (`OrganizationIsolationGuard`), Ethereum wallet address validation & registration, audit logging.
- [x] **Phase 5 — Smart Contract**: Solidity contract `SupplyChainRegistry.sol` with role-based access control, product lifecycle states, and 100% test coverage.
- [x] **Phase 6 — Blockchain Service**: Ethers.js integration, live event indexer, transaction querying, and node status endpoints.
- [x] **Phase 7 — Product Management**:
  - Full product CRUD with deterministic Keccak-256 cryptographic hashing (`productHash`)
  - Smart contract product registration via `POST /api/products/:id/register-blockchain`
  - Multi-tenant tenant isolation guards and role-based permissions (Manufacturer / Super Admin)
  - QR Code generation (data URL & verification payload) for all products
  - Traceability history endpoint combining on-chain events and PostgreSQL audit logs
  - Public consumer QR verification endpoint (`GET /api/public/verify/:productCode`)
  - Next.js Web UI for product listing, product creation, detailed provenance inspection, and mobile QR verification page (`/verify/[code]`)
- [x] **Phase 8 — Quality Control**:
  - Quality inspection submission endpoints (`POST /api/products/:id/quality-check` and `POST /api/quality-checks`)
  - On-chain transaction execution via `recordQualityCheck` on `SupplyChainRegistry.sol`
  - Lifecycle state transitions (`QUALITY_CHECKED` for PASS, `RECALLED` for FAIL)
  - Auto-registration on blockchain when inspecting unregistered products
  - Role-based permissions (`AUDITOR`, `MANUFACTURER`, `SUPER_ADMIN`, `ORG_ADMIN`) and multi-tenant data isolation
  - Quality check listing and filtering API (`GET /api/quality-checks` & `GET /api/products/:id/quality-checks`)
  - Next.js Quality Control & Assurance Dashboard (`/quality`) with PASS/FAIL forms, on-chain transaction receipt display, and historical inspection audits table
  - Integrated QC milestone visualization on Product Traceability Timeline (`/products/[id]`)
- [x] **Phase 9 — Shipment**:
  - Shipment creation and smart contract reference registration (`POST /api/shipments`)
  - Shipment dispatch with on-chain execution (`POST /api/shipments/:id/ship` and `POST /api/products/:id/ship`)
  - Delivery receipt confirmation with automatic product ownership transfer to recipient organization (`POST /api/shipments/:id/receive` and `POST /api/products/:id/receive`)
  - Manual ownership transfer endpoint (`POST /api/products/:id/transfer`)
  - Multi-tenant shipment tracking & isolation queries (`GET /api/shipments` and `GET /api/products/:id/shipments`)
  - Next.js Shipment Operations & Tracking Dashboard (`/shipments`) with shipment creator modal, status tracking, inline dispatch & receive triggers, and on-chain tx receipts
  - Interactive shipment milestones integration in the Product Traceability Timeline (`/products/[id]`)
- [x] **Phase 10 — Traceability**:
  - Authoritative end-to-end traceability endpoint (`GET /api/traceability/:productCode`, serialNumber, or UUID)
  - Quick multi-tenant product search endpoint (`GET /api/traceability?search=...`)
  - Deterministic Keccak-256 hash verification comparing calculated off-chain hashes against on-chain smart contract hashes
  - Authoritative smart contract state querying (`getProduct`, `getProductHistory`) on `SupplyChainRegistry.sol`
  - Chronological event timeline uniting registration, quality inspections, shipment dispatch, custody receipt, and terminal states
  - Multi-tenant ownership provenance chain tracking the sequence of custodians from manufacturer to current owner
  - Dedicated Next.js Traceability Dashboard (`/traceability`) with instant code lookup, live hash integrity badges, ownership provenance cards, and interactive milestone timeline
- [x] **Phase 11 — QR Verification**:
  - Deterministic Keccak-256 cryptographic hash verification comparing recalculated product attributes against immutable on-chain smart contract state
  - Public unauthenticated verification endpoint (`GET /api/public/verify/:productCode`) supporting lookup by both `productCode` and `serialNumber` without exposing sensitive internal credentials or organization IDs
  - Public QR code PNG image streaming endpoint (`GET /api/public/verify/:productCode/qr`)
  - Customer-facing sanitized supply-chain timeline combining manufacturing, passed QC inspections, shipment dispatch, custody delivery, and terminal states
  - Next.js Mobile-friendly Public Verification Page (`/verify/[code]`) with live authenticity badges, chronological event steps, on-chain provenance proofs, and QR download/lightbox modal
  - Dedicated Next.js QR Verification Landing Page (`/verify`) featuring instant product code / serial lookup and quick-test sample products
  - Navigation bar integration with direct "Verify QR" access for consumers and partners
- [x] **Phase 12 — Dashboard**:
  - Real operational statistics endpoint (`GET /api/dashboard/statistics`) calculating live database counts for total products, active shipments, in transit, received, sold, recalled, and blockchain transactions
  - Visual analytics dataset endpoint (`GET /api/dashboard/charts`) providing product lifecycle status distributions, shipment activity, organization ecosystem breakdown, and blockchain 7-day daily trend
  - Recent activity stream endpoint (`GET /api/dashboard/recent-activity`) aggregating real-time registrations, inspections, shipment movements, and blockchain ledger confirmations
  - Multi-tenant scoping with `OptionalJwtAuthGuard` delivering tenant-isolated metrics for authenticated organizations and aggregated statistics for public visitors
  - Enterprise SaaS Overview Dashboard in Next.js (`/`) featuring 7 KPI metric cards, lifecycle progress bars, organization breakdown, 7-day transaction trend visualization, and live event feed
- [x] **Phase 13 — Audit**:
  - Declarative audit decorator (`@Audit()`) and NestJS Interceptor (`AuditInterceptor`) capturing actions, entity types, entity IDs, user context, client IP (`x-forwarded-for`/`req.ip`), and sanitized metadata (redacting passwords and authorization tokens)
  - Dedicated PostgreSQL `AuditLog` model queried via indexed fields (`organizationId`, `userId`, `action`, `entityType`, `createdAt`)
  - Multi-tenant audit logs query API (`GET /api/audit-logs`) with strict tenant isolation (`SUPER_ADMIN` and `AUDITOR` view all logs, regular organizations isolated strictly to their tenant records)
  - Rich multi-field query filters supporting `organizationId`, `userId`, `action`, `entityType`, `entityId`, `dateFrom`, `dateTo`, `search`, `page`, and `limit`
  - Dynamic filter options endpoint (`GET /api/audit-logs/filters/options`) returning distinct actions, entity types, and organizations
  - Audit entry detail retrieval (`GET /api/audit-logs/:id`) with cross-tenant authorization enforcement
  - Enterprise Next.js Audit & Compliance UI (`/audit`) featuring full-text search, action/entity/organization dropdowns, date range pickers, color-coded action badges, client IP tracking, interactive JSON metadata drawer/modal, and compliance CSV/JSON exports
  - Global Navigation bar link integration to `/audit`
- [x] **Phase 14 — Blockchain Explorer**:
  - Blockchain explorer backend service & endpoints:
    - `GET /api/blockchain/status` (node connectivity, chainId, block height, peer count)
    - `GET /api/blockchain/stats` (total indexed transactions, confirmed/failed metrics, gas usage)
    - `GET /api/blockchain/transactions` (paginated list of indexed transactions with filters)
    - `GET /api/blockchain/transactions/:txHash` (detailed tx receipt, gas used, logs, block metadata)
    - `GET /api/blockchain/blocks/:blockNumber` (block header inspection, timestamp, miner, tx list)
  - Dedicated Next.js Blockchain Explorer Dashboard (`/blockchain`):
    - Live node status indicators and EVM network health stats
    - Real-time transaction ledger table with status pills, event badges, and block links
    - Interactive transaction detail modal and block inspector drawer
- [x] **Phase 15 — Automated Testing Suite**:
  - Hardhat Smart Contract unit tests: 100% function coverage on `SupplyChainRegistry.sol`
  - NestJS API unit tests: 23 unit test suites across all services, controllers, guards, and interceptors
  - Next.js Web UI unit tests: 5 Vitest component suites
  - End-to-end (e2e) test suites: 11 comprehensive suites (128 passing tests) validating authentication, RBAC, tenant isolation, products, shipments, QC, traceability, and audit logging
- [x] **Phase 16 — Integration Testing**:
  - Implemented `POST /api/products/:id/sell` with `SellProductDto` to support complete retail lifecycle
  - Created end-to-end multi-actor supply-chain test (`complete-flow.e2e-spec.ts`) executing the full 12-stage custody transfer from manufacturer creation to consumer verification
  - Added `pnpm test:integration` npm script
- [x] **Phase 17 — Documentation**:
  - Exhaustive documentation suite updated across README, PRD, Architecture, Database, Blockchain, API, UI, Security, and Development Plan.
- [x] **Phase 18 — Final Audit**:
  - Comprehensive project-wide code audit: verified zero fake responses, zero hardcoded dashboard metrics, authentic EVM state and transaction hashes, no plaintext passwords or committed secrets, 100% test pass rate across all suites, and clean production builds across NestJS and Next.js.
- [x] **Phase 19 — UI Refinement & Authentication**:
  - Enterprise White / Light Theme (`#FFFFFF`, `#F8FAFC`, `#E2E8F0`, `#0F172A`, `#64748B`) across all web interfaces.
  - Thai-first enterprise localization across all user-facing pages, cards, tables, forms, buttons, dialogs, toasts, error messages, and consumer QR verification.
  - Dedicated `/login` authentication page consuming the existing `POST /api/auth/login` endpoint with email validation, password visibility toggle, quick demo logins, and loading states.
  - Route protection via Next.js Edge Middleware (`apps/web/middleware.ts`) enforcing session authentication for dashboard, products, shipments, QC, traceability, blockchain, and audit pages while preserving public unauthenticated access for `/login` and `/verify`.
  - Global `useAuth` React hook providing session synchronization with `document.cookie` and `localStorage`, dynamic profile fetching (`GET /api/auth/me`), and clean logout handling.
