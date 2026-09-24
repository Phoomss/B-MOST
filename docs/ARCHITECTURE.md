# System Architecture Specification

## 1. High-Level System Architecture

B-MOST is built as a **Modular Monolith** organized within a pnpm monorepo workspace. It unites a high-velocity relational database for application queries with an immutable Ethereum Virtual Machine (EVM) blockchain for multi-organization trust and verification.

```text
                                  ┌─────────────────────────────┐
                                  │      Public Consumer        │
                                  │     (Mobile Smartphone)     │
                                  └──────────────┬──────────────┘
                                                 │ HTTPS (QR Code)
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               Next.js 16 Web Application                                │
│                                                                                         │
│  Executive Dashboard │ Products & Provenance │ Quality Control │ Logistics & Shipments  │
│  Traceability Explorer │ Public QR Verification │ Blockchain Explorer │ Audit Log Portal │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ REST API (JSON / Bearer JWT)
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   NestJS 11 REST API                                    │
│                                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Auth Module  │  │ Org Module   │  │ Users Module │  │ Products Mod │  │  QC Module │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Shipment Mod │  │ Trace Module │  │ PublicVerify │  │ Audit Module │  │ Dash Module│ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Blockchain Module                                     │ │
│  │  ┌──────────────────────────────┐        ┌──────────────────────────────────────┐  │ │
│  │  │   EthersBlockchainService    │        │       BlockchainIndexerService       │  │ │
│  │  │   (Contract Calls / Writes)  │        │   (Continuous Polling / Syncer)      │  │ │
│  │  └──────────────────────────────┘        └──────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┬──────────────────────┘
                           │ Prisma ORM                            │ JSON-RPC (HTTP/WS)
                           ▼                                       ▼
             ┌───────────────────────────┐           ┌───────────────────────────┐
             │       PostgreSQL 16       │           │   Hardhat EVM Blockchain  │
             │   Application Metadata,   │           │    SupplyChainRegistry    │
             │    Users, Orgs, Audit     │           │   State & Critical Events │
             └───────────────────────────┘           └───────────────────────────┘
```

---

## 2. Monorepo Structure

```text
B-MOST/
├── apps/
│   ├── api/                          # NestJS 11 REST Backend
│   │   ├── prisma/                   # Prisma schema & migrations
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── audit-logs/           # Audit logging module & controller
│   │   │   ├── auth/                 # JWT authentication, guards & strategies
│   │   │   ├── blockchain/           # Smart contract adapter & indexing service
│   │   │   ├── common/               # Decorators, filters, interceptors, guards
│   │   │   ├── dashboard/            # Executive analytics & metrics
│   │   │   ├── organizations/        # Multi-tenant organization CRUD
│   │   │   ├── prisma/               # PrismaClient provider
│   │   │   ├── products/             # Product lifecycle & registration
│   │   │   ├── public-verify/        # Unauthenticated QR verification endpoints
│   │   │   ├── quality-checks/       # QC inspection submission & history
│   │   │   ├── shipments/            # Shipment management & custody dispatch
│   │   │   ├── traceability/         # Authoritative provenance & hash matching
│   │   │   ├── users/                # User management & roles
│   │   │   ├── app.module.ts         # Root NestJS module
│   │   │   └── main.ts               # Application entry point with Swagger
│   │   └── test/                     # End-to-end (e2e) test suites & integration
│   │
│   └── web/                          # Next.js 16 (App Router) Frontend
│       ├── src/
│       │   ├── app/                  # Next.js App Router pages
│       │   │   ├── (auth)/login/     # Login view
│       │   │   ├── audit/            # Compliance & audit trail UI
│       │   │   ├── blockchain/       # Live blockchain explorer UI
│       │   │   ├── page.tsx          # Executive dashboard UI
│       │   │   ├── products/         # Product catalog, new product, detail
│       │   │   ├── quality/          # Quality control portal
│       │   │   ├── shipments/        # Logistics & shipment tracking
│       │   │   ├── traceability/     # Multi-actor provenance search
│       │   │   └── verify/           # Public QR consumer verification
│       │   ├── components/           # Reusable UI components & modals
│       │   ├── hooks/                # React custom hooks & auth context
│       │   ├── lib/                  # Axios API client, utils, formatters
│       │   └── types/                # Frontend TypeScript models
│
├── packages/
│   └── contracts/                    # Smart Contracts Workspace
│       ├── contracts/                # Solidity source code
│       │   └── SupplyChainRegistry.sol
│       ├── scripts/                  # Deployment & verification scripts
│       │   └── deploy.ts
│       ├── test/                     # Hardhat contract unit tests
│       │   └── SupplyChainRegistry.test.ts
│       └── hardhat.config.ts         # EVM compiler & network settings
│
├── docs/                             # Comprehensive system documentation
├── docker-compose.yml                # Docker PostgreSQL 16 container
├── pnpm-workspace.yaml               # Monorepo workspace configuration
└── tsconfig.base.json                # Shared TypeScript compiler options
```

---

## 3. Technology Stack

### 3.1 Frontend Web Application
- **Framework**: Next.js 16.0 (App Router architecture with React Server & Client Components)
- **Styling**: Tailwind CSS 3.4 with custom design tokens for enterprise typography and badges
- **Icons**: Lucide React for consistent SVG iconography
- **State Management & Data Fetching**: TanStack Query (React Query) v5 + Axios client
- **Forms & Validation**: React Hook Form with Zod schemas
- **QR Code Engine**: `qrcode.react` for vector QR code rendering and download utilities
- **Testing**: Vitest + React Testing Library

### 3.2 Backend REST API
- **Framework**: NestJS 11.0 (TypeScript modular architecture)
- **Database ORM**: Prisma Client 6.5
- **Relational Database**: PostgreSQL 16 running on port 5433
- **Authentication**: Passport.js, Passport-JWT, bcryptjs for hashing (10 rounds)
- **API Documentation**: `@nestjs/swagger` with OpenAPI 3.0 specs at `/api/docs`
- **Validation**: `class-validator` and `class-transformer` globally configured with strict whitelisting

### 3.3 Blockchain & Ledger
- **Smart Contract Language**: Solidity `^0.8.24`
- **Development & Testing Framework**: Hardhat 2.22
- **Standard Libraries**: OpenZeppelin Contracts v5 (AccessControl)
- **Client Integration Library**: Ethers.js v6 for JSON-RPC provider and contract invocation
- **Local EVM Node**: Hardhat Network on port 8545 (Chain ID 31337)

---

## 4. Architectural Boundaries & Principles

### 4.1 Strict Separation of Concerns
1. **Frontend Boundary**: The Next.js frontend has zero direct connection to PostgreSQL or the EVM RPC node. All communications flow through the NestJS REST API.
2. **Blockchain Boundary**: Other NestJS business modules (`ProductsModule`, `ShipmentsModule`, `QualityChecksModule`) never invoke raw JSON-RPC commands. They depend strictly on the `BlockchainService` interface.
3. **Database Boundary**: Only backend services interact with Prisma ORM.

### 4.2 Dual-Layer Data Responsibility Matrix
- **PostgreSQL**: Acts as the authoritative index for fast search, pagination, relational queries, user identity, and UI layout metadata.
- **Blockchain**: Acts as the authoritative source of truth for **proof of existence**, **cryptographic integrity**, **ownership custody**, and **irreversible state transitions**.

---

## 5. Blockchain Integration & Indexer Architecture

```text
┌─────────────────────────┐
│     EVM Blockchain      │
│  SupplyChainRegistry    │
└────────────┬────────────┘
             │ Emits Event (e.g., ProductShipped)
             ▼
┌─────────────────────────────────────────────────────────┐
│                BlockchainIndexerService                 │
│                                                         │
│  1. Polls latest confirmed blocks on interval (3000ms)  │
│  2. Extracts event topics & logs                        │
│  3. Formats parameters (productId, shipmentId, actor)   │
│  4. Inserts / Updates BlockchainTransaction record      │
│  5. Reconciles state in Product / Shipment table        │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                    │
│                                                         │
│  BlockchainTransaction:                                 │
│  [ txHash | blockNumber | status: CONFIRMED | entityId ]│
└─────────────────────────────────────────────────────────┘
```

### 5.1 Deterministic Cryptographic Fingerprint
To verify that operational product records in PostgreSQL have not been altered, B-MOST computes a deterministic Keccak-256 hash:

$$\text{ProductHash} = \text{keccak256}\Big(\text{productCode} \parallel \text{serialNumber} \parallel \text{manufacturerId} \parallel \text{name}\Big)$$

When queried via `/api/traceability/:code` or `/api/public/verify/:productCode`:
1. The backend recalculates the Keccak-256 hash from the live PostgreSQL record.
2. The backend queries the smart contract via `getProduct(productId)`.
3. If the recalculated hash exactly matches `product.productHash` stored on-chain, the system returns `VERIFIED`. If any character was altered in PostgreSQL, the status returns `MISMATCH`.

---

## 6. Multi-Tenant Data Isolation

```text
Incoming HTTP Request
         │
         ▼
[ JwtAuthGuard ] ──► Validates JWT token & extracts { userId, role, organizationId }
         │
         ▼
[ RolesGuard ] ──► Validates @Roles(...) decorator against user role
         │
         ▼
[ OrganizationIsolationGuard ]
         │
         ├── If user is SUPER_ADMIN or AUDITOR ──► Bypass (Global read access granted)
         │
         └── If user is regular tenant ──► Injects user's organizationId into query filter
                                            Verifies resource currentOwnerId == user.orgId
```

Every database write and state modification verifies that the caller's organization owns the resource:
- Manufacturers can only register products under their own organization ID.
- Organizations can only create shipments for products currently in their legal ownership.
- Only the declared shipment receiver can execute the `receive` action to transfer custody.

---

## 7. End-to-End Sequence Diagram: Custody Transfer

The following sequence illustrates how a physical product moves between two organizations with simultaneous on-chain settlement and relational indexing:

```text
Distributor (Sender)       NestJS API                Hardhat EVM           Receiver (Warehouse)
         │                      │                         │                         │
         │ 1. POST /shipments/ship                        │                         │
         ├─────────────────────►│                         │                         │
         │                      │ 2. Validate Ownership   │                         │
         │                      │ 3. shipProduct(...)     │                         │
         │                      ├────────────────────────►│                         │
         │                      │                         │ 4. Emit ProductShipped  │
         │                      │ 5. Update Status:       │                         │
         │                      │    Product -> SHIPPED   │                         │
         │                      │    Shipment -> SHIPPED  │                         │
         │ 6. Return 200 OK     │                         │                         │
         │◄─────────────────────┤                         │                         │
         │                      │                         │                         │
         │                      │                         │ 7. Physically Delivered │
         │                      │                         │    to Warehouse         │
         │                      │                         │                         │
         │                      │ 8. POST /shipments/receive                        │
         │                      │◄──────────────────────────────────────────────────┤
         │                      │ 9. Verify caller is declared receiver             │
         │                      │ 10. receiveProduct(...)                           │
         │                      ├────────────────────────►│                         │
         │                      │                         │ 11. Emit ProductReceived│
         │                      │                         │ 12. Emit OwnershipTransf│
         │                      │ 13. Update Status:      │                         │
         │                      │     Product -> RECEIVED │                         │
         │                      │     Owner -> Receiver   │                         │
         │                      │     Shipment -> DELIVRD │                         │
         │                      │ 14. Return 200 OK       │                         │
         │                      ├──────────────────────────────────────────────────►│
```

---

## 8. Resilience & Error Handling

1. **Transactional Reversions**: All multi-step database mutations use Prisma interactive transactions (`prisma.$transaction`) to prevent orphan states if an operation aborts mid-flight.
2. **Blockchain Timeout Protection**: Blockchain RPC invocations are handled with timeout fallbacks and translated into clean HTTP error payloads:
   - `PRODUCT_NOT_FOUND` (404)
   - `INVALID_STATE_TRANSITION` (400)
   - `UNAUTHORIZED_ACTION` (403)
   - `TRANSACTION_FAILED` (500)
3. **Audit Log Resiliency**: Audit logging is implemented through a global `AuditInterceptor`. If an audit record insertion encounters an internal database glitch, it fails gracefully without blocking the user's primary transaction.
