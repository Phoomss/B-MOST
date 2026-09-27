# Database Design & Specification

## 1. Overview

B-MOST utilizes **PostgreSQL 16** as its relational operational database, accessed through **Prisma ORM 6.5** with full TypeScript typing. The database stores application metadata, user accounts, tenant relationships, shipment tracking logs, inspection records, and indexed blockchain transaction receipts.

---

## 2. Entity-Relationship Model

```text
┌─────────────────────────┐
│      Organization       │
│  (id, name, code, etc)  │
└────────────┬────────────┘
             │ 1:N
             ├──► [ User ] (userId, email, role, organizationId)
             │
             ├──► [ Product (as Manufacturer) ] (manufacturerId)
             ├──► [ Product (as Current Owner) ] (currentOwnerId)
             │
             ├──► [ Shipment (as Sender) ] (senderOrganizationId)
             ├──► [ Shipment (as Receiver) ] (receiverOrganizationId)
             ├──► [ Shipment (as Carrier) ] (carrierOrganizationId)
             │
             ├──► [ QualityCheck ] (organizationId)
             └──► [ AuditLog ] (organizationId)

┌─────────────────────────┐
│         Product         │
│  (id, productCode, ...) │
└────────────┬────────────┘
             │ 1:N
             ├──► [ QualityCheck ] (productId)
             ├──► [ Shipment ] (productId)
             └──► [ BlockchainTransaction ] (productId)
```

---

## 3. Enums Specification

### 3.1 `OrganizationType`
- `MANUFACTURER`: Originates products and executes manufacturing quality checks.
- `DISTRIBUTOR`: Bulk wholesale logistics provider.
- `WAREHOUSE`: Intermediate regional staging and storage facility.
- `RETAILER`: Consumer point-of-sale merchant.
- `LOGISTICS`: Third-party freight forwarder / carrier.
- `AUDITOR`: Independent regulatory inspection body.

### 3.2 `OrganizationStatus`
- `ACTIVE`: Fully operational within the platform.
- `INACTIVE`: Temporarily paused; cannot dispatch new shipments.
- `SUSPENDED`: Blocked by platform administrator due to regulatory breach.

### 3.3 `UserRole`
- `SUPER_ADMIN`: Global administrator with unconstrained multi-tenant access.
- `ORG_ADMIN`: Administrator managing personnel and configurations within one organization.
- `MANUFACTURER`: Operator creating products and manufacturing inspections.
- `DISTRIBUTOR`: Logistics coordinator handling wholesale transfers.
- `WAREHOUSE`: Stockroom manager handling storage and dispatch.
- `RETAILER`: Merchant managing retail receiving and sales.
- `AUDITOR`: Independent compliance inspector.
- `VIEWER`: Read-only internal observer.

### 3.4 `UserStatus`
- `ACTIVE`: Active account permitted to log in.
- `INACTIVE`: Account pending activation or deactivated.
- `SUSPENDED`: Access revoked.

### 3.5 `ProductStatus`
- `REGISTERED` (0): Created by manufacturer; anchored to smart contract.
- `QUALITY_CHECKED` (1): Passed formal quality inspection.
- `READY_TO_SHIP` (2): Assigned to an outbound shipment; staged for pickup.
- `SHIPPED` (3): Dispatched from origin facility.
- `IN_TRANSIT` (4): Actively moving with logistics carrier.
- `RECEIVED` (5): Delivery confirmed; ownership transferred to recipient.
- `STORED` (6): Staged in warehouse inventory.
- `SOLD` (7): Purchased by consumer (terminal state).
- `RECALLED` (8): Revoked due to defect, failure, or safety alert (terminal state).

### 3.6 `ShipmentStatus`
- `PENDING`: Shipment manifest created; pending pickup.
- `SHIPPED`: Picked up from sender origin.
- `IN_TRANSIT`: Actively traveling between nodes.
- `DELIVERED`: Delivered and confirmed by recipient.
- `CANCELLED`: Shipment aborted prior to dispatch.

### 3.7 `QualityCheckResult`
- `PENDING`: Inspection in progress.
- `PASSED`: Certified meeting all technical and safety standards.
- `FAILED`: Substandard; triggers product recall.

### 3.8 `TxStatus`
- `PENDING`: Transaction submitted to blockchain mempool.
- `CONFIRMED`: Included in a confirmed block.
- `FAILED`: Transaction reverted by EVM.

---

## 4. Model Specifications

### 4.1 `Organization`
Represents an independent supply chain enterprise.

| Field | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | `String` (UUID) | No | `uuid()` | Primary Key |
| `name` | `String` | No | - | Enterprise business name |
| `code` | `String` | No | - | Unique enterprise code (e.g. `ORG-MFG-001`) |
| `type` | `OrganizationType` | No | - | Functional role in the supply chain |
| `address` | `String` | Yes | - | Physical operating address |
| `contactEmail`| `String` | Yes | - | Operational contact email |
| `phone` | `String` | Yes | - | Contact phone number |
| `walletAddress`| `String` | Yes | - | Ethereum public address (`0x...`) |
| `status` | `OrganizationStatus`| No | `ACTIVE` | Account status |
| `createdAt` | `DateTime` | No | `now()` | Timestamp created |
| `updatedAt` | `DateTime` | No | Auto | Timestamp last modified |

**Indexes:**
- `@@unique([code])`
- `@@unique([walletAddress])`
- `@@index([code])`, `@@index([type])`, `@@index([status])`

---

### 4.2 `User`
Authorized personnel associated with an organization.

| Field | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | `String` (UUID) | No | `uuid()` | Primary Key |
| `email` | `String` | No | - | Unique login email |
| `passwordHash`| `String` | No | - | Bcrypt password hash (10 salt rounds) |
| `firstName` | `String` | No | - | First name |
| `lastName` | `String` | No | - | Last name |
| `role` | `UserRole` | No | - | RBAC authorization role |
| `organizationId`| `String` (UUID)| Yes | - | Foreign Key -> `Organization.id` |
| `status` | `UserStatus` | No | `ACTIVE` | Account status |
| `createdAt` | `DateTime` | No | `now()` | Timestamp created |
| `updatedAt` | `DateTime` | No | Auto | Timestamp last modified |

**Indexes:**
- `@@unique([email])`
- `@@index([email])`, `@@index([organizationId])`, `@@index([role])`

---

### 4.3 `Product`
Physical unit tracked through the supply chain.

| Field | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | `String` (UUID) | No | `uuid()` | Primary Key |
| `productCode` | `String` | No | - | Unique human-readable code (e.g. `PRD-EV-1001`) |
| `serialNumber`| `String` | No | - | Unique hardware/batch serial (e.g. `SN-2026-9901`) |
| `name` | `String` | No | - | Product model name |
| `description` | `String` | Yes | - | Extended specifications |
| `category` | `String` | Yes | - | Taxonomy category (e.g. `Electronics`) |
| `manufacturerId`| `String` (UUID)| No | - | Foreign Key -> `Organization.id` (Creator) |
| `currentOwnerId`| `String` (UUID)| No | - | Foreign Key -> `Organization.id` (Current Custodian) |
| `blockchainProductId` | `String` | Yes | - | Numeric on-chain ID from smart contract |
| `productHash` | `String` | Yes | - | Keccak-256 hash string (`0x...`) |
| `blockchainTxHash` | `String` | Yes | - | Initial registration transaction hash |
| `status` | `ProductStatus` | No | `REGISTERED`| Current lifecycle state |
| `createdAt` | `DateTime` | No | `now()` | Timestamp created |
| `updatedAt` | `DateTime` | No | Auto | Timestamp last modified |

**Indexes:**
- `@@unique([productCode])`
- `@@unique([serialNumber])`
- `@@unique([blockchainProductId])`
- `@@index([productCode])`, `@@index([serialNumber])`, `@@index([manufacturerId])`, `@@index([currentOwnerId])`, `@@index([status])`

---

### 4.4 `Shipment`
Custodial movement of a product between two organizations.

| Field | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | `String` (UUID) | No | `uuid()` | Primary Key |
| `shipmentCode`| `String` | No | - | Unique tracking code (e.g. `SHP-2026-8801`) |
| `productId` | `String` (UUID) | No | - | Foreign Key -> `Product.id` |
| `senderOrganizationId` | `String` (UUID) | No | - | Foreign Key -> `Organization.id` |
| `receiverOrganizationId`| `String` (UUID) | No | - | Foreign Key -> `Organization.id` |
| `carrierOrganizationId` | `String` (UUID) | Yes | - | Foreign Key -> `Organization.id` |
| `origin` | `String` | No | - | Physical dispatch location |
| `destination` | `String` | No | - | Physical delivery destination |
| `status` | `ShipmentStatus`| No | `PENDING` | Current logistics status |
| `blockchainShipmentId` | `String` | Yes | - | Numeric on-chain ID from smart contract |
| `blockchainTxHash` | `String` | Yes | - | Blockchain creation tx hash |
| `shippedAt` | `DateTime` | Yes | - | Physical dispatch timestamp |
| `receivedAt`| `DateTime` | Yes | - | Physical delivery timestamp |
| `createdAt` | `DateTime` | No | `now()` | Timestamp created |
| `updatedAt` | `DateTime` | No | Auto | Timestamp last modified |

**Indexes:**
- `@@unique([shipmentCode])`
- `@@index([shipmentCode])`, `@@index([productId])`, `@@index([status])`, `@@index([senderOrganizationId])`, `@@index([receiverOrganizationId])`

---

### 4.5 `QualityCheck`
Formal technical or regulatory inspection of a product.

| Field | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | `String` (UUID) | No | `uuid()` | Primary Key |
| `productId` | `String` (UUID) | No | - | Foreign Key -> `Product.id` |
| `organizationId`| `String` (UUID)| No | - | Foreign Key -> `Organization.id` |
| `inspectorName` | `String` | No | - | Name of authorized inspector |
| `result` | `QualityCheckResult`| No | - | `PASSED` or `FAILED` |
| `notes` | `String` | Yes | - | Technical observations or test scores |
| `blockchainTxHash` | `String` | Yes | - | On-chain execution receipt hash |
| `createdAt` | `DateTime` | No | `now()` | Timestamp created |

**Indexes:**
- `@@index([productId])`, `@@index([organizationId])`, `@@index([result])`

---

### 4.6 `BlockchainTransaction`
Indexed on-chain transaction records synchronized from the EVM node.

| Field | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | `String` (UUID) | No | `uuid()` | Primary Key |
| `txHash` | `String` | No | - | Unique Ethereum transaction hash (`0x...`) |
| `blockNumber`| `BigInt` | Yes | - | Confirmed block height |
| `contractAddress`| `String`| No | - | `SupplyChainRegistry` contract address |
| `eventType` | `String` | No | - | Event name (`ProductRegistered`, etc.) |
| `entityType`| `String` | No | - | Target entity (`Product`, `Shipment`, etc.) |
| `entityId` | `String` | No | - | Associated entity UUID |
| `productId` | `String` (UUID) | Yes | - | Foreign Key -> `Product.id` |
| `walletAddress`| `String` | No | - | Caller signing address |
| `status` | `TxStatus` | No | `PENDING` | `CONFIRMED`, `PENDING`, or `FAILED` |
| `createdAt` | `DateTime` | No | `now()` | Ingestion timestamp |

**Indexes:**
- `@@unique([txHash])`
- `@@index([txHash])`, `@@index([entityId])`, `@@index([productId])`, `@@index([eventType])`, `@@index([status])`

---

### 4.7 `AuditLog`
Immutable compliance and operational activity log.

| Field | Type | Nullable | Default | Description |
|---|---|:---:|:---:|---|
| `id` | `String` (UUID) | No | `uuid()` | Primary Key |
| `userId` | `String` (UUID) | Yes | - | Foreign Key -> `User.id` |
| `organizationId`| `String` (UUID)| Yes | - | Foreign Key -> `Organization.id` |
| `action` | `String` | No | - | Action name (e.g. `PRODUCT_SELL`, `SHIPMENT_RECEIVE`) |
| `entityType`| `String` | No | - | Target model name |
| `entityId` | `String` | No | - | Target record UUID |
| `metadata` | `Json` | Yes | - | Sanitized request parameters (passwords redacted) |
| `ipAddress` | `String` | Yes | - | Client IP (`x-forwarded-for` or `remoteAddress`) |
| `createdAt` | `DateTime` | No | `now()` | Log capture timestamp |

**Indexes:**
- `@@index([organizationId])`, `@@index([userId])`, `@@index([createdAt])`, `@@index([entityType])`, `@@index([action])`

---

## 5. Database Transactions & Integrity

1. **Atomic Multi-Entity Updates**: When receiving a shipment, both the `Shipment` status and the `Product.currentOwnerId` are updated within a single `prisma.$transaction([ ... ])` block.
2. **Referential Integrity Constraints**:
   - Deleting an `Organization` is prevented if active products or shipments reference it (`onDelete: Restrict`).
   - If a `User` account is deleted, foreign keys in `AuditLog` are preserved with `onDelete: SetNull` to maintain compliance audit history.
3. **Data Migrations**:
   - All migrations are tracked via Prisma CLI: `pnpm db:migrate`.
   - Seed data is loaded deterministically via `pnpm db:seed`.