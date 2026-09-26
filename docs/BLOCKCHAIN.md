# Blockchain & Smart Contract Specification

The application currently uses the Sepolia deployment at `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a` (Chain ID `11155111`). See [Wallet and Role Mapping](WALLET_ROLES.md) for the current database addresses and verified contract roles. The local Hardhat details below describe an optional development network.

## 1. Network & Infrastructure

### 1.1 Development Environment
- **Node**: Local Hardhat EVM Node
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency**: ETH (Testnet)
- **Default Deployer**: Account #0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)

### 1.2 Target Public Networks
- **Ethereum Sepolia Testnet** (Chain ID: `11155111`)
- **Polygon Amoy Testnet** (Chain ID: `80002`)

---

## 2. Smart Contract Overview

### 2.1 Contract Metadata
- **Contract Name**: `SupplyChainRegistry.sol`
- **Solidity Version**: `^0.8.24`
- **Compiler Optimization**: Enabled (200 runs)
- **Inheritance**: OpenZeppelin `AccessControl`

### 2.2 Role Definitions
```solidity
bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
bytes32 public constant DISTRIBUTOR_ROLE  = keccak256("DISTRIBUTOR_ROLE");
bytes32 public constant WAREHOUSE_ROLE    = keccak256("WAREHOUSE_ROLE");
bytes32 public constant RETAILER_ROLE     = keccak256("RETAILER_ROLE");
bytes32 public constant LOGISTICS_ROLE    = keccak256("LOGISTICS_ROLE");
bytes32 public constant AUDITOR_ROLE      = keccak256("AUDITOR_ROLE");
```

---

## 3. Data Structures & Enums

### 3.1 Enums
```solidity
enum ProductStatus {
    REGISTERED,       // 0 - Product minted on-chain
    QUALITY_CHECKED,  // 1 - Passed inspection
    READY_TO_SHIP,    // 2 - Staged for carrier pickup
    SHIPPED,          // 3 - Dispatched from facility
    IN_TRANSIT,       // 4 - Moving with carrier
    RECEIVED,         // 5 - Delivered & accepted by receiver
    STORED,           // 6 - Stored in warehouse/stockroom
    SOLD,             // 7 - Purchased by end customer (terminal)
    RECALLED          // 8 - Safety/quality recall (terminal)
}

enum ShipmentStatus {
    PENDING,          // 0 - Created, not yet dispatched
    SHIPPED,          // 1 - Picked up by carrier
    IN_TRANSIT,       // 2 - En route to destination
    DELIVERED,        // 3 - Received by recipient
    CANCELLED         // 4 - Aborted prior to dispatch
}
```

### 3.2 Structs
```solidity
struct Product {
    uint256 productId;
    string productCode;
    bytes32 productHash;
    address manufacturer;
    address currentOwner;
    ProductStatus status;
    uint256 registeredAt;
}

struct QualityCheck {
    uint256 checkId;
    uint256 productId;
    address inspector;
    bool passed;
    string notes;
    uint256 checkedAt;
}

struct Shipment {
    uint256 shipmentId;
    string shipmentCode;
    uint256 productId;
    address sender;
    address receiver;
    address carrier;
    ShipmentStatus status;
    uint256 createdAt;
    uint256 shippedAt;
    uint256 receivedAt;
}

struct ProductEventRecord {
    string eventType;
    address actor;
    uint256 timestamp;
    string details;
}
```

---

## 4. Contract Methods Specification

### 4.1 `registerProduct`
Registers a new physical product on-chain.
```solidity
function registerProduct(
    string calldata productCode,
    bytes32 productHash
) external returns (uint256)
```
- **Access**: Caller must have `MANUFACTURER_ROLE`.
- **Validation**:
  - `bytes(productCode).length > 0`
  - `productHash != bytes32(0)`
  - `_productCodeToId[productCode] == 0` (Reverts with `PRODUCT_ALREADY_EXISTS`)
- **Emits**: `ProductRegistered(productId, productCode, productHash, msg.sender, timestamp)`

---

### 4.2 `recordQualityCheck`
Records a formal technical or compliance inspection.
```solidity
function recordQualityCheck(
    uint256 productId,
    bool passed,
    string calldata notes
) external
```
- **Access**: Caller must have `AUDITOR_ROLE`, `MANUFACTURER_ROLE`, or be the `currentOwner`.
- **Validation**:
  - Product must exist.
  - `product.status != ProductStatus.RECALLED`
  - `product.status != ProductStatus.SOLD`
- **State Transition**:
  - If `passed == true`: Sets `status = QUALITY_CHECKED`.
  - If `passed == false`: Sets `status = RECALLED`.
- **Emits**: `QualityChecked(...)`, and conditionally `ProductRecalled(...)`.

---

### 4.3 `createShipment`
Creates an on-chain shipment tracking manifest.
```solidity
function createShipment(
    string calldata shipmentCode,
    uint256 productId,
    address receiver,
    address carrier
) external returns (uint256)
```
- **Access**: Caller must be `currentOwner` or have `DEFAULT_ADMIN_ROLE`.
- **Validation**:
  - Product status must be `QUALITY_CHECKED`, `STORED`, or `READY_TO_SHIP`.
  - `receiver != address(0) && receiver != msg.sender`
  - `shipmentCode` must be unique.
- **State Transition**: Sets `product.status = READY_TO_SHIP`.
- **Emits**: `ShipmentCreated(...)`.

---

### 4.4 `shipProduct`
Dispatches product into logistics custody.
```solidity
function shipProduct(
    uint256 productId,
    uint256 shipmentId
) external
```
- **Access**: `currentOwner`, assigned `carrier`, or `LOGISTICS_ROLE`.
- **Validation**: Product must be in `READY_TO_SHIP`, `QUALITY_CHECKED`, or `STORED`.
- **State Transition**: Sets `product.status = SHIPPED`, `shipment.status = SHIPPED`.
- **Emits**: `ProductShipped(...)`.

---

### 4.5 `markInTransit`
Updates progress while in transit.
```solidity
function markInTransit(
    uint256 productId,
    uint256 shipmentId
) external
```
- **Access**: `carrier`, `currentOwner`, or `LOGISTICS_ROLE`.
- **Validation**: Product must currently be `SHIPPED`.
- **State Transition**: Sets `product.status = IN_TRANSIT`, `shipment.status = IN_TRANSIT`.
- **Emits**: `ShipmentInTransit(...)`.

---

### 4.6 `receiveProduct`
Confirms delivery and atomically executes custody transfer.
```solidity
function receiveProduct(
    uint256 productId,
    uint256 shipmentId
) external
```
- **Access**: Declared `receiver` on the shipment or `DEFAULT_ADMIN_ROLE`.
- **Validation**: Product status must be `SHIPPED` or `IN_TRANSIT`.
- **State Transition**:
  - Sets `product.status = RECEIVED`
  - Sets `product.currentOwner = shipment.receiver`
  - Sets `shipment.status = DELIVERED`
- **Emits**: `ProductReceived(...)` and `OwnershipTransferred(...)`.

---

### 4.7 `storeProduct`
Marks delivered goods as inventory stored in a warehouse or stockroom.
```solidity
function storeProduct(uint256 productId) external
```
- **Access**: `onlyProductOwner(productId)`
- **Validation**: Product status must be `RECEIVED`.
- **State Transition**: Sets `product.status = STORED`.
- **Emits**: `ProductStored(...)`.

---

### 4.8 `transferOwnership`
Explicit direct ownership transfer outside of a shipment workflow.
```solidity
function transferOwnership(
    uint256 productId,
    address newOwner
) external
```
- **Access**: `onlyProductOwner(productId)`
- **Validation**: `newOwner != address(0) && newOwner != msg.sender`, product not `SOLD` or `RECALLED`.
- **Emits**: `OwnershipTransferred(...)`.

---

### 4.9 `markAsSold`
Finalizes supply chain lifecycle at the retail store point of sale.
```solidity
function markAsSold(uint256 productId) external
```
- **Access**: `onlyProductOwner(productId)`
- **Validation**: Product status must be `STORED` or `RECEIVED`.
- **State Transition**: Sets `product.status = SOLD`.
- **Emits**: `ProductSold(productId, msg.sender, timestamp)`.

---

### 4.10 `recallProduct`
Emergency product revocation.
```solidity
function recallProduct(
    uint256 productId,
    string calldata reason
) external
```
- **Access**: Original `manufacturer`, `currentOwner`, `AUDITOR_ROLE`, or `DEFAULT_ADMIN_ROLE`.
- **Validation**: Product cannot already be `RECALLED`.
- **State Transition**: Sets `product.status = RECALLED`.
- **Emits**: `ProductRecalled(productId, msg.sender, reason, timestamp)`.

---

### 4.11 View & Read Methods
- `getProduct(uint256 productId) external view returns (Product memory)`
- `getProductByCode(string calldata productCode) external view returns (Product memory)`
- `getShipment(uint256 shipmentId) external view returns (Shipment memory)`
- `getShipmentByCode(string calldata shipmentCode) external view returns (Shipment memory)`
- `getQualityChecks(uint256 productId) external view returns (QualityCheck[] memory)`
- `getProductHistory(uint256 productId) external view returns (ProductEventRecord[] memory)`
- `getTotalProducts() external view returns (uint256)`
- `getTotalShipments() external view returns (uint256)`

---

## 5. Gas Usage Benchmarks

| Function | Average Gas Cost (units) |
|---|:---:|
| `registerProduct` | ~112,000 gas |
| `recordQualityCheck` (PASS) | ~85,000 gas |
| `recordQualityCheck` (FAIL) | ~92,000 gas |
| `createShipment` | ~128,000 gas |
| `shipProduct` | ~56,000 gas |
| `markInTransit` | ~44,000 gas |
| `receiveProduct` (with custody transfer) | ~68,000 gas |
| `storeProduct` | ~38,000 gas |
| `markAsSold` | ~42,000 gas |
| `recallProduct` | ~58,000 gas |

---

## 6. Deterministic Keccak-256 Hashing Algorithm

In NestJS backend (`ProductsService`):
```typescript
import { ethers } from 'ethers';

export function calculateProductHash(
  productCode: string,
  serialNumber: string,
  manufacturerId: string,
  name: string
): string {
  return ethers.keccak256(
    ethers.toUtf8Bytes(
      `${productCode}:${serialNumber}:${manufacturerId}:${name}`
    )
  );
}
```

---

## 7. Event Indexing Loop

The `BlockchainIndexerService` continuously syncs on-chain state to PostgreSQL:
1. Every 3,000ms, calls `provider.getBlockNumber()`.
2. Queries contract events from the last processed block to current block.
3. For each event log (`ProductRegistered`, `ProductShipped`, etc.), checks whether a `BlockchainTransaction` record exists in PostgreSQL.
4. If missing, inserts the record and updates corresponding product and shipment statuses.
