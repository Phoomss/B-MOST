# B-MOST Presentation — Level 3 Technical Review

## Review Status

CHANGES_REQUIRED

Reviewed [PRESENTATION_FINAL.md](PRESENTATION_FINAL.md) (SHA-256 `0B2F3D9DD183A8DFE959DF6D9879583D5BC2443D1AE83726FED466884E19FBA3`) against current repository HEAD `020588dd2b1484910ef24899fe9147a81a1fad83` on 2026-09-27. The five previously requested corrections have been applied to the main claims. Two related Slide 2 statements still overstate what the current app can do. Keep the presentation at `READY_FOR_CODEX_REVIEW` until these are corrected and reviewed.

## Required Changes

1. **Slide 2 speaker notes — Manufacturer presented as able to perform storage.**

   **Current claim:** The speaker notes group “Manufacturer, Distributor, Warehouse หรือ Super Admin” as permitted users who can take a received product into storage (`STORED`) and then create the next shipment.

   **Why incorrect:** The two actions have different app role lists. `STORE_PRODUCT` permits `SUPER_ADMIN`, `DISTRIBUTOR`, `WAREHOUSE`, and `RETAILER`; it does **not** permit `MANUFACTURER`. `CREATE_SHIPMENT` permits `SUPER_ADMIN`, `MANUFACTURER`, `DISTRIBUTOR`, and `WAREHOUSE`; it excludes `RETAILER`. The same role list cannot describe both actions.

   **Repository evidence:** [blockchain-action.service.ts](../../apps/api/src/blockchain/blockchain-action.service.ts) checks `CREATE_SHIPMENT` at the action branch around line 394 and `STORE_PRODUCT` around line 523. [SupplyChainRegistry.sol](../../packages/contracts/contracts/SupplyChainRegistry.sol) requires `RECEIVED` for `storeProduct` and `STORED` for the next `createShipment` leg.

   **Exact correction:** Split the Slide 2 speaker sentence by action: “หลังรับสินค้า ผู้ใช้ที่มีบทบาท Distributor, Warehouse, Retailer หรือ Super Admin และกระเป๋าตรงกับเจ้าของปัจจุบัน สามารถลงนาม `storeProduct` เพื่อเปลี่ยนเป็น `STORED` ได้ หลังธุรกรรมนี้สำเร็จ ผู้ใช้บทบาท Manufacturer, Distributor, Warehouse หรือ Super Admin ที่ผ่านการตรวจสิทธิ์และกระเป๋าเจ้าของจึงสามารถสร้าง Shipment ถัดไปไปยังกระเป๋าผู้รับอื่นได้ โดย Retailer ไม่สามารถสร้าง Shipment ผ่านแอปปัจจุบัน.” Keep the shorter combined script's Distributor/Warehouse example, which is supported.

2. **Slide 2 associated five-minute demo, 2:40–3:15 — next leg described as immediately ready after clicking Store.**

   **Current claim:** The narration says the Distributor can click “Store” and is then ready to create the next Shipment “ได้ทันที,” while the expected verification in this step only shows the Store button ready. The plan does not perform or confirm a Store transaction in this step.

   **Why incorrect:** After receipt the product is `RECEIVED`. `createShipment` is allowed only from `QUALITY_CHECKED` or `STORED`; reaching `STORED` requires a separate user-signed `storeProduct` transaction and successful chain/SQL confirmation. Merely having or clicking the Store button does not establish that the next shipment can be created.

   **Repository evidence:** [SupplyChainRegistry.sol](../../packages/contracts/contracts/SupplyChainRegistry.sol) `storeProduct` and `createShipment` state checks; [product-state-machine.service.ts](../../apps/api/src/blockchain/product-state-machine.service.ts) action-state table; [product detail UI](../../apps/web/app/products/%5Bid%5D/page.tsx) shows Store only at `RECEIVED`, shows Ship at `STORED`, and runs Store through `executeUserSignedAction`.

   **Exact correction:** In the 2:40–3:15 demo row, say that the Distributor organization is shown as owner and the Store action is available. Add: “A next shipment becomes available only after a separate `storeProduct` transaction is mined and confirmed, changing the product to `STORED`.” Keep storage as an optional post-demo step unless the plan allocates time to sign and confirm it.

No application or slide content was changed in this Level 3 review. The prior five-issue review is archived at [CODEX_REVIEW_LEVEL3_FIVE_20260927.md](CODEX_REVIEW_LEVEL3_FIVE_20260927.md).
