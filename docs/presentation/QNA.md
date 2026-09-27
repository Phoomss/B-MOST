# B-MOST Presentation Q&A

## Why use blockchain alongside PostgreSQL?

PostgreSQL stores accounts, organizations, detailed products, drafts, shipment relations, action intents and application logs. The contract records selected product hashes, wallet ownership, state transitions, QC and shipment history. This allows comparison against an external ledger while retaining SQL queries and application operations. It does not make SQL immutable.

## Is all information on-chain?

No. Product names, serials and organization relations are primarily in SQL, with selected fields committed by a hash. The contract stores product codes, hashes, wallet addresses, statuses, shipment information and history. QC notes and recall reasons are also on-chain strings, so do not describe all notes as private.

## Does a verified QR prove a physical product is authentic?

No. The QR is a URL to /verify/<productCode>, not an NFT or a cryptographic physical tag. It can be copied. The system checks recorded data; trustworthy physical labeling and truthful inspections remain external assumptions.

Public verification currently accepts a chain hash matching either the stored SQL hash or the freshly computed hash. It does not prove all current metadata is unchanged. The public on-chain status-name mapping is also outdated. See [CODEX_REVIEW.md](CODEX_REVIEW.md).

## What exactly is hashed?

Canonical JSON containing normalized productCode, serialNumber, manufacturer database UUID, optional name and category, hashed with Keccak-256. Description is excluded. Normal API edits protect hash fields after registration. The stored hash and recomputed hash are distinct values when metadata changes outside those protections.

Source: [product-hash.util.ts](../../apps/api/src/products/utils/product-hash.util.ts).

## Why Sepolia? Is the live deployment verified?

The application targets an Ethereum test network for demonstration and uses test ETH for gas. Source pins chain ID 11155111 and contract 0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a. This audit verified configuration and local behavior, not live deployed bytecode, balances or network availability. Local Hardhat tests are separate from Sepolia.

## What does MetaMask do? Is it also the login?

Login uses email/password and JWT. MetaMask signs blockchain transactions. The selected account must match the application's public wallet mapping and the action's contract authority. The API prepares/simulates the call and verifies its mined receipt before completing SQL synchronization. Business private keys are not required by the active API flow; getSigner() is disabled. Legacy DTOs still exist, so do not claim the entire repository has no historical private-key fields.

## Does the backend send transactions?

The active business flow signs and broadcasts from the browser wallet. The backend reads the chain, simulates calls, checks receipts/events and updates SQL. Old routes remain, including disabled signer paths; these are not the demo integration path.

## Who creates a product?

The normal business origin is Manufacturer. The product-create API also permits Super Admin and ORG_ADMIN, subject to a valid Manufacturer organization. On-chain registration preparation permits Manufacturer or Super Admin; the wallet still needs MANUFACTURER_ROLE. Downstream organizations receive the same product instead of recreating it.

## What is a draft?

A SQL product with no blockchainProductId. It already has SQL status REGISTERED, so that label alone proves nothing about on-chain registration. Draft creation and chain registration are separate operations. The creation form defaults to no immediate blockchain registration.

## Who owns the product during shipping?

The existing owner remains owner during shipment creation, dispatch and transit. receiveProduct assigns currentOwner to the designated receiver, sets product RECEIVED and shipment DELIVERED, and emits ProductReceived plus OwnershipTransferred. Storage is a separate transaction. Sale sets SOLD and retains the owner's address; customer QR lookup is a read.

## Must the journey always follow all four organization types?

No. It is a business scenario, not a contract-enforced order. A stored product can start another shipment with a different receiver wallet. IN_TRANSIT is optional. The seeded Distributor and Warehouse share one wallet and cannot ship to each other. A full four-actor journey needs suitable wallet mappings and rehearsal.

## How are permissions controlled?

Application JWT/roles, organization and wallet checks, then independent contract role/ownership/state checks. An application role grants no automatic on-chain role. Several contract actions rely on current ownership rather than Distributor/Warehouse/Retailer roles. SUPER_ADMIN in the app cannot bypass on-chain owner checks.

Store/sell preparation checks owner wallets without requiring the user organization ID to equal the owner organization ID. Shared wallets weaken the distinction between organizations. Do not claim perfect tenant isolation or a completed security audit.

## Can an auditor or owner recall a sold product?

The contract allows recall from any state except already RECALLED, including SOLD, by the original manufacturer, current owner, Auditor role or contract admin. The action API only permits application Super Admin, Manufacturer or Auditor and requires a reason. No dedicated recall UI control was found; do not promise a recall button.

## Can users edit blockchain history or cancel shipments?

Permitted later transactions change current state while previous transactions/history remain recorded. There is no contract product-deletion function. Shipment CANCELLED is an enum placeholder without a cancellation operation. Application SQL logs are ordinary database records, not an immutable blockchain ledger.

## What happens when a transaction fails?

A rejected prompt does not approve a chain write, but the database product draft, pending intent or shipment draft may already exist. A reverted transaction does not advance contract state; gas may be spent. A mined transaction persists even if SQL confirmation fails. Preserve the original intent/hash and retry confirmation as the same user where appropriate; do not blindly resend a state-changing transaction.

Confirmation accepts repeated requests for an already confirmed intent with the same hash. It sets a 15-minute expiresAt during preparation, but only the browser currently checks expiry before sending. Do not claim automatic cleanup or server-enforced expiry.

## Does the indexer guarantee recovery?

No. It listens to contract events and supports historical queries, but it does not reconstruct all SQL records or ownership. QC events update status without creating QC rows; ownership events do not update currentOwnerId. Creating a new leg from STORED is also missing from its shipment-created status update. Browser confirmation is necessary for the intended complete update.

The transaction table is unique by hash, so two events in one transaction do not produce two independent event rows.

## What is verified in the traceability view?

The timeline combines SQL milestones; separate chain history and hash information are queried when the product has the current Sepolia reference. The private API's verified flag can mean a chain record exists; inspect hashMatch as well. Its UI uses both flags for the positive check. Public milestone badges sometimes just indicate a stored transaction hash and may reuse the shipment-creation hash.

## Why separate database and blockchain IDs?

SQL IDs are UUIDs; contract IDs are numeric uint256 values stored as strings in SQL. Always retain chain ID and contract address too. Shipment.productId in SQL refers to the product UUID, while the contract's productId is numeric. A product code is the business lookup key and QR path value.

## What can customers see without logging in?

Product details, manufacturer/current owner summary, passed QC information (including notes and inspector names), shipment timeline, blockchain comparison, a QR URL and available transaction hashes for display/copy. The public page does not provide a built-in explorer link for every transaction. It is a public report, not the protected organization dashboard. A phone needs a reachable URL; localhost addresses only reach the phone itself.

## Is this production-ready or fully decentralized?

No production-readiness claim is supported by this audit. The web, API, SQL database, role administration and RPC services remain operational dependencies. The inspected controls and focused tests do not establish comprehensive security, availability, performance or finality guarantees. No performance benchmark, live deployment attestation or external smart-contract audit was completed here.

## Short Thai answers

| Topic | Answer |
| --- | --- |
| Blockchain | บันทึกสถานะ ผู้ถือครอง และประวัติเหตุการณ์ที่สำคัญ |
| PostgreSQL | เก็บข้อมูลการทำงานและความสัมพันธ์ของระบบ |
| MetaMask | ผู้ใช้ยืนยันและลงนามธุรกรรมด้วยกระเป๋าของตนเอง |
| Receipt | เมื่อรับสำเร็จ เจ้าของเปลี่ยนเป็นผู้รับที่กำหนดไว้ |
| QR | เปิดหน้าตรวจสอบสาธารณะ ไม่ใช่หลักประกันว่าสินค้าจริงไม่ถูกปลอม |
| IDs | UUID ในฐานข้อมูล กับเลข ID บนสัญญาเป็นคนละค่า |
| Demo limit | ผลทดสอบในเครื่องยังไม่ยืนยันความพร้อมของระบบจริง |

Source map: [architecture](ARCHITECTURE.md), [contract](../../packages/contracts/contracts/SupplyChainRegistry.sol), [action service](../../apps/api/src/blockchain/blockchain-action.service.ts), [public verification](../../apps/api/src/products/products.service.ts), [traceability](../../apps/api/src/traceability/traceability.service.ts), [indexer](../../apps/api/src/blockchain/blockchain-indexer.service.ts). For unverified implementation questions, state the boundary rather than guessing.
