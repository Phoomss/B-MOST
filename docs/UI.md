# User Interface Specification (ข้อกำหนดส่วนต่อประสานผู้ใช้)

## 1. Design System & Frontend Architecture (ระบบการออกแบบและสถาปัตยกรรมส่วนหน้า)

The B-MOST frontend is built using **Next.js 16** with the **App Router** paradigm and **Tailwind CSS**. Designed as a high-density, mission-critical enterprise SaaS application, the interface prioritizes data clarity, responsiveness, sub-second visual feedback, clear cryptographic verification cues, and **Thai-first enterprise localization**.

### 1.1 White / Light Enterprise Theme (ชุดรูปแบบสีสว่างระดับองค์กร)
The user interface follows a restrained, clean, and modern white/light enterprise design system:
- **Primary Background**: `#FFFFFF` (ความขาวสะอาด สบายตา)
- **Secondary / Surface Background**: `#F8FAFC` (สีเทาอ่อนสำหรับพื้นหลังแผงควบคุมและคอนเทนเนอร์)
- **Card Background**: `#FFFFFF` พร้อมเส้นขอบคมชัด
- **Borders & Dividers**: `#E2E8F0` (เส้นขอบบาง สุภาพ ไม่หนาเกะกะ)
- **Primary Text**: `#0F172A` (สีเข้มคมชัด อ่านง่าย รองรับอักษรภาษาไทย)
- **Secondary Text**: `#64748B` (สีเทากลางสำหรับคำอธิบายเสริมและหน่วยข้อมูล)
- **Design Aesthetic**: Minimalist, professional, enterprise-grade; avoids excessive gradients, glassmorphism, or heavy dark mode widgets.

### 1.2 Enterprise Color Palette (ระบบสีมาตรฐาน)
- **Primary Action (Blue)**: `#2563EB` (ปุ่มหลัก, ลิงก์ที่กำลังใช้งาน, สถานะนำทาง)
- **Success (Emerald / Green)**: `#059669` (สถานะผ่านการตรวจสอบ, ธุรกรรมยืนยันแล้ว, ข้อมูลสมบูรณ์)
- **Warning (Amber / Yellow)**: `#D97706` (สินค้าอยู่ระหว่างการจัดส่ง, รอดำเนินการ)
- **Error / Recall (Red / Rose)**: `#DC2626` (สินค้าเรียกคืน, การตรวจสอบไม่ผ่าน, ข้อผิดพลาดของระบบ)
- **Neutral (Slate / Gray)**: `#475569` (รหัสสินค้า, แฮชธุรกรรม, ป้ายกำกับทั่วไป)

### 1.3 Thai-First Typography & Localization (ระบบตัวอักษรและการแปลภาษาไทย)
The application adopts **Thai as the primary user-facing language**, supported by a clean typography stack:
- **Font Stack**: `Noto Sans Thai`, `Inter`, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif.
- **Readability Standards**: Line-height (1.6 for body copy), appropriate letter-spacing, generous button padding (`h-10`, `h-11`), and spacious table rows (`py-3.5`) to prevent Thai vowel clipping.
- **Centralized Dictionary**: Managed through `apps/web/lib/thai-locale.ts` providing standardized translation maps for statuses, navigation items, actions, and badge styles.
- **Technical Terminology Preservation**: Critical technical identifiers remain in English with Thai contextual annotations (e.g. *Blockchain*, *Smart Contract*, *Wallet Address*, *Keccak-256*, *Transaction Hash*, *QR Code*).

#### Standardized Vocabulary Mapping:
| English Term | Thai Term | Context / Usage |
|---|---|---|
| Dashboard | ภาพรวมระบบ | Executive command center |
| Products | สินค้า | Product catalog & lifecycle |
| Shipments | การจัดส่ง | Logistics manifests & transport |
| Quality Checks | ตรวจสอบคุณภาพ | QC audits and inspection forms |
| Traceability | ติดตามและตรวจสอบสินค้า | Provenance graph & integrity check |
| Blockchain | Blockchain / ธุรกรรม Blockchain | Ledger & block explorer |
| Audit Logs | ประวัติการตรวจสอบ | Security and compliance logs |
| Organizations | องค์กร | Tenant and actor directory |
| Users | ผู้ใช้งาน | Account management |
| Settings | ตั้งค่า | Preferences & configuration |
| Login / Sign In | เข้าสู่ระบบ | Authentication portal |
| Verify Product | ตรวจสอบสินค้า | Public consumer authenticity check |

#### Status Badges & Thai Translations:
- `REGISTERED` ──► **ลงทะเบียนแล้ว** (`bg-slate-100 text-slate-800 border-slate-200`)
- `QUALITY_CHECKED` ──► **ตรวจสอบคุณภาพแล้ว** (`bg-emerald-100 text-emerald-800 border-emerald-200`)
- `READY_TO_SHIP` ──► **พร้อมจัดส่ง** (`bg-blue-100 text-blue-800 border-blue-200`)
- `SHIPPED` / `IN_TRANSIT` ──► **กำลังขนส่ง** (`bg-amber-100 text-amber-800 border-amber-200`)
- `RECEIVED` / `STORED` ──► **รับสินค้าแล้ว** / **จัดเก็บในคลัง** (`bg-indigo-100 text-indigo-800 border-indigo-200`)
- `SOLD` ──► **จำหน่ายแล้ว** (`bg-purple-100 text-purple-800 border-purple-200`)
- `RECALLED` ──► **เรียกคืน** (`bg-red-100 text-red-800 border-red-200`)
- Cryptographic Integrity: `VERIFIED` (สมบูรณ์ / ตรวจสอบแล้ว) vs `MISMATCH` (ข้อมูลไม่ตรงกับบล็อกเชน)

---

## 2. Authentication & Route Protection (การยืนยันตัวตนและการคุ้มครองเส้นทาง)

### 2.1 Login Portal (`/login`)
A dedicated, enterprise-grade authentication interface connecting directly to the backend `POST /api/auth/login` endpoint.
- **Visual Design**: Centered clean white card on `#F8FAFC` slate background with the official B-MOST branding and Thai typography.
- **Form Controls**:
  - Email (`อีเมล`): Strict email validation with placeholder `name@organization.com`.
  - Password (`รหัสผ่าน`): Masked input with interactive eye toggle button for password visibility.
  - Submit Button: Primary blue with loading spinner and disabled state (`กำลังเข้าสู่ระบบ...`).
- **Quick Demo Accounts**: One-click demo credential autofill for immediate role testing (Super Admin, Manufacturer, Auditor, Logistics, Warehouse, Retailer).
- **Error Handling**: Non-blocking Thai alert callouts for invalid credentials (`อีเมลหรือรหัสผ่านไม่ถูกต้อง`) or network connectivity disruptions.
- **Persistence & Session**:
  - Sets dual session tokens: `document.cookie` (`bmost_token`) for Next.js Edge Middleware and `localStorage` (`token`) for client Axios requests.
  - Automatically redirects authenticated users away from `/login` to `/` (or specified `?redirect=` target).

### 2.2 Next.js Route Guard Middleware (`middleware.ts`)
Next.js Edge middleware evaluates every incoming request:
- **Public Routes (Unrestricted)**:
  - `/login` (เข้าสู่ระบบ)
  - `/verify` (ตรวจสอบสินค้าสาธารณะ)
  - `/verify/[code]` (ผลการตรวจสอบสินค้าด้วย QR Code)
  - Static assets (`/_next`, `/favicon.ico`, `/public`)
- **Protected Routes (Redirect to `/login` if unauthenticated)**:
  - `/` (ภาพรวมระบบ)
  - `/products`, `/products/[id]`, `/products/new`
  - `/shipments`
  - `/quality`, `/quality-checks`
  - `/traceability`
  - `/blockchain`
  - `/audit`
- **Route Aliases**: Automatically maps `/dashboard` to `/` and `/quality-checks` to `/quality`.

### 2.3 Client Authentication Hook (`useAuth`)
React hook providing global authentication state:
- `user`: Authenticated user profile (`id`, `email`, `name`, `role`, `organization`).
- `isLoading`: Initial hydration check against `GET /api/auth/me`.
- `isAuthenticated`: Boolean status indicating verified session.
- `login(token, user)`: Sets session storage, cookies, and redirects.
- `logout()`: Clears tokens, resets state, and routes to `/login`.

---

## 3. Page Specifications (ข้อกำหนดหน้าระบบ)

### 3.1 ภาพรวมระบบ - Executive Dashboard (`/`)
The operational command center for supply chain executives and organization operators.
- **7 KPI Summary Cards**:
  - สินค้าทั้งหมด (Total Products)
  - กำลังจัดส่ง (In Transit)
  - รับสินค้าแล้ว (Received & Stored)
  - จำหน่ายแล้ว (Retail Sold)
  - สินค้าเรียกคืน (Recalled - Alert Red)
  - การจัดส่งที่ดำเนินการ (Active Shipments)
  - ธุรกรรม Blockchain (Total Confirmed On-Chain Transactions)
- **Visual Analytics Widgets**:
  - สถานะวงจรชีวิตสินค้า (Product Lifecycle Distribution visual bar)
  - แนวโน้มธุรกรรม Blockchain 7 วันย้อนหลัง (Interactive trend chart)
  - สัดส่วนการมีส่วนร่วมของแต่ละองค์กร (Organization Activity Breakdown)
- **Real-Time Activity Stream**: Live feed displaying real product registrations, QC inspections, shipments, and EVM block confirmations in Thai.

---

### 3.2 สินค้า - Product Catalog & Detail (`/products`, `/products/new`, `/products/[id]`)
- **`/products` (รายการสินค้า)**:
  - Multi-tenant data table with real-time search by code, serial number, or product name.
  - Filter by lifecycle status pills and pagination controls.
  - Contextual action triggers: ดูรายละเอียด (View Detail), ตรวจสอบคุณภาพ (QC), สร้างการจัดส่ง (Create Shipment).
- **`/products/new` (ลงทะเบียนสินค้าใหม่)**:
  - Manufacturer creation form: รหัสสินค้า (Product Code), หมายเลขซีเรียล (Serial Number), ชื่อสินค้า (Product Name), หมวดหมู่ (Category), ข้อมูลจำเพาะ (Specifications).
  - Instant client-side validation and duplicate prevention.
- **`/products/[id]` (รายละเอียดและประวัติสินค้า)**:
  - **Header Card**: Product title, status pill, deterministic Keccak-256 hash badge with one-click copy button.
  - **Cryptographic Proof Card**: Compares live database attributes against the smart contract on-chain hash.
  - **QR Code Utility**: Real-time vector QR code pointing to public verification, download button (PNG), and modal lightbox.
  - **Interactive Lifecycle Timeline**: Chronological steps displaying timestamp, actor, organization, and clickable transaction hash linking to the Blockchain Explorer.

---

### 3.3 ตรวจสอบคุณภาพ - Quality Control Portal (`/quality`)
Dedicated interface for auditors, QC engineers, and manufacturers.
- **Inspection Submission Modal**:
  - Target product selector with live code search.
  - Inspector identity & organization display.
  - Result Toggle: `ผ่านเกณฑ์ (PASSED)` (green) or `ไม่ผ่านเกณฑ์ (FAILED)` (red).
  - Technical notes and inspection parameter textarea.
- **Inspection Ledger**:
  - Filterable table of historical inspections with status badges.
  - Direct links to confirmed EVM transaction receipts.

---

### 3.4 การจัดส่ง - Logistics & Shipment Management (`/shipments`)
Command center for dispatchers, carriers, and receiving managers.
- **Create Shipment Manifest Modal**:
  - Select qualified product (must be `QUALITY_CHECKED` or `STORED`).
  - Select recipient organization from active directory.
  - Designate optional logistics carrier.
  - Specify physical origin address and destination hub.
- **Shipment Management Table**:
  - Tracking code, product reference, sender, receiver, carrier, and status.
  - Contextual action triggers:
    - Senders see **ส่งสินค้า (Dispatch / Ship)** button.
    - Carriers see **กำลังขนส่ง (Mark In-Transit)** button.
    - Receivers see **ยืนยันการรับสินค้า (Confirm Receipt)** button (which triggers automatic on-chain custody transfer).

---

### 3.5 ติดตามและตรวจสอบสินค้า - Multi-Actor Traceability (`/traceability`)
Universal search and cryptographic verification tool for supply chain auditors.
- **Instant Search Bar**: Accepts `productCode`, `serialNumber`, or database UUID.
- **Custody Provenance Graph**: Visual cards demonstrating chronological custody transfer:
  `ผู้ผลิต (Manufacturer)` ──► `ผู้จัดจำหน่าย (Distributor)` ──► `คลังสินค้า (Warehouse)` ──► `ร้านค้าปลีก (Retailer)`.
- **Integrity Validation Banner**:
  - Green banner: "ความถูกต้องสมบูรณ์ของข้อมูล: ข้อมูลในฐานข้อมูลตรงกับค่าแฮชบนบล็อกเชน 100% (Cryptographic Integrity Verified)."
  - Red banner: "คำเตือน: ข้อมูลในฐานข้อมูลไม่ตรงกับค่าแฮชบนบล็อกเชน (Integrity Warning)."

---

### 3.6 ตรวจสอบสินค้าสาธารณะ - Public Consumer QR Verification (`/verify`, `/verify/[code]`)
Accessible by consumers and partners without authentication.
- **`/verify` (หน้าค้นหาสำหรับประชาชน)**:
  - Clean search bar for manual product code / serial entry.
  - Quick-test buttons loading sample verified products.
- **`/verify/[code]` (ผลการตรวจสอบความแท้จริง)**:
  - Prominent verified badge with shield icon (สินค้าแท้ ผ่านการรับรองบน Blockchain).
  - Product specifications (ชื่อสินค้า, รุ่น, หมวดหมู่, ผู้ผลิต).
  - Authentic Supply Chain Milestones:
    1. ผลิตและขึ้นทะเบียน (Manufactured & Registered)
    2. ผ่านการตรวจสอบคุณภาพ (Quality Inspection Passed)
    3. จัดส่งและรับเข้าคลังสินค้า (Logistics & Warehousing)
    4. จำหน่ายสู่ผู้บริโภค (Retail Sale & Delivery)
  - Blockchain Proof Drawer: Displays smart contract address and immutable on-chain Keccak-256 hash.

---

### 3.7 ธุรกรรม Blockchain - Live Blockchain Explorer (`/blockchain`)
Built-in block and transaction explorer eliminating reliance on external block explorers.
- **Node Health Cards**:
  - สถานะการเชื่อมต่อโหนด (Node Connection: Connected / Disconnected)
  - ความสูงบล็อกปัจจุบัน (Current Block Height)
  - รหัสเครือข่าย (Chain ID: 31337)
  - แก๊สที่ใช้ทั้งหมด (Total Gas Consumed)
- **Ledger Table**:
  - Paginated transactions: Tx Hash, Event Type, Entity Type, Block Number, Caller Address, Status (`CONFIRMED`), and Timestamp.
- **Transaction Detail Modal**:
  - Full receipt inspection: gas used, cumulative gas, transaction fee, contract address, emitted event topics, and decoded arguments.
- **Block Inspector**:
  - View block header, timestamp, miner, and included transactions.

---

### 3.8 ประวัติการตรวจสอบ - Compliance Audit Log Portal (`/audit`)
Regulatory compliance view for internal auditors and security officers.
- **Filtering Suite**:
  - Full-text search across action and metadata.
  - Action dropdown filter (e.g. `PRODUCT_SELL`, `SHIPMENT_RECEIVE`).
  - Entity type dropdown (e.g. `Product`, `Shipment`, `Organization`).
  - Organization selector and Date range picker.
- **Audit Table**:
  - Timestamp, Client IP address badge, User email, Organization, Action, and Entity ID.
- **Metadata Inspection Drawer**:
  - Formatted JSON viewer displaying exact request payload with credentials redacted.
- **Export Capabilities**:
  - Instant CSV and JSON export for regulatory submissions.

---

## 4. UI States & User Experience Standards (มาตรฐานประสบการณ์ผู้ใช้งาน)

1. **Loading Skeletons**: Every table and detail card renders pulse-animated skeleton loaders matching the final layout geometry to eliminate cumulative layout shifts (CLS).
2. **Actionable Empty States**: When lists or searches return zero records, the UI provides friendly contextual guidance in Thai (e.g. "ไม่พบข้อมูลการจัดส่ง กดปุ่ม 'สร้างการจัดส่ง' เพื่อเริ่มต้นการจัดส่งสินค้าใหม่").
3. **Transaction Progress Modals**: When an action triggers a smart contract write, the UI displays a multi-step progress dialog:
   `กำลังเตรียมข้อมูลธุรกรรม` ──► `ส่งข้อมูลไปยัง EVM Blockchain` ──► `รอการยืนยันบล็อก` ──► `ทำรายการสำเร็จ`.
4. **Toast Feedback**: All user operations trigger non-intrusive toast notifications with clear status messages in Thai.
5. **Accessibility & Contrast**: Conforms to WCAG 2.1 AA standards for color contrast on `#FFFFFF` backgrounds with focus rings for keyboard navigation.