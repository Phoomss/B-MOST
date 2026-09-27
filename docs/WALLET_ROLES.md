# Demo wallet and role mapping

The addresses below come from [`apps/api/prisma/seed.ts`](../apps/api/prisma/seed.ts). They describe **seed defaults**, not verified live database or Sepolia role assignments. MetaMask account labels are local to each browser. Confirm the selected public address and current contract roles before a test; `GET /api/blockchain/roles/:wallet` is Super Admin protected.

| Seed wallet | Public address | Seed users and organizations |
| --- | --- | --- |
| Account 1 | `0x0FcD93659FA339bB05A2A12Ed7000dFD714E0998` | Super Admin, Org Admin, Manufacturer, Retailer, Auditor; manufacturer, retailer, auditor organizations |
| Account 2 | `0x3f073b4f50D2B2486B632DFB4c7005FC449cED14` | Distributor, Warehouse; distributor and warehouse organizations |

The seed script sets a shared demo password; use these accounts only in an isolated development dataset. The seed does not grant on-chain roles. The deployed contract's role state must be read from Sepolia. Public wallet addresses are safe to share; never share the corresponding private keys or seed phrases.

## How permissions combine

The JWT user has an application role and a public `walletAddress`; the organization can also have a wallet address. Prepared actions compare the connected MetaMask account with the expected user and organization wallet, then check contract state and authorization. The contract may authorize by current ownership, a named role, or both. See the [action table](BLOCKCHAIN.md#contract-roles-and-application-roles).

Super Admin can assign a user's public wallet through the API and `/admin/wallets`. The API's role-change preparation supports grant/revoke for `DISTRIBUTOR_ROLE`, `WAREHOUSE_ROLE`, and `RETAILER_ROLE`; a contract admin wallet must sign. Application role updates do not automatically grant contract roles.

## Shared-wallet test constraint

`createShipment` rejects a receiver with the same wallet as the sender. Seed Distributor and Warehouse share Account 2, so a direct on-chain shipment between them fails. Seed Manufacturer and Retailer share Account 1, so a direct shipment between them also fails. Use distinct, funded wallet addresses and valid role/ownership setup for the full Manufacturer → Distributor → Warehouse → Retailer chain. The two-wallet seed can demonstrate alternating legs such as Manufacturer → Distributor → Retailer.

Customer verification is public at `/verify` and `/verify/[code]`; authenticated `/traceability` requires login.
