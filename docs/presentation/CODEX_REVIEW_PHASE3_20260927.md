# Codex Presentation Review — Phase 3

## Review Status

CHANGES_REQUIRED

Reviewed 2026-09-27 against current repository HEAD `020588dd2b1484910ef24899fe9147a81a1fad83` and working tree. Phase 3 only: this review changes CODEX_REVIEW.md. The presentation, handoff, application code and visual design were not edited.

## Material reviewed

- [PRESENTATION.md](PRESENTATION.md): four main slide sections, three Mermaid diagrams, Thai notes, combined script, demo checklist/fallbacks and 16 Q&A answers.
- [AGY_HANDOFF.md](AGY_HANDOFF.md): READY_FOR_CODEX_REVIEW, claims, diagrams, asset inventory and assumptions.
- All Markdown files under docs/presentation, including the Phase 1 review archived below.
- Current Solidity, ABI, Prisma schema, active action preparation/confirmation, wallet code, verification/traceability services and pages, product permissions, seed wallet mappings and network configuration.
- The actual brand_logo.png and icon_logo.png were opened and inspected. The submitted artifact contains textual asset references/layout instructions; no rendered deck or application screenshots are supplied in the handoff.

Reviewed presentation SHA-256: `2718EC346EBA05C5389B637DE0462F0715C8C4E3FCB08A68A7ABDFC0C8386775`.  
Reviewed handoff SHA-256: `96FB829CE9D2163C955D0387862AA12590890037F4C86CE5EF1E9AEB9C423E0F`.

Line references below refer to these reviewed versions. This verdict concerns their technical content, not a proposed redesign.

### Required Changes

1. **High — Correct the hash-integrity guarantee.**

   **Slide:** Slide 4, PRESENTATION.md lines 236–246 and 253; combined script line 268; Q&A 4 line 328.

   **Incorrect claim:** The deck says the hash guarantees that database data has not changed since registration and that the system detects database modifications immediately. The combined Thai script also calls hashing “เข้ารหัส,” suggesting encryption.

   **Source evidence:** [ProductsService.verifyPublicProduct](../../apps/api/src/products/products.service.ts), lines 1368–1373, accepts on-chain hash equality to the stored productHash **OR** computedHash. If a covered SQL field changes while the original stored hash remains, this public check can still pass. [Hash utility](../../apps/api/src/products/utils/product-hash.util.ts), lines 18–28, hashes selected normalized fields and excludes description. [TraceabilityService](../../apps/api/src/traceability/traceability.service.ts), lines 126–155 and 341, computes a separate hashMatch; its verified flag alone is weaker. These checks occur on requests, not as continuous tamper monitoring.

   **Exact correction:** Replace the guarantee with: “Keccak-256 commits selected normalized product fields to the contract. Comparing a freshly recomputed hash can reveal a mismatch in those fields. The current public checker also accepts a match to the stored SQL hash, so its verified badge does not prove all current metadata is unchanged.” In Thai notes/script use: “เราใช้ Keccak-256 คำนวณค่าแฮชของข้อมูลหลักที่เลือกไว้ การเทียบค่าแฮชที่คำนวณใหม่ช่วยตรวจพบข้อมูลที่ไม่ตรงกันได้ แต่หน้า Public ปัจจุบันยังยอมรับการตรงกับค่าแฮชเดิมในฐานข้อมูล จึงไม่ใช่หลักประกันว่าข้อมูลทุกช่องไม่ถูกแก้ไขครับ.” Replace “เข้ารหัส” with “คำนวณค่าแฮช”; remove “ทันที” as a detection guarantee.

2. **High — Actually disclose the public status-label defect in the audience-facing material.**

   **Slide:** Slide 4 line 241 and the 4:15–5:00 demo row line 301. Also AGY_HANDOFF.md lines 37, 59 and 95.

   **Incorrect claim:** The deck calls status mapping a translation of raw state without identifying it as incorrect. The handoff says the defect is transparently disclosed, but the spoken notes/demo contain no such disclosure. After the planned receipt, the public on-chain card can say RECALLED.

   **Source evidence:** [Public verification service](../../apps/api/src/products/products.service.ts), lines 1359–1381, maps actual states 2/3/4/5 to SHIPPED/DELIVERED/SOLD/RECALLED and states 6/7/8 to UNKNOWN. [Contract enum](../../packages/contracts/contracts/SupplyChainRegistry.sol), lines 25–35, defines the correct nine states. [Public page](../../apps/web/app/verify/[code]/page.tsx), line 539, displays onChainStatusName. [DEMO_FLOW.md](DEMO_FLOW.md), “Public verification limitation,” already requires explicit disclosure.

   **Exact correction:** Add this explicit note to Slide 4's technical disclosure and the public-demo narration: “ขณะนี้ป้ายสถานะบนเชนในหน้าสาธารณะมีการจับคู่ชื่อสถานะคลาดเคลื่อน หลังรับสินค้าอาจแสดง RECALLED ทั้งที่สถานะจริงคือ RECEIVED; กรณีนี้ไม่ใช่เหตุการณ์เรียกคืน เราจะอ้างอิงสถานะจากสัญญาและธุรกรรมรับสินค้าครับ.” Include the mapping details above in the backup notes, including UNKNOWN after optional storage. Describe public reads as **API-backed** contract reads. Update the handoff to match the actual disclosure. Do not imply a code fix or a correct status card.

3. **High — Remove the configuration-only migration claim.**

   **Slide:** Slide 3 architecture backup, Q&A 5 at PRESENTATION.md line 331.

   **Incorrect claim:** Moving to Ethereum L1 or L2 only requires changing RPC and contract-address configuration.

   **Source evidence:** [wallet.ts](../../apps/web/lib/blockchain/wallet.ts), lines 17–18, 24–32 and 58–74, hardcodes Sepolia and rejects different public settings. [blockchain.config.ts](../../apps/api/src/blockchain/blockchain.config.ts) pins the address/chain. [BlockchainService](../../apps/api/src/blockchain/blockchain.service.ts), lines 79–89 and 177, rejects a different contract/network. [Action service](../../apps/api/src/blockchain/blockchain-action.service.ts), lines 131 and 679, validates Sepolia references and confirmation against 11155111.

   **Exact correction:** Replace the migration sentence with: “ระบบปัจจุบันผูกกับ Sepolia และ Contract Address ที่กำหนดไว้ การย้ายเครือข่ายต้องปรับโค้ดและการตรวจสอบเครือข่าย นำสัญญาไปใช้งานบนเครือข่ายใหม่ จัดการข้อมูลอ้างอิงและสิทธิ์ Wallet แล้วทดสอบใหม่ ไม่ใช่เปลี่ยน RPC เพียงอย่างเดียวครับ.” Present migration as future engineering work, not existing portable configuration.

4. **High — Correct synchronization guarantees, confirmation recovery and transfer timing.**

   **Slide:** Slide 3 Thai closing line 216; demo receipt narration line 298 and failed-confirm fallback line 311; Q&A 13 line 355.

   **Incorrect claim:** SQL always matches blockchain; resubmitting only a transaction hash is sufficient recovery. The receipt narration can also imply API confirmation causes the on-chain ownership transfer.

   **Source evidence:** [Wallet helper](../../apps/web/lib/blockchain/wallet.ts), lines 116–129, waits for a chain receipt before calling a separate API. [Contract receiveProduct](../../packages/contracts/contracts/SupplyChainRegistry.sol), lines 469–482, changes ownership in the chain transaction. [ActionService.confirm](../../apps/api/src/blockchain/blockchain-action.service.ts), lines 655–675 and 874 onward, requires the original intentId, transactionHash and same user, then commits SQL separately. [Indexer](../../apps/api/src/blockchain/blockchain-indexer.service.ts), syncProductStateFromEvent at line 473, does not reconstruct SQL currentOwnerId or QC rows.

   **Exact correction:** Replace Slide 3's “เสมอ” sentence with: “API ตรวจสอบหลักฐานบนเชนก่อนบันทึกผลลงฐานข้อมูล แต่หาก Confirm หรือการซิงก์ขัดข้อง ข้อมูลสองฝั่งอาจไม่ตรงกันชั่วคราวและต้องตรวจสอบครับ.” State that the mined receiveProduct transaction transfers ownership; API confirm subsequently updates SQL. In Q&A/fallback specify retrying **the original intentId and transactionHash as the same user with the matching wallet mapping**; it is an API recovery step, not an implemented one-click UI retry. Preserve the pair privately, inspect SQL/chain state, and stop dependent storage/shipment actions if confirm fails. A successful chain receipt alone does not prove SQL owner synchronization.

5. **Medium — Fix the lifecycle diagram's function and identifier labels.**

   **Slide:** Slide 2 Mermaid at lines 65, 79 and 93; AGY_HANDOFF.md Slide 2 summary line 22.

   **Incorrect claim:** The wallet invokes sellProduct(); the draft is identified by chainId:null; transit is shown only as a shipment state despite the “complete” product/shipment flow.

   **Source evidence:** [Contract](../../packages/contracts/contracts/SupplyChainRegistry.sol), line 534, defines markAsSold(uint256), not sellProduct. [ABI](../../packages/contracts/abi/SupplyChainRegistry.json), line 1003, and [web sale handler](../../apps/web/app/products/[id]/page.tsx), line 142, agree. [Schema](../../apps/api/prisma/schema.prisma), lines 148–150, distinguishes blockchainProductId, blockchainChainId and blockchainContractAddress. Contract markInTransit at line 412 updates both product and shipment.

   **Exact correction:** Use “MetaMask: markAsSold()” in the diagram and handoff. Change the draft label to “status: REGISTERED, blockchainProductId: null”; network chain ID remains a separate concept. Show both “Product: IN_TRANSIT” and “Shipment: IN_TRANSIT” in the transit node. Preserve the existing layout, state order, next-leg loop and optional transit branch.

6. **Medium — Correct product-creation permissions and wallet preflight.**

   **Slide:** Slide 2 role explanation / Q&A 8 at line 340; Slide 3 identity explanation / Q&A 6 at line 334; demo preparation lines 277–280.

   **Incorrect claim:** Only an application Manufacturer can create and register products. Wallet verification is described only as an organization mapping, and the demo preflight does not explicitly check the user's mapping.

   **Source evidence:** [ProductsController](../../apps/api/src/products/products.controller.ts), line 53, permits SUPER_ADMIN, ORG_ADMIN and MANUFACTURER for SQL creation. [ProductsService.create](../../apps/api/src/products/products.service.ts), lines 126–199, requires a valid active Manufacturer organization. [ActionService.prepare](../../apps/api/src/blockchain/blockchain-action.service.ts), lines 341–359, permits SUPER_ADMIN or MANUFACTURER for registration and checks MANUFACTURER_ROLE. Its wallet/assertOrganization helpers at lines 76–109 and receiver checks at lines 494–506 distinguish user and organization mappings. [Wallet helper](../../apps/web/lib/blockchain/wallet.ts), lines 44–49 and 111, checks expectedWallet from the user.

   **Exact correction:** Say “Manufacturer is the normal product origin. SQL draft creation also permits Super Admin and ORG_ADMIN for a valid Manufacturer organization. Registration preparation permits Manufacturer or Super Admin, and the wallet must have MANUFACTURER_ROLE.” Keep downstream receipt of the same product. Add preflight checks that the logged-in User.walletAddress equals the selected MetaMask account and that the relevant Manufacturer/receiver Organization.walletAddress matches. State explicitly that application roles do not grant on-chain roles.

7. **High — Correct the claimed explorer links and completeness of the demo timeline.**

   **Slide:** Slide 4 line 241; demo rows at lines 300–301; Q&A 15 line 361; AGY_HANDOFF.md explorer-link claims.

   **Incorrect claim:** The traceability/public pages provide clickable Etherscan receipts for every transaction and a complete transaction-backed milestone timeline.

   **Source evidence:** [Traceability page](../../apps/web/app/traceability/page.tsx), lines 599–605, renders transaction hashes as spans, not explorer anchors. [Public page](../../apps/web/app/verify/[code]/page.tsx), lines 423–441 and 500–524, provides hash display/copy buttons, not Etherscan receipt links. [TraceabilityService](../../apps/api/src/traceability/traceability.service.ts), lines 214–301, assembles SQL milestones; dispatch and receipt timeline objects omit blockchainTxHash and no separate storage/transit milestone is built there. [Public timeline](../../apps/api/src/products/products.service.ts), lines 1455–1486, reuses the shipment creation hash for dispatch/receipt. [Shipment receipt handler](../../apps/web/app/shipments/page.tsx), lines 230–245, obtains the actual receive transaction hash from the confirmed result.

   **Exact correction:** Replace “Etherscan links for every transaction/all milestones” with “selected SQL milestones and available transaction hashes, with separate on-chain evidence.” Demonstrate the **actual receiveProduct transaction hash** using a separately prepared/opened Sepolia explorer URL, clearly distinguishing this manual navigation from an in-app link. Use the receipt to inspect ProductReceived and OwnershipTransferred. Do not use a shipment-created or registration hash as the receipt transaction. Correct the expected demo results and Q&A accordingly.

   This direct UI-source check also narrows broad “transaction links” wording inherited from the Phase 1 documents. For this point, use this Phase 3 finding as the source of truth; no application change is requested.

8. **Medium — Remove unsupported business-image storage from the data responsibility answer.**

   **Slide:** Slide 3 storage responsibilities / Q&A 1 at line 319.

   **Incorrect claim:** PostgreSQL currently stores business/product images (“รูปภาพ”).

   **Source evidence:** [Prisma schema](../../apps/api/prisma/schema.prisma), particularly Product at line 137 and Organization at line 86, defines no image/blob/image-URL field or business image model. The inspected logos are static files in apps/web/public, not product images stored in PostgreSQL.

   **Exact correction:** Remove “รูปภาพ” from the answer. List users, organizations, product metadata, drafts, shipment relations, QC records and application logs. Do not substitute a new upload/storage feature. If explaining long text storage, retain the distinction that QC notes and recall reasons also exist on-chain.

9. **Medium — Make the handoff's screenshot and asset inventory match the delivered artifact.**

   **Slide:** Slide 1 branding and Slide 4/demo screenshot evidence; AGY_HANDOFF.md “Screenshots Used,” lines 75–87.

   **Incorrect claim:** Logos are described as already integrated into slide header/favicon/token marker, while the delivered Markdown only contains text references and placement instructions. No application screenshots or rendered slide artifact are provided to verify those placements.

   **Source evidence:** [PRESENTATION.md](PRESENTATION.md), lines 13–15 and 23, references logo filenames as text; the [handoff](AGY_HANDOFF.md) points solely to that file. The current docs/presentation inventory contains Markdown files only. The two referenced logo files exist and were visually inspected in this review.

   **Exact correction:** State “Screenshots used: none supplied. Logo files referenced for composition: [paths]. Delivered artifact: PRESENTATION.md, containing slide content/layout specifications, Mermaid diagrams and speaker/demo notes.” Describe intended asset placement as intended, not verified rendered integration. If a separate rendered deck already exists, identify its actual path for subsequent review; do not claim that it was reviewed here. No new screenshot, mockup or visual redesign is required by this finding.

## Checks that passed / content to retain

| Review area | Finding |
| --- | --- |
| Four-slide scope | Exactly four main slides; supplementary Thai notes, combined script, five-minute checklist and Q&A are present |
| Main architecture | Web/API/SQL separation, browser wallet signing, API simulation/receipt checks and HTTP RPC event path match source |
| PostgreSQL vs chain | Main slide separation is sound, subject to the hash and unsupported-image corrections above; SQL commit is correctly identified as SQL-only |
| Product and shipment lifecycle | QC pass/fail, creation vs dispatch, optional transit, receipt → ownership/DELIVERED, separate storage and next-leg loop are supported; fix diagram labels in item 5 |
| Sale and recall behavior | Sale retains owner; recall is allowed from SOLD and other states except already RECALLED; permissions remain required |
| Database vs blockchain IDs | UUID vs contract uint256 distinction is correct; numeric contract IDs are stored as decimal strings in SQL references, scoped by network and contract |
| Signing and authentication | Email/password/JWT login differs from MetaMask signing; active backend signer is disabled; direct browser flow is supported |
| Sepolia configuration | 11155111 and 0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a match current code; this confirms configured values only |
| Seed-aware demo | Fresh product, prepared SHIPPED state and Manufacturer A → Distributor B receipt avoid the seeded Distributor/Warehouse same-wallet conflict |
| Public access | Public verify route requires no account/JWT/wallet; QR is a URL, not physical authenticity proof |
| Physical truth boundary | The core distinction between recorded history and physical authenticity is appropriate; describe real-world inspection/label controls as external assumptions, not features verified by this audit |
| Production boundary | Deck does not claim immediate production readiness; no benchmark or live rehearsal proof has been supplied |

## Demo and screenshot review limits

The prepared-history plus one-live-receipt plan is feasible in source, subject to successful rehearsal and the corrections above. Five minutes is a target, not a chain-latency guarantee. Storage must remain optional and requires another confirmed transaction.

No live browser/MetaMask/Sepolia session or deployed database was exercised in Phase 3. Actual wallet balances, roles, deployed bytecode, RPC reliability and screen timings remain unverified. No supplied screenshot can establish successful receipt/ownership change because none was included. This is a limitation of the available evidence, not a request to fabricate it.

MetaMask's exact decoded prompt wording has not been observed. Treat receiveProduct as the requested contract function; verify the actual prompt during rehearsal rather than promising its precise visible label. Test both RPC paths, ABI-ready flags and public URL reachability before the session.

## Validation performed in Phase 3

- Read every docs/presentation Markdown file and checked presentation claims against current implementation.
- Inspected all three Mermaid diagrams as source; no rendered-layout or Mermaid-renderer compatibility approval is claimed.
- Opened the two real logo images. Checked page source for screenshot/UI claims.
- Ran `node packages/contracts/scripts/sync-abi.cjs --check`: passed, committed ABI matches the local compiled artifact.
- Confirmed the contract, shared ABI, action enum and frontend sale handler all use markAsSold.
- Full application/contract suites were not rerun for this documentation-only review. The 81 local tests recorded below belong to Phase 1; they are not new live-demo evidence.
- Application source and presentation/handoff content remain unchanged.

## Phase 4 handoff

Apply the nine numbered technical corrections to the indicated slide content, Thai notes, combined script, demo/Q&A and handoff statements. Preserve visual ownership and the four-slide structure. Revisions and AGY_HANDOFF.md updates belong to Phase 4; they were not performed here. Re-review the revised artifacts before setting APPROVED.

---

# Archived Codex Technical Audit — Phase 1

The following is the historical Phase 1 record. Its READY_FOR_AGY status does not override the current Phase 3 CHANGES_REQUIRED verdict. Item 7 above supersedes its broad wording about in-app transaction links.

## Audit Status

READY_FOR_AGY

Phase 1 completed on 2026-09-27 against repository HEAD `020588dd2b1484910ef24899fe9147a81a1fad83` and the current working tree.

This status releases the verified technical documentation for Antigravity's Phase 2 work. It is **not** final presentation approval, a live deployment attestation, or a claim that the demo has passed rehearsal. No slides, Phase 2 handoff or Phase 3 approval were created.

Updated: [PRESENTATION_CONTEXT.md](PRESENTATION_CONTEXT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DEMO_FLOW.md](DEMO_FLOW.md), [QNA.md](QNA.md). Application functionality was not modified.

## Verified

| Area inspected | Verified implementation / source |
| --- | --- |
| Repository and docs | README.md; docs architecture, blockchain, API, security, development, reference and demo material compared with implementation. Existing documentation is not authoritative where it conflicts with source |
| Stack | Next.js/React/Tailwind/viem, NestJS/Prisma/ethers/JWT, PostgreSQL, Solidity/AccessControl, pnpm and Docker; package manifests under apps and packages/contracts |
| Product identity | SQL UUID differs from contract numeric ID; product chain reference includes network/address. [schema](../../apps/api/prisma/schema.prisma) |
| Draft creation | SQL status REGISTERED with null blockchainProductId; separate registration. [ProductsService.create](../../apps/api/src/products/products.service.ts), [creation UI](../../apps/web/app/products/new/page.tsx) |
| Contract lifecycle | Registration, QC, shipment creation, dispatch, optional transit, receipt, storage, sale, transfer and recall; STORED can start another shipment. [SupplyChainRegistry.sol](../../packages/contracts/contracts/SupplyChainRegistry.sol) |
| Receipt and ownership | Receipt emits ProductReceived and OwnershipTransferred; designated receiver becomes owner; shipment DELIVERED differs from product RECEIVED |
| RBAC | Active action-role matrix and wallet checks documented; application roles differ from contract authority. [action service](../../apps/api/src/blockchain/blockchain-action.service.ts), [JWT strategy](../../apps/api/src/auth/strategies/jwt.strategy.ts), [RolesGuard](../../apps/api/src/auth/guards/roles.guard.ts) |
| Browser signing | Prepare → MetaMask/viem write → receipt wait → confirm; matching wallet/network/ABI checks. [wallet.ts](../../apps/web/lib/blockchain/wallet.ts) |
| Receipt confirmation | Chain, successful receipt, sender, direct-call calldata and expected event/value checks; SQL transaction and repeated-confirm handling. Mediated-call branch has different validation, documented in architecture |
| Disabled server signer | getSigner throws; old registration/QC endpoints return 410 and other old writes reach disabled paths. [BlockchainService](../../apps/api/src/blockchain/blockchain.service.ts), products/quality/shipments controllers |
| Network configuration | Web/API pin Sepolia 11155111 and 0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a. Actual deployed code and wallet state were not queried |
| ABI | Shared @b-most/contracts/abi export used by both applications; committed ABI matches local compiled artifact |
| Public verification | Unauthenticated /verify and /api/public/verify; QR contains a URL with product code. Implementation limitations below |
| Indexer | HTTP JSON-RPC event listener plus explicit historical queries; partial SQL synchronization, not complete recovery |
| UI/assets | Actual app route inventory, redirect aliases, logo files, CSS colors and font imports documented; no browser screenshot validation claimed |
| Containers/config | Compose PostgreSQL/API/web topology, ports, build-time public vars, migrations at startup, optional seeding, Watch rules and local-only Hardhat network configuration inspected |

## Corrected

Corrections apply to the four presentation source documents. Broader repository documentation and code remain unchanged.

- Replaced expected/unverified placeholders with source-backed behavior and evidence links.
- Removed shadcn/ui from the stack; the web package uses custom components and Tailwind.
- Distinguished SQL draft creation from chain registration; REGISTERED in SQL is not proof of a mined registration.
- Added the next-leg loop from STORED, optional IN_TRANSIT, separate storage, failed-QC recall and recall after sale.
- Distinguished product RECEIVED from shipment DELIVERED; sale retains the owner address and QR lookup does not transfer ownership.
- Added API simulation, receipt verification, confirmation and partial indexer paths to architecture.
- Replaced “two-phase commit” implications with a prepare/sign/confirm application protocol; no shared SQL/Ethereum atomic transaction exists.
- Corrected claims that rejection causes no database writes, that intent expiry automatically cleans up records, and that synchronization always repairs the database.
- Separated application role/organization checks from AccessControl and wallet ownership; documented shared-wallet and tenant-scope exceptions.
- Qualified public/private verified flags and SQL-derived timelines. Hash checks and receipt checks are different.
- Replaced assumptions of a full seed-wallet four-organization demo with a rehearsable one-product, one-live-receipt plan and explicit fallback.
- Classified the fixed Sepolia address as configured, not freshly attested. Local Hardhat deployment records are not Sepolia proof.
- Recorded correct UI paths and API details: /dashboard → /, /quality-checks → /quality, user wallet update is PATCH; authenticated product QR returns JSON/data URL, public QR image endpoint returns PNG.
- Removed unsupported implications from wider docs: sub-50ms performance, complete event recovery, WebSocket transport, warehouse binning/coordinates, legal proof, immutable SQL audit trails, automatic contract roles and fully decentralized operation.

## Unsupported / Do Not Present

- Physical authenticity guaranteed by blockchain/QR, truthful inspections guaranteed by hashing, tamper-proof labels, or legally conclusive signatures.
- All application data on-chain; all QC/recall notes private; SQL logs cryptographically immutable.
- shadcn/ui, NFT/ERC-721 minting, IPFS, IoT/GPS telemetry, sensor integration, warehouse bins, payments or consumer-wallet sale transfer. A seed product mentioning IoT is descriptive fixture text.
- Every organization automatically having a unique wallet or an app role automatically granting contract authority.
- A required contract-enforced Manufacturer → Distributor → Warehouse → Retailer order.
- Working shipment cancellation just because CANCELLED exists in the enum.
- A dedicated recall/manual-transfer/contract-role-grant UI; API/contract capability must not be presented as a verified button.
- All legacy REST writes functioning, a backend wallet signing normal business transactions, or a repository completely free of legacy signer fields.
- Every timeline milestone having its own independently verified transaction; an index row for every emitted event.
- Server-enforced 15-minute intent expiration, automatic cleanup, guaranteed synchronization, zero risk of stale state, or distributed atomic commit.
- Correct public on-chain status labels for all nine product states.
- Production readiness, measured latency/throughput, complete security audit, blockchain finality guarantee or successful live Sepolia rehearsal.
- Seeded SQL records/screenshots passed off as confirmed blockchain events or newly executed live transactions.

## Demo Risks

| Priority | Finding and source | Required presentation/demo handling |
| --- | --- | --- |
| High | Public status-name mapping has six old entries for a nine-state contract. Actual READY_TO_SHIP/SHIPPED/IN_TRANSIT/RECEIVED map to SHIPPED/DELIVERED/SOLD/RECALLED; STORED/SOLD/RECALLED map to UNKNOWN. [ProductsService.verifyPublicProduct](../../apps/api/src/products/products.service.ts), [public page](../../apps/web/app/verify/[code]/page.tsx) | Do not claim the public on-chain status card is correct. Rehearse and disclose the limitation; use contract enum/current product state as evidence |
| High | Public hashMatch accepts stored-hash OR recomputed-hash equality; private traceability verified can mean only an on-chain record exists. Public milestones may be marked verified from hash presence or SQL status | Do not describe badges as comprehensive metadata/physical authenticity proofs. Show hashMatch and actual receipt evidence separately |
| High | Indexer does not update currentOwnerId on ownership events or create QC rows; its shipment-created product update omits STORED. [indexer](../../apps/api/src/blockchain/blockchain-indexer.service.ts) | Check SQL owner/QC/state after confirmation; do not continue after a missed confirm assuming indexer recovery |
| High | Seed Distributor and Warehouse share a wallet; sender-to-self shipments are rejected. [seed](../../apps/api/prisma/seed.ts), createShipment in contract/action service | Use Manufacturer → Distributor for timed demo; configure suitable distinct wallets before a full four-actor rehearsal |
| High | Seed product has null chain references, a literal hash, and SQL-only QC/shipment fixtures | Create a fresh product through UI. Do not use fixtures as chain evidence or reseed during demo |
| High | Actual Sepolia bytecode, ABI compatibility at the live address, roles, balances, DB contents and browser flow were not verified | Complete live preflight/rehearsal before relying on writes. Local tests establish no live availability claim |
| Medium | Preparation writes pending intents/shipment drafts; rejected prompts can leave them. Browser does not persist a durable confirmation retry queue. [action service](../../apps/api/src/blockchain/blockchain-action.service.ts), [wallet](../../apps/web/lib/blockchain/wallet.ts) | Preserve intent/hash privately on failure, inspect before retrying, avoid duplicate creation; switch to labeled evidence if needed |
| Medium | Indexer/event-confirm ordering and replay can rewrite status; transaction upsert is unique by hash despite multiple events per tx | Verify actual resulting state and receipts. Do not use transaction-row count as event count |
| Medium | Same-wallet store/sell does not enforce organization-ID equality; dashboard treats no-organization users as global | Do not claim uniform tenant isolation or independent custody merely by changing logins |
| Medium | /blockchain sync starts from block zero; RPC range/rate limits may reject it. Listener startup failure has no scheduled retry in its service | Avoid unrestricted sync during demo; bounded operator recovery must be checked |
| Medium | User login, wallet identity and on-chain permission are separate; app Super Admin cannot bypass owner checks | Prepare profiles and wallets before presentation, rehearse switching, keep credentials off-screen |
| Medium | Browser/API use separate RPC paths; production public URLs are build-time settings; QR localhost fails on phones | Test both RPC paths and the actual phone/public URL; desktop public lookup is a fallback |
| Medium | Public lookup uppercases serial input although stored serial is only trimmed | Use the exact product code for a reliable demo lookup |
| Medium | Full fresh one-leg flow requires five chain transactions, six with storage, plus account switching | Use the timed plan in DEMO_FLOW.md: prepared history, one live receipt, storage optional |

These are documented implementation findings, not fixes made during this phase. Antigravity should use accurate wording and disclose relevant demo limitations rather than depicting missing behavior as implemented.

## Validation performed

Existing tests were executed without changing application source or adding tests.

| Check | Result |
| --- | --- |
| Hardhat SupplyChainRegistry suite | 27 passed, including multiple shipment legs, ownership transfer, invalid transitions and access rejection |
| Focused API suites | 4 suites / 40 tests passed: blockchain-action.service, blockchain-indexer.service, product-state-machine.service, auth-wallet.service |
| Focused web suites | 5 files / 14 tests passed: wallet, shipment, verification, product-registration, quality-blockchain-registration |
| ABI checker | Committed ABI matches local compiled SupplyChainRegistry artifact, including a check after contract tests |

Reproducible commands used from the indicated directories:

```text
packages/contracts:
node node_modules/hardhat/internal/cli/cli.js test

apps/api:
node node_modules/jest/bin/jest.js --runInBand --silent blockchain-action.service.spec.ts blockchain-indexer.service.spec.ts product-state-machine.service.spec.ts auth-wallet.service.spec.ts

apps/web:
node node_modules/vitest/vitest.mjs run test/wallet.test.ts test/shipment.test.tsx test/verification.test.tsx test/product-registration.test.tsx test/quality-blockchain-registration.test.tsx

repository root:
node packages/contracts/scripts/sync-abi.cjs --check
```

Initial pnpm invocations encountered Windows PowerShell script policy and command-resolution issues; invoking the installed Node entry points completed the checks successfully. Web tests emitted a Vite configuration-loader warning without test failures.

These are local contract tests and focused API/web tests with mocks, not an end-to-end MetaMask/Sepolia rehearsal. Passing tests do not negate the source findings above. No production build, live browser capture, database migration, seed/reset, deployment or external chain write was performed.

## Handoff boundary

Use the four updated presentation documents and this review as Phase 2 technical sources. Preserve Phase 2 ownership for visual design, slide composition and speaker-script preparation. Later presentation review must be a separate Phase 3 pass; READY_FOR_AGY must not be represented as Review Status = APPROVED.
