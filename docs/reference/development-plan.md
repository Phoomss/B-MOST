# Development Status & Verification Plan

> [!NOTE]
> This document records verified development milestones, verification commands, and known operational boundaries for the B-MOST repository.

---

## 1. Verified Architecture & Feature Status

- [x] **Monorepo Architecture**: pnpm workspaces linking `apps/api`, `apps/web`, and `packages/contracts`.
- [x] **Smart Contract**: Solidity `SupplyChainRegistry.sol` deployed on Ethereum Sepolia at `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a`.
- [x] **Client-Side Signing**: Next.js web application coordinates MetaMask signing via `viem.writeContract`. Server-side signer is disabled.
- [x] **Two-Phase Action Protocol**: `POST /api/blockchain/actions/prepare` and `POST /api/blockchain/actions/confirm` with `BlockchainActionIntent`.
- [x] **Relational Persistence**: PostgreSQL with Prisma ORM 6, tracking organizations, users, drafts, shipments, audit logs, and on-chain transactions.
- [x] **Container Environment**: `docker-compose.yml` and `docker-compose.dev.yml` supporting development hot-reload with Docker Compose Watch.
- [x] **Public Verification**: Consumer QR code verification page with real-time on-chain sanity checks.

---

## 2. Monorepo Quality & Verification Commands

All commands have been verified against the root `package.json`:

```powershell
# 1. Type Checking (Web & API)
pnpm typecheck

# 2. Linting (All packages)
pnpm lint

# 3. Unit Tests (API & Web)
pnpm test

# 4. Smart Contract Compilation & Tests
pnpm blockchain:compile
pnpm blockchain:test

# 5. Integration & End-to-End Tests
pnpm test:e2e
pnpm test:integration

# 6. Production Builds
pnpm build
```

---

## 3. Known Operational Boundaries

1. **Legacy REST Write Routes**: Endpoints such as `POST /api/products/:id/register-blockchain` and `POST /api/quality-checks` return HTTP 410 (Gone). Client applications must use the prepared-action flow.
2. **Shipment Cancellation**: The status `CANCELLED` is present in enums, but no cancellation transition exists in the smart contract.
3. **Database vs Contract Identifiers**: `Product.id` is a UUID string. `Product.blockchainProductId` is a contract integer string. The two must never be interchanged.
4. **Seed Fixture Wallet Sharing**: In `prisma/seed.ts`, Account 1 is shared by Manufacturer, Retailer, and Auditor; Account 2 is shared by Distributor and Warehouse. Multi-hop testing should use alternating legs or separate wallet addresses.
