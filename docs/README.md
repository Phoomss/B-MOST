# B-MOST Documentation

Welcome to the comprehensive technical documentation for **B-MOST** (Blockchain-Based Multi-Organization Supply Chain Traceability Platform).

---

## 1. Quick Technical Reference

| Parameter | Specification |
| --- | --- |
| **Network** | Ethereum Sepolia Testnet |
| **Chain ID** | `11155111` (`0xaa36a7`) |
| **Contract Name** | `SupplyChainRegistry` |
| **Deployed Address** | [`0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a`](https://sepolia.etherscan.io/address/0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a) |
| **Frontend Stack** | Next.js 16, React 19, Tailwind CSS 4, viem v2 |
| **Backend Stack** | NestJS 11, Prisma ORM 6, ethers v6 |
| **Database** | PostgreSQL 16 |
| **Package Manager** | `pnpm@11.1.1` (monorepo workspaces) |

---

## 2. Documentation Directory

### Architecture
- [System Architecture](architecture/system-architecture.md): Component tiers, boundaries, communication protocols, and web route hierarchy.
- [Blockchain Architecture](architecture/blockchain-architecture.md): On-chain vs off-chain storage design, client signing rationale, ABI packages, and event indexer.
- [Data Flow & Persistence](architecture/data-flow.md): End-to-end data progression, Prisma database models, database UUID vs contract ID disparity, and synchronization guarantees.

### Development & Operations
- [Getting Started](development/getting-started.md): Local machine prerequisites, repository setup, host development workflow, and verified monorepo scripts.
- [Environment Configuration](development/environment.md): Comprehensive inventory of backend, database, and Next.js public environment variables.
- [Docker & Containers](development/docker.md): Docker Compose architecture, Compose Watch development setup, ports, and migration execution.
- [Troubleshooting Guide](development/troubleshooting.md): Diagnosing RPC connectivity, wallet mismatches, pending sync recovery, and port conflicts.

### Blockchain & Smart Contracts
- [Smart Contract Specification](blockchain/smart-contract.md): Detailed Solidity functions, modifiers, parameters, view helpers, and emitted events for `SupplyChainRegistry`.
- [Roles & Permissions](blockchain/roles.md): Separation of application RBAC from smart contract AccessControl, wallet ownership rules, and authorization matrix.
- [Product & Shipment Lifecycles](blockchain/product-lifecycle.md): Complete finite state machine diagrams and transition tables for products and multi-leg shipments.
- [Transaction Protocol & Flow](blockchain/transaction-flow.md): The two-phase action protocol (`prepare` → MetaMask signing → `confirm`), sequence diagrams, and error handling.

### API & Integration
- [REST API Overview](api/overview.md): NestJS REST controllers, JWT authentication, Swagger UI, major resources, and modern vs legacy write paths.

### Guides & Walkthroughs
- [End-to-End Demonstration Guide](guides/demo-flow.md): Step-by-step supply chain tutorial through Manufacturing, Distribution, Warehousing, Retail, and Consumer QR verification.

### Security & Governance
- [Security Controls & Policy](security/security.md): Implemented security controls, password hashing, non-custodial signing, receipt validation, and secret classification.

### Historical Reference
- [Product Requirements (PRD)](reference/prd.md): Original product requirements and functional scope.
- [Development Plan](reference/development-plan.md): Monorepo verification status and milestone tracking.
- [System Test Dataset](reference/system-test-dataset.md): Seed fixtures, demo organizations, and default accounts.

---

## 3. Source of Truth Hierarchy

When resolving inconsistencies between documentation and code, follow this precedence order:
1. **Current Executable Source Code** (`apps/web`, `apps/api`)
2. **Solidity Smart Contracts** (`packages/contracts/contracts/SupplyChainRegistry.sol`)
3. **Database Schema** (`apps/api/prisma/schema.prisma`)
4. **Package Scripts & Monorepo Config** (`package.json`, `pnpm-workspace.yaml`)
5. **Docker Compose Configuration** (`docker-compose.yml`, `docker-compose.dev.yml`)
6. **Documentation** (`docs/`)
