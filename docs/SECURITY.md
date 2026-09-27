# Security controls

## Identity and authorization

The API uses JWT authentication for protected resources, Prisma `UserRole` values for selected route permissions, and organization checks in guards and services. Users and organizations have public wallet addresses. The connected MetaMask account must match the authenticated user's expected wallet for prepared blockchain actions. Smart-contract AccessControl and current-owner checks are separate from application RBAC; see [roles](BLOCKCHAIN.md#contract-roles-and-application-roles).

The API validates DTOs with `class-validator` and a global pipe that strips unlisted properties and rejects extras. Audit interception records selected actions with sanitized metadata. Public verification has a dedicated controller and returns consumer-facing data; protected traceability and operational records require JWT.

## Blockchain write checks

The browser sends the contract transaction through viem and MetaMask. The API prepares an expiring intent after checking application role, organization, wallet, chain references, and live contract state. At confirmation it checks transaction/receipt status, sender, contract, prepared call or event/state, then synchronizes the database. The backend signer method is disabled. Contract methods enforce their own roles, owner, and state conditions.

## Configuration and secrets

Public: contract address, ABI, wallet addresses, chain ID, transaction hashes. Secret: private keys, seed phrases, JWT secret, database passwords, private RPC URLs or credentials. `NEXT_PUBLIC_*` values are exposed in the web bundle, so never put a secret there. Use local ignored `.env` files or secret storage; the committed `.env.example` is a template only. Replace its example JWT secret and database password before running beyond local development.

The root `.env.example` contains two `DATABASE_URL` examples, one local and one Supabase placeholder. Keep only the intended connection in an actual `.env`, and set `DIRECT_URL` when running Prisma migrations. Compose supplies its own container database URL and can use its default development credentials; configure stronger values for a shared environment.

## Limits to account for

- The older REST write services retain `signerPrivateKey` DTO fields, but `getSigner()` always throws. Avoid sending a private key to any API endpoint; use prepared actions.
- No guarantee of universal tenant isolation is implied by JWT alone. Check each route and service policy when adding data access.
- The checked-in ABI comments say events remain unverified against the Sepolia deployment. Validate them before relying on new event-based behavior.
