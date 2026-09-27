# B-MOST System Test Dataset & Testing Guide

## 1. Overview & Test Environment

เอกสารนี้รวบรวม **System Test Dataset** และ **คู่มือการทดสอบระบบ (Testing Guide)** สำหรับระบบ **B-MOST (Blockchain Multi-Organization Supply Chain Traceability Platform)** 

เอกสารนี้ออกแบบมาเพื่อให้ทีมพัฒนา (Developer), ทีมทดสอบระบบ (QA/Tester), และผู้มีส่วนได้ส่วนเสีย (Stakeholders) สามารถใช้ข้อมูลชุดเดียวกันในการทดสอบแบบ End-to-End (E2E), Integration Testing, การทดสอบสิทธิ์ผู้ใช้งาน (RBAC), และการทดสอบเชื่อมต่อบล็อกเชน (EVM Smart Contract)

### สรุปจุดเชื่อมต่อระบบ (System Endpoints)

| บริการ (Service) | URL / Connection | รายละเอียด |
| :--- | :--- | :--- |
| **Web Frontend** | `http://localhost:3000` | ระบบเว็บแอปพลิเคชัน (Next.js 16) |
| **Backend API (REST)** | `http://localhost:4000/api` | บริการ API หลัก (NestJS 11) |
| **Swagger API Docs** | `http://localhost:4000/api/docs` | เอกสารและการทดสอบ Interactive API |
| **Sepolia Smart Contract** | `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a` | SupplyChainRegistry บน Ethereum Sepolia (Chain ID: 11155111) |
| **PostgreSQL Database** | `localhost:5433` | ฐานข้อมูลหลัก (Database: `bmost_db`, User: `postgres`) |

---

## 2. องค์กรคู่ค้าในห่วงโซ่อุปทาน (Organizations / Supply Chain Nodes)

องค์กรจำลองครบทุกประเภทตามมาตรฐานห่วงโซ่อุปทาน (Supply Chain Hierarchy):

> **การเชื่อมต่อ MetaMask 2 Accounts บนเครือข่าย Sepolia:**  
> ดูรายละเอียดและสถานะสิทธิ์บนบล็อกเชนใน [Wallet และ Role ที่ใช้งานจริง](WALLET_ROLES.md) โดยกำหนดบทบาท:
> - **Account 1** (`0x0FcD93659FA339bB05A2A12Ed7000dFD714E0998`): Super Admin, Org Admin, Manufacturer (`ORG-MFG-001`), Retailer (`ORG-RTL-001`), Auditor (`ORG-AUD-001`)
> - **Account 2** (`0x3f073b4f50D2B2486B632DFB4c7005FC449cED14`): Distributor (`ORG-DST-001`), Warehouse (`ORG-WRH-001`)

| รหัสองค์กร (Code) | ชื่อองค์กร (Organization Name) | ประเภท (Type) | กระเป๋าบล็อกเชน (Wallet Address) | บทบาทในระบบ |
| :--- | :--- | :--- | :--- | :--- |
| **`ORG-MFG-001`** | **Apex Tech Manufacturing** | `MANUFACTURER` | Account 1 (`0x0FcD93659FA339bB05A2A12Ed7000dFD714E0998`) | โรงงานผู้ผลิตต้นทาง, ลงทะเบียนสินค้า, บันทึกลง Smart Contract |
| **`ORG-DST-001`** | **Global Express Distribution** | `DISTRIBUTOR` | Account 2 (`0x3f073b4f50D2B2486B632DFB4c7005FC449cED14`) | ตัวแทนจำหน่ายค้าส่ง, รับสินค้าจากโรงงาน, กระจายสินค้าต่อ |
| **`ORG-WRH-001`** | **SafeHub Logistics & Storage** | `WAREHOUSE` | Account 2 (`0x3f073b4f50D2B2486B632DFB4c7005FC449cED14`) | คลังจัดเก็บสินค้าส่วนกลาง, คลังสินค้าทัณฑ์บน, ห้องเย็นควบคุมอุณหภูมิ |
| **`ORG-RTL-001`** | **Prime Retail Store** | `RETAILER` | Account 1 (`0x0FcD93659FA339bB05A2A12Ed7000dFD714E0998`) | หน้าร้านค้าปลีก, จุดจำหน่ายให้แก่ผู้บริโภค (Consumer POS) |
| **`ORG-LOG-001`** | **SwiftFreight Carrier Express** | `LOGISTICS` | `0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f` | ผู้ให้บริการขนส่งสินค้า (Carrier), อัปเดตสถานะการนำส่ง |
| **`ORG-AUD-001`** | **ChainAudit Global Assurance** | `AUDITOR` | Account 1 (`0x0FcD93659FA339bB05A2A12Ed7000dFD714E0998`) | ผู้ตรวจรับรองมาตรฐานภายนอก (Third-party Auditor), สุ่มตรวจ QC |

---

## 3. ข้อมูลบัญชีผู้ใช้สำหรับทดสอบสิทธิ์ (User Personas & RBAC Matrix)

> **รหัสผ่านเริ่มต้นสำหรับทุกบัญชี:** `password123`  
> *สามารถคลิกปุ่มกรอกข้อมูลอัตโนมัติได้จากหน้าล็อกอิน `/login`*

| บัญชีผู้ใช้ (Email) | สิทธิ์ (Role) | องค์กรที่สังกัด | MetaMask Account | ขอบเขตการทดสอบ (Scope of Testing) |
| :--- | :--- | :--- | :---: | :--- |
| **`superadmin@bmost.io`** | `SUPER_ADMIN` | *ทุกองค์กร (Global)* | **Account 1** | ดู Dashboard รวมทุก Tenant, จัดการองค์กรและผู้ใช้งาน, จัดการ Wallet ที่ `/admin/wallets` |
| **`orgadmin@bmost.io`** | `ORG_ADMIN` | Apex Tech (`ORG-MFG-001`) | **Account 1** | จัดการข้อมูลสมาชิกและสิทธิ์ภายในองค์กร Apex Tech |
| **`manufacturer@bmost.io`** | `MANUFACTURER` | Apex Tech (`ORG-MFG-001`) | **Account 1** | สร้างสินค้าใหม่, ออกเลข Serial, บันทึกขึ้น Blockchain, ตรวจ QC ต้นทาง |
| **`distributor@bmost.io`** | `DISTRIBUTOR` | Global Express (`ORG-DST-001`) | **Account 2** | สร้างใบจัดส่งค้าส่ง (Shipment), รับโอนกรรมสิทธิ์สินค้า (Transfer Ownership) |
| **`warehouse@bmost.io`** | `WAREHOUSE` | SafeHub (`ORG-WRH-001`) | **Account 2** | บันทึกรับสินค้าเข้าคลัง (STORED), เบิกจ่ายสินค้าส่งต่อ |
| **`retailer@bmost.io`** | `RETAILER` | Prime Retail (`ORG-RTL-001`) | **Account 1** | บันทึกรับสินค้าหน้าร้าน, บันทึกการขายสินค้า (SOLD) |
| **`auditor@bmost.io`** | `AUDITOR` | ChainAudit (`ORG-AUD-001`) | **Account 1** | ตรวจสอบคุณภาพอิสระ (Passed / Failed), สั่ง Recall, ตรวจสอบ Audit Log |

---

## 4. ชุดข้อมูลสินค้าทดสอบตามวงจรชีวิต (Product Lifecycle Dataset)

ชุดข้อมูลครอบคลุมทั้ง **9 สถานะของสินค้า** ตาม Business Logic ของระบบ:

```text
REGISTERED ──► QUALITY_CHECKED ──► READY_TO_SHIP ──► SHIPPED ──► IN_TRANSIT ──► RECEIVED ──► STORED ──► SOLD
     │
     └───► (กรณีตรวจไม่ผ่าน หรือมีข้อบกพร่อง) ──► RECALLED
```

### ตารางสรุปข้อมูลสินค้าทดสอบ (Product Test Matrix)

| รหัสสินค้า (Product Code) | หมายเลขซีเรียล (Serial No.) | ชื่อสินค้า | หมวดหมู่ | ผู้ถือครองปัจจุบัน | สถานะ (Status) |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **`PRD-ELEC-2026-001`** | `SN-APEX-9001-EL` | Industrial IoT Temperature Sensor Hub v2 | Electronics | Apex Tech Manufacturing | `REGISTERED` |
| **`PRD-MED-2026-002`** | `SN-APEX-9002-MD` | Cold-Chain mRNA Vaccine Specimen Box | Medical & Pharmaceuticals | Apex Tech Manufacturing | `QUALITY_CHECKED` |
| **`PRD-FOOD-2026-003`** | `SN-APEX-9003-FD` | Premium Organic Hom Mali Rice 5kg Lot-A | Food & Beverage | Apex Tech Manufacturing | `READY_TO_SHIP` |
| **`PRD-AUTO-2026-004`** | `SN-APEX-9004-AU` | Automotive Electronic Control Unit (ECU-Pro) | Automotive & Parts | Apex Tech Manufacturing | `SHIPPED` |
| **`PRD-MACH-2026-005`** | `SN-APEX-9005-MC` | High-Precision CNC Digital Servo Motor 750W | Industrial Machinery | Apex Tech &rarr; Global Express | `IN_TRANSIT` |
| **`PRD-CONS-2026-006`** | `SN-APEX-9006-CS` | Smart Home Air Purifier HEPA-14 Pro | Consumer Goods | SafeHub Logistics & Storage | `RECEIVED` |
| **`PRD-CHEM-2026-007`** | `SN-APEX-9007-CH` | Polymer Resin Industrial Raw Material Drum | Chemicals & Materials | SafeHub Logistics & Storage | `STORED` |
| **`PRD-LUX-2026-008`** | `SN-APEX-9008-LX` | Chronograph Mechanical Sapphire Watch 42mm | Luxury & Jewelry | Prime Retail Store | `SOLD` |
| **`PRD-COSM-2026-009`** | `SN-APEX-9009-CM` | Hydrating Facial Serum Vitamin C Lot-X | Cosmetics | ChainAudit / Apex Tech | `RECALLED` |

---

## 5. ชุดข้อมูลการขนส่ง (Shipment Test Dataset)

> **กฎการขนส่งบล็อกเชนระหว่าง 2 Accounts:**  
> ฟังก์ชัน `createShipment` กำหนดเงื่อนไข `receiver != msg.sender` ดังนั้นการเปิดใบจัดส่งบนบล็อกเชนจะต้องส่งข้ามระหว่าง **Account 1** และ **Account 2** เสมอ:
> - ขาที่ 1: Manufacturer (Account 1) ──► Distributor หรือ Warehouse (Account 2)
> - ขาที่ 2: Distributor หรือ Warehouse (Account 2) ──► Retailer (Account 1)

| รหัสการจัดส่ง | รหัสสินค้า | ต้นทาง (Sender) | ปลายทาง (Receiver) | ผู้ขนส่ง (Carrier) | บัญชีผู้ส่ง &rarr; ผู้รับ | สถานะ (Status) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`SHIP-2026-0001`** | `PRD-FOOD-2026-003` | Apex Tech | Global Express | SwiftFreight | Account 1 &rarr; Account 2 | `PENDING` |
| **`SHIP-2026-0002`** | `PRD-AUTO-2026-004` | Apex Tech | SafeHub Storage | SwiftFreight | Account 1 &rarr; Account 2 | `SHIPPED` |
| **`SHIP-2026-0003`** | `PRD-MACH-2026-005` | Apex Tech | Global Express | SwiftFreight | Account 1 &rarr; Account 2 | `IN_TRANSIT` |
| **`SHIP-2026-0004`** | `PRD-CONS-2026-006` | Global Express | Prime Retail | SwiftFreight | Account 2 &rarr; Account 1 | `DELIVERED` |

---

## 6. ชุดข้อมูลการตรวจสอบคุณภาพ (Quality Inspection Dataset)

| รหัสสินค้า | ผู้ตรวจสอบ (Inspector) | องค์กรผู้ตรวจ | ผลลัพธ์ (Result) | รายละเอียดและบันทึกผลการตรวจสอบ |
| :--- | :--- | :--- | :---: | :--- |
| **`PRD-MED-2026-002`** | นพ. วิจารณ์ อัศวานนท์ (`auditor@bmost.io`) | ChainAudit Global [Account 1] | **`PASSED`** | สอบเทียบเซนเซอร์วัดความเย็น -80°C สม่ำเสมอ 72 ชม. ซีลสุญญากาศและระบบความปลอดภัยสมบูรณ์ |
| **`PRD-ELEC-2026-001`** | สมชาย เมคเกอร์ (`manufacturer@bmost.io`) | Apex Tech [Account 1] | **`PASSED`** | ผ่านการทดสอบฮาร์ดแวร์เข้ารหัส Crypto Chip และความทนทานต่อไฟกระชาก 4kV |
| **`PRD-COSM-2026-009`** | ดร. ปิติ กลิ่นแก้ว (`auditor@bmost.io`) | ChainAudit Global [Account 1] | **`FAILED`** | ค่าความเป็นกรด-ด่าง (pH) ผิดเพี้ยน และพบการตกตะกอนในขวดตัวอย่าง สั่ง Recall ทันที |

---

## 7. กรณีทดสอบตามการใช้งานจริง (End-to-End Scenarios)

### Scenario A: การสร้างสินค้าใหม่และการลงทะเบียน Smart Contract (Manufacturer Flow)
1. เข้าสู่ระบบด้วยบัญชี: `manufacturer@bmost.io` / `password123` (เลือก MetaMask เป็น **Account 1**)
2. ไปที่เมนู **สินค้า (Products)** &rarr; คลิก **ลงทะเบียนสินค้าใหม่**
3. ป้อนข้อมูลสินค้าและบันทึกลง Smart Contract
4. **ผลที่คาดหวัง:** 
   - ระบบส่ง Transaction ไปยัง Sepolia Node และยืนยันผลสำเร็จ
   - แสดงสถานะสินค้าเป็น `REGISTERED`

### Scenario B: การตรวจรับรองและสั่ง Recall สินค้า (Auditor Flow)
1. เข้าสู่ระบบด้วยบัญชี: `auditor@bmost.io` / `password123` (เลือก MetaMask เป็น **Account 1**)
2. ไปที่เมนู **การตรวจสอบคุณภาพ (Quality Checks)** &rarr; คลิก **บันทึกผลตรวจใหม่**
3. เลือกสินค้า บันทึกผล `PASSED` หรือ `FAILED`
4. **ผลที่คาดหวัง:** 
   - กรณี `PASSED`: สถานะเปลี่ยนเป็น `QUALITY_CHECKED` พร้อมเปิดใบส่งสินค้าได้
   - กรณี `FAILED`: สถานะเปลี่ยนเป็น `RECALLED` และแจ้งเตือนหน้า Traceability

### Scenario C: การส่งต่อสินค้าและโอนกรรมสิทธิ์ (Custody Transfer Flow)
1. **Manufacturer (Account 1)**: เปิดเมนูการจัดส่ง สร้างใบจัดส่งปลายทางเป็น Global Express หรือ SafeHub Storage (Account 2) &rarr; สถานะเป็น `READY_TO_SHIP` &rarr; กดจัดส่ง (`shipProduct`)
2. **Distributor / Warehouse (Account 2)**: สลับ MetaMask เป็น **Account 2** &rarr; กดยืนยันรับสินค้า (`receiveProduct`) &rarr; สถานะเป็น `RECEIVED` และกรรมสิทธิ์บนสัญญาโอนมาเป็น Account 2
3. **Distributor / Warehouse (Account 2)**: เปิดหน้ารายละเอียดสินค้า กดจัดเก็บสินค้า (`storeProduct`) &rarr; สถานะเป็น `STORED`
4. **Distributor / Warehouse (Account 2)**: สร้างใบจัดส่งต่อไปยัง Prime Retail Store (Account 1) &rarr; กดจัดส่ง (`shipProduct`)
5. **Retailer (Account 1)**: สลับ MetaMask กลับเป็น **Account 1** &rarr; กดยืนยันรับสินค้า (`receiveProduct`) &rarr; กดจัดเก็บ (`storeProduct`) &rarr; กดขายสินค้า (`markAsSold`) &rarr; สถานะเป็น `SOLD`

### Scenario D: การสืบค้นและตรวจสอบย้อนกลับของผู้บริโภค (Public Traceability Flow)
1. เปิดหน้าเว็บ `http://localhost:3000/traceability` (ไม่ต้อง Login)
2. ค้นหาด้วยรหัสสินค้า
3. **ผลที่คาดหวัง:**
   - แสดง Timeline เส้นทางการเดินทางของสินค้าครบทุกขั้นตอนตั้งแต่ผลิตจนถึงขาย
   - แสดงปุ่มตรวจสอบความถูกต้องของข้อมูลบน Smart Contract (Verify Hash) ผลลัพธ์ต้องขึ้นว่า **"Verified Valid / ไม่ถูกแก้ไข"**

---

## 8. กฎการตรวจสอบข้อมูล (Validation & Boundary Test Cases)

| รหัสทดสอบ | เงื่อนไขการทดสอบ | ข้อมูลที่ป้อน | ผลลัพธ์ที่คาดหวัง |
| :--- | :--- | :--- | :--- |
| **VAL-01** | เว้นว่างฟิลด์จำเป็น (Required Field) | ไม่กรอก Product Code หรือ Name | Browser แจ้งเตือน Required ทันที ไม่อนุญาตให้ Submit |
| **VAL-02** | Product Code สั้นกว่า 3 ตัวอักษร | `PR` | API ตอบกลับข้อผิดพลาด 400: MinLength 3 characters |
| **VAL-03** | Product Code มีอักขระพิเศษ | `PRD#2026@01` หรือมีเคาะเว้นวรรค | API ปฏิเสธ (รองรับเฉพาะ `A-Za-z0-9_-`) |
| **VAL-04** | Product Code ซ้ำในระบบ | `PRD-ELEC-2026-001` | API ตอบกลับข้อผิดพลาด 409 Conflict: สินค้ารหัสนี้มีอยู่แล้ว |
| **VAL-05** | เลือกปลายทางที่มี Wallet เดียวกับผู้ส่ง | เลือกองค์กรที่ใช้ Wallet เดียวกัน | UI ปิดการเลือก / API ปฏิเสธ `INVALID_RECIPIENT` |
| **VAL-06** | ป้อนข้อความรายละเอียดยาวเกิน | Description > 2,000 ตัวอักษร | API ตรวจจับ MaxLength 2,000 |

---

*เอกสารฉบับนี้จัดทำขึ้นสำหรับโครงการ B-MOST Supply Chain Traceability Platform เพื่อใช้เป็นมาตรฐานการทดสอบระบบ*
