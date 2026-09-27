# Product Requirements & Scope Reference

> [!NOTE]
> This document records the original product requirements document (PRD) and functional scope for B-MOST. For live implementation details, refer to the [System Architecture](../architecture/system-architecture.md), [Smart Contract Specification](../blockchain/smart-contract.md), and [API Overview](../api/overview.md).

---

## 1. Problem Statement & Objectives

Traditional supply chains face opacity, fragmented recordkeeping across organizational boundaries, and high risk of counterfeiting or gray-market diversion. B-MOST provides:
- A shared, multi-organization traceability network where custody handoffs and quality milestones are anchored to the Ethereum Sepolia blockchain.
- Fast relational querying, draft management, and audit logging via PostgreSQL and NestJS.
- Accessible, unauthenticated consumer verification via standard QR codes.

---

## 2. Platform Actors & Roles

1. **Manufacturer**: Registers initial product assets, records batch properties, passes quality inspection, and initiates the first logistics leg.
2. **Distributor**: Receives goods from manufacturer, manages regional storage, and dispatches forward shipments.
3. **Warehouse**: Manages inventory buffering and fulfillment logistics.
4. **Retailer**: Accepts retail delivery, stores items in retail inventory, and marks products sold at point-of-sale.
5. **Auditor / Inspector**: Certified third party verifying product compliance, conducting quality inspections, or issuing recalls.
6. **Consumer**: Public end-user scanning QR codes to verify authenticity, origin, and complete chain-of-custody history.
7. **Super Admin**: System administrator managing organizations, user roles, and public Ethereum wallet mappings.

---

## 3. Core Functional Scope

- **JWT Authentication & RBAC**: Secure role-based login and organization-scoped record access.
- **Product Drafts & Notarization**: Products start as editable drafts in PostgreSQL and are committed to Sepolia only when finalized.
- **Two-Phase Action Protocol**: Browser-based signing with MetaMask via viem, receipt verification, and database state synchronization.
- **Multi-Leg Logistics Tracking**: Supports chaining multiple shipments across organizations while maintaining continuous product provenance.
- **Public Provenance Portal**: Fast consumer verification pages (`/verify/[code]`) with authenticity badges and blockchain links.
- **Explorer & Audit Logs**: On-chain block explorer and immutable database audit logs capturing all critical actions.
