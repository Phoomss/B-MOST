# SupplyChainRegistry Smart Contract Specification

The `SupplyChainRegistry` smart contract acts as the decentralized source of truth for the B-MOST platform. It manages product identity, quality inspections, multi-organization logistics, ownership custody, and life-cycle events.

---

## 1. Contract Overview

| Field | Detail |
| --- | --- |
| **Contract Name** | `SupplyChainRegistry` |
| **Solidity Version** | `^0.8.24` |
| **Framework & Base** | Hardhat, OpenZeppelin `AccessControl` v5.2.0 |
| **Network** | Ethereum Sepolia Testnet |
| **Chain ID** | `11155111` |
| **Deployed Address** | `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a` |
| **License** | MIT |

---

## 2. On-Chain Data Structures

### 2.1 Enums

```solidity
enum ProductStatus {
    REGISTERED,       // 0: Freshly minted by Manufacturer
    QUALITY_CHECKED,  // 1: Passed QC inspection
    READY_TO_SHIP,    // 2: Shipment created by current owner
    SHIPPED,          // 3: Dispatched from facility
    IN_TRANSIT,       // 4: Carrier actively transporting goods
    RECEIVED,         // 5: Delivered & accepted by receiver (ownership transferred)
    STORED,           // 6: Placed into warehouse / store storage
    SOLD,             // 7: Sold to final consumer
    RECALLED          // 8: Terminal state for defects / hazards
}

enum ShipmentStatus {
    PENDING,          // 0: Created, awaiting dispatch
    SHIPPED,          // 1: Picked up by carrier
    IN_TRANSIT,       // 2: En route
    DELIVERED,        // 3: Received and confirmed by recipient
    CANCELLED         // 4: Reserved enum value (no contract transition)
}
```

### 2.2 Structs

```solidity
struct Product {
    uint256 productId;           // Auto-incrementing on-chain ID
    string productCode;          // Unique business SKU
    bytes32 productHash;         // keccak256 hash of product attributes
    address manufacturer;        // Wallet that minted the product
    address currentOwner;        // Current legal owner wallet
    ProductStatus status;        // State machine status
    uint256 registeredAt;        // Block timestamp
}

struct QualityCheck {
    uint256 checkId;             // Auto-incrementing inspection ID
    uint256 productId;           // Associated product ID
    address inspector;           // Inspector wallet address
    bool passed;                 // Inspection result
    string notes;                // Inspection commentary
    uint256 checkedAt;           // Block timestamp
}

struct Shipment {
    uint256 shipmentId;          // Auto-incrementing shipment ID
    string shipmentCode;         // Unique tracking reference code
    uint256 productId;           // Associated product ID
    address sender;              // Shipping organization wallet
    address receiver;            // Receiving organization wallet
    address carrier;             // Logistics / transport carrier wallet
    ShipmentStatus status;       // Shipment status enum
    uint256 createdAt;           // Block timestamp
    uint256 shippedAt;           // Dispatch block timestamp
    uint256 receivedAt;          // Delivery block timestamp
}

struct ProductEventRecord {
    string eventType;            // e.g. "REGISTERED", "SHIPPED"
    address actor;               // Wallet address triggering the action
    uint256 timestamp;           // Block timestamp
    string details;              // Supplementary textual notes
}
```

---

## 3. Modifiers

- `productExists(uint256 productId)`: Reverts with `"PRODUCT_NOT_FOUND"` if `_products[productId].productId == 0`.
- `onlyProductOwner(uint256 productId)`: Reverts with `"NOT_CURRENT_OWNER"` if `msg.sender != _products[productId].currentOwner`.

---

## 4. State-Modifying Functions

### 4.1 Product Registration & Inspection
- **`registerProduct(string productCode, bytes32 productHash) external returns (uint256)`**
  - **Prerequisites**: `hasRole(MANUFACTURER_ROLE, msg.sender)`, unique `productCode`, non-zero `productHash`.
  - **Effect**: Increments product counter, initializes `Product` with status `REGISTERED`, assigns `manufacturer` and `currentOwner` to `msg.sender`, emits `ProductRegistered`.
- **`recordQualityCheck(uint256 productId, bool passed, string notes) external`**
  - **Prerequisites**: Product status must be `REGISTERED`. Caller must have `AUDITOR_ROLE` or `MANUFACTURER_ROLE` or be `currentOwner`.
  - **Effect**:
    - If `passed == true`: product status becomes `QUALITY_CHECKED`.
    - If `passed == false`: product status becomes `RECALLED` (terminal), emits `ProductRecalled`.
    - Appends inspection to history and emits `QualityChecked`.

### 4.2 Logistics & Custody Transfer
- **`createShipment(string shipmentCode, uint256 productId, address receiver, address carrier) external returns (uint256)`**
  - **Prerequisites**: Caller must be `currentOwner` or `DEFAULT_ADMIN_ROLE`. `receiver != address(0)` and `receiver != msg.sender`. Product status must be `QUALITY_CHECKED` or `STORED`.
  - **Effect**: Creates `Shipment` in `PENDING` state. Advances product status to `READY_TO_SHIP`. Emits `ShipmentCreated`.
- **`shipProduct(uint256 productId, uint256 shipmentId) external`**
  - **Prerequisites**: Product status must be `READY_TO_SHIP` and shipment status `PENDING`. Caller must be `currentOwner`, `carrier`, `LOGISTICS_ROLE`, or admin.
  - **Effect**: Product status becomes `SHIPPED`, shipment status becomes `SHIPPED`. Sets `shippedAt`. Emits `ProductShipped`.
- **`markInTransit(uint256 productId, uint256 shipmentId) external`**
  - **Prerequisites**: Product and shipment status must be `SHIPPED`. Caller must be `carrier`, `currentOwner`, `LOGISTICS_ROLE`, or admin.
  - **Effect**: Product status becomes `IN_TRANSIT`, shipment status becomes `IN_TRANSIT`. Emits `ShipmentInTransit`.
- **`receiveProduct(uint256 productId, uint256 shipmentId) external`**
  - **Prerequisites**: Product & shipment status must be `SHIPPED` or `IN_TRANSIT`. Caller must be `shipment.receiver` or admin.
  - **Effect**:
    - Product status becomes `RECEIVED`.
    - Product `currentOwner` is automatically updated to `shipment.receiver`.
    - Shipment status becomes `DELIVERED` with `receivedAt` timestamp.
    - Emits `ProductReceived` and `OwnershipTransferred`.

### 4.3 Storage, Retail & Lifecycle Operations
- **`storeProduct(uint256 productId) external`**
  - **Prerequisites**: Caller must be `currentOwner`. Product status must be `RECEIVED`.
  - **Effect**: Product status becomes `STORED`. Emits `ProductStored`. (From `STORED`, the owner can begin the next shipment leg or sell).
- **`transferOwnership(uint256 productId, address newOwner) external`**
  - **Prerequisites**: Caller must be `currentOwner`. `newOwner != address(0)` and `newOwner != msg.sender`. Status cannot be `RECALLED` or `SOLD`.
  - **Effect**: Updates `currentOwner` to `newOwner`. Emits `OwnershipTransferred`.
- **`markAsSold(uint256 productId) external`**
  - **Prerequisites**: Caller must be `currentOwner`. Product status must be `STORED`.
  - **Effect**: Product status becomes `SOLD`. Emits `ProductSold`.
- **`recallProduct(uint256 productId, string reason) external`**
  - **Prerequisites**: Caller must be `manufacturer`, `currentOwner`, `AUDITOR_ROLE`, or admin. Product cannot be already `RECALLED`.
  - **Effect**: Product status transitions immediately to `RECALLED`. Emits `ProductRecalled`.

---

## 5. View Functions

| Function Signature | Return Type | Description |
| --- | --- | --- |
| `getProduct(uint256 productId)` | `Product` | Retrieves product struct by on-chain ID |
| `getProductByCode(string productCode)` | `Product` | Retrieves product struct by unique SKU string |
| `getShipment(uint256 shipmentId)` | `Shipment` | Retrieves shipment struct by ID |
| `getShipmentByCode(string shipmentCode)` | `Shipment` | Retrieves shipment struct by reference code |
| `getQualityChecks(uint256 productId)` | `QualityCheck[]` | Returns all inspection logs for a product |
| `getProductHistory(uint256 productId)` | `ProductEventRecord[]` | Returns chronological event history |
| `getTotalProducts()` | `uint256` | Current product counter total |
| `getTotalShipments()` | `uint256` | Current shipment counter total |

---

## 6. Events Specification

All significant state changes emit indexed Solidity events:

```solidity
event ProductRegistered(uint256 indexed productId, string productCode, bytes32 productHash, address indexed manufacturer, uint256 timestamp);
event QualityChecked(uint256 indexed productId, address indexed inspector, bool passed, string notes, uint256 timestamp);
event ShipmentCreated(uint256 indexed shipmentId, string shipmentCode, uint256 indexed productId, address indexed sender, address receiver, address carrier, uint256 timestamp);
event ProductShipped(uint256 indexed productId, uint256 indexed shipmentId, address indexed sender, uint256 timestamp);
event ShipmentInTransit(uint256 indexed productId, uint256 indexed shipmentId, address indexed carrier, uint256 timestamp);
event ProductReceived(uint256 indexed productId, uint256 indexed shipmentId, address indexed receiver, uint256 timestamp);
event ProductStored(uint256 indexed productId, address indexed owner, uint256 timestamp);
event OwnershipTransferred(uint256 indexed productId, address indexed previousOwner, address indexed newOwner, uint256 timestamp);
event ProductSold(uint256 indexed productId, address indexed seller, uint256 timestamp);
event ProductRecalled(uint256 indexed productId, address indexed recalledBy, string reason, uint256 timestamp);
```
