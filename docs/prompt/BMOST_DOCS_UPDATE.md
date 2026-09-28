# B-MOST Documentation Audit & Update

## Goal
Audit and update all B-MOST documentation to match the current repository implementation. Source code is the primary source of truth. Do not document planned, obsolete, or imaginary features as implemented.

## Audit first
Inspect `README.md`, `docs/`, `apps/web/`, `apps/api/`, `packages/contracts/`, Prisma schema, Docker/Compose, package files, pnpm workspace, env examples, CI/CD, Solidity, ABI/config, auth/RBAC, and diagrams.

Identify outdated, duplicated, conflicting, missing, stale, or broken documentation before editing.

## Structure
Use a maintainable structure where justified:

```text
docs/
├── README.md
├── architecture/
│   ├── system-architecture.md
│   ├── blockchain-architecture.md
│   └── data-flow.md
├── development/
│   ├── getting-started.md
│   ├── environment.md
│   ├── docker.md
│   └── troubleshooting.md
├── blockchain/
│   ├── smart-contract.md
│   ├── roles.md
│   ├── product-lifecycle.md
│   └── transaction-flow.md
├── api/overview.md
├── guides/demo-flow.md
└── security/security.md
```

Do not create empty/duplicated docs just to match this tree.

## Root README
Keep `README.md` concise: description, objectives, features, stack, architecture, repo structure, prerequisites, quick start, env setup, Docker dev command, app URLs, blockchain info, docs index, and verified development commands. Put details in `docs/`.

## Current blockchain
Document and verify:
- Network: Sepolia
- Chain ID: `11155111`
- `SupplyChainRegistry`: `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a`

Public: contract address, ABI, wallet addresses, tx hashes.
Secret: private keys, seed phrases, JWT secret, DB passwords, private RPC credentials. Never document real secrets.

## Architecture
Current intended write flow:

```text
Frontend → MetaMask → viem WalletClient → Sepolia → SupplyChainRegistry
```

Backend handles REST API, PostgreSQL, auth/RBAC, applicable blockchain reads, receipt/event verification, and DB synchronization. Normal business writes are signed by the connected MetaMask wallet, not a backend deployer key.

## Database vs blockchain IDs
Explicitly document:

```text
Product.id != Product.blockchainProductId
Shipment.id != Shipment.blockchainShipmentId
```

Never use DB IDs where contract blockchain IDs are required. Verify synchronization fields against Prisma.

## Supply-chain flow
Validate against implementation and document:

```text
Manufacturer → Distributor → Warehouse → Retailer → Customer Verification
```

Manufacturer creates/registers the Product. Downstream organizations do not recreate it; they receive and forward the same product via shipments/ownership transitions.

Typical flow:
- Manufacturer: Register → Quality Check → Create Shipment → Ship
- Distributor: Incoming → Receive → Store/Process → Create Next Shipment
- Warehouse: Incoming → Receive → Store → Create Next Shipment
- Retailer: Incoming → Receive → Store → Mark Sold
- Customer: QR Scan → Public Verification → Trace History

## Roles
Separate application RBAC from smart-contract AccessControl.

Application roles may include:
`SUPER_ADMIN`, `ORG_ADMIN`, `MANUFACTURER`, `DISTRIBUTOR`, `WAREHOUSE`, `RETAILER`, `AUDITOR`, `VIEWER`.

Derive contract roles from Solidity. For important actions document application permission, contract role, ownership requirement, and required state. Do not assume app roles and contract roles are identical.

## Lifecycles
Verify against Solidity before documenting.

Product:
`REGISTERED → QUALITY_CHECKED → READY_TO_SHIP → SHIPPED → IN_TRANSIT → RECEIVED → STORED → SOLD`, plus `RECALLED`.

Shipment:
`PENDING → SHIPPED → IN_TRANSIT → DELIVERED`, plus `CANCELLED` only where actually supported.

Explain the operation responsible for each valid transition.

## Environment
Separate frontend/backend env documentation and verify every name in source.

Frontend candidates:
```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_CHAIN_ID=
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_BLOCKCHAIN_ABI_READY=
```

Backend candidates:
```env
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
BLOCKCHAIN_RPC_URL=
CONTRACT_ADDRESS=
BLOCKCHAIN_CHAIN_ID=
BLOCKCHAIN_ABI_READY=
```

Use placeholders only; never expose secrets.

## Docker
Verify/document the base + dev override:

```text
docker-compose.yml + docker-compose.dev.yml
```

Development:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --watch
```

Include a PowerShell-compatible one-line command. Document web/api/postgres and optional local Hardhat profile. Current normal blockchain target is Sepolia; local-chain is optional.

## Local development
Use pnpm. Inspect package scripts and document only commands that exist, e.g. `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## API
Inspect NestJS controllers and Swagger. Document base URL, auth, major resources, Swagger URL, and authorization. Prefer Swagger for detailed endpoint contracts instead of duplicating every endpoint manually.

## Security
Document only implemented controls: JWT, app RBAC, org isolation, MetaMask signing, AccessControl, tx verification, secret management, validation, no frontend private keys, no committed secrets, and public/private blockchain configuration.

## Diagrams
Use maintainable Mermaid diagrams where useful: system architecture, supply-chain flow, lifecycle, blockchain transaction flow.

## Markdown standard
- One H1 per document
- Logical H2/H3 hierarchy
- Descriptive headings
- Language identifiers on fenced code
- Tables only when useful
- Consistent terminology
- Relative internal links
- Minimal decorative emojis
- No duplicated sections or giant paragraphs
- Concise technical writing

Use consistent terms: B-MOST, SupplyChainRegistry, Blockchain, Sepolia, MetaMask, Manufacturer, Distributor, Warehouse, Retailer, Auditor.

## Language
Inspect current convention. Prefer English for technical/developer docs unless the repository clearly establishes Thai. Do not create unnecessary bilingual duplicates.

## Stale content
Find/update obsolete contract addresses, Hardhat-only architecture, backend business signing, old env vars/commands/role flows/API behavior. Preserve historical docs only when they remain useful and clearly label them.

## Source-of-truth priority
1. Current executable source
2. Smart contract
3. Prisma schema
4. Package scripts/config
5. Docker config
6. Existing docs

If docs conflict with code, update docs rather than silently changing production code. Report important inconsistencies.

## Links and validation
Validate relative links and README→docs navigation. After editing:
- inspect `git diff`
- check Markdown hierarchy/links
- verify commands against package scripts
- verify env vars against source
- verify roles/transitions against Solidity
- verify DB fields against Prisma
- verify Docker commands against Compose

Do not run destructive commands.

## Do not
Do not modify app functionality, smart contracts, deployments, or database state merely to match docs. Do not expose secrets or invent features, endpoints, env vars, permissions, transitions, or production behavior.

## Final report
Report:
1. Audit summary
2. Files created
3. Files updated
4. Files removed/archived
5. Stale information corrected
6. Architecture inconsistencies found
7. Broken links fixed
8. Final docs structure
9. Manual confirmations remaining
10. `git diff --stat`

Do not stop after auditing. Perform the documentation update after understanding the repository.
