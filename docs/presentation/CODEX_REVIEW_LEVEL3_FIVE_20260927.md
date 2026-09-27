# B-MOST Presentation — Level 3 Final Technical Review

## Review Status

CHANGES_REQUIRED

Reviewed 2026-09-27 against repository HEAD `020588dd2b1484910ef24899fe9147a81a1fad83`, the current source tree, [PRESENTATION_FINAL.md](PRESENTATION_FINAL.md) (SHA-256 `6A5A70095686CB50E19AE49D55EF8646FFCC7D3CC58A55664B7C2373049D953C`), the [AGY handoff](AGY_HANDOFF.md), and the verified presentation documents. The final specification exists and the two issues in [the previous Level 3 review](CODEX_REVIEW_LEVEL3_PREFINAL_20260927.md) were corrected. The remaining issues below prevent approval. Do not set `Status: FINAL` or `Technical Review: APPROVED` yet.

Re-reviewed for the latest Level 3 request on 2026-09-27. The presentation candidate hash and repository HEAD are unchanged; all five cited claims remain in the candidate, and their source evidence remains current. This is the current verdict for that exact artifact.

## Required Changes

1. **Slide 1 — claim that the system eliminates data silos and disputes.**

   **Current claim:** The Main Message says, “B-MOST eliminates cross-enterprise data silos and disputes.”

   **Why incorrect or unsupported:** The implementation provides a shared B-MOST application and on-chain evidence for recorded actions. It does not integrate or remove each organization's ERP/WMS data silos, and a signed history cannot eliminate disputes about physical custody or inspection truth.

   **Repository evidence:** [schema.prisma](../../apps/api/prisma/schema.prisma) models B-MOST records; [SupplyChainRegistry.sol](../../packages/contracts/contracts/SupplyChainRegistry.sol) records product/shipment state and events. The slide's own “Verifiable recorded history boundary” limits the claim to digital evidence. No ERP/WMS integration or dispute-resolution guarantee is present in the current implementation.

   **Exact recommended correction:** Replace the Main Message with: “B-MOST helps reduce cross-enterprise record fragmentation and custody disputes by keeping shared operational records and anchoring key product and custody events on Sepolia. It provides verifiable recorded history; physical facts still require operational checks.”

2. **Slide 2 — next shipment leg presented as available to any current owner.**

   **Current claim:** The slide says a `STORED` product can start a new shipment leg immediately, and Q&A 11 says the current owner can create a shipment to another partner. The lifecycle diagram has an unqualified `STORE → CREATE_SHIP` loop.

   **Why incorrect or unsupported:** The contract allows its current owner to call `createShipment` from `STORED`, but the application's `CREATE_SHIPMENT` preparation allows only `SUPER_ADMIN`, `MANUFACTURER`, `DISTRIBUTOR`, and `WAREHOUSE`. A `RETAILER` app user may store and sell but cannot start the next shipment through the current app workflow. A new leg also requires a distinct receiver wallet and a signed, confirmed transaction.

   **Repository evidence:** [SupplyChainRegistry.sol](../../packages/contracts/contracts/SupplyChainRegistry.sol) `createShipment`; [blockchain-action.service.ts](../../apps/api/src/blockchain/blockchain-action.service.ts) `CREATE_SHIPMENT` role check and receiver-wallet validation; the same service allows `RETAILER` for `STORE_PRODUCT` but excludes it from shipment creation.

   **Exact recommended correction:** Qualify the Slide 2 storage/next-leg text, diagram label, notes, combined script, and Q&A 11: “From `STORED`, an authorized Manufacturer, Distributor, Warehouse, or Super Admin app user whose wallet matches the current owner can prepare, sign, and confirm a new shipment to a different receiver wallet without repeating QC. The current Retailer app role cannot create that next leg.” Do not imply that a next leg appears immediately merely because storage completed.

3. **Slide 3 — database writes described as occurring only after receipt verification.**

   **Current claim:** The Main Message says the Prepare → Sign → Confirm protocol “guarantees that database state updates occur only after independent verification of mined on-chain receipts.”

   **Why incorrect or unsupported:** Prepare writes a `PENDING` action intent and, for `CREATE_SHIPMENT`, a `PENDING` shipment draft before MetaMask signing or any receipt. The event indexer can also partially update SQL from contract logs outside the direct Confirm call. Receipt verification precedes the direct Confirm transaction's business-state updates, not every database write.

   **Repository evidence:** [blockchain-action.service.ts](../../apps/api/src/blockchain/blockchain-action.service.ts) `prepare` transaction creates the draft shipment and intent, while `confirm` checks transaction/receipt and then runs its SQL transaction. [blockchain-indexer.service.ts](../../apps/api/src/blockchain/blockchain-indexer.service.ts) `handleEvent` and `syncProductStateFromEvent` perform separate partial SQL synchronization.

   **Exact recommended correction:** Replace the Main Message's second sentence with: “In the direct user-signed flow, Prepare records a pending intent (and may create a shipment draft); after a mined receipt, Confirm verifies the transaction and updates the business state in a SQL transaction. The event indexer can separately synchronize some fields from chain events; Ethereum and SQL do not share an atomic commit.” Keep the existing sequence diagram's pending-intent step.

4. **Slide 4 Q&A 3 — QR lookup described as confirmation that a product is on-chain.**

   **Current claim:** Q&A 3 says the QR URL points to `/verify/[code]` “เพื่อยืนยันว่า ‘มีประวัติและข้อมูลสินค้านี้บันทึกอยู่จริงบนบล็อกเชน’” (to confirm that this product's data/history is recorded on-chain).

   **Why incorrect or unsupported:** The QR is a lookup URL. A SQL-only draft can have a product record and QR route while `blockchainProductId` is null. The public endpoint can return `verified: false`, and a chain read or hash check may also fail. Scanning is an opportunity to check registration/evidence, not proof by itself. Slide 4 already correctly discloses that a positive public hash result has limited meaning.

   **Repository evidence:** [products.service.ts](../../apps/api/src/products/products.service.ts) creates the SQL product before chain registration; `verifyPublicProduct` initializes `registeredOnChain`, `hashMatch`, and `verified` to false and only attempts the contract read when `blockchainProductId` exists. The public [verify page](../../apps/web/app/verify/%5Bcode%5D/page.tsx) displays the API result.

   **Exact recommended correction:** Change Q&A 3 to say: “QR Code เป็น URL ไปยัง `/verify/[code]` เพื่อ **ตรวจว่ามี** ข้อมูลและหลักฐานบนเชนที่ตรวจสอบได้หรือไม่; การสแกนเพียงอย่างเดียวไม่ได้ยืนยันว่าลงทะเบียนบนเชนแล้วหรือพิสูจน์ว่าสินค้าจริงไม่ปลอม.” Retain the physical-label limitation and Slide 4's hash/status disclosures.

5. **Slide 4 demo transition / five-minute live demo — exact MetaMask prompt text.**

   **Current claim:** The 1:20–2:40 demo narration and Expected Verification promise that the MetaMask prompt visibly identifies the function as `receiveProduct`.

   **Why incorrect or unsupported:** The app calls `receiveProduct` through viem's `writeContract`, but the exact text MetaMask displays depends on the wallet version and transaction decoding; no live browser capture or rehearsal establishes that label. The transaction and contract event are verifiable after broadcast.

   **Repository evidence:** [wallet.ts](../../apps/web/lib/blockchain/wallet.ts) calls `client.writeContract` with the prepared `functionName`; [shipments/page.tsx](../../apps/web/app/shipments/page.tsx) passes `action: 'receiveProduct'`; [SupplyChainRegistry.sol](../../packages/contracts/contracts/SupplyChainRegistry.sol) emits `ProductReceived` and `OwnershipTransferred` on receipt. No screenshot or live-wallet result is supplied in the [handoff](AGY_HANDOFF.md).

   **Exact recommended correction:** In the demo row, describe the MetaMask prompt as a request to confirm the prepared transaction to the configured contract. Say `receiveProduct` is the function the app sends, and verify its execution from the transaction receipt and `ProductReceived`/`OwnershipTransferred` events. Do not promise that MetaMask will display the function name verbatim.

## Verified against the current implementation

- **Versions:** [web package](../../apps/web/package.json) declares Next.js `16.3.5`, React `19.2.8`, Tailwind CSS `^4`, and viem `^2.56.8`; [API package](../../apps/api/package.json) declares NestJS `^11.0.1`, Prisma `6.19.3`, and ethers `^6.17.0`; [docker-compose.yml](../../docker-compose.yml) uses `postgres:16-alpine`; [hardhat.config.ts](../../packages/contracts/hardhat.config.ts) sets Solidity `0.8.24`, and the contract imports OpenZeppelin `AccessControl` (package declares `^5.2.0`). All major versions stated in Slide 3 match these declarations. `node packages/contracts/scripts/sync-abi.cjs --check` passed.
- **Contract and lifecycles:** Registration, QC pass/fail, shipment `PENDING → SHIPPED → IN_TRANSIT/DELIVERED`, product `REGISTERED → QUALITY_CHECKED → READY_TO_SHIP → SHIPPED → IN_TRANSIT/RECEIVED → STORED → SOLD`, recall, and a new leg from `STORED` match [SupplyChainRegistry.sol](../../packages/contracts/contracts/SupplyChainRegistry.sol), subject to item 2's app-role qualification. Dispatch retains the sender as owner; receipt transfers to the designated receiver and emits both receipt and ownership events. Sale retains the retailer wallet as owner.
- **IDs and storage:** [schema.prisma](../../apps/api/prisma/schema.prisma) uses UUID strings for `Product.id` and `Shipment.id`, with separate nullable string references `blockchainProductId` and `blockchainShipmentId` for contract `uint256` IDs. PostgreSQL holds application users, organizations, product/shipment/QC records and logs; the contract holds product code/hash, owner/status, shipment and QC state, and event/history records. QC notes and recall reasons are on-chain strings.
- **Signing and network:** [wallet.ts](../../apps/web/lib/blockchain/wallet.ts) performs account, chain, contract, and ABI checks, signs through the injected wallet, waits for a receipt, then calls Confirm. [blockchain.service.ts](../../apps/api/src/blockchain/blockchain.service.ts) disables backend signing via `getSigner()` throwing. The web and API pin Sepolia `11155111` and address `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a`. This verifies configured values, not the current live deployment.
- **Public verification and UI limits:** [products.service.ts](../../apps/api/src/products/products.service.ts) computes a Keccak-256 hash from normalized `productCode`, `serialNumber`, `manufacturerId`, `name`, and `category` via [product-hash.util.ts](../../apps/api/src/products/utils/product-hash.util.ts); `description` is excluded. Public `hashMatch` accepts chain hash equality with stored SQL hash **or** recomputed hash. Public status labels use a stale six-entry map: contract statuses 2–5 display as `SHIPPED/DELIVERED/SOLD/RECALLED`; 6–8 display `UNKNOWN`. Slide 4, its speaker notes, the combined script, and the public demo row disclose the `RECEIVED → RECALLED` and `STORED → UNKNOWN` examples. The private traceability page recomputes the selected-field hash but its “100%” UI wording should not be treated as proof of all metadata or physical authenticity; the slide's selected-field boundary limits that interpretation.
- **Demo and assets:** The prepared Manufacturer → Distributor receipt is supported by the UI action and contract. The corrected `/products/[id]` demo row now says it shows the Distributor organization, while traceability can show the wallet address. In-app transaction hashes are text/copy controls, so separate Etherscan inspection is accurate. The handoff supplies no screenshots or rendered slide deck; no live MetaMask/Sepolia rehearsal was performed in this review.

## Review boundary

Only this review record and its archived predecessor were changed. `PRESENTATION_FINAL.md`, application code, contracts, and slide design were not edited. Re-review the corrected final specification before setting `Review Status: APPROVED` and marking the presentation `FINAL`.
