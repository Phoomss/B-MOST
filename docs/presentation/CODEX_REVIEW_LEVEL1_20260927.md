# Codex Technical Audit — Level 1 / Phase 1

## Audit Status

READY_FOR_AGY

Audit Status: READY_FOR_AGY

Rechecked the current B-MOST repository on 2026-09-27 at commit `020588dd2b1484910ef24899fe9147a81a1fad83`. The tracked application source has no working-tree changes. The current implementation, not earlier prose or presentation claims, controls this audit.

This status releases the technical facts for presentation work. It is not a presentation approval or live Sepolia attestation. An earlier Phase 3 review of the prior Markdown presentation found changes required; its full record is preserved in [CODEX_REVIEW_PHASE3_20260927.md](CODEX_REVIEW_PHASE3_20260927.md). That review remains relevant to that presentation until its corrections are checked separately. No slide or handoff revision was performed in this Level 1 audit.

## Verified

| Area | Source-backed fact |
| --- | --- |
| Repository and stack | [README.md](../../README.md), package manifests and docs agree on a Next.js 16 / React 19 / Tailwind 4 / viem web app; NestJS 11 / Prisma 6 / ethers 6 API; PostgreSQL 16 in Compose; Solidity 0.8.24 / OpenZeppelin AccessControl contract. shadcn/ui is not installed |
| Data model | [Prisma schema](../../apps/api/prisma/schema.prisma) defines Organization, User, Product, Shipment, QualityCheck, BlockchainTransaction, BlockchainActionIntent and AuditLog. Product and Shipment use database UUIDs; contract numeric IDs are separate nullable decimal strings, with chain/address references |
| Draft and registration | [ProductsService.create](../../apps/api/src/products/products.service.ts) saves a SQL product with status REGISTERED and null blockchainProductId; registration is a later wallet action. A draft's SQL status is not evidence of on-chain registration |
| Contract transitions | [SupplyChainRegistry.sol](../../packages/contracts/contracts/SupplyChainRegistry.sol) supports registration, QC pass/fail, shipment creation, dispatch, optional transit, receipt, storage, sale, manual transfer and recall. QC failure recalls; a stored product can start another shipment. Shipment CANCELLED has no transition function |
| Custody | During dispatch/transit the current owner remains the sender. A successful receiveProduct sets product RECEIVED, shipment DELIVERED and owner to designated receiver, emitting ProductReceived and OwnershipTransferred. markAsSold requires STORED and does not transfer ownership to a consumer |
| Permissions | [JWT strategy](../../apps/api/src/auth/strategies/jwt.strategy.ts), [RolesGuard](../../apps/api/src/auth/guards/roles.guard.ts) and [BlockchainActionService](../../apps/api/src/blockchain/blockchain-action.service.ts) enforce application role, organization and wallet checks. Contract roles and address/state checks are separate. Application Super Admin cannot bypass contract owner checks |
| Signing | [wallet helper](../../apps/web/lib/blockchain/wallet.ts) executes prepare → MetaMask/viem write → wait for receipt → confirm. The [backend signer](../../apps/api/src/blockchain/blockchain.service.ts) throws. Legacy write routes should not be represented as the active business path |
| Confirmation | [ActionService.confirm](../../apps/api/src/blockchain/blockchain-action.service.ts) checks Sepolia, transaction/receipt, sender, expected event and pertinent values, then writes SQL in a transaction. Direct-call calldata is also checked. There is no atomic commit shared by Ethereum and SQL |
| Public QR | [QR utility](../../apps/api/src/products/utils/qr-code.util.ts) encodes a URL containing productCode. [/verify/[code]](../../apps/web/app/verify/[code]/page.tsx) calls the unauthenticated public API. This is a record lookup, not proof of the physical item's identity |
| Verification limits | [ProductsService.verifyPublicProduct](../../apps/api/src/products/products.service.ts) accepts an on-chain hash matching either the stored SQL hash or freshly computed hash. The public on-chain status-name mapping is stale: values 2–5 are mislabeled and 6–8 become UNKNOWN |
| Timeline and explorer | [TraceabilityService](../../apps/api/src/traceability/traceability.service.ts) assembles SQL milestones and separate chain information. The [traceability page](../../apps/web/app/traceability/page.tsx) displays hashes as text; the public page displays/copies hashes. These pages do not provide an Etherscan receipt link for every milestone |
| Indexer | [BlockchainIndexerService](../../apps/api/src/blockchain/blockchain-indexer.service.ts) listens through the configured HTTP RPC and supports explicit historical scans. Its state recovery is partial: it does not reconstruct QC rows or SQL owner changes from all relevant events |
| Sepolia configuration | Web and API pin chain ID 11155111 and address 0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a. These are source-verified settings. Local Hardhat test/deploy networks use chain ID 31337; local records do not prove current deployed Sepolia bytecode |
| Docker and variables | [Compose](../../docker-compose.yml) runs PostgreSQL, API and web; host defaults are database 5433, API 4000 and web 3000. [API entrypoint](../../apps/api/docker-entrypoint.sh) applies migrations, with seeding optional. [.env.example](../../.env.example) lists RPC, JWT, DB and public client variable names; no secret values were copied into this audit |
| Assets and routes | Real logo files exist in [apps/web/public](../../apps/web/public); product, shipment, quality, traceability, blockchain, audit and public verification pages were inspected. /dashboard and /quality-checks redirect to / and /quality |

The [Sepolia identity migration](../../apps/api/prisma/migrations/20260925000000_sepolia_identity/migration.sql) adds chain/address columns without silently rewriting earlier local-chain references. The [action-intent migration](../../apps/api/prisma/migrations/20260925010000_blockchain_action_intents/migration.sql) creates the pending intent table and its transaction-hash uniqueness rule.

## Corrected

The four technical presentation documents were updated or reconfirmed as the source-verified Level 1 package:

- [PRESENTATION_CONTEXT.md](PRESENTATION_CONTEXT.md): now distinguishes actual hash displays from explorer links, identifies the public status-label defect, and records real screen candidates without claiming screenshots were captured.
- [ARCHITECTURE.md](ARCHITECTURE.md): now states that public contract data reaches the page through the API and that displayed hashes are not built-in explorer links for every milestone.
- [DEMO_FLOW.md](DEMO_FLOW.md): now distinguishes the numeric on-chain product ID from Sepolia chain ID and requires the actual receiveProduct hash for an independently opened receipt view.
- [QNA.md](QNA.md): now describes available public transaction hashes as display/copy data rather than in-app explorer links.
- Earlier Level 1 corrections already in those documents remain source-supported: SQL draft vs chain registration, product and shipment state separation, optional transit and next-leg loop, distinct application/contract permissions, SQL vs chain storage, client signing, and the seeded shared-wallet constraint.

## Unsupported / Do Not Present

- A guarantee that QR scanning proves physical authenticity, prevents label copying or validates a real-world inspection.
- A guarantee that any public “verified” badge proves all current SQL metadata is unchanged, or that the incorrect public on-chain status labels are accurate.
- Automatic, complete event recovery; permanent synchronization between SQL and chain; a distributed atomic commit; or server-enforced intent expiry/automatic cleanup.
- Clickable in-app Etherscan receipt links for every transaction, a dedicated transaction hash for every SQL timeline milestone, or one database transaction row per emitted event.
- A working shipment cancellation action; a required Manufacturer → Distributor → Warehouse → Retailer contract order; or a same-wallet Distributor → Warehouse seed handoff.
- A blockchain function named sellProduct; the active action and ABI use markAsSold. Do not confuse product blockchain ID with chain ID.
- Only Manufacturer application users being permitted to create SQL drafts: Super Admin and ORG_ADMIN are also permitted under their checks. On-chain registration additionally needs the appropriate wallet authority.
- Moving to another Ethereum network by changing RPC/address configuration alone. Network and address checks are pinned in source.
- Product-image storage, NFT/IPFS, IoT sensor telemetry, GPS tracking, legal non-repudiation, measured high performance, full decentralization or production readiness.
- The existing Markdown presentation as technically approved. Its earlier review findings are retained in the archived Phase 3 review.

## Demo Risks

| Risk | Current mitigation |
| --- | --- |
| Live Sepolia deployment/bytecode, wallet roles/balances and database contents were not reverified | Rehearse against the actual deployed contract and accounts; a configured address and passing local tests are insufficient |
| Manufacturer, Auditor and Retailer share one seed wallet; Distributor and Warehouse share another | Use Manufacturer → Distributor for the timed A → B handoff; provision distinct wallets before claiming a full four-organization journey |
| Seed product has SQL-only inspection/shipment fixtures and null blockchain IDs | Create a fresh product; show confirmed on-chain IDs and hashes for that same record |
| Fresh one-leg journey needs at least five chain transactions | Prepare registration/QC/create/dispatch in advance; aim for one live receipt, with store optional |
| Receipt succeeds on-chain but API confirmation fails | Preserve original intentId and receive transaction hash, inspect both systems, retry the same-user confirmation where appropriate; do not blindly resend the write |
| Public page may show RECEIVED as RECALLED and its verified badge has limited semantics | Explain the incorrect label and compare actual contract state/receipt; avoid claims of full metadata or physical proof |
| Browser and API use separate RPC paths; mobile localhost URLs fail | Test both RPC paths and the session-free public URL on the presentation device/phone before the session |
| Indexer cannot fully repair SQL ownership/QC after missed confirmation | Stop dependent storage or next-leg writes until SQL and chain state agree |
| Explorer links are not built into each product timeline/public milestone | Retain and independently inspect the actual receiveProduct hash, clearly labeling previously recorded evidence |

## Useful Real Screens

These are current application pages suitable for **actual captures during rehearsal**. No screenshots were generated or submitted by this audit.

| Screen | What it can evidence | Capture condition |
| --- | --- | --- |
| [Product detail](../../apps/web/app/products/[id]/page.tsx) | Product code, SQL detail, registration status, blockchain product ID, QR, current owner | Use a fresh product with successful registration; distinguish SQL UUID from chain ID |
| [Quality](../../apps/web/app/quality/page.tsx) | QC action and recorded result | Capture only after a successful recordQualityCheck confirmation; show whether result is passed |
| [Shipments](../../apps/web/app/shipments/page.tsx) | Sender/receiver, pending/shipped/delivered statuses, live receipt result/hash | Capture before and after a **real** receiveProduct; do not use shipment creation hash as receipt hash |
| [Traceability](../../apps/web/app/traceability/page.tsx) | SQL milestones, ownership history and separate hash/chain comparison | Explain which values come from SQL and which from contract; displayed transaction hashes are not explorer links |
| [Public verification](../../apps/web/app/verify/[code]/page.tsx) | No-login lookup, QR, public history and hash display | Show the known status-label defect honestly; the public API supplies contract data |
| [Blockchain view](../../apps/web/app/blockchain/page.tsx) | Configured RPC status and indexed transactions/blocks | Do not equate RPC connection with deployed bytecode validation or full indexer recovery |
| [Wallet management](../../apps/web/app/admin/wallets/page.tsx) | User/organization public wallet mapping | Super Admin only; do not show credentials or claim it grants on-chain roles |

Brand assets: [full logo](../../apps/web/public/brand_logo.png) and [icon](../../apps/web/public/icon_logo.png), also copied under assets/ and docs/assets/. The Noto Sans Thai and Geist Mono font setup and the blue/slate UI palette are in [layout](../../apps/web/app/layout.tsx) and [CSS](../../apps/web/app/globals.css). Framework placeholder SVGs under public/ are not B-MOST branding. Filename references in a Markdown deck do not establish that an image is embedded in a rendered slide.

## Validation and limits

- Read the current workflow, its Level 1 definition, root README and technical documentation; compared source across apps/web, apps/api, Prisma schema/migrations, contract, ABI, RBAC, routes and runtime configuration.
- Ran `node packages/contracts/scripts/sync-abi.cjs --check`: passed; the committed ABI matches the local compiled artifact.
- Phase 1 earlier ran 27 contract tests, 40 focused API tests and 14 focused web tests against the same source commit. They were not rerun for this documentation refresh.
- No live chain writes, browser walkthrough, deployment attestation, database reset, application-functionality edit, slide change, UI redesign or new test occurred in this Level 1 run. Runtime readiness still needs a real rehearsal.

## Audit summary

The repository supports a hybrid PostgreSQL/Sepolia traceability workflow with browser-signed supply-chain actions, explicit receipt confirmation and public product lookup. The four technical documents now state the workflow and its limits accurately enough to serve as presentation source material. The prior presentation review remains an outstanding, separate record.