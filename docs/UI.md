# User Interface Specification

## 1. Design System & Frontend Architecture

The B-MOST frontend is built using **Next.js 16** with the **App Router** paradigm and **Tailwind CSS**. Designed as a high-density, mission-critical enterprise SaaS application, the interface prioritizes data clarity, responsiveness, sub-second visual feedback, and clear cryptographic verification cues.

### 1.1 Core Layouts
- **Authenticated Dashboard Shell**: Includes a persistent Topbar (displaying active organization, user role badge, wallet connectivity status, and user profile) and a collapsible Sidebar navigation.
- **Public Verification Shell**: A clean, distraction-free, mobile-first responsive layout tailored for mobile smartphone camera QR scans (`/verify/[code]`).

### 1.2 Color & Status Palette
- **Primary Accent**: Slate & Blue (`#2563EB`)
- **Status Badges**:
  - `REGISTERED`: Slate (`bg-slate-100 text-slate-800 border-slate-200`)
  - `QUALITY_CHECKED`: Emerald (`bg-emerald-100 text-emerald-800 border-emerald-200`)
  - `READY_TO_SHIP`: Blue (`bg-blue-100 text-blue-800 border-blue-200`)
  - `SHIPPED` / `IN_TRANSIT`: Amber (`bg-amber-100 text-amber-800 border-amber-200`)
  - `RECEIVED` / `STORED`: Indigo (`bg-indigo-100 text-indigo-800 border-indigo-200`)
  - `SOLD`: Purple (`bg-purple-100 text-purple-800 border-purple-200`)
  - `RECALLED`: Rose / Red (`bg-red-100 text-red-800 border-red-200`)
- **Verification Status**:
  - `VERIFIED`: Green badge with ShieldCheck icon
  - `MISMATCH`: Red alert badge with AlertTriangle icon

---

## 2. Page Specifications

### 2.1 Executive Dashboard (`/`)
The command center for supply chain executives and operations managers.
- **KPI Summary Cards (7 Metrics)**:
  - Total Products in Ecosystem
  - In Transit Shipments
  - Confirmed Received Items
  - Retail Sold Units
  - Recalled Items (Alert Highlight)
  - Active Dispatches
  - Total Confirmed On-Chain Transactions
- **Visual Analytics**:
  - Lifecycle Status Distribution (Progress bar visualizer)
  - 7-Day Transaction Velocity Chart (Interactive trend)
  - Organization Participation Breakdown
- **Real-Time Activity Stream**: Live feed showing recent product creations, QC inspections, shipments, and blockchain confirmations.

---

### 2.2 Product Catalog & Detail (`/products`, `/products/[id]`, `/products/new`)
- **`/products` (Catalog)**:
  - Multi-tenant product table with search by code/serial/name.
  - Lifecycle status filters and pagination controls.
  - Action buttons: View Detail, Perform QC, Create Shipment.
- **`/products/new` (Registration)**:
  - Manufacturer creation form: Product Code, Serial Number, Product Name, Category, Extended Specifications.
  - Client-side validation ensuring unique codes before submission.
- **`/products/[id]` (Provenance & Detail)**:
  - **Header Card**: Product title, status pill, deterministic Keccak-256 hash badge with copy button.
  - **Cryptographic Proof Card**: Compares PostgreSQL hash with smart contract on-chain hash.
  - **QR Code Utility**: Real-time vector QR code pointing to public verification, download button (PNG), and full-screen lightbox.
  - **Interactive Lifecycle Timeline**: Chronological steps displaying timestamp, actor, organization, and clickable transaction hash linking to the Blockchain Explorer.

---

### 2.3 Quality Control Portal (`/quality`)
Dedicated portal for auditors, quality control engineers, and manufacturers.
- **Inspection Submission Modal**:
  - Target Product selector.
  - Inspector Name & Organization.
  - Result Toggle: `PASSED` (green) or `FAILED` (red).
  - Detailed technical notes / test metrics textarea.
- **Inspection Ledger**:
  - Table of all historical quality checks with status badges.
  - Direct links to confirmed EVM transaction hashes.

---

### 2.4 Logistics & Shipment Tracking (`/shipments`)
Command center for dispatchers, logistics carriers, and receiving managers.
- **Create Shipment Manifest Modal**:
  - Select qualified product (must be `QUALITY_CHECKED` or `STORED`).
  - Select recipient organization (filtered by active organizations).
  - Designate optional third-party carrier (`LOGISTICS` role).
  - Specify physical origin address and destination hub.
- **Shipment Management Table**:
  - Tracking code, product reference, sender, receiver, carrier, and status.
  - Contextual action triggers:
    - Senders see **Dispatch / Ship** button.
    - Carriers see **Mark In-Transit** button.
    - Receivers see **Confirm Receipt** button (which triggers automatic on-chain custody transfer).

---

### 2.5 Multi-Actor Traceability (`/traceability`)
Universal search and audit tool for supply chain investigators.
- **Instant Search Bar**: Accepts `productCode`, `serialNumber`, or database UUID.
- **Custody Provenance Graph**: Visual cards demonstrating chronological custody transfer:
  `Manufacturer` ──► `Distributor` ──► `Warehouse` ──► `Retailer`.
- **Integrity Validation Banner**:
  - Green banner: "Cryptographic Integrity Verified: Live database attributes match smart contract on-chain hash 100%."
  - Red banner: "Integrity Warning: Database records do not match on-chain hash."

---

### 2.6 Public Consumer QR Verification (`/verify`, `/verify/[code]`)
Accessible by anyone without login.
- **`/verify` (Landing)**:
  - Search input for consumer code entry and sample quick-test buttons.
- **`/verify/[code]` (Consumer Product Card)**:
  - Prominent verified badge with shield icon.
  - Product specifications (Name, Model, Category, Manufacturer).
  - Authentic Supply Chain Milestones:
    1. Manufactured & Certified
    2. Quality Inspection Passed
    3. Logistics Dispatch & Warehousing
    4. Retail Distribution & Sale
  - Blockchain Proof Drawer: Displays smart contract address and on-chain verification hash.

---

### 2.7 Live Blockchain Explorer (`/blockchain`)
Built-in block and transaction explorer eliminating reliance on external block explorers for local or private EVM subnets.
- **Node Health Cards**:
  - Node connection status (Connected / Disconnected)
  - Current Block Height
  - Chain ID (31337)
  - Total Gas Consumed
- **Ledger Table**:
  - Paginated transactions with columns: Tx Hash, Event Type, Entity Type, Block Number, Caller Address, Status (`CONFIRMED`), and Timestamp.
- **Transaction Detail Modal**:
  - Full receipt inspection: gas used, cumulative gas, transaction fee, contract address, emitted event topics, and decoded arguments.
- **Block Inspector**:
  - View block header, timestamp, miner, and included transactions.

---

### 2.8 Compliance Audit Log Portal (`/audit`)
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

## 3. UI States & User Experience Standards

1. **Loading Skeletons**: Every table and detail card renders pulse-animated skeleton loaders matching the final layout geometry to eliminate layout shifts (CLS).
2. **Actionable Empty States**: When lists or searches return zero records, the UI provides friendly contextual guidance (e.g. "No shipments found. Click 'Create Shipment' to initiate an outbound delivery.").
3. **Transaction Progress Modals**: When an action triggers a smart contract write, the UI displays a multi-step progress dialog:
   `Preparing Transaction` ──► `Submitting to EVM` ──► `Awaiting Block Confirmation` ──► `Success`.
4. **Toast Feedback**: All user operations trigger non-intrusive toast notifications with clear status messages.