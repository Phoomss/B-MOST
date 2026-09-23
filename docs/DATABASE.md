# Database Design

## 1. Database

Use:

**PostgreSQL**

ORM:

**Prisma**

---

# 2. Core Entities

```text
Organization
    │
    ├── User
    │
    ├── Product
    │
    ├── Shipment
    │
    └── QualityCheck

Product
    │
    ├── QualityCheck
    ├── Shipment
    ├── AuditLog
    └── BlockchainTransaction
```

---

# 3. Organization

Fields:

```text
id
name
code
type
address
contactEmail
phone
walletAddress
status
createdAt
updatedAt
```

Types:

```text
MANUFACTURER
DISTRIBUTOR
WAREHOUSE
RETAILER
LOGISTICS
AUDITOR
```

---

# 4. User

Fields:

```text
id
email
passwordHash
firstName
lastName
role
organizationId
status
createdAt
updatedAt
```

Roles:

```text
SUPER_ADMIN
ORG_ADMIN
MANUFACTURER
DISTRIBUTOR
WAREHOUSE
RETAILER
AUDITOR
VIEWER
```

---

# 5. Product

Fields:

```text
id
productCode
serialNumber
name
description
category
manufacturerId
currentOwnerId
blockchainProductId
productHash
blockchainTxHash
status
createdAt
updatedAt
```

Constraints:

* productCode unique
* serialNumber unique
* blockchainProductId unique where applicable

---

# 6. Shipment

Fields:

```text
id
shipmentCode
productId
senderOrganizationId
receiverOrganizationId
carrierOrganizationId
origin
destination
status
blockchainShipmentId
blockchainTxHash
shippedAt
receivedAt
createdAt
updatedAt
```

---

# 7. QualityCheck

Fields:

```text
id
productId
organizationId
inspectorName
result
notes
blockchainTxHash
createdAt
```

Results:

```text
PENDING
PASSED
FAILED
```

---

# 8. BlockchainTransaction

Fields:

```text
id
txHash
blockNumber
contractAddress
eventType
entityType
entityId
walletAddress
status
createdAt
```

Transaction status:

```text
PENDING
CONFIRMED
FAILED
```

---

# 9. AuditLog

Fields:

```text
id
userId
organizationId
action
entityType
entityId
metadata
ipAddress
createdAt
```

---

# 10. Suggested Prisma Relations

```text
Organization
 ├── users
 ├── productsManufactured
 ├── productsOwned
 ├── shipmentsSent
 ├── shipmentsReceived
 └── qualityChecks

User
 ├── organization
 └── auditLogs

Product
 ├── manufacturer
 ├── currentOwner
 ├── qualityChecks
 ├── shipments
 └── blockchainTransactions

Shipment
 ├── product
 ├── sender
 ├── receiver
 └── carrier
```

---

# 11. Indexes

Create indexes for:

```text
User.email
User.organizationId
Product.productCode
Product.serialNumber
Product.manufacturerId
Product.currentOwnerId
Product.status
Shipment.shipmentCode
Shipment.productId
Shipment.status
BlockchainTransaction.txHash
BlockchainTransaction.entityId
AuditLog.organizationId
AuditLog.createdAt
```

---

# 12. Data Integrity

Use:

* foreign keys
* unique constraints
* enum types
* transactions where necessary

Never allow orphaned records.

---

# 13. Blockchain Data

Do not duplicate the entire blockchain database.

Store references such as:

```text
txHash
blockNumber
contractAddress
eventType
blockchainEntityId
```

Detailed blockchain state should be retrieved from the blockchain when authoritative verification is required.

---

# 14. Database Transactions

Use database transactions when multiple related records must be created or updated together.

Example:

```text
Create Shipment
+
Create Shipment Audit Log
```

must be atomic.

---

# 15. Migration

All schema changes must use Prisma migrations.

Never manually modify production database schemas.