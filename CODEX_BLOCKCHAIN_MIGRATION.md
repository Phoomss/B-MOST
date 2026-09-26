# B-MOST --- Codex Blockchain Migration Instructions

## Objective

Migrate the existing **B-MOST (Blockchain Multi-Organization Supply
Chain Traceability)** blockchain integration from:

**Hardhat Local Network + NestJS `DEPLOYER_PRIVATE_KEY` signing**

to:

**Sepolia Testnet + MetaMask user signing + NestJS read/verify/sync
architecture**

Work with the existing repository. Inspect the codebase before modifying
anything.

------------------------------------------------------------------------

## Non-negotiable rules

-   Do **not** rewrite the project.
-   Do **not** modify `SupplyChainRegistry.sol`.
-   Do **not** redeploy the smart contract.
-   Do **not** change the deployed contract address.
-   Do **not** generate, guess, reconstruct, or invent the ABI/function
    signatures.
-   The real ABI will be added manually later.
-   Do **not** perform destructive database operations automatically.
-   Do **not** automatically grant blockchain roles.
-   Preserve authentication, JWT, RBAC, organizations, users, products,
    shipments, quality checks, audit logs, QR verification, existing
    APIs, and UI.
-   Use **pnpm**.
-   Prefer existing dependencies and project conventions.
-   Never expose or commit private keys/secrets.

## Target configuration

``` text
Network: Sepolia
Chain ID: 11155111
Contract: 0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a

Account 1:
- SUPER_ADMIN
- MANUFACTURER

Account 2:
- DISTRIBUTOR
- WAREHOUSE
- RETAILER
```

Multiple application users must be allowed to share one blockchain
wallet.

Application authorization remains:

``` text
JWT -> User -> Role -> Organization
```

Wallet address is for blockchain identity/signing only. Never infer the
application role from the wallet address.

------------------------------------------------------------------------

## 1. Audit first

Before broad changes, inspect the actual repository and identify:

-   frontend and NestJS backend structure
-   Prisma schema
-   blockchain modules/services
-   ethers/viem usage
-   ABI location
-   RPC and contract configuration
-   `DEPLOYER_PRIVATE_KEY` usage
-   Wallet/Signer construction
-   product, quality-check, and shipment blockchain flows
-   transaction persistence
-   User wallet fields
-   environment files/examples
-   assumptions tied to Hardhat Local

Search for at least:

``` text
DEPLOYER_PRIVATE_KEY
PRIVATE_KEY
new Wallet
new ethers.Wallet
Signer
contract.connect
localhost:8545
0x5FbDB2315678afecb367f032d93F642f64180aa3
registerProduct
recordQualityCheck
createShipment
shipProduct
markInTransit
receiveProduct
storeProduct
transferOwnership
markAsSold
recallProduct
```

Do not assume filenames/models. Use what actually exists.

------------------------------------------------------------------------

## 2. Smart contract

The deployed smart contract is fixed:

``` text
Sepolia
Chain ID: 11155111
0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a
```

Do not modify:

-   contract source
-   state machine
-   ownership rules
-   role rules
-   deployed address

If an application requirement conflicts with the contract, report the
conflict instead of changing the contract.

------------------------------------------------------------------------

## 3. Environment migration

Backend target:

``` env
BLOCKCHAIN_RPC_URL=<SEPOLIA_RPC_URL>
CONTRACT_ADDRESS=0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a
```

Frontend target:

``` env
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a
```

Update appropriate `.env.example` files.

Remove the runtime dependency on `DEPLOYER_PRIVATE_KEY` only after all
business transaction dependencies have been migrated.

Never expose private RPC credentials, private keys, JWT secrets, or
backend secrets through `NEXT_PUBLIC_*`.

------------------------------------------------------------------------

## 4. ABI

I will add the actual ABI manually.

Inspect existing ABI handling first. If no suitable module exists,
create only a minimal placeholder:

``` ts
// TODO: Add actual SupplyChainRegistry ABI
export const supplyChainRegistryAbi = [] as const;
```

Do not fake ABI entries.

For code blocked by the missing ABI, use:

``` text
TODO: Waiting for SupplyChainRegistry ABI
```

Continue implementing work that does not require the ABI.

Prefer a shared ABI source only if the current repository structure
naturally supports it. Do not restructure the project significantly just
for ABI sharing.

------------------------------------------------------------------------

## 5. MetaMask + viem

Frontend blockchain writes must be user-signed through MetaMask.

Implement/reuse:

-   Connect wallet
-   Current account
-   Account change handling
-   Chain change handling
-   Sepolia detection
-   Switch to Sepolia
-   Wallet validation
-   viem Public Client
-   viem Wallet Client

Required chain:

``` text
Sepolia / 11155111
```

Use existing project UI conventions and Thai user-facing messages.

Do not introduce another Web3 framework unless necessary.

------------------------------------------------------------------------

## 6. User-wallet mapping

Inspect the Prisma `User` model first.

The system needs `walletAddress`, but it must **not be unique** for this
two-wallet architecture.

Conceptual mapping:

``` text
Admin User        -> Account 1
Manufacturer User -> Account 1

Distributor User  -> Account 2
Warehouse User    -> Account 2
Retailer User     -> Account 2
```

Do not use:

``` prisma
walletAddress String? @unique
```

Use the project's existing migration conventions. Do not run destructive
migrations automatically.

Before blockchain writes, compare the authenticated user's expected
wallet with the connected MetaMask address using proper address
normalization.

If they do not match, block the transaction and show a Thai message such
as:

> กระเป๋าเงินที่เชื่อมต่อไม่ตรงกับบัญชีผู้ใช้งาน กรุณาเปลี่ยนบัญชีใน MetaMask

------------------------------------------------------------------------

## 7. Remove backend business signing

Audit every use of `DEPLOYER_PRIVATE_KEY`.

Business transactions must migrate from:

``` text
Frontend -> NestJS -> Backend Signer -> Blockchain
```

to:

``` text
Frontend
-> validate user/wallet
-> MetaMask
-> user confirms
-> Sepolia
-> receipt/tx hash
-> NestJS verification
-> PostgreSQL sync
```

Relevant operations include:

``` text
registerProduct
recordQualityCheck
createShipment
shipProduct
markInTransit
receiveProduct
storeProduct
transferOwnership
markAsSold
recallProduct
```

Migration sequence:

1.  identify signer dependencies
2.  introduce MetaMask path
3.  migrate callers
4.  verify behavior
5.  remove unused signer code
6.  remove `DEPLOYER_PRIVATE_KEY` runtime dependency if no longer
    required

Do not blindly delete the existing signer first.

------------------------------------------------------------------------

## 8. Backend responsibility

NestJS should become primarily a read/verify/sync layer.

Responsibilities:

-   read contract state
-   read product/shipment/history
-   fetch transaction and receipt
-   verify transaction success
-   verify target contract
-   verify sender where applicable
-   decode expected events once ABI exists
-   extract blockchain identifiers
-   sync verified blockchain state/results into PostgreSQL
-   support audit/history

The backend must not store organization/user private keys.

------------------------------------------------------------------------

## 9. Transaction verification

Frontend may submit a transaction hash. Backend must independently
verify it.

Target:

``` text
transactionHash
-> Sepolia RPC
-> transaction/receipt
-> success check
-> verify target contract
-> verify sender
-> decode expected event (when ABI exists)
-> extract blockchain IDs/data
-> update PostgreSQL
```

Do not trust frontend values such as:

``` json
{
  "success": true,
  "blockchainProductId": 1
}
```

without blockchain verification.

If event decoding is blocked by the missing ABI, isolate it behind a
clear TODO.

------------------------------------------------------------------------

## 10. Database ID vs blockchain ID

Audit every relevant call.

These IDs are not interchangeable:

``` text
Product.id != Product.blockchainProductId
Shipment.id != Shipment.blockchainShipmentId
```

Contract calls must use blockchain IDs.

Fix any location that incorrectly sends PostgreSQL IDs as contract IDs.

------------------------------------------------------------------------

## 11. Contract roles

Account 1 is Admin + Manufacturer.

Account 2 needs:

``` text
DISTRIBUTOR_ROLE
WAREHOUSE_ROLE
RETAILER_ROLE
```

Prepare support for `grantRole`, `revokeRole`, and `hasRole` where
appropriate, but admin write transactions must be signed by Account 1
via MetaMask.

Do not automatically grant roles from a backend key.

Do not invent role hashes or ABI definitions.

If blocked by ABI, leave a TODO/manual step.

------------------------------------------------------------------------

## 12. Two-wallet constraint

Do not require separate wallets for Distributor, Warehouse, and
Retailer.

Because they share Account 2, do not attempt artificial blockchain
ownership transfers:

``` text
Account 2 Distributor
-> Account 2 Warehouse
-> Account 2 Retailer
```

when the contract disallows self-receiver/self-transfer.

Use this blockchain demo flow:

``` text
Account 1 — Admin / Manufacturer
  Register Product
  -> Quality Check
  -> Create Shipment(receiver = Account 2)
  -> Ship
  -> Mark In Transit

Account 2 — Distributor / Warehouse / Retailer
  Receive
  -> Store
  -> Mark Sold
```

Application dashboards can remain separated by JWT/database role even
though the blockchain address is shared.

Expected state progression:

``` text
REGISTERED
-> QUALITY_CHECKED
-> READY_TO_SHIP
-> SHIPPED
-> IN_TRANSIT
-> RECEIVED
-> STORED
-> SOLD
```

------------------------------------------------------------------------

## 13. Gas and public verification

The wallet signing a write pays Sepolia gas:

``` text
Account 1 -> Admin/Manufacturer writes
Account 2 -> Distributor/Warehouse/Retailer writes
```

Read-only operations do not require user gas.

Customer QR verification must remain public/read-only and must not
require:

-   Login
-   MetaMask
-   Sepolia ETH
-   Transaction signing

Preserve `/verify/[productCode]` or the equivalent existing route.

------------------------------------------------------------------------

## 14. Transaction UX

Follow existing UI conventions. Prefer Thai messages:

``` text
กรุณายืนยันธุรกรรมใน MetaMask
กำลังส่งธุรกรรม...
กำลังรอ Blockchain ยืนยัน...
กำลังตรวจสอบธุรกรรม...
ธุรกรรมสำเร็จ
ผู้ใช้ยกเลิกธุรกรรม
ธุรกรรมล้มเหลว
```

Where appropriate show:

-   transaction hash
-   wallet
-   block number
-   status
-   Sepolia Etherscan link

Do not use raw RPC stack traces as primary user-facing errors.

Map known contract errors such as:

``` text
PRODUCT_NOT_FOUND
SHIPMENT_NOT_FOUND
INVALID_STATE_TRANSITION
NOT_CURRENT_OWNER
UNAUTHORIZED_ACTION
SHIPMENT_PRODUCT_MISMATCH
```

to understandable Thai messages while preserving technical errors in
logs.

------------------------------------------------------------------------

## 15. Old Hardhat Local data

Old environment:

``` text
RPC: http://localhost:8545
Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

New environment:

``` text
Network: Sepolia
Chain ID: 11155111
Contract: 0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a
```

Old local-chain data must not be assumed to exist on Sepolia.

Audit actual models/fields for data such as:

-   `blockchainProductId`
-   `blockchainShipmentId`
-   `transactionHash`
-   `blockNumber`
-   `contractAddress`
-   `chainId`
-   blockchain status/events/history
-   other chain-specific references

Do not guess model/table names.

### Reset/re-sync strategy

Before changing data, report:

-   affected models
-   affected fields
-   affected relationships
-   records requiring reset/re-sync where practical
-   business data that can remain

Do not automatically execute `DELETE`, `TRUNCATE`, `DROP`, or full
database reset.

If useful, prepare a safe development script such as:

``` text
scripts/reset-local-blockchain-data.ts
```

but do not execute destructive behavior without approval.

Preserve non-blockchain business data whenever practical.

### Never reuse local blockchain IDs

A local:

``` text
blockchainProductId = 1
```

must not be treated as the same product on Sepolia.

Fresh Sepolia products/shipments must receive fresh blockchain IDs from
the deployed Sepolia contract/events.

Consider storing `chainId`, `contractAddress`, and transaction identity
if this fits the existing schema and prevents network mixing. Avoid
unnecessary schema changes.

------------------------------------------------------------------------

## 16. Security

Never:

-   expose private keys
-   store private keys in PostgreSQL
-   send private keys through APIs
-   put private keys in frontend code
-   hardcode/commit private keys
-   use public Hardhat default keys on Sepolia
-   trust frontend transaction success without RPC verification
-   trust unverified blockchain IDs
-   confuse DB IDs with blockchain IDs

Ensure secret environment files remain ignored by Git.

------------------------------------------------------------------------

## 17. Implementation phases

Work incrementally:

1.  **Audit** repository and signer/data dependencies.
2.  **Configure Sepolia** RPC, chain ID, and deployed address.
3.  **Prepare ABI placeholder** only.
4.  **Prepare database wallet mapping**.
5.  **Implement MetaMask + viem infrastructure**.
6.  **Migrate blockchain writes** from backend signer to frontend
    wallet.
7.  **Implement backend transaction verification/sync**.
8.  **Prepare Account 2 role management**.
9.  **Audit Hardhat data and prepare reset/re-sync mechanism**.
10. **Validate** with lint/typecheck/tests/build.

Do not perform a blind large rewrite.

------------------------------------------------------------------------

## 18. Validation

Use commands appropriate to the actual workspace and prefer pnpm, for
example:

``` bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Only run commands supported by the repository.

Fix errors introduced by your changes.

Do not hide failures. Report unrelated/pre-existing failures separately.

Because the real ABI is currently missing, distinguish final work as:

``` text
COMPLETED
BLOCKED BY ABI
MANUAL STEP REQUIRED
```

Do not fake a successful integration where ABI is required.

------------------------------------------------------------------------

## Final target checklist

``` text
Smart Contract
└── unchanged

MetaMask
├── Account 1 = Admin + Manufacturer
└── Account 2 = Distributor + Warehouse + Retailer

Contract Roles
└── Account 2 needs Distributor + Warehouse + Retailer roles

Backend .env
├── Sepolia RPC
└── Sepolia Contract Address

ABI
└── placeholder only; user adds real ABI

Frontend
├── Connect MetaMask
├── Detect account
├── Switch Sepolia
├── viem PublicClient
├── viem WalletClient
└── User signs business transactions

Backend
├── no DEPLOYER signer for business transactions
├── read blockchain
├── verify transactions
├── decode events after ABI is supplied
└── sync DB

Database
├── User.walletAddress
├── walletAddress is NOT unique
├── Product.id != blockchainProductId
└── Shipment.id != blockchainShipmentId

Old Local Data
├── audit Hardhat references
├── never reuse old blockchain IDs
├── prepare safe reset/re-sync
└── no destructive execution without approval
```

## Final report required

When finished, report:

1.  Repository architecture found
2.  Files changed
3.  `DEPLOYER_PRIVATE_KEY` usages found
4.  Backend signer code migrated/remaining
5.  Sepolia configuration changes
6.  MetaMask/viem implementation
7.  User-wallet mapping changes
8.  Prisma/database changes
9.  Blockchain ID mapping issues found/fixed
10. Transaction verification implementation
11. Old Hardhat data discovered
12. Reset/re-sync strategy
13. ABI-dependent TODOs
14. Manual steps required
15. Commands/tests executed
16. Test/build results
17. Remaining errors/risks

Manual steps should explicitly identify anything I need to provide or
approve, especially:

-   add the real ABI
-   configure `SEPOLIA_RPC_URL`
-   configure Account 1 / Account 2 addresses
-   grant Account 2 required contract roles
-   provide Sepolia ETH for gas
-   approve database reset/re-sync

**Start by auditing the existing repository before making broad
changes.**
