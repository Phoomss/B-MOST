# Troubleshooting Guide

This guide addresses common errors and troubleshooting steps encountered during development, testing, and operations.

---

## 1. Blockchain Connectivity & RPC Issues

### Symptom: API logs `Blockchain disconnected` or status endpoint shows `connected: false`
- **Cause**: The `BLOCKCHAIN_RPC_URL` in `.env` is invalid, unreachable, or rate-limited by the public node provider.
- **Resolution**:
  1. Verify the RPC endpoint using curl:
     ```bash
     curl -X POST https://ethereum-sepolia-rpc.publicnode.com -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
     ```
  2. If using a free public endpoint, consider switching to an Infura, Alchemy, or QuickNode Sepolia endpoint.
  3. Ensure `BLOCKCHAIN_CHAIN_ID=11155111` in `.env`.

---

## 2. Wallet & MetaMask Errors

### Symptom: `กระเป๋าเงินที่เชื่อมต่อไม่ตรงกับบัญชีผู้ใช้งาน`
- **Cause**: The MetaMask active account address does not match the `walletAddress` assigned to the logged-in user in PostgreSQL (`User.walletAddress`).
- **Resolution**:
  1. Check the logged-in profile in the top-right navbar or via `GET /api/auth/me`.
  2. In MetaMask, switch to the account address displayed in the user profile.
  3. Alternatively, have a Super Admin update the user's registered wallet address via `/admin/wallets` or `PUT /api/auth/users/:id/wallet`.

### Symptom: `กรุณาเปลี่ยนเครือข่าย MetaMask เป็น Sepolia`
- **Cause**: MetaMask is connected to Ethereum Mainnet, Hardhat localhost, or a different testnet.
- **Resolution**:
  1. Open MetaMask network selector.
  2. Select **Sepolia** (Chain ID: `11155111` or Hex `0xaa36a7`).
  3. The web app will also offer an automatic network switch button calling `walletClient.switchChain({ id: 11155111 })`.

---

## 3. Product Draft vs On-Chain Disparity

### Symptom: `สินค้านี้ยังไม่ได้ลงทะเบียนบน Blockchain` when attempting Quality Check or Shipment
- **Cause**: The product is currently in **draft state** (`Product.blockchainProductId` is `null`).
- **Resolution**:
  1. Navigate to `/products/[id]`.
  2. Click **"Register on Blockchain"**.
  3. Confirm the MetaMask prompt with a Manufacturer wallet holding `MANUFACTURER_ROLE`.
  4. Wait for the transaction confirmation to populate `blockchainProductId` before moving forward.

---

## 4. State Synchronization Recovery

### Symptom: MetaMask transaction confirmed on Sepolia, but the UI still shows the previous status
- **Cause**: The browser disconnected or the API server restarted between the on-chain mining event and the `POST /api/blockchain/actions/confirm` request.
- **Resolution**:
  1. Look up the transaction on [Sepolia Etherscan](https://sepolia.etherscan.io/) to verify the receipt status is `Success (Status: 1)`.
  2. Re-trigger confirmation using curl or Swagger (`/api/blockchain/actions/confirm`):
     ```bash
     curl -X POST http://localhost:4000/api/blockchain/actions/confirm \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <YOUR_JWT>" \
       -d '{"intentId":"<INTENT_UUID>","transactionHash":"<0x_TX_HASH>"}'
     ```
  3. If the intent has expired (past 15 minutes), a Super Admin can trigger `POST /api/blockchain/sync` with the relevant block range, or wait for the `BlockchainIndexerService` to pick up the event.

---

## 5. Logistics Constraints & Shared Wallet Conflict

### Symptom: Contract reverts with `INVALID_RECIPIENT` during `createShipment`
- **Cause**: Smart contract rule requires `receiver != msg.sender` and `receiver != address(0)`.
- **Seed Fixture Note**: In the default seed fixture:
  - Account 1 (`0x0FcD...`) owns Manufacturer, Retailer, and Auditor.
  - Account 2 (`0x3f07...`) owns Distributor and Warehouse.
  - Therefore, shipping directly from Distributor to Warehouse using default seed accounts will revert because both share Account 2!
- **Resolution**:
  - To simulate Distributor → Warehouse, configure distinct wallet addresses for each organization in `/admin/wallets`, or follow an alternating path (e.g. Manufacturer [Acc 1] → Distributor [Acc 2] → Retailer [Acc 1]).

---

## 6. Database Port & Connection Issues

### Symptom: `Can't reach database server at localhost:5432`
- **Cause**: Local PostgreSQL container publishes port `5433` on the host to avoid colliding with any native PostgreSQL running on port `5432`.
- **Resolution**:
  - Host tools (Prisma CLI, DBeaver) must connect to `localhost:5433`.
  - Inside Docker containers, the hostname is `postgres:5432`.
  - Check that your `.env` contains:
    ```env
    DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bmost_db?schema=public
    DIRECT_URL=postgresql://postgres:postgres@localhost:5433/bmost_db?schema=public
    ```
