# Development setup

## Prerequisites

Install Node.js 20+, pnpm 11 (workspace declares `pnpm@11.1.1`), and Docker Compose for the container path. Configure a Sepolia RPC URL and a funded MetaMask account with the required contract role to exercise writes.

## Docker development

From the repository root in PowerShell:

```powershell
Copy-Item .env.example .env
pnpm install
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --watch
```

Set `BLOCKCHAIN_RPC_URL` and `JWT_SECRET` in `.env` first. The root alias is `pnpm docker:dev`. Base Compose defines `postgres` (host port 5433 by default), `api` (4000), and `web` (3000). The dev override switches API/web images to development targets and Compose Watch syncs source changes; selected manifests and configuration trigger rebuilds. The normal blockchain target is Sepolia. Optional local Hardhat is a separate contract-development process, not a fourth Compose service.

The API entrypoint runs `prisma migrate deploy`, but the Compose API environment does not supply `DIRECT_URL`, which the Prisma schema declares. Confirm migration behavior in your environment. If Prisma requires it, provide a `DIRECT_URL` pointing at the Compose PostgreSQL service (`postgres:5432`) through a local Compose override before starting. This is a current configuration gap, not an application network setting.

Open web `http://localhost:3000`, API `http://localhost:4000/api`, and Swagger `http://localhost:4000/api/docs`. `pnpm docker:logs` follows logs; `pnpm docker:down` stops the Compose stack without deleting its database volume. `pnpm docker:up` runs the base production-target Compose configuration in detached mode.

## Host development

With `.env` configured for local PostgreSQL and both `DATABASE_URL` and `DIRECT_URL` set:

```powershell
pnpm install
pnpm docker:db
pnpm db:generate
pnpm db:migrate
pnpm dev
```

`pnpm dev` runs the API and web scripts in parallel. `pnpm dev:api` and `pnpm dev:web` run them separately. `pnpm db:seed` adds optional demo data. The web package's `dev` script uses `${PORT:-3000}` shell expansion; on Windows PowerShell, the Docker route is the supported copy-and-run path, while host web launch may require a Unix-compatible shell.

## Contract development and checks

`pnpm blockchain:compile` and `pnpm blockchain:test` run Hardhat compile/tests. `pnpm blockchain:node` starts a local Hardhat node; `pnpm blockchain:deploy` targets localhost. The application itself remains fixed to Sepolia. Root checks include `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm test:integration`. `pnpm lint` runs the API ESLint script with `--fix`, so review its diff after use.

The GitHub Actions CI workflow runs on pull requests to `develop` and pushes to feature/fix/refactor/chore branches. It installs with a frozen lockfile, generates Prisma Client, runs lint, typecheck and unit tests, compiles contracts, then builds applications. The separate auto-PR and auto-merge workflows manage PRs to `develop`; they are not deployment workflows.

## Troubleshooting

- Missing/incorrect `BLOCKCHAIN_RPC_URL`: API contract status is disconnected; verify the URL and Sepolia chain ID.
- Wallet/network mismatch: select the wallet assigned to the JWT user and switch MetaMask to Sepolia (`11155111`).
- Draft product lacks `blockchainProductId`: register it through a prepared wallet action before quality or shipment actions.
- Chain transaction confirmed but database stale: retry `/api/blockchain/actions/confirm` with the original intent and hash while valid, then inspect chain and DB state before sending another write.
- Prisma connection failure: use the container host `postgres:5432` only inside Compose; host tools use `localhost:5433` by default. Ensure `DIRECT_URL` is set for migrations and passed into the API container when using Compose.
