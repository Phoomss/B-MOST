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
