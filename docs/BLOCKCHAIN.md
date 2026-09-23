# Blockchain Specification

## 1. Network

Development:

```text
Hardhat Local Network
```

Future deployment:

```text
Ethereum Sepolia
Polygon Amoy
```

---

# 2. Smart Contract

Contract:

```text
SupplyChainRegistry.sol
```

Framework:

```text
Solidity
Hardhat
OpenZeppelin
```

---

# 3. Product Structure

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
```

---

# 4. Product Status

```solidity
enum ProductStatus {
    REGISTERED,
    QUALITY_CHECKED,
    READY_TO_SHIP,
    SHIPPED,
    IN_TRANSIT,
    RECEIVED,
    STORED,
    SOLD,
    RECALLED
}
```

---

# 5. Smart Contract Functions

## registerProduct

Registers a product.

Requirements:

* product ID must be unique
* product code must be unique
* manufacturer must be authorized

---

## recordQualityCheck

Records a quality-check event.

Requirements:

* caller must be authorized
* product must exist
* product must be in valid state

---

## createShipment

Creates a shipment reference.

---

## shipProduct

Changes product state to SHIPPED.

---

## receiveProduct

Changes product state to RECEIVED.

---

## transferOwnership

Changes the current owner.

---

## markAsSold

Changes status to SOLD.

---

## recallProduct

Changes status to RECALLED.

---

## getProduct

Returns current blockchain state.

---

## getProductHistory

Returns product event history.

---

# 6. Events

```solidity
event ProductRegistered(...);

event QualityChecked(...);

event ShipmentCreated(...);

event ProductShipped(...);

event ProductReceived(...);

event OwnershipTransferred(...);

event ProductSold(...);

event ProductRecalled(...);
```

---

# 7. Access Control

Use OpenZeppelin AccessControl where appropriate.

Roles may include:

```text
DEFAULT_ADMIN_ROLE
MANUFACTURER_ROLE
DISTRIBUTOR_ROLE
WAREHOUSE_ROLE
RETAILER_ROLE
AUDITOR_ROLE
```

The exact role implementation should remain consistent with the application's organization model.

---

# 8. State Transition Rules

Valid examples:

```text
REGISTERED
→ QUALITY_CHECKED

QUALITY_CHECKED
→ READY_TO_SHIP

READY_TO_SHIP
→ SHIPPED

SHIPPED
→ IN_TRANSIT

IN_TRANSIT
→ RECEIVED

RECEIVED
→ STORED

STORED
→ SHIPPED

STORED
→ SOLD
```

Recall may occur from appropriate non-final states.

Invalid transitions must revert.

---

# 9. Product Hash

Use:

```text
keccak256(...)
```

The hash should be generated from deterministic product information.

Example:

```text
productCode
+
serialNumber
+
manufacturer
+
important metadata
```

Do not store passwords or sensitive personal data on-chain.

---

# 10. Blockchain Transaction Flow

```text
Frontend
    ↓
NestJS API
    ↓
BlockchainService
    ↓
Smart Contract
    ↓
Transaction
    ↓
Block Confirmation
    ↓
Event
    ↓
Event Listener
    ↓
PostgreSQL Index
```

---

# 11. Blockchain Event Indexer

The backend must listen for contract events.

When an event occurs:

1. Parse event.
2. Extract transaction hash.
3. Extract block number.
4. Extract event data.
5. Identify related entity.
6. Store index record.
7. Update application state if necessary.

---

# 12. Transaction Status

Frontend must distinguish:

```text
PENDING
CONFIRMED
FAILED
```

Never display a failed transaction as successful.

---

# 13. Blockchain Verification

The verification service should compare:

```text
PostgreSQL Product Hash
        vs
Blockchain Product Hash
```

Return:

```text
VERIFIED
```

when hashes match.

Otherwise:

```text
MISMATCH
```

---

# 14. Wallet

Use MetaMask for development.

Frontend must support:

* connect
* disconnect
* address display
* chain detection
* network mismatch warning

---

# 15. Local Blockchain

Document:

```bash
pnpm blockchain:node
pnpm blockchain:deploy
```

The deployment script must output:

```text
Contract Address
Network
Chain ID
Deployment Transaction
```

---

# 16. Security

Never commit:

```text
DEPLOYER_PRIVATE_KEY
MNEMONIC
API_KEYS
```

Use `.env`.

---

# 17. Blockchain Design Principle

The blockchain should not become a general-purpose storage system.

Only critical information requiring:

* immutability
* shared verification
* transparency
* auditability

should be recorded on-chain.