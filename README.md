# B-MOST (Blockchain Multi-Organization Supply Chain Traceability)

> **ระบบติดตามและตรวจสอบห่วงโซ่อุปทานหลายองค์กรด้วยเทคโนโลยีบล็อกเชน**

A web-based multi-organization supply-chain traceability platform using Blockchain (EVM / Solidity) and Smart Contracts to record critical supply-chain events in a transparent, tamper-resistant, and auditable manner.

---

## 🏗 Monorepo Architecture

This project is organized as a pnpm workspace monorepo:

```text
B-MOST/
├── apps/
│   ├── api/          # NestJS 11 REST API with Swagger & Blockchain module
│   └── web/          # Next.js 16 (App Router) with Tailwind CSS UI
├── packages/         # Shared libraries & contracts (Smart Contracts in Hardhat)
├── docs/             # Product & Architecture Specifications
├── docker-compose.yml# PostgreSQL 16 container definition
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node v25)
- **pnpm**: v11+
- **Docker & Docker Compose** (for PostgreSQL)

### 2. Environment Setup
Copy the environment variables template:
```bash
cp .env.example .env
```

### 3. Start PostgreSQL Database
```bash
pnpm docker:up
# or: docker compose up -d
```

### 4. Install Dependencies
```bash
pnpm install
```

### 5. Run Development Servers
To run both backend and frontend concurrently:
```bash
pnpm dev
```

Or run services individually:
```bash
# Backend (NestJS on port 4000)
pnpm dev:api

# Frontend (Next.js on port 3000)
pnpm dev:web
```

---

## 🌐 Endpoints & Ports

| Service | Port | URL | Description |
|---|---|---|---|
| **Frontend** | `3000` | `http://localhost:3000` | Next.js Web Application & Verification |
| **Backend API** | `4000` | `http://localhost:4000/api` | NestJS REST API |
| **API Docs (Swagger)** | `4000` | `http://localhost:4000/api/docs` | OpenAPI / Swagger Interface |
| **PostgreSQL** | `5433` | `localhost:5433` | Relational application database (Docker) |

---

## 🛠 Available Scripts

- `pnpm dev`: Start all apps in parallel
- `pnpm build`: Build all applications
- `pnpm test`: Run unit test suites across all workspaces
- `pnpm test:e2e`: Run end-to-end integration and RBAC test suites
- `pnpm docker:up`: Launch PostgreSQL container in the background
- `pnpm docker:down`: Stop PostgreSQL container
- `pnpm db:migrate`: Run Prisma migrations on the database
- `pnpm db:seed`: Seed initial organizations, users, and product data
- `pnpm db:studio`: Launch Prisma Studio database GUI

---

## 📋 Implemented Modules & Features

- [x] **Phase 1 — Project Setup**: Monorepo with pnpm, Next.js 16, NestJS 11, PostgreSQL Docker container.
- [x] **Phase 2 — Database**: Prisma schema, relations, indexes, migrations, and seed script.
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

