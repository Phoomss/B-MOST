Create a short, highly visual presentation for the current B-MOST project.

Project:
B-MOST — Blockchain Multi-Organization Supply Chain Traceability

Thai:
ระบบติดตามและตรวจสอบห่วงโซ่อุปทานหลายองค์กรด้วยเทคโนโลยีบล็อกเชน

==================================================
PRESENTATION CONTEXT
==================================================

Total session time: 10 minutes

Time allocation:

Presentation: 3 minutes
Live Demo:    5 minutes
Q&A:          2 minutes

IMPORTANT:

The slides are NOT intended to explain every feature.

The purpose of the 3-minute presentation is to make the audience
understand the COMPLETE SYSTEM OVERVIEW before the 5-minute live demo.

After these slides, the audience should already understand:

1. What B-MOST is
2. What problem it solves
3. Who uses the system
4. How a product moves through the supply chain
5. What the system records
6. What Blockchain is used for
7. How the technical architecture works
8. What they are about to see in the live demo

Create ONLY 4 main slides.

Do not create a long introduction.
Do not create a separate agenda slide.
Do not create unnecessary theory slides.
Do not explain generic Blockchain concepts.

The presentation must lead naturally into the live demo.

==================================================
FIRST: AUDIT THE CURRENT PROJECT
==================================================

Before creating slides, inspect the CURRENT repository.

Review:

- README.md
- docs/
- apps/web/
- apps/api/
- packages/contracts/
- SupplyChainRegistry.sol
- Prisma schema
- current routes/pages
- RBAC
- blockchain integration
- Docker configuration
- existing logo/assets
- current UI
- current screenshots if available

Run/inspect the application if possible.

The CURRENT implementation is the source of truth.

Do NOT invent:

- features
- screens
- APIs
- roles
- smart-contract behavior
- architecture
- metrics
- results

Use REAL screenshots from B-MOST whenever possible.

==================================================
OVERALL STORY
==================================================

Build the entire presentation around ONE product journey.

Core idea:

"สินค้าหนึ่งรายการถูกสร้างเพียงครั้งเดียว
และถูกติดตามตลอดเส้นทางระหว่างหลายองค์กร"

Supply chain:

Manufacturer
    ↓
Distributor
    ↓
Warehouse
    ↓
Retailer
    ↓
Customer

B-MOST connects these organizations and records important
supply-chain events so the product journey can be traced and verified.

The presentation should make this concept immediately understandable.

==================================================
SLIDE 1 — WHAT IS B-MOST?
TIME: ~35–40 seconds
==================================================

Purpose:

Within the first 30–40 seconds, make the audience understand
the problem and B-MOST solution.

Title:

B-MOST

Subtitle:

Blockchain Multi-Organization Supply Chain Traceability

Thai subtitle:

ระบบติดตามและตรวจสอบห่วงโซ่อุปทานหลายองค์กรด้วยเทคโนโลยีบล็อกเชน

Main visual:

Manufacturer
      ↓
Distributor
      ↓
Warehouse
      ↓
Retailer
      ↓
Customer

Prefer horizontal layout:

Manufacturer → Distributor → Warehouse → Retailer → Customer

Show a product moving through the chain.

Problem:

สินค้าเดินทางผ่านหลายองค์กร
แต่ข้อมูลของแต่ละช่วงอาจแยกจากกัน
ทำให้การตรวจสอบย้อนหลังทำได้ยาก

Solution:

B-MOST เชื่อมข้อมูลการเดินทางของสินค้า
ตั้งแต่ต้นทางถึงปลายทาง
และบันทึกเหตุการณ์สำคัญผ่าน Blockchain

Use very little text.

Main message:

"One Product. One Journey. Verifiable History."

or:

"สินค้าเดียว เส้นทางเดียว ตรวจสอบย้อนหลังได้"

Visual priority:
80% visual
20% text

==================================================
SLIDE 2 — COMPLETE SYSTEM WORKFLOW
TIME: ~50 seconds
==================================================

THIS IS THE MOST IMPORTANT OVERVIEW SLIDE.

The audience should understand almost the entire business workflow
from this single slide.

Create a large horizontal Supply Chain Journey.

Example:

┌────────────────┐
│ MANUFACTURER   │
│ ผู้ผลิต         │
│                │
│ Register       │
│ Quality Check  │
└───────┬────────┘
        │
        │ Shipment
        ▼
┌────────────────┐
│ DISTRIBUTOR    │
│ ผู้จัดจำหน่าย    │
│                │
│ Receive        │
│ Store          │
│ Distribute     │
└───────┬────────┘
        │
        │ Shipment
        ▼
┌────────────────┐
│ WAREHOUSE      │
│ คลังสินค้า       │
│                │
│ Receive        │
│ Store          │
│ Dispatch       │
└───────┬────────┘
        │
        │ Shipment
        ▼
┌────────────────┐
│ RETAILER       │
│ ร้านค้าปลีก      │
│                │
│ Receive        │
│ Store          │
│ Sold           │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ CUSTOMER       │
│                │
│ Scan QR        │
│ Verify         │
└────────────────┘

Under the organization flow, show Product Lifecycle:

REGISTERED
→ QUALITY_CHECKED
→ READY_TO_SHIP
→ SHIPPED
→ IN_TRANSIT
→ RECEIVED
→ STORED
→ SOLD

Also visually communicate:

PRODUCT CREATED ONCE

The Product must NOT be recreated by Distributor,
Warehouse, or Retailer.

Instead:

Product #001
   │
   ├── Shipment #001
   │   Manufacturer → Distributor
   │
   ├── Shipment #002
   │   Distributor → Warehouse
   │
   └── Shipment #003
       Warehouse → Retailer

This is an important concept.

Use animation only if Antigravity supports simple progressive reveal.

Do not make this slide look like a database diagram.

It should look like a real business supply-chain journey.

==================================================
SLIDE 3 — SYSTEM ARCHITECTURE
TIME: ~50 seconds
==================================================

Purpose:

Show that B-MOST is not simply a blockchain demo.

It is a complete Web Application + Backend + Database +
Blockchain architecture.

Create ONE clean architecture diagram.

Recommended visual:

                     USERS
                       │
                       ▼
              ┌─────────────────┐
              │     B-MOST      │
              │ Next.js Web App │
              └───────┬─────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          │ REST API              │ Blockchain TX
          ▼                       ▼
 ┌─────────────────┐        ┌─────────────┐
 │   NestJS API    │        │  MetaMask   │
 │                 │        └──────┬──────┘
 │ Authentication  │               │
 │ RBAC            │               ▼
 │ Business Logic  │           Sepolia
 └────────┬────────┘               │
          │                        ▼
          ▼                ┌──────────────────┐
 ┌─────────────────┐       │SupplyChainRegistry│
 │   PostgreSQL    │       │     Solidity     │
 │     Prisma      │       └──────────────────┘
 └─────────────────┘

If confirmed by source code, show backend blockchain
verification/synchronization as a dotted return path:

Sepolia / Transaction Receipt
            ↓
       NestJS Backend
            ↓
        PostgreSQL

Clearly distinguish responsibilities.

APPLICATION LAYER

Next.js
- User Interface
- Role-based workflow
- MetaMask interaction

NestJS
- REST API
- Authentication
- RBAC
- Business Logic
- Blockchain verification/sync where implemented

PostgreSQL
- Users
- Organizations
- Products
- Shipments
- Application data

BLOCKCHAIN LAYER

MetaMask
- User signs transaction

Sepolia
- Blockchain network

SupplyChainRegistry
- Product traceability state
- Important supply-chain events

Important architecture rule:

Normal blockchain business transactions are signed by
the user's MetaMask wallet.

Do NOT show backend private key signing as the normal architecture.

At the bottom show technology stack compactly:

Next.js | NestJS | PostgreSQL | Prisma
MetaMask | viem | Solidity | Sepolia | Docker

Do NOT make separate slides for technology stack.

==================================================
SLIDE 4 — WHAT BLOCKCHAIN ADDS + TRANSITION TO DEMO
TIME: ~40 seconds
==================================================

Purpose:

Answer:

"Why does this system need Blockchain?"

Do NOT explain Blockchain theory.

Show one product:

Product #001

and its traceable timeline:

Registered
   ↓
Quality Checked
   ↓
Shipped
   ↓
Received
   ↓
Stored
   ↓
Sold

Beside the timeline show:

Application
     │
     │ Important event
     ▼
MetaMask Signature
     │
     ▼
SupplyChainRegistry
     │
     ▼
Blockchain Transaction
     │
     ▼
Verifiable History

Show three concise benefits:

TRACEABLE
ตรวจสอบเส้นทางย้อนหลังได้

TRANSPARENT
เห็นเหตุการณ์สำคัญตลอด Supply Chain

VERIFIABLE
ตรวจสอบ Transaction บน Blockchain ได้

Also show:

Customer
   ↓
Scan QR
   ↓
Product Verification
   ↓
Product Journey

Important:

Do NOT claim that all application data is stored on Blockchain.

Clearly communicate:

PostgreSQL
=
Operational / Application Data

Blockchain
=
Important Traceability State / Events

End this slide with:

"ต่อไปจะเป็นการ Demo การเดินทางของสินค้าจริง
ตั้งแต่ Manufacturer จนถึงการตรวจสอบปลายทาง"

This sentence transitions directly into the live demo.

==================================================
3-MINUTE SPEAKER SCRIPT
==================================================

Create Thai speaker notes for all 4 slides.

Target:

Slide 1: 35–40 seconds
Slide 2: 45–50 seconds
Slide 3: 45–50 seconds
Slide 4: 35–40 seconds

Total:

Approximately 2:50–3:00 minutes.

The speaker notes must sound natural when spoken.

Avoid formal academic paragraphs.

The script should explain the diagrams rather than reading
every word on the slide.

==================================================
LIVE DEMO ROADMAP
==================================================

The slides should prepare the audience for this 5-minute demo.

Do NOT create separate demo slides unless needed as backup.

The intended demo story is:

STEP 1 — Manufacturer

Login as Manufacturer

Show:
- Dashboard
- Register Product
- Product created

Explain:

"สินค้าจะถูกสร้างจาก Manufacturer เพียงครั้งเดียว"

----------------------------

STEP 2 — Quality Check

Open Quality Check.

Perform / show Quality Check.

Product:

REGISTERED
→ QUALITY_CHECKED

Show MetaMask transaction if practical.

----------------------------

STEP 3 — Create Shipment

Manufacturer creates shipment.

Receiver:

Distributor

Show:

Product
+
Shipment
+
Receiver

Confirm transaction through MetaMask.

----------------------------

STEP 4 — Distributor / Receiver

Switch account/user.

Show:

Incoming Shipment

Receive product.

Explain ownership transition.

If the current demo environment uses a simplified wallet setup,
only demonstrate transitions that the actual smart contract and
wallet configuration support.

Do NOT fake unsupported Distributor → Warehouse → Retailer
on-chain transfers.

----------------------------

STEP 5 — Traceability

Open product detail / verification.

Show:

Product information
Status
Shipment
Transaction
History

If available, show transaction link / blockchain verification.

----------------------------

STEP 6 — Customer Verification

Open:

QR / Public Verification

Show that a customer does not need access to the internal dashboard
to verify the product journey.

End demo with:

"นี่คือเส้นทางของสินค้าเดียวกันตั้งแต่ต้นทาง
และทุกเหตุการณ์สำคัญสามารถตรวจสอบย้อนกลับได้"

==================================================
DESIGN PRINCIPLES
==================================================

The slides must feel like the same product as the B-MOST web app.

Use actual repository:

- B-MOST logo
- branding
- typography direction
- UI screenshots
- icons/assets where suitable

Style:

Modern Enterprise
Clean
Professional
Minimal
Light / White
Supply-chain oriented

Avoid generic cryptocurrency aesthetics.

DO NOT use:

- Bitcoin logos
- Ethereum coins as decorative graphics
- neon crypto backgrounds
- excessive hexagons
- generic stock images
- unnecessary gradients
- excessive animations

Blockchain should look like infrastructure,
not cryptocurrency.

==================================================
SCREENSHOTS
==================================================

Use REAL B-MOST screenshots wherever screenshots improve the slides.

Do not fabricate UI.

Potential screenshots:

- Dashboard
- Product
- Register Product
- Quality Check
- Shipment
- Incoming Shipment
- Verification
- Trace History

However:

Do not fill slides with many tiny screenshots.

The 3-minute presentation should explain the SYSTEM.

The 5-minute live demo will show detailed UI.

Use screenshots only where they strengthen understanding.

==================================================
VISUAL PRIORITY
==================================================

Prefer:

Diagram
>
Screenshot
>
Short label
>
Paragraph

Each slide should communicate its core idea within approximately
5 seconds of looking at it.

Avoid more than 3–5 major textual points per slide.

==================================================
TECHNICAL FACTS TO VERIFY
==================================================

Current expected blockchain configuration:

Network:
Sepolia

Chain ID:
11155111

SupplyChainRegistry:
0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a

Expected technology stack:

Frontend:
Next.js
TypeScript
Tailwind CSS
shadcn/ui
viem

Backend:
NestJS
TypeScript
Prisma
PostgreSQL
JWT
Swagger

Blockchain:
Solidity
OpenZeppelin AccessControl
MetaMask
Sepolia

Infrastructure:
Docker
Docker Compose

VERIFY all of these against the repository.

Do not present an expected technology as implemented if it is
not present in current source.

==================================================
VERY IMPORTANT
==================================================

This is NOT a 3-minute product pitch followed by nothing.

This is:

3 min — Understand the system
5 min — Prove it works through live demo
2 min — Q&A

Therefore the slides must NOT duplicate the live demo.

Slides explain:

WHY
+
WHO
+
FLOW
+
ARCHITECTURE
+
BLOCKCHAIN ROLE

Live demo proves:

HOW IT ACTUALLY WORKS

The audience should enter the demo already understanding what
they are about to see.

==================================================
DELIVERABLES
==================================================

Create:

1. 4 presentation slides
2. Supply-chain journey diagram
3. System architecture diagram
4. Blockchain traceability diagram
5. Thai speaker notes for every slide
6. Full combined 3-minute Thai script
7. A separate 5-minute live-demo script/checklist
8. Backup Q&A notes for likely technical questions

For Q&A preparation include concise answers for topics such as:

- Why Blockchain instead of only PostgreSQL?
- What data is stored in PostgreSQL vs Blockchain?
- Why use Sepolia?
- How does MetaMask participate?
- Who can create products?
- How are roles controlled?
- How is product ownership transferred?
- Can blockchain data be modified?
- What happens if a blockchain transaction fails?
- Why do Product.id and blockchainProductId differ?
- How does QR verification work?
- What prevents unauthorized actions?
- What is the role of the smart contract?
- How would the system be extended for production?

Before finalizing:

- verify all claims against current source
- verify diagrams against implementation
- verify role permissions against Solidity
- verify screenshots are real
- ensure no secrets are visible
- ensure presentation fits within 3 minutes
- ensure demo roadmap fits within 5 minutes
- ensure slides are readable from a projector