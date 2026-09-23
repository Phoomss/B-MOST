# Product Requirements Document

## 1. Project Overview

### Project Name

**Blockchain-Based Multi-Organization Supply Chain Traceability Platform**

### Thai Name

**ระบบติดตามและตรวจสอบห่วงโซ่อุปทานหลายองค์กรด้วยเทคโนโลยีบล็อกเชน**

### Project Type

University Blockchain Project

### Project Goal

Develop a web-based multi-organization supply-chain traceability platform that uses Blockchain and Smart Contracts to record critical supply-chain events in a transparent, tamper-resistant, and auditable manner.

The system connects multiple organizations participating in a supply chain:

```text
Manufacturer
      ↓
Distributor
      ↓
Warehouse
      ↓
Retailer
      ↓
Customer
```

The system allows authorized organizations to create, transfer, receive, inspect, and trace products.

Customers can verify product information and its supply-chain history through a QR code.

---

# 2. Problem Statement

Traditional supply-chain systems often store information in databases controlled by individual organizations.

This creates several problems:

* Different organizations may maintain separate records.
* Data reconciliation between organizations can be difficult.
* Historical records may be modified by authorized database administrators.
* Customers may have limited visibility into product history.
* Auditors may need to collect information from multiple organizations.
* There is no shared immutable record of critical supply-chain events.

The project addresses these problems by using Blockchain as a shared ledger for critical events.

---

# 3. Proposed Solution

Create a multi-organization platform where:

* Organizations manage their own operational data.
* PostgreSQL stores application and operational metadata.
* Blockchain stores critical supply-chain state and events.
* Smart Contracts enforce important business rules.
* Blockchain events are indexed into PostgreSQL for efficient searching.
* Users can trace a product across multiple organizations.
* Customers can verify products through QR codes.

---

# 4. Project Objectives

## Primary Objectives

1. Implement a real blockchain-based supply-chain system.
2. Support multiple organizations.
3. Implement role-based access control.
4. Record critical product events on blockchain.
5. Provide end-to-end product traceability.
6. Provide public product verification.
7. Provide blockchain transaction visibility.
8. Provide an audit trail.
9. Demonstrate why Blockchain is useful in multi-organization systems.

---

# 5. Target Users

## Super Administrator

Manages the entire platform.

## Organization Administrator

Manages users and data within an organization.

## Manufacturer

Registers products and performs quality checks.

## Distributor

Receives and transfers products.

## Warehouse

Manages product storage and movement.

## Retailer

Receives products and marks them as sold.

## Auditor

Reviews product history and blockchain records.

## Customer

Verifies product authenticity and history.

---

# 6. User Roles

| Role         | Main Responsibility         |
| ------------ | --------------------------- |
| SUPER_ADMIN  | System administration       |
| ORG_ADMIN    | Organization administration |
| MANUFACTURER | Product production          |
| DISTRIBUTOR  | Distribution                |
| WAREHOUSE    | Storage                     |
| RETAILER     | Retail                      |
| AUDITOR      | Auditing                    |
| VIEWER       | Read-only access            |

---

# 7. Core Features

## 7.1 Authentication

* Login
* Logout
* JWT authentication
* Role-based authorization
* Organization-based authorization
* Password hashing

---

## 7.2 Organization Management

SUPER_ADMIN can:

* Create organizations
* Update organizations
* Activate/deactivate organizations
* Assign organization types
* Register organization wallet addresses

---

## 7.3 User Management

Authorized administrators can:

* Create users
* Assign roles
* Assign organization
* Activate/deactivate users

---

## 7.4 Product Management

Manufacturers can:

* Register products
* Generate product code
* Generate serial number
* Register product on blockchain
* Perform quality checks
* Generate QR code

---

## 7.5 Shipment Management

Organizations can:

* Create shipments
* Select sender
* Select receiver
* Select carrier
* Define origin
* Define destination
* Ship products
* Receive products

---

## 7.6 Quality Control

Authorized organizations can:

* Perform quality checks
* Record PASS / FAIL
* Add notes
* Record inspector
* Record timestamp
* Store blockchain transaction reference

---

## 7.7 Traceability

Users can view:

* Product lifecycle
* Ownership history
* Shipment history
* Quality checks
* Blockchain events
* Transaction hashes
* Participating organizations

---

## 7.8 QR Verification

Each product has a QR code.

The QR code points to:

```text
/verify/{productCode}
```

Customers can view:

* Product name
* Product code
* Manufacturer
* Current status
* Supply-chain timeline
* Verification result
* Blockchain references

---

## 7.9 Blockchain Explorer

Authorized users can inspect:

* Transaction hash
* Block number
* Sender
* Receiver
* Contract address
* Event type
* Transaction status
* Timestamp

---

## 7.10 Audit Log

The system records:

* User
* Organization
* Action
* Entity
* Entity ID
* Timestamp
* IP address
* Metadata

---

# 8. Product Lifecycle

```text
REGISTERED
    ↓
QUALITY_CHECKED
    ↓
READY_TO_SHIP
    ↓
SHIPPED
    ↓
IN_TRANSIT
    ↓
RECEIVED
    ↓
STORED
    ↓
SOLD
```

Alternative state:

```text
RECALLED
```

Invalid state transitions must be rejected.

---

# 9. Functional Requirements

## FR-01 Authentication

Users must authenticate before accessing protected features.

## FR-02 Organization Isolation

Users must only access data permitted by their organization and role.

## FR-03 Product Registration

Manufacturers must be able to register products.

## FR-04 Blockchain Registration

Product registration must create a real blockchain transaction.

## FR-05 Quality Check

Authorized users must be able to perform quality checks.

## FR-06 Shipment Creation

Authorized users must be able to create shipments.

## FR-07 Product Transfer

Products must be transferable between organizations.

## FR-08 Product Receiving

Receiving organizations must be able to confirm receipt.

## FR-09 Product Sale

Retailers must be able to mark products as sold.

## FR-10 Product Recall

Authorized users must be able to recall products.

## FR-11 Traceability

The system must display the complete product history.

## FR-12 QR Verification

Customers must be able to verify products through QR codes.

## FR-13 Blockchain Verification

The system must verify critical information against blockchain state.

## FR-14 Audit Logging

Important actions must create audit records.

---

# 10. Non-Functional Requirements

## Performance

* API should respond quickly for normal CRUD operations.
* Database queries must use appropriate indexes.
* Blockchain operations must expose pending/confirmed states.

## Reliability

* Failed blockchain transactions must not be treated as successful.
* Database and blockchain state must be reconciled.

## Security

* Passwords must never be stored in plaintext.
* JWT must be validated server-side.
* RBAC must be enforced server-side.
* Sensitive information must not be stored on-chain.

## Maintainability

* Modular backend
* Typed API
* Typed blockchain interface
* Clear documentation
* Automated tests

---

# 11. Blockchain Usage

Blockchain is responsible for:

* Product registration
* Product hash
* Ownership
* Product status
* Critical supply-chain events
* Immutable event history

PostgreSQL is responsible for:

* Users
* Organizations
* Product metadata
* Shipment metadata
* Audit metadata
* Search/indexing
* Analytics

---

# 12. MVP Scope

The MVP must include:

* Authentication
* RBAC
* Multi-organization support
* Product registration
* Smart Contract
* Blockchain integration
* Shipment
* Product receiving
* Ownership transfer
* Quality check
* Traceability
* QR verification
* Dashboard
* Audit log

---

# 13. Out of Scope

Do not implement in the initial version:

* Real IoT sensors
* Real GPS tracking
* Real payment processing
* Real logistics provider integration
* AI forecasting
* Cryptocurrency payments
* NFT marketplace
* Mobile application

These may be future extensions.

---

# 14. Success Criteria

The project is successful when a complete workflow can be demonstrated:

```text
Manufacturer
→ Register Product
→ Blockchain Transaction
→ Quality Check
→ Create Shipment
→ Distributor Receives
→ Transfer Ownership
→ Warehouse Receives
→ Retailer Receives
→ Product Sold
→ Customer Scans QR
→ Customer Views Traceability
```

All critical blockchain actions must use real transactions.

