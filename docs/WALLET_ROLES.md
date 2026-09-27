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

## แผนใช้ MetaMask 2 accounts สำหรับทดสอบการส่งต่อสินค้า

ตารางด้านบนเป็น **snapshot ของค่าที่เคยตรวจพบ** ไม่ใช่หลักฐานว่าได้เปลี่ยน wallet ในระบบแล้ว แผนด้านล่างเป็นค่าที่ต้องตั้งเมื่อมี MetaMask เพียงสอง public addresses:

| Public address | บัญชีผู้ใช้และองค์กรที่ควรผูก |
| --- | --- |
| Account 1 — ตรวจ public address ใน MetaMask; ใน snapshot คือ `0x0FcD93659FA339bB05A2A12Ed7000dFD714E0998` | `superadmin@bmost.io`, `manufacturer@bmost.io` / `ORG-MFG-001`, `warehouse@bmost.io` / `ORG-WRH-001`, `auditor@bmost.io` / `ORG-AUD-001` |
| Account 2 — ตรวจ public address ใน MetaMask; ใน snapshot คือ `0x3f073b4f50D2B2486B632DFB4c7005FC449cED14` | `distributor@bmost.io` / `ORG-DST-001`, `retailer@bmost.io` / `ORG-RTL-001` |

เส้นทางตัวอย่างคือ **Manufacturer (Account 1) → Distributor (Account 2) → Warehouse (Account 1) → Retailer (Account 2)** แต่ละช่วงต้องมี wallet ผู้ส่งและผู้รับคนละ address เพราะ `createShipment` บนสัญญาไม่รับ `receiver == msg.sender` แม้ชื่อองค์กรจะต่างกัน

1. ให้ Super Admin เปิด `/admin/wallets` แล้วตั้ง public address ของบัญชีผู้ใช้ตามตาราง พร้อมซิงก์ `walletAddress` ขององค์กรนั้นให้ตรงกัน โดยเฉพาะ `warehouse@bmost.io` และ `ORG-WRH-001` ต้องย้ายจาก Account 2 ไป Account 1 ส่วน `auditor@bmost.io` และ `ORG-AUD-001` ต้องตรวจว่าผูก Account 1 แล้วจริง
2. **สำหรับสินค้าที่ Distributor เป็นเจ้าของบน Sepolia อยู่แล้ว ให้คง wallet ของ Distributor เดิมไว้** การเปลี่ยน wallet ในฐานข้อมูลไม่ได้โอนกรรมสิทธิ์บนสัญญา หากเปลี่ยน wallet ขององค์กรที่ถือสินค้าอยู่ ต้องโอนกรรมสิทธิ์บนสัญญาและซิงก์ข้อมูลให้ตรงก่อนทำรายการต่อ
3. หลัง Distributor ยืนยันรับสินค้า สถานะจะเป็น `RECEIVED`; เปิดหน้าสินค้าแล้วกด **จัดเก็บสินค้า** ให้เป็น `STORED` ก่อนสร้างใบจัดส่งไป Warehouse เมื่อ Warehouse รับสินค้า ให้จัดเก็บก่อนสร้างใบจัดส่งไป Retailer เช่นกัน
4. ทุกครั้งที่ทำรายการ ให้เลือก MetaMask address ตรงกับบัญชีผู้ใช้และองค์กรที่ล็อกอิน และใช้เครือข่าย Sepolia ตรวจ role บนสัญญาด้วย `GET /api/blockchain/roles/{wallet}` เมื่อต้องใช้ role เฉพาะ การรับสินค้า จัดเก็บ และจัดส่งต่อของเจ้าของสินค้าตามเส้นทางนี้ตรวจสิทธิ์จาก wallet ผู้ถือครองบนสัญญา

แผนสอง accounts นี้ใช้สาธิตการส่งต่อได้ แต่ wallet ถูกใช้ซ้ำข้ามองค์กร จึงไม่พิสูจน์ความเป็นอิสระของแต่ละองค์กร และ Auditor ใช้ wallet ร่วมกับ Manufacturer/Super Admin หากใช้งานจริงควรใช้ public address แยกสำหรับแต่ละองค์กรและผู้ตรวจอิสระ
