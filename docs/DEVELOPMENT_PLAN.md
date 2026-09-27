# Development status and follow-up

This is a concise status record based on the repository implementation, not a live deployment certificate. See [development setup](DEVELOPMENT.md) for runnable commands.

## Implemented in source

- pnpm monorepo with Next.js web, NestJS API, Prisma/PostgreSQL, and a Hardhat contract package.
- Solidity `SupplyChainRegistry` with AccessControl, product quality and custody transitions, history, and read methods.
- Sepolia-fixed web/API integration using MetaMask, prepared action intents, receipt verification, and database sync.
- JWT authentication, organization records, product drafts, shipment and quality views, public verification, dashboards, explorer, audit logging, and test suites.

## Known gaps and checks

- Legacy product/shipment REST write routes still advertise or attempt prior backend-signing behavior; `getSigner()` now throws. Migrate callers to `/api/blockchain/actions/prepare` and `/confirm`; update Swagger annotations when code is changed.
- The contract and Prisma enums include `CANCELLED`, but there is no shipment cancellation method or workflow.
- The checked-in Sepolia ABI comments say event compatibility has not been verified against deployment. Confirm deployed events and role grants with a Sepolia RPC before claiming live operational coverage.
- Compose's API environment does not set `DIRECT_URL` although the Prisma schema declares it. Verify `prisma migrate deploy` in the actual container environment; add a configured direct URL if required.
- Root `.env.example` contains two `DATABASE_URL` examples; select one for each working `.env`.
- Seed data uses shared wallets and a demo password. Keep it in isolated test environments. `FORCE_SEED=true` causes the seed script to clear and rebuild master data.

## Verification commands

`pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm test:integration`, and `pnpm blockchain:test` exist. Run them against the intended environment and record actual results rather than relying on older fixed pass-rate claims. `pnpm lint` can modify API files because its script includes `--fix`.
