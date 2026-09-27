# REST API overview

The NestJS API uses the `/api` prefix. Default local URL: `http://localhost:4000/api`. Swagger UI is at `http://localhost:4000/api/docs` and is the reference for request/response DTOs. `apps/api/src/main.ts` applies a global validation pipe with transformation, whitelist, and rejection of extra fields.

## Authentication and access

`POST /api/auth/login` returns a JWT. Send it as `Authorization: Bearer <token>` to protected routes. `GET /api/auth/me` returns the current profile. Most resources use `JwtAuthGuard`; `RolesGuard` limits selected writes, and services/guards enforce organization isolation. `GET /api/public/verify/:productCode` and its `/qr` image route are public. Dashboard reads use an optional JWT and can return public aggregate data.

Application roles are distinct from contract roles. See [blockchain roles](BLOCKCHAIN.md#contract-roles-and-application-roles) and [security](SECURITY.md).

## Major resources

| Prefix | Current purpose |
| --- | --- |
| `/api/auth` | Login, current user, and Super Admin user-wallet management |
| `/api/organizations` | Organizations, shipping partners, and wallet-bearing organization details |
| `/api/products` | Draft CRUD, product lookups, QR data, shipment and history reads |
| `/api/shipments` | Shipment list/detail; legacy write routes also remain registered |
| `/api/quality-checks` | Inspection list/detail; legacy POST returns 410 |
| `/api/traceability` | Authenticated product search and provenance lookup |
| `/api/public/verify` | Public verification by product code or serial and QR PNG |
| `/api/blockchain` | Prepared actions, role reads/changes, verification, status, explorer, sync |
| `/api/dashboard` | Statistics, charts, and recent activity |
| `/api/audit-logs` | Audit list, filters, and detail |

## Blockchain actions

For a business write, call `POST /api/blockchain/actions/prepare` with a `UserSignedAction` and `entityId`, then submit the returned function and arguments through MetaMask on Sepolia. Call `POST /api/blockchain/actions/confirm` with `intentId` and `transactionHash`. The API verifies the receipt and synchronizes the database. The intent expires after 15 minutes. The web client implements this in `apps/web/lib/blockchain/wallet.ts`; the accepted action names are in `apps/api/src/blockchain/dto/blockchain-action.dto.ts`.

Super Admin can read wallet contract roles at `GET /api/blockchain/roles/:wallet` and prepare supported role changes at `POST /api/blockchain/roles/prepare`; the wallet must have contract admin authority. `POST /api/blockchain/verify-transaction` checks a user-signed transaction. Explorer/status endpoints are JWT protected; `POST /api/blockchain/sync` is Super Admin only.

## Legacy write endpoints

`POST /api/products/:id/register-blockchain`, `POST /api/products/:id/quality-check`, and `POST /api/quality-checks` explicitly return HTTP 410 and direct callers to the prepared-action flow. Other older product/shipment write endpoints remain registered, but their service path calls `BlockchainService.getSigner()`, which throws a service-unavailable error. Do not build a new client against them. Some Swagger operation descriptions still describe their old successful behavior; controller registration alone does not establish working functionality.

The API can create and edit **unregistered drafts** with product endpoints. Draft deletion is rejected after a blockchain registration or supply-chain history exists.
