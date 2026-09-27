# System test dataset guide

This is a **demo fixture guide**, not a snapshot of the current database or Sepolia deployment. The executable fixture is [`apps/api/prisma/seed.ts`](../apps/api/prisma/seed.ts). Seeding is optional and only appropriate for an isolated database; `FORCE_SEED=true` clears and rebuilds existing master data in that script.

## Seeded actors

The script creates Manufacturer (`ORG-MFG-001`), Distributor (`ORG-DST-001`), Warehouse (`ORG-WRH-001`), Retailer (`ORG-RTL-001`), and Auditor (`ORG-AUD-001`) organizations, plus seven users: `superadmin@bmost.io`, `orgadmin@bmost.io`, `manufacturer@bmost.io`, `distributor@bmost.io`, `warehouse@bmost.io`, `retailer@bmost.io`, and `auditor@bmost.io`. It also creates example product data. The seed uses a shared demo password, so avoid using the fixture on a shared or production database. See [seed wallet mapping](WALLET_ROLES.md).

## Test sequence

1. Configure the API/web for Sepolia and verify the selected wallets, contract role grants, and organization wallet assignments.
2. Log in as Manufacturer, create an unregistered product draft, and use the prepared-action path to call `registerProduct` through MetaMask.
3. Prepare and sign `recordQualityCheck`. A pass advances to `QUALITY_CHECKED`; a fail recalls it.
4. Prepare `createShipment` with a recipient using a distinct wallet; sign `shipProduct`, optionally `markInTransit`, then log in as receiver and sign `receiveProduct`.
5. As the new owner, sign `storeProduct`; create another shipment leg if needed. Retailer can sign `markAsSold` from `STORED`.
6. Check authenticated traceability, `/verify/[code]`, the transaction hash, and the stored database versus chain IDs.

Each write follows [prepare → MetaMask → confirm](ARCHITECTURE.md#transaction-flow). Do not use legacy REST write routes for blockchain milestones. The two-wallet seed cannot directly exercise Distributor → Warehouse because both share one wallet and the contract rejects self-shipments. Use distinct wallets for a full four-organization route.

## Negative cases worth checking

- Wrong Sepolia chain ID, contract address, or MetaMask account.
- Missing contract role for registration, wrong current owner, or a same-wallet shipment receiver.
- Product or shipment database UUID passed where a contract numeric ID is needed.
- Quality check outside `REGISTERED`, shipment from an invalid product state, receipt before shipping, sale before storage, and repeated recall.
- Confirming a transaction with the wrong sender, contract, intent, or expected event; reusing one hash for another intent.
- Public verification response exposes only the intended consumer fields; protected organization data requires JWT.
