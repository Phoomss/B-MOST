# Wallet และ Role ที่ใช้งานจริง

ตรวจสอบเมื่อ 26 กันยายน 2026 จากฐานข้อมูลที่รันอยู่และสัญญา `SupplyChainRegistry` บน Ethereum Sepolia (Chain ID `11155111`) ที่ `0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a` ข้อมูลนี้เป็น snapshot; หาก Super Admin เปลี่ยน wallet หรือ grant/revoke role ต้องตรวจใหม่

> ชื่อ **Account 1** และ **Account 2** ใน MetaMask เป็นชื่อเฉพาะในเครื่องผู้ใช้ ระบบไม่เก็บชื่อเหล่านี้ จึงต้องเปิด MetaMask แล้วเทียบ **public address** กับตารางก่อนระบุว่าเป็น Account ใด

| Public address | บัญชี/role ในแอปที่ผูกอยู่ | องค์กรที่ผูก wallet เดียวกัน | Role บนสัญญา Sepolia |
| --- | --- | --- | --- |
| `0x0FcD93659FA339bB05A2A12Ed7000dFD714E0998` | `superadmin@bmost.io` → `SUPER_ADMIN`; `manufacturer@bmost.io` → `MANUFACTURER` | `ORG-MFG-001` Apex Tech Manufacturing | `DEFAULT_ADMIN_ROLE`, `MANUFACTURER_ROLE`, `DISTRIBUTOR_ROLE`, `WAREHOUSE_ROLE`, `RETAILER_ROLE`, `LOGISTICS_ROLE`, `AUDITOR_ROLE` |
| `0x3f073b4f50D2B2486B632DFB4c7005FC449cED14` | `distributor@bmost.io` → `DISTRIBUTOR`; `warehouse@bmost.io` → `WAREHOUSE`; `retailer@bmost.io` → `RETAILER`; `auditor@bmost.io` → `AUDITOR` | `ORG-DST-001`, `ORG-WRH-001`, `ORG-RTL-001`, `ORG-AUD-001` | **ไม่มี role ใด** ในรายการข้างต้น |

`orgadmin@bmost.io` มี role `ORG_ADMIN` ในแอป แต่ยังไม่มี `walletAddress` ในฐานข้อมูล

## วิธีตรวจว่า Account 1/2 คือ address ใด

1. เปิด MetaMask เลือก **Account 1** แล้วคัดลอก public address เทียบกับตาราง จากนั้นทำซ้ำกับ **Account 2** อย่าใช้ชื่อหรือหมายเลขลำดับบัญชีเป็นหลักฐานแทน address
2. เข้าระบบเว็บด้วยบัญชีที่ต้องการใช้งาน แล้วเลือก address เดียวกันใน MetaMask
3. หาก wallet ของผู้ใช้หรือองค์กรยังว่าง ให้ Super Admin เปิด `/admin/wallets` เพื่อบันทึก public address ของผู้ใช้และองค์กรให้ตรงกัน
4. หลังตั้งค่าแล้ว ตรวจ role บนสัญญาอีกครั้งด้วย `GET /api/blockchain/roles/{wallet}` ใน API Docs (ต้องล็อกอินเป็น Super Admin)

Role ในแอปเป็นสิทธิ์ของบัญชีล็อกอิน ส่วน role บนสัญญาผูกกับ **public address** และเปลี่ยนแยกจากกัน การกำหนด wallet ในหน้า `/admin/wallets` ไม่ได้ grant role บนสัญญา ตัวอย่างเช่นการลงทะเบียนสินค้าต้องมี `MANUFACTURER` ในแอป และ `MANUFACTURER_ROLE` บน Sepolia ด้วย

Address ที่สองมี role ในแอปหลายแบบ แต่ปัจจุบันไม่มี role บนสัญญา จึงต้องให้ wallet ที่ถือ `DEFAULT_ADMIN_ROLE` grant role ที่จำเป็นก่อนทำรายการที่สัญญากำหนดให้ใช้ role นั้น
