# B-MOST Live Demo Flow

## Scope and readiness

Phase 1 technical procedure, audited 2026-09-27. The walkthrough below is supported by source and local tests; it has **not** been rehearsed against the live application or Sepolia in this audit. No live transactions, database migrations, seed operations or wallet changes were performed.

Goal: demonstrate one product's recorded journey, a user-signed custody handoff, traceability and public verification in about five minutes. Complete the preparation before presenting; label prepared evidence honestly.

## Required pre-demo checks

- Web login, API and database are healthy. Default local web is port 3000; API is port 4000 with /api prefix.
- Check actual network chain ID 11155111 and contract 0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a. Check deployed code and relevant contract reads; the API connected flag alone checks RPC network/block availability, not bytecode equivalence.
- MetaMask is installed, unlocked, on Sepolia, with test ETH in every signing account.
- Logged-in User.walletAddress matches the selected MetaMask account. Manufacturer/receiver Organization.walletAddress mappings also match their users. The registration wallet has MANUFACTURER_ROLE on-chain.
- Set user/organization public wallet mappings through Super Admin /admin/wallets if needed **before rehearsal**. This page does not grant contract roles or change an existing on-chain owner's address.
- Check backend BLOCKCHAIN_ABI_READY and frontend NEXT_PUBLIC_BLOCKCHAIN_ABI_READY are true. Browser chain/address settings must match; production public settings require a rebuild when changed.
- Verify both RPC paths work: the API RPC and the browser public RPC used to await receipts.
- Use separate browser profiles for organization logins, or explicitly log out/in and switch MetaMask. Tabs in the same profile share application storage; changing a login affects other tabs.
- Open the public URL without a session. For a phone scan, WEB_URL and the browser API URL must be reachable from the phone. localhost on a phone is not the presentation computer.
- Prepare actual transaction hashes, product code, SQL UUID and on-chain IDs for the same product. Keep credentials, tokens, private keys and RPC credentials off screen.

## Seed wallet constraint

Source: [seed.ts](../../apps/api/prisma/seed.ts).

| Seed actors | Wallet grouping |
| --- | --- |
| Super Admin, Manufacturer, Auditor, Retailer | Account A |
| Distributor, Warehouse | Account B |

Manufacturer → Distributor is a valid A → B handoff. Distributor → Warehouse is B → B and fails the receiver-address restriction. Distributor → Retailer is B → A and can be used for an extended two-leg rehearsal. These are wallet groupings from source, not confirmation of the deployed database.

For the full Manufacturer → Distributor → Warehouse → Retailer scenario, configure suitable separate wallets and rehearse before the session. Logging into Warehouse with the shared wallet does not constitute a new shipment or organization ownership transfer.

The seed product PROD-2026-001 is a SQL fixture with null blockchain references, a literal hash, and SQL QC/shipment fixtures without transaction hashes. It is not evidence of a completed blockchain journey. Create a fresh product through the UI for the demo; do not blindly register the seed fixture or rerun the seed script.

## Prepare one product before the timed demo

Use a unique product code and serial number; record the code. The following operations establish the same product's history.

| Step | UI / action | Required observed result |
| --- | --- | --- |
| Create draft | Manufacturer: /products/new | SQL UUID and code; blockchainProductId null. SQL REGISTERED alone does not prove chain registration |
| Register | Product detail → บันทึกลง Blockchain, or explicit registration checkbox on creation | MetaMask registerProduct, successful API confirmation, numeric on-chain product ID, Sepolia chain ID 11155111, and transaction hash |
| Pass QC | /quality or product QC link | recordQualityCheck(true); product QUALITY_CHECKED, QC row with hash |
| Create shipment | /shipments; select Distributor, origin/destination and optional carrier | createShipment; shipment PENDING with on-chain shipment ID, product READY_TO_SHIP |
| Dispatch | Shipment row → dispatch | shipProduct; shipment and product SHIPPED; sender remains owner |

The creation page's registration checkbox defaults to false. Each blockchain action is a separate transaction. Inspect confirmations and current SQL/chain state before moving on. Leave this product SHIPPED, ready for live receipt. Do not receive it during preparation unless preparing a separately labeled backup.

Capture real screenshots of draft/registration/QC/shipment and successful transactions if a fallback is needed. No such screenshots were produced by this audit. Use the actual product code throughout; do not fabricate IDs or hashes.

## Five-minute presentation run

| Time | Action | Evidence and explanation |
| --- | --- | --- |
| 0:00–0:45 | Manufacturer product detail | Identify product/code and registration transaction. State that registration and QC were completed before the session |
| 0:45–1:20 | Show QC and existing shipment | Product is SHIPPED; sender/receiver and shipment ID correspond to the same product. Creation and dispatch were separate transactions |
| 1:20–2:40 | Switch to Distributor login and wallet; /shipments → receive | Sign receiveProduct in MetaMask. Wait for successful API confirmation. Shipment becomes DELIVERED, product RECEIVED, owner becomes Distributor |
| 2:40–3:15 | Refresh product detail; optionally store if time permits | Receipt already proves custody transfer. storeProduct is a second transaction; RECEIVED → STORED only after success |
| 3:15–4:15 | /traceability?code=<actual product code> | Show SQL milestones, ownership and separate blockchain/hash information. Use the actual receiveProduct hash from the completed shipment action in a separately opened Sepolia explorer page to inspect ProductReceived and OwnershipTransferred; the timeline itself does not provide that receipt link |
| 4:15–5:00 | Public /verify/<actual product code>, optionally QR | Show lookup without login, product information and the implemented hash comparison. The page displays/copies available hashes but has no built-in explorer link for every milestone; explain the status-label limitation below |

Thai technical cue: **สินค้าถูกสร้างเพียงครั้งเดียว แต่ละช่วงการส่งต่อใช้ Shipment ใหม่ และการรับสินค้าจะเปลี่ยนเจ้าของเป็นผู้รับที่กำหนดไว้**

This schedule is a target, not a transaction latency guarantee. IN_TRANSIT is optional: receiving directly from SHIPPED is supported. Limit timed writes to receipt, with storage optional. A complete fresh one-leg flow needs at least five chain transactions (register, QC, create shipment, dispatch, receive), six with storage; do not promise all of them within five minutes.

## Public verification limitation to handle explicitly

The current public page displays an outdated on-chain status name. Numeric states 2/3/4/5 are wrongly labeled SHIPPED/DELIVERED/SOLD/RECALLED; 6/7/8 display UNKNOWN. For a received product, the public “on-chain status” can therefore misleadingly say RECALLED. This is a display mapping defect, not a recall event.

Rehearse that screen before including it. State the limitation if showing it; use the correct contract enum and the refreshed product state to explain status. A backup screenshot of the same faulty UI does not fix the claim. Do not advertise the public status card as a correct live state comparison.

Its verified badge accepts a match to either the stored hash or freshly computed metadata hash. Show it as the implemented check, not proof that every current metadata field or physical item is authentic. Timeline transaction badges are not independent receipt verification for every milestone.

The authenticated timeline is assembled from SQL milestones and does not attach the receipt transaction hash to every dispatch or receipt item. Do not reuse a shipment-creation hash as proof of a later receipt. Capture the actual receiveProduct hash from the successful shipment action or a separately verified receipt before opening an explorer.

Sources: [verifyPublicProduct](../../apps/api/src/products/products.service.ts), [public page](../../apps/web/app/verify/[code]/page.tsx), [contract enum](../../packages/contracts/contracts/SupplyChainRegistry.sol).

## Extended rehearsal outside the five-minute window

After receipt, Distributor stores the product and creates a new shipment to a receiver with a different wallet. Repeat create → dispatch → receive → store for each leg. Retailer can mark a STORED product SOLD; owner stays the retailer wallet. With seed mappings, Distributor → Retailer is supported; inserting Warehouse requires resolving the shared-wallet constraint first.

Recall and manual ownership transfer exist in the action API/contract but no dedicated normal UI controls were found. They are Q&A material, not promised clicks in this demo. Do not use legacy REST write routes or attempt to cancel a shipment: cancellation has no implemented operation.

## Failure and fallback procedure

| Failure | Response |
| --- | --- |
| User rejects MetaMask | Explain that no approved transaction was broadcast. Product/intent/shipment drafts may remain; avoid creating duplicate records |
| Wrong wallet/network/role | Correct the login/account/network mapping; contract simulation may reject before a prompt |
| Pending transaction | Show its actual pending state/hash, then use explicitly labeled recorded evidence if time expires; do not resubmit blindly |
| Mined transaction, failed API confirmation | Preserve the original intent ID/hash privately. Same-user confirmation of that pair can be retried; inspect chain and SQL state before any new write |
| State mismatch / old chain reference | Stop dependent writes and diagnose after the demo; no assumption of automatic recovery |
| RPC unavailable / public unverified | Report live verification unavailable. Switch to a previously captured successful transaction/screenshot, labeled as recorded |
| SQL owner remains stale | Do not continue downstream actions. The indexer does not fully repair ownership/QC records; confirmation is necessary |
| QR unreachable on phone | Open the same public URL in a session-free desktop browser and explain the URL reachability issue |

The /blockchain sync UI requests history from block zero; this can exceed RPC log limits. Do not trigger an unrestricted historical scan during the timed demo. Operator recovery should use an appropriate bounded range and verify the outcome; it is not guaranteed complete recovery.

Successful demo evidence means: one consistent product identity, a real confirmed receipt, correct receiver ownership in chain and SQL, and public access with its current limitations stated. Screenshots and prior transactions must never be presented as new live actions.
