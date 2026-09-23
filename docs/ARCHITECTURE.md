# System Architecture

## 1. Architecture Overview

The system uses a modular monolith architecture.

```text
                    ┌─────────────────────┐
                    │      Customer       │
                    │    QR Verification  │
                    └──────────┬──────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────┐
│                 Next.js Web Application              │
│                                                     │
│ Dashboard │ Products │ Shipments │ Traceability     │
│ Blockchain │ Audit │ Organizations │ Verification   │
└──────────────────────────┬──────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────┐
│                    NestJS API                        │
│                                                     │
│ Auth │ Users │ Organizations │ Products             │
│ Shipments │ Quality │ Traceability │ Audit          │
│                                                     │
│                Blockchain Module                    │
└──────────────┬─────────────────────┬────────────────┘
               │                     │
               ▼                     ▼
      ┌─────────────────┐   ┌────────────────────────┐
      │   PostgreSQL    │   │    Smart Contract      │
      │                 │   │ SupplyChainRegistry    │
      │ Application     │   └───────────┬────────────┘
      │ Data + Indexing │               │
      └─────────────────┘               ▼
                                  EVM Blockchain
```

---

# 2. Technology Stack

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Query
* React Hook Form
* Zod
* Recharts
* QR Code
* viem

## Backend

* NestJS
* TypeScript
* Prisma
* PostgreSQL
* JWT
* Swagger

## Blockchain

* Solidity
* Hardhat
* OpenZeppelin
* EVM
* viem

## Infrastructure

* Docker
* Docker Compose
* pnpm

---

# 3. Architectural Principles

## Separation of Concerns

Frontend must not directly access PostgreSQL.

Frontend communicates with backend APIs.

Backend communicates with:

* PostgreSQL
* Blockchain

---

## Blockchain Boundary

Only the Blockchain module may directly interact with Smart Contracts.

Other backend modules must use the BlockchainService abstraction.

---

## Database Boundary

Only backend services may access PostgreSQL.

---

# 4. Backend Modules

```text
src/
├── auth/
├── users/
├── organizations/
├── products/
├── shipments/
├── quality-checks/
├── traceability/
├── blockchain/
├── audit/
├── dashboard/
└── common/
```

---

# 5. Blockchain Module

Responsibilities:

* RPC connection
* Contract initialization
* Transaction submission
* Transaction confirmation
* Event listening
* Event indexing
* Blockchain reads
* Blockchain verification

---

# 6. Data Ownership Model

## PostgreSQL

Source of truth for application data.

## Blockchain

Source of truth for critical immutable supply-chain events.

Neither system should be treated as a replacement for the other.

---

# 7. Event Indexing

When blockchain events occur:

```text
Smart Contract
      ↓
Blockchain Event
      ↓
Blockchain Listener
      ↓
Blockchain Service
      ↓
PostgreSQL
      ↓
Traceability API
      ↓
Frontend
```

---

# 8. Transaction Lifecycle

```text
User Action
    ↓
Frontend
    ↓
Backend API
    ↓
Authorization
    ↓
Business Validation
    ↓
Blockchain Service
    ↓
Smart Contract
    ↓
Pending
    ↓
Confirmed
    ↓
Event Emitted
    ↓
Event Indexed
    ↓
Database Updated
    ↓
Frontend Updated
```

---

# 9. Multi-Tenancy

Every organization-owned entity must contain organization references where appropriate.

Authorization must validate:

```text
User
↓
Role
↓
Organization
↓
Resource
↓
Permission
```

Never rely only on frontend filtering.

---

# 10. API Communication

Frontend communicates with backend through REST APIs.

Use:

* JSON
* HTTP status codes
* DTO validation
* consistent error responses

---

# 11. Frontend Architecture

```text
app/
components/
features/
hooks/
lib/
services/
types/
```

Use feature-oriented organization where appropriate.

---

# 12. Error Handling

Blockchain errors must be translated into understandable application errors.

Examples:

```text
PRODUCT_NOT_FOUND
INVALID_STATE_TRANSITION
UNAUTHORIZED_ACTION
TRANSACTION_FAILED
TRANSACTION_PENDING
WALLET_NOT_CONNECTED
NETWORK_MISMATCH
```

---

# 13. Scalability Considerations

The MVP uses a modular monolith.

Future versions may separate:

* Blockchain Indexer
* Notification Service
* Analytics Service
* Logistics Integration Service

Do not implement microservices unless required.

---

# 14. Architecture Decision

The project intentionally avoids storing large data directly on-chain.

Blockchain stores critical proof/state.

PostgreSQL stores operational data.

This reduces blockchain cost and keeps the system practical.
