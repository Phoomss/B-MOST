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
- The canonical ABI matches the compiled Solidity artifact; confirm deployed runtime bytecode and role grants with a Sepolia RPC before claiming live operational coverage.
- Compose supplies `DIRECT_URL` for Prisma migrations. Verify `prisma migrate deploy` in the actual container environment.
- Root `.env.example` contains one local `DATABASE_URL` and a matching `DIRECT_URL`; replace both for hosted PostgreSQL.
- Seed data uses shared wallets and a demo password. Keep it in isolated test environments. `FORCE_SEED=true` causes the seed script to clear and rebuild master data.

## Verification commands

`pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm test:integration`, and `pnpm blockchain:test` exist. Run them against the intended environment and record actual results rather than relying on older fixed pass-rate claims. `pnpm lint` can modify API files because its script includes `--fix`.
