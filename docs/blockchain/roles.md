# Roles, Permissions & Authorization Matrix

In B-MOST, security and authority are enforced through two distinct layers:
1. **Application-Level RBAC**: Enforced by NestJS controllers, JWT guards, and Prisma database models.
2. **Smart-Contract AccessControl & Wallet Identity**: Enforced by `SupplyChainRegistry.sol` on the Ethereum Sepolia blockchain.

---

## 1. Application Roles vs Contract Roles

> [!IMPORTANT]
> **An application role does NOT automatically grant an on-chain contract role.**
> A user can have the application role `MANUFACTURER`, but their connected MetaMask wallet must separately possess `MANUFACTURER_ROLE` on-chain to execute `registerProduct()`.

### 1.1 Application Roles (`UserRole` Enum in Prisma)
- `SUPER_ADMIN`: Full administrative control across all organizations, wallet mapping, contract event syncing, and role management.
- `ORG_ADMIN`: Organization-level manager for members and internal workflow.
- `MANUFACTURER`: Production and assembly staff. Creates product drafts, submits blockchain registration, and ships first leg.
- `DISTRIBUTOR`: Logistics distributor. Receives products, manages regional storage, and initiates downstream shipments.
- `WAREHOUSE`: Storage and fulfillment center. Receives custody, manages warehouse binning, and prepares forward shipments.
- `RETAILER`: Storefront or retail point. Receives final shipment, places in store storage, and marks sold to consumer.
- `AUDITOR`: Regulatory and quality control officer. Inspects products, issues quality certificates, and triggers recalls.
- `VIEWER`: Read-only operational observer.

### 1.2 Smart-Contract Roles (`AccessControl` in Solidity)
- `DEFAULT_ADMIN_ROLE`: OpenZeppelin admin role. Can grant and revoke contract roles. Assigned to deployer / contract admin.
- `MANUFACTURER_ROLE`: Authorized to invoke `registerProduct()`.
- `DISTRIBUTOR_ROLE`: Registered distributor wallet identity.
- `WAREHOUSE_ROLE`: Registered warehouse wallet identity.
- `RETAILER_ROLE`: Registered retail wallet identity.
- `LOGISTICS_ROLE`: Authorized carrier for `shipProduct()` and `markInTransit()`.
- `AUDITOR_ROLE`: Authorized inspector for `recordQualityCheck()` and `recallProduct()`.

---

## 2. Wallet Identity vs Contract Roles

Many contract functions enforce authority through **ownership and transaction context** rather than named roles:

- **Current Owner (`currentOwner == msg.sender`)**: Once a product is received, the holder is the `currentOwner`. They have absolute authority to `storeProduct()`, `createShipment()`, or `markAsSold()`, regardless of whether their address holds an explicit `DISTRIBUTOR_ROLE` or `RETAILER_ROLE`.
- **Shipment Receiver (`msg.sender == shipment.receiver`)**: Only the designated receiver can invoke `receiveProduct()`.
- **Designated Carrier (`msg.sender == shipment.carrier`)**: The specified carrier address is authorized to transition shipments to `SHIPPED` and `IN_TRANSIT`.

---

## 3. Action Authorization Matrix

This table defines the authorization requirements across both the application API and the smart contract:

| Operation | Required Application Role | Required Contract Permission | Required Entity State |
| --- | --- | --- | --- |
| **`registerProduct`** | `SUPER_ADMIN` or `MANUFACTURER` (Org wallet match) | `MANUFACTURER_ROLE` | Draft product exists; code not yet registered on-chain |
| **`recordQualityCheck`** | `SUPER_ADMIN`, `MANUFACTURER`, or `AUDITOR` | `AUDITOR_ROLE`, `MANUFACTURER_ROLE`, or `currentOwner` | `Product.status == REGISTERED` |
| **`createShipment`** | `SUPER_ADMIN`, `MANUFACTURER`, `DISTRIBUTOR`, or `WAREHOUSE` | `currentOwner == msg.sender` or `DEFAULT_ADMIN_ROLE` | `Product.status == QUALITY_CHECKED` or `STORED` |
| **`shipProduct`** | Sender org member or designated carrier | `currentOwner`, `carrier`, `LOGISTICS_ROLE`, or Admin | `Product.status == READY_TO_SHIP` and `Shipment.status == PENDING` |
| **`markInTransit`** | Carrier or sender org member | `carrier`, `currentOwner`, `LOGISTICS_ROLE`, or Admin | `Product.status == SHIPPED` and `Shipment.status == SHIPPED` |
| **`receiveProduct`** | Receiver org member | `msg.sender == shipment.receiver` or Admin | `Product.status == SHIPPED` or `IN_TRANSIT` |
| **`storeProduct`** | Current owner org member | `currentOwner == msg.sender` | `Product.status == RECEIVED` |
| **`markAsSold`** | `SUPER_ADMIN` or `RETAILER` | `currentOwner == msg.sender` | `Product.status == STORED` |
| **`transferOwnership`**| Current owner org member | `currentOwner == msg.sender` | Any state except `RECALLED` or `SOLD` |
| **`recallProduct`** | `SUPER_ADMIN`, `MANUFACTURER`, or `AUDITOR` | `manufacturer`, `currentOwner`, `AUDITOR_ROLE`, or Admin | Any state except already `RECALLED` |

---

## 4. On-Chain Role Management

Super Admins can grant or revoke contract roles for organization wallets:
- **API Endpoints**:
  - `GET /api/blockchain/roles/:wallet`: Inspects on-chain roles for any Ethereum address.
  - `POST /api/blockchain/roles/prepare`: Prepares `grantRole` or `revokeRole` calldata for `DISTRIBUTOR_ROLE`, `WAREHOUSE_ROLE`, or `RETAILER_ROLE`.
- **Signing Requirement**: The role modification transaction must be signed by a MetaMask account holding `DEFAULT_ADMIN_ROLE` on the Sepolia contract.
