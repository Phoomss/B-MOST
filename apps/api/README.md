# B-MOST API

NestJS 11 REST API with Prisma/PostgreSQL, JWT authentication, organization-scoped resources, blockchain reads, prepared wallet actions, receipt confirmation, and Swagger documentation.

From the workspace root, see [Getting Started](../../docs/development/getting-started.md) and [Environment Configuration](../../docs/development/environment.md). The API defaults to `http://localhost:4000/api`; Swagger is at `http://localhost:4000/api/docs`.

```powershell
pnpm dev:api
pnpm db:generate
pnpm db:migrate
pnpm --filter @b-most/api test
```

The normal blockchain write path is `POST /api/blockchain/actions/prepare` → MetaMask → `POST /api/blockchain/actions/confirm`. Backend custodial signing is disabled. See the [REST API Overview](../../docs/api/overview.md).
