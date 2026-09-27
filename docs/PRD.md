# Product requirements and scope

This document records B-MOST's product intent. For observed behavior, use [architecture](ARCHITECTURE.md), [blockchain lifecycle](BLOCKCHAIN.md), [API](API.md), and the repository source.

## Problem and objective

Organizations in a supply chain need a shared, auditable account of product origin, quality, custody, and sale. B-MOST keeps operational records in PostgreSQL and anchors selected milestones in `SupplyChainRegistry` on Sepolia. Customers can verify a product by code or QR link without logging in.

## Actors

Manufacturer registers a product and starts its first shipment. Distributor and Warehouse receive, store, and forward the same product. Retailer receives, stores, and marks it sold. Auditor can inspect and recall under the implemented permission checks. Super Admin manages organizations and public wallet assignments. Customer reads the public verification view. Application role and contract authorization are separate; see [roles](BLOCKCHAIN.md#contract-roles-and-application-roles).

## Current functional scope

- JWT login, user/organization records, and application RBAC.
- Product drafts and one-time on-chain registration by an authorized Manufacturer wallet.
- Quality check, shipment creation, dispatch, optional in-transit update, receipt, storage, sale, transfer, and recall through prepared wallet actions.
- Authenticated traceability, public verification and QR generation, dashboards, audit logs, and blockchain explorer reads.
- Receipt verification and PostgreSQL synchronization after MetaMask signing.

The detailed lifecycle and operation prerequisites are in [blockchain](BLOCKCHAIN.md#product-states). Contract `CANCELLED` is an enum value without an implemented transition. Older API write routes remain registered but backend signing is disabled; see [API](API.md#legacy-write-endpoints).

## Data and trust boundaries

PostgreSQL owns user, organization, and operational details; the contract owns its numeric IDs, owner wallet, hash, and status. `Product.id` and `Shipment.id` are UUIDs and must never be substituted for contract IDs. A QR lookup verifies the recorded product against available on-chain data; it does not prove the physical item's authenticity by itself.

## Future changes

Any new contract transition, organization flow, role grant, or public data field requires implementation and tests before being described as available. Historical phase completion and test counts are not evidence of the current build state.
