# Wallet และ Role ที่ใช้งานจริง (Real Wallet & Role Mapping)

ตรวจสอบสถานะล่าสุดจากฐานข้อมูลระบบ B-MOST และสัญญา `SupplyChainRegistry` บนเครือข่าย Ethereum Sepolia (Chain ID `11155111`) ที่ Contract Address `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a`

> **ข้อควรจำ:** ชื่อ **Account 1** และ **Account 2** เป็นชื่อเฉพาะที่แสดงในส่วนขยาย MetaMask ของแต่ละเครื่อง ระบบบล็อกเชนและฐานข้อมูลจะไม่เก็บชื่อเหล่านี้ ดังนั้นให้เปิด MetaMask และเทียบ **Public Address** กับตารางด้านล่างเสมอ

---

## 1. ตารางจับคู่สิทธิ์และ Wallet (Current Mapping Matrix)

ระบบกำหนดให้ใช้สถาปัตยกรรม 2-Account สำหรับการทดสอบครบวงจร (End-to-End Testnet Simulation) ดังนี้:

| บัญชี MetaMask | Public Address | บัญชีผู้ใช้ในระบบ (Email & Role) | องค์กรที่สังกัด | Role บนสัญญา Sepolia |
| :--- | :--- | :--- | :--- | :--- |
| **Account 1** | `0x0FcD93659FA339bB05A2A12Ed7000dFD714E0998` | 1. `superadmin@bmost.io` → `SUPER_ADMIN`<br>2. `orgadmin@bmost.io` → `ORG_ADMIN`<br>3. `manufacturer@bmost.io` → `MANUFACTURER`<br>4. `retailer@bmost.io` → `RETAILER`<br>5. `auditor@bmost.io` → `AUDITOR` | • `ORG-MFG-001` (Apex Tech Manufacturing)<br>• `ORG-RTL-001` (Prime Retail Store)<br>• `ORG-AUD-001` (ChainAudit Global) | `DEFAULT_ADMIN_ROLE`<br>`MANUFACTURER_ROLE`<br>`DISTRIBUTOR_ROLE`<br>`WAREHOUSE_ROLE`<br>`RETAILER_ROLE`<br>`LOGISTICS_ROLE`<br>`AUDITOR_ROLE` |
| **Account 2** | `0x3f073b4f50D2B2486B632DFB4c7005FC449cED14` | 1. `distributor@bmost.io` → `DISTRIBUTOR`<br>2. `warehouse@bmost.io` → `WAREHOUSE` | • `ORG-DST-001` (Global Express Distribution)<br>• `ORG-WRH-001` (SafeHub Logistics & Storage) | ปัจจุบันสัญญายังไม่มี Role เฉพาะเจาะจง (รายการรับสินค้า, จัดเก็บ, และสร้างใบส่งต่อของเจ้าของสินค้าใช้สิทธิ์ผู้ถือครอง `currentOwner`) |

> **รหัสผ่านเริ่มต้นสำหรับทุกบัญชี:** `password123`

---

## 2. ลำดับขั้นตอนการทำงานในระบบ (System Flow & Custody Chain)

### กฎข้อบังคับบน Smart Contract (On-Chain Invariant)
ในสัญญาอัจฉริยะ `SupplyChainRegistry.sol` ฟังก์ชัน `createShipment` มีเงื่อนไขตรวจสอบความถูกต้อง:
```solidity
require(receiver != address(0) && receiver != msg.sender, "INVALID_RECIPIENT");
```
**ผลกระทบสำคัญจากการใช้ 2 Accounts:**
- ผู้ส่ง (Sender) และ ผู้รับ (Receiver) จะต้องมี **Public Address คนละ address กัน** เสมอ
- เนื่องจาก **Distributor** และ **Warehouse** ผูกอยู่กับ **Account 2** เหมือนกัน จึงไม่สามารถสร้าง On-chain Shipment ส่งหากันโดยตรงระหว่าง Distributor และ Warehouse ได้ (เนื่องจาก `receiver == msg.sender`)
- ในทำนองเดียวกัน **Manufacturer** และ **Retailer** ผูกอยู่กับ **Account 1** เหมือนกัน จึงไม่สามารถส่งหากันโดยตรงระหว่าง Manufacturer และ Retailer ได้
- ดังนั้น เส้นทางการส่งต่อสินค้าบนบล็อกเชนจะสลับกันระหว่าง **Account 1 ↔ Account 2**

---

### เส้นทางการส่งมอบสินค้ามาตรฐาน (Standard Shipment Paths)

#### เส้นทางหลัก A: ผ่านผู้จัดจำหน่าย (Manufacturer → Distributor → Retailer)
```text
[Account 1] Manufacturer (Apex Tech)
   │  1. registerProduct() → REGISTERED
   │  2. recordQualityCheck() โดย Auditor/Mfg [Account 1] → QUALITY_CHECKED
   │  3. createShipment() (ผู้รับ = Global Express [Account 2]) → READY_TO_SHIP
   │  4. shipProduct() → SHIPPED
   ▼
[Account 2] Distributor (Global Express)
   │  5. receiveProduct() → RECEIVED (โอนกรรมสิทธิ์ On-chain มายัง Account 2)
   │  6. storeProduct() เข้าคลังพักสินค้า → STORED
   │  7. createShipment() (ผู้รับ = Prime Retail [Account 1]) → READY_TO_SHIP
   │  8. shipProduct() → SHIPPED
   ▼
[Account 1] Retailer (Prime Retail)
   │  9. receiveProduct() → RECEIVED (โอนกรรมสิทธิ์ On-chain กลับมายัง Account 1)
   │ 10. storeProduct() เข้าสต็อกหน้าร้าน → STORED
   │ 11. markAsSold() บันทึกการขายแก่ผู้บริโภค → SOLD ✅
   ▼
[Public] ผู้บริโภคสแกน QR Code ตรวจสอบย้อนกลับที่ /verify หรือ /traceability
```

#### เส้นทางหลัก B: ผ่านคลังสินค้าส่วนกลาง (Manufacturer → Warehouse → Retailer)
```text
[Account 1] Manufacturer (Apex Tech)
   │  1. registerProduct() & recordQualityCheck()
   │  2. createShipment() (ผู้รับ = SafeHub Logistics & Storage [Account 2])
   │  3. shipProduct()
   ▼
[Account 2] Warehouse (SafeHub Storage)
   │  4. receiveProduct() → RECEIVED (โอนกรรมสิทธิ์ On-chain มายัง Account 2)
   │  5. storeProduct() เข้าคลังสินค้าส่วนกลาง → STORED
   │  6. createShipment() (ผู้รับ = Prime Retail [Account 1])
   │  7. shipProduct()
   ▼
[Account 1] Retailer (Prime Retail)
   │  8. receiveProduct() → RECEIVED (โอนกรรมสิทธิ์ On-chain กลับมายัง Account 1)
   │  9. storeProduct() → STORED
   │ 10. markAsSold() → SOLD ✅
```

---

## 3. คู่มือการสลับ Account ใน MetaMask ระหว่างทดสอบ

| ลำดับขั้นตอน | บัญชีผู้ใช้ที่ล็อกอิน | สิทธิ์ (Role) | บัญชี MetaMask ที่ต้องเลือก | กิจกรรมที่ทำ |
| :---: | :--- | :--- | :---: | :--- |
| **1** | `superadmin@bmost.io` | `SUPER_ADMIN` | **Account 1** | ตรวจสอบแดชบอร์ด จัดการ wallet ที่ `/admin/wallets` |
| **2** | `orgadmin@bmost.io` | `ORG_ADMIN` | **Account 1** | จัดการข้อมูลสมาชิกและสินค้าภายใน Apex Tech |
| **3** | `manufacturer@bmost.io` | `MANUFACTURER` | **Account 1** | ลงทะเบียนสินค้าใหม่ (`registerProduct`) |
| **4** | `auditor@bmost.io` | `AUDITOR` | **Account 1** | ตรวจสอบคุณภาพสินค้า (`recordQualityCheck`) |
| **5** | `manufacturer@bmost.io` | `MANUFACTURER` | **Account 1** | เปิดใบจัดส่ง (`createShipment`) ไปยัง Distributor หรือ Warehouse |
| **6** | `distributor@bmost.io` หรือ `warehouse@bmost.io` | `DISTRIBUTOR` / `WAREHOUSE` | **Account 2** ⚠️ *(สลับ MetaMask เป็น Account 2)* | ยืนยันรับสินค้า (`receiveProduct`) และกดจัดเก็บ (`storeProduct`) |
| **7** | `distributor@bmost.io` หรือ `warehouse@bmost.io` | `DISTRIBUTOR` / `WAREHOUSE` | **Account 2** | เปิดใบจัดส่ง (`createShipment`) ต่อไปยัง Retailer |
| **8** | `retailer@bmost.io` | `RETAILER` | **Account 1** ⚠️ *(สลับ MetaMask กลับเป็น Account 1)* | ยืนยันรับสินค้า (`receiveProduct`) และกดจัดเก็บ (`storeProduct`) |
| **9** | `retailer@bmost.io` | `RETAILER` | **Account 1** | บันทึกการขายสินค้าหน้าร้าน (`markAsSold`) |
| **10**| สาธารณะ (ไม่ต้องล็อกอิน) | `PUBLIC` | ไม่ต้องใช้ Wallet | ตรวจสอบประวัติสินค้าและ Anchor Hash ที่ `/traceability` หรือ `/verify` |

---

## 4. การจัดการ Wallet ผ่านหน้าแอดมิน (`/admin/wallets`)

หากต้องการตรวจสอบหรือปรับเปลี่ยน Wallet ของผู้ใช้หรือองค์กร:
1. เข้าสู่ระบบด้วย `superadmin@bmost.io` / `password123`
2. เลือกบัญชี MetaMask เป็น **Account 1**
3. ไปที่เมนู **ผู้ดูแลระบบ &rarr; จัดการ Wallet** (`http://localhost:3000/admin/wallets`)
4. เลือกรหัสผู้ใช้ที่ต้องการ ป้อน Public Address และเลือก ☑ **อัปเดตกระเป๋าเงินขององค์กรที่สังกัดด้วย** เพื่อให้สอดคล้องกัน
5. กด **บันทึกข้อมูล**
6. ตรวจสอบ Role บน Smart Contract ได้ผ่าน Swagger API: `GET /api/blockchain/roles/{wallet}`
