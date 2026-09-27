# B-MOST Presentation Context

## Audit basis

Phase 1 technical audit, 2026-09-27. Repository HEAD: `020588dd2b1484910ef24899fe9147a81a1fad83`, plus current working tree. This document describes inspected source and local tests. Live deployment, browser operation, wallet balances and deployed database contents were not verified. See [CODEX_REVIEW.md](CODEX_REVIEW.md).

## Project and message

**B-MOST — Blockchain-Based Multi-Organization Supply Chain Traceability Platform**  
ระบบติดตามและตรวจสอบห่วงโซ่อุปทานหลายองค์กรด้วยเทคโนโลยีบล็อกเชน

> One Product. One Journey. Verifiable History.

B-MOST addresses fragmented product and custody records across organizations. It connects product records, inspections and shipments in PostgreSQL with selected state changes and history in an Ethereum smart contract. Consumers can open public verification by product code or QR URL.

Say “verifiable recorded history.” Blockchain does not prove inspection truth, physical possession or authenticity of an item bearing a copied QR label.

Session target: presentation 3 minutes, demo 5 minutes, Q&A 2 minutes. This phase supplies technical content; slides and speaker scripts belong to Phase 2.

## Supply chain and participants

`Manufacturer → Distributor → Warehouse → Retailer → Customer verification`

This is a supported business scenario, not an organization order enforced by the contract. One product retains its identity; each delivery leg gets a new shipment. Customer verification is a public read. Sale changes status without transferring ownership to a customer wallet.

| Participant | Normal implemented application flow |
| --- | --- |
| Manufacturer | Create SQL draft, register via MetaMask, QC, create shipment, dispatch |
| Distributor | Receive, store, create and dispatch another shipment |
| Warehouse | Receive, store, create and dispatch another shipment |
| Retailer | Receive, store, mark sold |
| Auditor | Broad reads; QC and recall through permitted API actions subject to contract authority; no dedicated recall button found |
| Super Admin | Organization administration and wallet mapping; contract role preparation through API subject to on-chain admin authority |
| Customer | Public lookup/verification; no application account or wallet needed |

Prisma also defines application roles ORG_ADMIN and VIEWER. LOGISTICS is an organization type and LOGISTICS_ROLE exists on-chain; there is no Logistics application user role. Do not imply a separate dedicated portal for every role.

## Product and shipment lifecycle

A database draft has blockchainProductId = null although its SQL status is already REGISTERED. There is no DRAFT enum or separate draft flag.

After on-chain registration:

```text
REGISTERED → QUALITY_CHECKED → READY_TO_SHIP → SHIPPED
                                                  ↓
                                      [optional IN_TRANSIT]
                                                  ↓
                                              RECEIVED → STORED → SOLD
                                                           ↓
                                               next leg: READY_TO_SHIP
```

- QC failure changes REGISTERED to RECALLED.
- Explicit recall is allowed from every state except RECALLED, including SOLD.
- Creating a shipment changes the product to READY_TO_SHIP; dispatch is another transaction.
- Receipt changes product to RECEIVED, shipment to DELIVERED, and owner to the designated receiver. Storage is a separate transaction.
- Stored products can start another shipment leg; QC is not repeated each leg.
- Shipment flow: PENDING → SHIPPED → [optional IN_TRANSIT] → DELIVERED.
- CANCELLED exists in the enums but has no implemented cancellation operation.

Sources: [contract](../../packages/contracts/contracts/SupplyChainRegistry.sol), [schema](../../apps/api/prisma/schema.prisma), [action service](../../apps/api/src/blockchain/blockchain-action.service.ts).

## Stack and network

| Layer | Repository technology |
| --- | --- |
| Web | Next.js 16.3.5, React 19.2.8, TypeScript, Tailwind CSS 4, viem 2, custom components |
| API | NestJS 11, TypeScript, Prisma 6, ethers 6, JWT/Passport, bcryptjs, Swagger |
| Database | PostgreSQL; Compose uses postgres:16-alpine |
| Contract | Solidity compiler 0.8.24, OpenZeppelin AccessControl dependency ^5.2.0, Hardhat 2 |
| Infrastructure | pnpm workspaces, Docker, Docker Compose and development Watch |

Sources: package manifests in [web](../../apps/web/package.json), [API](../../apps/api/package.json), [contracts](../../packages/contracts/package.json). No shadcn/ui dependency or installed component system was found.

Application configuration pins Sepolia chain ID 11155111 (0xaa36a7) and contract 0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a. This is source-verified configuration, not a fresh deployment attestation. Business writes use browser MetaMask signing; backend signing is disabled. Local Hardhat tests and deploy scripts use local networks.

## Identity rule

```text
Product.id  != Product.blockchainProductId
Shipment.id != Shipment.blockchainShipmentId
```

Database IDs are UUIDs. Contract IDs are uint256 values stored as decimal strings in SQL. Blockchain identity includes chain ID and contract address. SQL Shipment.productId references the product UUID. QR URLs contain the product code.

## Current UI and assets

| Route | Purpose |
| --- | --- |
| /login | Account login |
| / | Dashboard; /dashboard redirects here |
| /products, /products/new, /products/[id] | Search, draft creation, registration, details, QR, store and sell |
| /quality | QC; /quality-checks redirects here |
| /shipments | Create, dispatch, mark in transit, receive |
| /traceability?code=... | Authenticated SQL timeline and separate blockchain/hash comparison; transaction hashes are text, not explorer links |
| /blockchain | RPC status, indexed transactions, transaction/block details, sync control |
| /audit | Application audit logs |
| /admin/wallets | Super Admin public wallet mapping, not on-chain role grant UI |
| /verify, /verify/[code] | Public lookup and API-backed verification; transaction hashes can be displayed or copied, with a known on-chain status-label defect |

Brand assets: [brand logo](../../apps/web/public/brand_logo.png), [icon logo](../../apps/web/public/icon_logo.png), with copies under assets/ and docs/assets/. Current UI uses blue #2563eb, slate #0f172a, light surfaces, Noto Sans Thai and Geist Mono. Sources: [CSS](../../apps/web/app/globals.css), [layout](../../apps/web/app/layout.tsx), [pages](../../apps/web/app). Asset files and UI source were inspected; no fresh browser screenshots were captured. Framework placeholder SVGs are not B-MOST branding.

Useful real screens to capture during a rehearsed session: product detail with a confirmed blockchain ID, the shipment list before and after a confirmed receipt, authenticated traceability, and the public verification report. Capture only actual UI states and label pre-recorded evidence. The current presentation source is Markdown, so a filename reference alone is not proof that an image was embedded or a screen was captured.

## Technical boundaries for four slides

1. Problem, solution, participants: one product with multiple shipment legs.
2. Workflow: separate draft, registration, QC, shipment creation, dispatch, receipt and storage; show optional transit and next-leg loop.
3. Architecture: REST, SQL, MetaMask, API simulation/receipt verification and limited event synchronization.
4. Blockchain value and demo transition: hashes, wallet actors, state/history and public lookup with the review's verification limits.

Do not promise production readiness, physical authenticity, immutable SQL audit logs, instant/final transactions or complete automatic recovery. The seeded Distributor and Warehouse share a wallet, preventing that handoff. See [ARCHITECTURE.md](ARCHITECTURE.md), [DEMO_FLOW.md](DEMO_FLOW.md) and [QNA.md](QNA.md).
