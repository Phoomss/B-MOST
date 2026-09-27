# B-MOST — Blockchain Error UX Refactor

## Goal
Refactor blockchain error handling across the Next.js frontend so normal users never see raw viem/MetaMask/RPC/contract error dumps.

Keep unchanged:
- Sepolia, Chain ID `11155111`
- Contract `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a`
- MetaMask + viem signing architecture
- Smart contract, database schema, and retry flow

## Tasks

### 1. Centralize blockchain errors
Inspect existing utilities first. Reuse one if available; otherwise create something like:

`apps/web/lib/blockchain/errors.ts`

Provide a reusable function such as:

```ts
getBlockchainErrorMessage(error: unknown): string
```

Safely inspect nested viem errors (`cause`, `shortMessage`, `details`, `name`, `code`) without excessive `any`.

### 2. Handle MetaMask rejection
Detect:
- code `4001`
- `UserRejectedRequestError`
- `User rejected the request`
- `User denied transaction signature`

Show only:

> คุณยกเลิกการยืนยันธุรกรรมใน MetaMask

or:

> ยกเลิกการทำรายการแล้ว

Do not treat cancellation as a severe system failure.

### 3. Map known errors
- `UNAUTHORIZED_ACTION` → `คุณไม่มีสิทธิ์ดำเนินการนี้`
- `PRODUCT_NOT_FOUND` → `ไม่พบข้อมูลสินค้านี้บน Blockchain`
- `SHIPMENT_NOT_FOUND` → `ไม่พบข้อมูลการจัดส่งนี้บน Blockchain`
- `INVALID_STATE_TRANSITION` → `สถานะปัจจุบันของรายการไม่รองรับการดำเนินการนี้`
- `NOT_CURRENT_OWNER` → `บัญชีที่เชื่อมต่อไม่ได้เป็นเจ้าของสินค้าปัจจุบัน`
- insufficient funds → `ยอด Sepolia ETH ไม่เพียงพอสำหรับค่าธรรมเนียมธุรกรรม`
- wrong chain → `กรุณาเปลี่ยนเครือข่าย MetaMask เป็น Sepolia`
- wallet disconnected → `กรุณาเชื่อมต่อ MetaMask ก่อนทำรายการ`
- unknown → `ไม่สามารถทำรายการบน Blockchain ได้ กรุณาลองใหม่อีกครั้ง`

Never fall back to raw error text.

### 4. Product registration partial success
PostgreSQL product creation and blockchain registration are separate.

If the DB product was created but MetaMask was rejected, do NOT show `เกิดข้อผิดพลาดในการลงทะเบียน`.

Show:

**สร้างสินค้าแล้ว**

`บันทึกสินค้าในระบบเรียบร้อยแล้ว แต่คุณยกเลิกการยืนยันธุรกรรมใน MetaMask สามารถบันทึกบน Blockchain ภายหลังได้`

Keep the existing product link/retry action, e.g. `ไปหน้าสินค้า`.

Never delete the successfully created DB record.

### 5. Alert / Toast
Reuse the project's existing shadcn/Sonner/Toast/Alert system. Do not add another notification library unnecessarily.

Use:
- success → success
- cancellation → neutral/warning
- authorization → warning/error
- actual failure → error

Never render raw error objects.

### 6. Audit raw error rendering
Search for and replace user-facing blockchain usages of:

```ts
error.message
err.message
String(error)
`${error}`
JSON.stringify(error)
toast.error(error.message)
setError(error.message)
alert(error.message)
```

Route them through the centralized sanitizer.

### 7. Development logging
Raw technical errors may be logged only for development diagnostics:

```ts
if (process.env.NODE_ENV === "development") {
  console.error("Blockchain transaction failed:", error);
}
```

Never log private keys, seed phrases, JWT secrets, DB passwords, or private RPC credentials.

### 8. Apply consistently
Audit:
- Register Product
- Quality Check
- Create Shipment
- Ship Product
- Mark In Transit
- Receive Product
- Store Product
- Mark Sold
- Recall Product
- Grant Role/admin blockchain actions

### 9. Do not change
Do not:
- modify/redeploy `SupplyChainRegistry.sol`
- change contract/network
- change MetaMask signing architecture
- move business writes to backend signing
- change DB schema
- remove retry registration
- silently suppress real failures

## Expected UX
When the user clicks `บันทึกบน Blockchain`, MetaMask opens, and they reject:

> **ยกเลิกการทำรายการ**  
> คุณยกเลิกการยืนยันธุรกรรมใน MetaMask สามารถลองใหม่ได้ภายหลัง

Never show calldata, request arguments, wallet/contract diagnostic dumps, stack traces, viem docs/version, or nested RPC errors in the UI.

## Validation
Test:
1. MetaMask Reject
2. Wallet disconnected
3. Wrong network
4. Unauthorized wallet
5. Known contract revert
6. Unknown blockchain error
7. Successful transaction
8. DB product created but blockchain transaction cancelled

Run existing applicable scripts:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Final report
Report:
1. Error utility created/reused
2. Error mappings
3. Files/components changed
4. Raw UI errors removed
5. Partial-success registration UX
6. MetaMask rejection behavior
7. Unknown error behavior
8. Validation results

Start by auditing existing blockchain error handling and notification components before changing code.
