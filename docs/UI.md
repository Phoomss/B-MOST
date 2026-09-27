# Web interface

The Next.js App Router lives in [`apps/web/app`](../apps/web/app). User-facing text is primarily Thai; developer documentation uses English.

## Routes

| Route | Purpose |
| --- | --- |
| `/login` | JWT login |
| `/`, `/dashboard` | Dashboard |
| `/products`, `/products/new`, `/products/[id]` | Product list, draft creation, detail and milestones |
| `/quality`, `/quality-checks` | Quality workflow and inspection views |
| `/shipments` | Shipment operations |
| `/traceability` | Authenticated provenance search |
| `/blockchain` | Explorer and transaction views |
| `/audit` | Audit log |
| `/admin/wallets` | Super Admin wallet management |
| `/verify`, `/verify/[code]` | Public consumer verification |

`apps/web/middleware.ts` redirects protected pages when the app session cookie is absent; the API still enforces JWT and authorization. Public verification does not require login.

## Wallet workflow

The browser's `executeUserSignedAction` prepares an action with the API, checks the connected MetaMask account and Sepolia network, writes through viem `WalletClient`, waits for a successful receipt, then confirms the hash with the API. The UI must show a failed confirmation as a possible sync problem even when the chain transaction succeeded. Public API configuration and the contract address are checked before the write. See [transaction flow](ARCHITECTURE.md#transaction-flow).
