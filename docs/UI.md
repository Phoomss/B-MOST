# User Interface Specification

## 1. Design Direction

Design the system as an enterprise SaaS platform.

Characteristics:

* Clean
* Professional
* Modern
* Data-oriented
* Responsive
* Accessible

Avoid:

* excessive gradients
* excessive animation
* unnecessary decorative elements
* overly colorful dashboards

---

# 2. Main Layout

Authenticated pages use:

```text
┌──────────────────────────────────────────────┐
│ Topbar                                       │
├────────────┬─────────────────────────────────┤
│ Sidebar    │ Main Content                    │
│            │                                 │
│ Dashboard  │                                 │
│ Products   │                                 │
│ Shipments  │                                 │
│ Quality    │                                 │
│ Traceability│                                │
│ Blockchain │                                 │
│ Audit      │                                 │
│ Users      │                                 │
│ Settings   │                                 │
└────────────┴─────────────────────────────────┘
```

---

# 3. Dashboard

Display:

* Total Products
* Active Shipments
* In Transit
* Received
* Sold
* Recalled
* Blockchain Transactions

Charts:

* Product Status
* Shipment Activity
* Organization Activity
* Blockchain Activity

All values must be real API data.

---

# 4. Product List

Columns:

```text
Product Code
Product Name
Manufacturer
Current Owner
Status
Blockchain
Created
Actions
```

Features:

* Search
* Filter
* Pagination
* Sort

---

# 5. Product Detail

Sections:

## Product Information

* Product name
* Code
* Serial
* Category
* Manufacturer
* Current owner

## Blockchain

* Product ID
* Hash
* Transaction
* Status
* Contract

## QR Code

Show downloadable QR code.

## Traceability

Display timeline.

---

# 6. Product Timeline

Example:

```text
● Product Registered
│
├── Manufacturer
├── 23 Sep 2026
└── Transaction

│
● Quality Checked
│
├── PASSED
└── Transaction

│
● Shipped
│
└── Transaction

│
● Received
│
└── Transaction

│
● Sold
│
└── Transaction
```

---

# 7. Shipment Page

Display:

* Shipment code
* Product
* Sender
* Receiver
* Carrier
* Origin
* Destination
* Status
* Created date
* Blockchain transaction

---

# 8. Quality Check Page

Form:

```text
Product
Inspector
Result
Notes
```

Results:

```text
PASS
FAIL
```

Display blockchain transaction after submission.

---

# 9. Traceability Page

Users can search by:

* Product Code
* Serial Number

Display:

* Product
* Current status
* Current owner
* Complete timeline
* Blockchain verification

---

# 10. Public Verification Page

URL:

```text
/verify/{productCode}
```

No login.

Display:

```text
✓ Product Verified

Product
Manufacturer
Current Status

Supply Chain Timeline

Blockchain Verification
```

Keep the interface understandable for non-technical users.

---

# 11. Blockchain Page

Display transaction table:

```text
Transaction Hash
Event
Entity
Block
Status
Timestamp
```

Clicking a transaction opens detailed information.

---

# 12. Audit Page

Display:

```text
User
Organization
Action
Entity
Timestamp
```

Support filtering.

---

# 13. Organization Management

SUPER_ADMIN interface:

* Organization table
* Create organization
* Edit organization
* Activate/deactivate
* Wallet address

---

# 14. User Management

Display:

```text
Name
Email
Organization
Role
Status
Created
```

---

# 15. Loading States

Use:

* skeletons
* spinners
* disabled submit buttons

Never display blank screens while loading.

---

# 16. Empty States

Examples:

```text
No products found.
Create your first product to begin tracking your supply chain.
```

---

# 17. Error States

Errors must be actionable.

Example:

```text
Transaction failed.

The blockchain transaction could not be completed.

[Try Again]
```

---

# 18. Blockchain Transaction UI

Use status steps:

```text
Preparing
   ↓
Waiting for Wallet
   ↓
Submitting
   ↓
Confirming
   ↓
Confirmed
```

---

# 19. Responsive Design

Support:

* Desktop
* Tablet
* Mobile

The public verification page should be especially mobile-friendly because it is accessed from QR codes.

---

# 20. Accessibility

Implement:

* semantic HTML
* keyboard navigation
* sufficient contrast
* labels for form fields
* accessible dialogs
* accessible tables
* meaningful error messages