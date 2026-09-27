# Database model

The authoritative schema is [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma). Prisma uses PostgreSQL with `DATABASE_URL` and `DIRECT_URL`.

## Main models

| Model | Purpose |
| --- | --- |
| `Organization`, `User` | Tenant, app role, status, and public wallet address |
| `Product` | Product code, serial, manufacturer, current owner, status, and chain reference |
| `Shipment` | Delivery leg, sender, receiver, optional carrier, status, and chain reference |
| `QualityCheck` | Inspection result, inspector, organization, and transaction hash |
| `BlockchainActionIntent` | Prepared user-signed action and confirmation status |
| `BlockchainTransaction` | Indexed or confirmed transaction metadata |
| `AuditLog` | Recorded API actions and context |

The schema enums include eight `UserRole` values, nine `ProductStatus` values, five `ShipmentStatus` values, and `PENDING`/`PASSED`/`FAILED` quality results. `CANCELLED` is present in the shipment enum, but the contract has no cancellation function; there is no implemented cancellation workflow.

## Database and blockchain identifiers

```text
Product.id != Product.blockchainProductId
Shipment.id != Shipment.blockchainShipmentId
```

`Product.id` and `Shipment.id` are database UUID strings. Their optional `blockchainProductId` and `blockchainShipmentId` are contract numeric IDs stored as strings. Only the latter go into contract calls. Product and shipment rows also store `blockchainChainId`, `blockchainContractAddress`, and transaction hashes. Products have a composite uniqueness constraint on `(blockchainChainId, blockchainContractAddress, blockchainProductId)`; a draft product has no blockchain ID. `Shipment.productId` is the **database** product UUID.

The API's action preparation checks chain ID `11155111`, fixed contract address, product code/hash, owner wallet, and expected status against live contract reads. Confirmation saves IDs and status after verifying a receipt. A failed or interrupted sync can leave a chain transaction ahead of the database; inspect both systems before retrying a write.

## Migrations and seed data

Use `pnpm db:generate` and `pnpm db:migrate` for host development after configuring both database URLs. `pnpm db:seed` populates demo data; it is optional. Compose's API entrypoint applies migrations and seeds only when `SEED_DATABASE=true` or `AUTO_SEED=true`.
