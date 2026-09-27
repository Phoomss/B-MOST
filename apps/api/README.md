# B-MOST API

NestJS 11 API with Prisma/PostgreSQL, JWT authentication, organization-aware resources, blockchain reads, prepared wallet actions, receipt confirmation, and Swagger.

From the workspace root, see [development setup](../../docs/DEVELOPMENT.md) and [environment configuration](../../docs/ENVIRONMENT.md). The API defaults to `http://localhost:4000/api`; Swagger is at `http://localhost:4000/api/docs`.

```powershell
pnpm dev:api
pnpm db:generate
pnpm db:migrate
pnpm --filter @b-most/api test
```

The normal blockchain write path is `POST /api/blockchain/actions/prepare` → MetaMask → `POST /api/blockchain/actions/confirm`. Backend signing is disabled. See the [API overview](../../docs/API.md).
