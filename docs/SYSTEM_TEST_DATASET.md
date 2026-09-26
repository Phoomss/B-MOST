# B-MOST System Test Dataset & Testing Guide

## 1. Overview & Test Environment

เอกสารนี้รวบรวม **System Test Dataset** และ **คู่มือการทดสอบระบบ (Testing Guide)** สำหรับระบบ **B-MOST (Blockchain Multi-Organization Supply Chain Traceability Platform)** 

เอกสารนี้ออกแบบมาเพื่อให้ทีมพัฒนา (Developer), ทีมทดสอบระบบ (QA/Tester), และผู้มีส่วนได้ส่วนเสีย (Stakeholders) สามารถใช้ข้อมูลชุดเดียวกันในการทดสอบแบบ End-to-End (E2E), Integration Testing, การทดสอบสิทธิ์ผู้ใช้งาน (RBAC), และการทดสอบเชื่อมต่อบล็อกเชน (EVM Smart Contract)

### สรุปจุดเชื่อมต่อระบบ (System Endpoints)

| บริการ (Service) | URL / Connection | รายละเอียด |
| :--- | :--- | :--- |
| **Web Frontend** | `http://localhost:3000` | ระบบเว็บแอปพลิเคชัน (Next.js 15) |
| **Backend API (REST)** | `http://localhost:4000/api` | บริการ API หลัก (NestJS) |
| **Swagger API Docs** | `http://localhost:4000/api/docs` | เอกสารและการทดสอบ Interactive API |
| **Local Blockchain (EVM)** | `http://localhost:8545` | Hardhat / Local Node (Chain ID: 31337) |
| **PostgreSQL Database** | `localhost:5433` | ฐานข้อมูลหลัก (Database: `bmost`, User: `postgres`) |

---

## 2. องค์กรคู่ค้าในห่วงโซ่อุปทาน (Organizations / Supply Chain Nodes)

องค์กรจำลองครบทุกประเภทตามมาตรฐานห่วงโซ่อุปทาน (Supply Chain Hierarchy):

> **หมายเหตุ:** Wallet ในตารางนี้เป็นตัวอย่างข้อมูลทดสอบเดิม ไม่ใช่ค่าในฐานข้อมูลหรือ role บนสัญญา Sepolia ปัจจุบัน สำหรับ Account 1/2 ให้เทียบ public address และดูสถานะที่ตรวจจริงใน [Wallet และ Role ที่ใช้งานจริง](WALLET_ROLES.md)

| รหัสองค์กร (Code) | ชื่อองค์กร (Organization Name) | ประเภท (Type) | กระเป๋าบล็อกเชน (Wallet Address) | บทบาทในระบบ |
| :--- | :--- | :--- | :--- | :--- |
| **`ORG-MFG-001`** | **Apex Tech Manufacturing** | `MANUFACTURER` | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | โรงงานผู้ผลิตต้นทาง, ลงทะเบียนสินค้า, บันทึกลง Smart Contract |
| **`ORG-DST-001`** | **Global Express Distribution** | `DISTRIBUTOR` | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | ตัวแทนจำหน่ายค้าส่ง, รับสินค้าจากโรงงาน, กระจายสินค้าต่อ |
| **`ORG-WRH-001`** | **SafeHub Logistics & Storage** | `WAREHOUSE` | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | คลังจัดเก็บสินค้าส่วนกลาง, คลังสินค้าทัณฑ์บน, ห้องเย็นควบคุมอุณหภูมิ |
| **`ORG-RTL-001`** | **Prime Retail Store** | `RETAILER` | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | หน้าร้านค้าปลีก, จุดจำหน่ายให้แก่ผู้บริโภค (Consumer POS) |
| **`ORG-LOG-001`** | **SwiftFreight Carrier Express** | `LOGISTICS` | `0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f` | ผู้ให้บริการขนส่งสินค้า (Carrier), อัปเดตสถานะการนำส่ง |
| **`ORG-AUD-001`** | **ChainAudit Global Assurance** | `AUDITOR` | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4df` | ผู้ตรวจรับรองมาตรฐานภายนอก (Third-party Auditor), สุ่มตรวจ QC |

---

## 3. ข้อมูลบัญชีผู้ใช้สำหรับทดสอบสิทธิ์ (User Personas & RBAC Matrix)

> **รหัสผ่านเริ่มต้นสำหรับทุกบัญชี:** `password123`

| บัญชีผู้ใช้ (Email) | สิทธิ์ (Role) | องค์กรที่สังกัด | ขอบเขตการทดสอบ (Scope of Testing) |
| :--- | :--- | :--- | :--- |
| **`superadmin@bmost.io`** | `SUPER_ADMIN` | *ทุกองค์กร (Global)* | ดู Dashboard รวมทุก Tenant, จัดการองค์กรและผู้ใช้งาน, ดู Audit Log ทั้งหมด |
| **`orgadmin@bmost.io`** | `ORG_ADMIN` | Apex Tech (`ORG-MFG-001`) | จัดการข้อมูลสมาชิกและสิทธิ์ภายในองค์กร Apex Tech |
| **`manufacturer@bmost.io`** | `MANUFACTURER` | Apex Tech (`ORG-MFG-001`) | สร้างสินค้าใหม่, ออกเลข Serial, บันทึกขึ้น Blockchain, ตรวจ QC ต้นทาง |
| **`distributor@bmost.io`** | `DISTRIBUTOR` | Global Express (`ORG-DST-001`) | สร้างใบจัดส่งค้าส่ง (Shipment), รับโอนกรรมสิทธิ์สินค้า (Transfer Ownership) |
| **`warehouse@bmost.io`** | `WAREHOUSE` | SafeHub (`ORG-WRH-001`) | บันทึกรับสินค้าเข้าคลัง (STORED), เบิกจ่ายสินค้า |
| **`retailer@bmost.io`** | `RETAILER` | Prime Retail (`ORG-RTL-001`) | บันทึกรับสินค้าหน้าร้าน, บันทึกการขายสินค้า (SOLD) |
| **`auditor@bmost.io`** | `AUDITOR` | ChainAudit (`ORG-AUD-001`) | ตรวจสอบคุณภาพอิสระ (Passed / Failed), สั่ง Recall, ตรวจสอบ Audit Log |

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

### รายละเอียดสินค้าแต่ละรายการ (Product Detail Profiles)

#### 1. `PRD-ELEC-2026-001` — สถานะ `REGISTERED`
* **ชื่อสินค้า:** `Industrial IoT Temperature Sensor Hub v2`
* **หมวดหมู่:** `อิเล็กทรอนิกส์และอุปกรณ์ (Electronics)`
* **รายละเอียด:** เซนเซอร์ตรวจจับอุณหภูมิและความชื้นระดับอุตสาหกรรม มาตรฐานกันน้ำ IP67 รองรับ Modbus RTU / RS485 สำหรับคลังสินค้าห้องเย็น
* **Blockchain Anchor:** ยืนยันธุรกรรมบน Smart Contract แล้ว (`CONFIRMED`)
* **จุดประสงค์การทดสอบ:** ใช้ทดสอบการทำ Quality Check และการเปลี่ยนสถานะจากต้นทาง

#### 2. `PRD-MED-2026-002` — สถานะ `QUALITY_CHECKED`
* **ชื่อสินค้า:** `Cold-Chain mRNA Vaccine Specimen Box`
* **หมวดหมู่:** `ยาและเวชภัณฑ์ (Medical & Pharmaceuticals)`
* **รายละเอียด:** วัคซีนควบคุมอุณหภูมิพิเศษ -80°C ถึง -60°C ผ่านการตรวจรับรองคุณภาพโดยหน่วยงาน ChainAudit
* **ผลตรวจคุณภาพ:** `PASSED`
* **จุดประสงค์การทดสอบ:** ใช้ทดสอบการเปิดใบจัดส่งสินค้า (Create Shipment)

#### 3. `PRD-FOOD-2026-003` — สถานะ `READY_TO_SHIP`
* **ชื่อสินค้า:** `Premium Organic Hom Mali Rice 5kg Lot-A`
* **หมวดหมู่:** `อาหารและเครื่องดื่ม (Food & Beverage)`
* **รายละเอียด:** ข้าวหอมมะลิอินทรีย์แท้ 100% บรรจุในถุงสุญญากาศ บันทึกล็อตผลิตลงบนบล็อกเชน
* **ใบจัดส่งที่ผูกไว้:** `SHIP-2026-0001` (สถานะ `PENDING`)
* **จุดประสงค์การทดสอบ:** ใช้ทดสอบการเปลี่ยนสถานะการจัดส่งเป็น `SHIPPED`

#### 4. `PRD-AUTO-2026-004` — สถานะ `SHIPPED`
* **ชื่อสินค้า:** `Automotive Electronic Control Unit (ECU-Pro)`
* **หมวดหมู่:** `ยานยนต์และชิ้นส่วน (Automotive & Spare Parts)`
* **รายละเอียด:** กล่องควบคุมอิเล็กทรอนิกส์ยานยนต์ รองรับโปรโตคอล CAN-Bus 2.0B
* **ใบจัดส่งที่ผูกไว้:** `SHIP-2026-0002` (ออกจากคลังโรงงานแล้ว)
* **จุดประสงค์การทดสอบ:** ใช้ทดสอบขั้นตอนระหว่างผู้ให้บริการขนส่ง (Carrier) อัปเดตสถานะ

#### 5. `PRD-MACH-2026-005` — สถานะ `IN_TRANSIT`
* **ชื่อสินค้า:** `High-Precision CNC Digital Servo Motor 750W`
* **หมวดหมู่:** `เครื่องจักรและอุปกรณ์อุตสาหกรรม (Industrial Machinery)`
* **รายละเอียด:** เซอร์โวมอเตอร์ความแม่นยำสูง สำหรับเครื่องจักร CNC 5 แกน
* **ใบจัดส่งที่ผูกไว้:** `SHIP-2026-0003` (กำลังเดินทางบนมอเตอร์เวย์ โดย SwiftFreight)
* **จุดประสงค์การทดสอบ:** ใช้ทดสอบการกดรับมอบสินค้า (Receive Shipment & Transfer Ownership)

#### 6. `PRD-CONS-2026-006` — สถานะ `RECEIVED`
* **ชื่อสินค้า:** `Smart Home Air Purifier HEPA-14 Pro`
* **หมวดหมู่:** `สินค้าอุปโภคบริโภค (Consumer Goods)`
* **รายละเอียด:** เครื่องฟอกอากาศอัจฉริยะ กรองอนุภาคขนาดเล็ก 0.3 ไมครอน
* **ผู้ถือครอง:** รับมอบเข้าคลังสินค้า SafeHub แล้ว
* **จุดประสงค์การทดสอบ:** ใช้ทดสอบการนำสินค้าเข้าพื้นที่จัดเก็บ (Mark as STORED)

#### 7. `PRD-CHEM-2026-007` — สถานะ `STORED`
* **ชื่อสินค้า:** `Polymer Resin Industrial Raw Material Drum`
* **หมวดหมู่:** `เคมีภัณฑ์และวัตถุดิบ (Chemicals & Raw Materials)`
* **รายละเอียด:** เม็ดพลาสติกโพลิเมอร์คุณภาพสูงสำหรับงานฉีดขึ้นรูป บรรจุถัง 200 ลิตร จัดเก็บในห้องควบคุมความชื้น
* **สถานที่จัดเก็บ:** คลังสินค้า SafeHub แหลมฉบัง ชั้นวาง B-04
* **จุดประสงค์การทดสอบ:** ใช้ทดสอบการเบิกสินค้าเพื่อนำไปกระจายต่อยังผู้ค้าปลีก

#### 8. `PRD-LUX-2026-008` — สถานะ `SOLD` (Terminal State)
* **ชื่อสินค้า:** `Chronograph Mechanical Sapphire Watch 42mm`
* **หมวดหมู่:** `สินค้าลักชัวรีและอัญมณี (Luxury & Jewelry)`
* **รายละเอียด:** นาฬิกากลไกโครโนกราฟ ตัวเรือนสแตนเลส 316L กระจกแซฟไฟร์กันรอย
* **จุดจำหน่าย:** Prime Retail Store (สยามพารากอน / สุขุมวิท)
* **จุดประสงค์การทดสอบ:** ทดสอบหน้า Traceability เพื่อดูประวัติครบสมบูรณ์ตั้งแต่ผลิตจนถึงมือผู้ซื้อ

#### 9. `PRD-COSM-2026-009` — สถานะ `RECALLED` (Terminal State)
* **ชื่อสินค้า:** `Hydrating Facial Serum Vitamin C Lot-X`
* **หมวดหมู่:** `เครื่องสำอางและเวชสำอาง (Cosmetics & Personal Care)`
* **รายละเอียด:** เซรั่มบำรุงผิวหน้า
* **สาเหตุการเรียกคืน (Recall Alert):** ผลตรวจ QC ไม่ผ่าน (`FAILED`) ตรวจพบค่าความคงตัวต่ำกว่าเกณฑ์มาตรฐานและมีความเสี่ยงต่อผู้บริโภค
* **จุดประสงค์การทดสอบ:** ทดสอบการแสดง Alert และ Badge สีแดงเตือนภัยในหน้าสืบค้นย้อนกลับ (Traceability)

---

## 5. ชุดข้อมูลการขนส่ง (Shipment Test Dataset)

| รหัสการจัดส่ง | รหัสสินค้า | ต้นทาง (Sender) | ปลายทาง (Receiver) | ผู้ขนส่ง (Carrier) | จุดเริ่มต้น &rarr; ปลายทาง | สถานะ (Status) |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **`SHIP-2026-0001`** | `PRD-FOOD-2026-003` | Apex Tech | Global Express | SwiftFreight | โรงงานบางปู &rarr; คลังบางนา-ตราด | `PENDING` |
| **`SHIP-2026-0002`** | `PRD-AUTO-2026-004` | Apex Tech | SafeHub Storage | Global Express | โรงงานบางปู &rarr; คลังแหลมฉบัง | `SHIPPED` |
| **`SHIP-2026-0003`** | `PRD-MACH-2026-005` | Apex Tech | Global Express | SwiftFreight | โรงงานบางปู &rarr; คลังบางนา-ตราด | `IN_TRANSIT` |
| **`SHIP-2026-0004`** | `PRD-CONS-2026-006` | Global Express | Prime Retail | SwiftFreight | คลังบางนา &rarr; สาขาสุขุมวิท | `DELIVERED` |

---

## 6. ชุดข้อมูลการตรวจสอบคุณภาพ (Quality Inspection Dataset)

| รหัสสินค้า | ผู้ตรวจสอบ (Inspector) | องค์กรผู้ตรวจ | ผลลัพธ์ (Result) | รายละเอียดและบันทึกผลการตรวจสอบ |
| :--- | :--- | :--- | :---: | :--- |
| **`PRD-MED-2026-002`** | นพ. วิจารณ์ อัศวานนท์ | ChainAudit Global | **`PASSED`** | สอบเทียบเซนเซอร์วัดความเย็น -80°C สม่ำเสมอ 72 ชม. ซีลสุญญากาศและระบบความปลอดภัยสมบูรณ์ |
| **`PRD-ELEC-2026-001`** | สมชาย เมคเกอร์ | Apex Tech | **`PASSED`** | ผ่านการทดสอบฮาร์ดแวร์เข้ารหัส Crypto Chip และความทนทานต่อไฟกระชาก 4kV |
| **`PRD-COSM-2026-009`** | ดร. ปิติ กลิ่นแก้ว | ChainAudit Global | **`FAILED`** | ค่าความเป็นกรด-ด่าง (pH) ผิดเพี้ยน และพบการตกตะกอนในขวดตัวอย่าง สั่ง Recall ทันที |

---

## 7. กรณีทดสอบตามการใช้งานจริง (End-to-End Scenarios)

### Scenario A: การสร้างสินค้าใหม่และการลงทะเบียน Smart Contract (Manufacturer Flow)
1. เข้าสู่ระบบด้วยบัญชี: `manufacturer@bmost.io` / `password123`
2. ไปที่เมนู **สินค้า (Products)** &rarr; คลิก **ลงทะเบียนสินค้าใหม่**
3. ป้อนข้อมูล:
   * **Product Code:** `PRD-TEST-AUTO-01` (หรือกดสร้างอัตโนมัติ)
   * **Serial Number:** `SN-TEST-9901` (หรือกดสร้างอัตโนมัติ)
   * **Product Name:** `Next-Gen Smart Sensor Probe`
   * **Category:** เลือก `อิเล็กทรอนิกส์และอุปกรณ์ (Electronics)`
   * **บันทึกลง Smart Contract:** ติ๊กเลือก ☑
4. กดปุ่ม **บันทึกสินค้า (Register Product)**
5. **ผลที่คาดหวัง:** 
   * ระบบส่ง Transaction ไปยัง EVM Node สำเร็จ
   * Redirect ไปยังหน้ารายละเอียดสินค้า แสดงแท็บ Blockchain Tx Hash, Product Hash, และสถานะ `REGISTERED`

---

### Scenario B: การตรวจรับรองและสั่ง Recall สินค้า (Auditor Flow)
1. เข้าสู่ระบบด้วยบัญชี: `auditor@bmost.io` / `password123`
2. ไปที่เมนู **การตรวจสอบคุณภาพ (Quality Checks)** &rarr; คลิก **บันทึกผลตรวจใหม่**
3. เลือกสินค้า: `PRD-COSM-2026-009`
4. เลือกผลการตรวจสอบ: **`FAILED`**
5. ระบุหมายเหตุ: `ตรวจพบค่าความคงตัวไม่ผ่านเกณฑ์ ปนเปื้อนสารโลหะหนัก สั่งระงับและเรียกคืนสินค้า`
6. บันทึกผลตรวจ
7. **ผลที่คาดหวัง:** 
   * สถานะสินค้าถูกเปลี่ยนเป็น `RECALLED` โดยอัตโนมัติ
   * เมื่อเข้าหน้า [`/traceability`](http://localhost:3000/traceability) แล้วค้นหารหัสนี้ จะแสดง Banner แจ้งเตือนสีแดงทันที

---

### Scenario C: การสืบค้นและตรวจสอบย้อนกลับของผู้บริโภค (Public Traceability Flow)
1. เปิดหน้าเว็บ [`http://localhost:3000/traceability`](http://localhost:3000/traceability) (ไม่ต้อง Login)
2. ค้นหาด้วยรหัสสินค้า: `PRD-CONS-2026-006`
3. **ผลที่คาดหวัง:**
   * แสดง Timeline เส้นทางการเดินทางของสินค้าครบทุกขั้นตอน
   * แสดงข้อมูลโรงงานผู้ผลิต (`Apex Tech`), วันที่ตรวจ QC, คลังสินค้าผู้รับมอบ (`SafeHub`)
   * แสดงปุ่มตรวจสอบความถูกต้องของข้อมูลบน Smart Contract (Verify Hash) ผลลัพธ์ต้องขึ้นว่า **"Verified Valid / ไม่ถูกแก้ไข"**

---

## 8. กฎการตรวจสอบข้อมูล (Validation & Boundary Test Cases)

| รหัสทดสอบ | เงื่อนไขการทดสอบ | ข้อมูลที่ป้อน | ผลลัพธ์ที่คาดหวัง |
| :--- | :--- | :--- | :--- |
| **VAL-01** | เว้นว่างฟิลด์จำเป็น (Required Field) | ไม่กรอก Product Code หรือ Name | Browser แจ้งเตือน Required ทันที ไม่อนุญาตให้ Submit |
| **VAL-02** | Product Code สั้นกว่า 3 ตัวอักษร | `PR` | API ตอบกลับข้อผิดพลาด 400: MinLength 3 characters |
| **VAL-03** | Product Code มีอักขระพิเศษ | `PRD#2026@01` หรือมีเคาะเว้นวรรค | API ปฏิเสธ (รองรับเฉพาะ `A-Za-z0-9_-`) |
| **VAL-04** | Product Code ซ้ำในระบบ | `PRD-ELEC-2026-001` | API ตอบกลับข้อผิดพลาด 409 Conflict: สินค้ารหัสนี้มีอยู่แล้ว |
| **VAL-05** | เลือกหมวดหมู่ `Other` แต่ไม่ระบุชื่อ | เลือก Other แล้วเว้นว่างช่องระบุ | ระบบบังคับกรอกช่องระบุชื่อหมวดหมู่เพิ่มเติม |
| **VAL-06** | ป้อนข้อความรายละเอียดยาวเกิน | Description > 2,000 ตัวอักษร | API ตรวจจับ MaxLength 2,000 |

---

*เอกสารฉบับนี้จัดทำขึ้นสำหรับโครงการ B-MOST Supply Chain Traceability Platform เพื่อใช้เป็นมาตรฐานการทดสอบระบบ*
