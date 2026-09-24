# REST API Specification

## 1. Overview & Conventions

- **Base URL**: `http://localhost:4000/api`
- **Authentication**: Bearer JWT passed in header: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`
- **Interactive Documentation**: Swagger UI available at `http://localhost:4000/api/docs`

### 1.1 Standard Error Format
All errors follow standard RFC 7807 formatted JSON envelopes:
```json
{
  "statusCode": 400,
  "message": "Product cannot be shipped from its current state.",
  "error": "Bad Request",
  "timestamp": "2026-09-24T12:00:00.000Z",
  "path": "/api/products/c6b29f7e-fa2a-4db5-9e7c-a49da2ef3fa8/ship"
}
```

---

## 2. Authentication API (`/api/auth`)

### 2.1 Login
`POST /api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "manufacturer@example.com",
  "password": "Password123!"
}
```
- **Response `200 OK`**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "manufacturer@example.com",
    "firstName": "John",
    "lastName": "Maker",
    "role": "MANUFACTURER",
    "organizationId": "22222222-2222-2222-2222-222222222222"
  }
}
```

### 2.2 Get Current Profile
`GET /api/auth/me`
- **Access**: Authenticated
- **Response `200 OK`**: Returns user profile with organization name and role.

---

## 3. Organizations API (`/api/organizations`)

### 3.1 List Organizations
`GET /api/organizations`
- **Access**: Authenticated (`SUPER_ADMIN`, `AUDITOR`, or tenant-scoped)
- **Response `200 OK`**: Array of `Organization` objects.

### 3.2 Create Organization
`POST /api/organizations`
- **Access**: `SUPER_ADMIN`
- **Request Body**:
```json
{
  "name": "Apex Electronics Ltd.",
  "code": "ORG-MFG-001",
  "type": "MANUFACTURER",
  "address": "123 Industrial Way, Tech Park",
  "contactEmail": "contact@apex.com",
  "phone": "+1-555-0199",
  "walletAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
}
```

### 3.3 Update Organization Wallet
`PATCH /api/organizations/:id/wallet`
- **Access**: `SUPER_ADMIN`
- **Request Body**: `{ "walletAddress": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" }`

---

## 4. Products API (`/api/products`)

### 4.1 List Products
`GET /api/products`
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 10)
  - `search` (string, filters code, serial, name)
  - `status` (`REGISTERED`, `QUALITY_CHECKED`, `READY_TO_SHIP`, `SHIPPED`, `IN_TRANSIT`, `RECEIVED`, `STORED`, `SOLD`, `RECALLED`)
  - `organizationId` (UUID, optional filter)

### 4.2 Create Product
`POST /api/products`
- **Access**: `MANUFACTURER`, `SUPER_ADMIN`
- **Request Body**:
```json
{
  "productCode": "PRD-EV-1001",
  "serialNumber": "SN-2026-9901",
  "name": "High-Efficiency Battery Cell 4680",
  "description": "Solid-state electrolyte with high nickel cathode",
  "category": "Energy Storage"
}
```

### 4.3 Register on Blockchain
`POST /api/products/:id/register-blockchain`
- **Access**: `MANUFACTURER`, `SUPER_ADMIN`
- **Description**: Triggers `registerProduct` on `SupplyChainRegistry.sol`.
- **Response `200 OK`**:
```json
{
  "success": true,
  "blockchainProductId": "1",
  "productHash": "0x89e24b5c1c8a14b...",
  "transactionHash": "0x34f19b22a07c4b...",
  "status": "REGISTERED"
}
```

### 4.4 Perform Quality Check
`POST /api/products/:id/quality-check`
- **Access**: `AUDITOR`, `MANUFACTURER`, `SUPER_ADMIN`
- **Request Body**:
```json
{
  "passed": true,
  "notes": "Cell capacity 102%, internal impedance within 0.5% tolerance.",
  "inspectorName": "Dr. Aris Thorne"
}
```

### 4.5 Dispatch Product Shipment
`POST /api/products/:id/ship`
- **Access**: Owner organization, Carrier, or Admin
- **Request Body**:
```json
{
  "shipmentId": "33333333-3333-3333-3333-333333333333"
}
```

### 4.6 Receive Product Shipment
`POST /api/products/:id/receive`
- **Access**: Declared recipient organization
- **Request Body**:
```json
{
  "shipmentId": "33333333-3333-3333-3333-333333333333"
}
```

### 4.7 Retail Sale Execution
`POST /api/products/:id/sell`
- **Access**: `RETAILER`, `ORG_ADMIN`, `SUPER_ADMIN`
- **Request Body**:
```json
{
  "notes": "Sold at Flagship Retail Store 01"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "status": "SOLD",
  "transactionHash": "0x789b..."
}
```

### 4.8 Emergency Recall
`POST /api/products/:id/recall`
- **Access**: Manufacturer, Current Owner, `AUDITOR`, `SUPER_ADMIN`
- **Request Body**:
```json
{
  "reason": "Electrolyte thermal sensor calibration fault"
}
```

### 4.9 Download QR Verification Payload
`GET /api/products/:id/qr`
- **Response `200 OK`**:
```json
{
  "productCode": "PRD-EV-1001",
  "verificationUrl": "http://localhost:3000/verify/PRD-EV-1001",
  "qrDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
}
```

---

## 5. Shipments API (`/api/shipments`)

### 5.1 Create Shipment Manifest
`POST /api/shipments`
- **Access**: `MANUFACTURER`, `DISTRIBUTOR`, `WAREHOUSE`, `ORG_ADMIN`, `SUPER_ADMIN`
- **Request Body**:
```json
{
  "shipmentCode": "SHP-2026-8801",
  "productId": "44444444-4444-4444-4444-444444444444",
  "receiverOrganizationId": "55555555-5555-5555-5555-555555555555",
  "carrierOrganizationId": "66666666-6666-6666-6666-666666666666",
  "origin": "Bangkok Facility A",
  "destination": "Chonburi Distribution Hub"
}
```

### 5.2 Dispatch Shipment
`POST /api/shipments/:id/ship`
- **Triggers**: Changes shipment to `SHIPPED`, executes `shipProduct` on blockchain.

### 5.3 Receive Shipment
`POST /api/shipments/:id/receive`
- **Triggers**: Changes shipment to `DELIVERED`, executes `receiveProduct` on blockchain, automatically transfers product `currentOwnerId` to receiver.

---

## 6. Traceability API (`/api/traceability`)

### 6.1 Authoritative Provenance Lookup
`GET /api/traceability/:code`
- **Parameters**: `code` (matches `productCode`, `serialNumber`, or database UUID)
- **Response `200 OK`**:
```json
{
  "product": {
    "id": "...",
    "productCode": "PRD-EV-1001",
    "serialNumber": "SN-2026-9901",
    "name": "High-Efficiency Battery Cell 4680",
    "status": "SOLD",
    "manufacturer": { "name": "Apex Electronics Ltd." },
    "currentOwner": { "name": "Urban Retail Store" }
  },
  "blockchain": {
    "isRegistered": true,
    "onChainProductId": 1,
    "onChainHash": "0x89e24b5c1c8a14b...",
    "databaseHash": "0x89e24b5c1c8a14b...",
    "verificationStatus": "VERIFIED",
    "contractStatus": "SOLD"
  },
  "provenanceChain": [
    { "order": 1, "organization": "Apex Electronics Ltd.", "role": "MANUFACTURER" },
    { "order": 2, "organization": "Nexus Logistics Co.", "role": "DISTRIBUTOR" },
    { "order": 3, "organization": "Metro Warehousing Ltd.", "role": "WAREHOUSE" },
    { "order": 4, "organization": "Urban Retail Store", "role": "RETAILER" }
  ],
  "timeline": [
    {
      "eventType": "REGISTERED",
      "timestamp": "2026-09-24T08:00:00.000Z",
      "actor": "Apex Electronics Ltd.",
      "transactionHash": "0x1111..."
    },
    {
      "eventType": "QUALITY_CHECKED",
      "timestamp": "2026-09-24T08:30:00.000Z",
      "actor": "Dr. Aris Thorne",
      "transactionHash": "0x2222..."
    },
    {
      "eventType": "SHIPPED",
      "timestamp": "2026-09-24T09:00:00.000Z",
      "actor": "Apex Electronics Ltd.",
      "transactionHash": "0x3333..."
    },
    {
      "eventType": "RECEIVED",
      "timestamp": "2026-09-24T10:00:00.000Z",
      "actor": "Nexus Logistics Co.",
      "transactionHash": "0x4444..."
    },
    {
      "eventType": "SOLD",
      "timestamp": "2026-09-24T12:00:00.000Z",
      "actor": "Urban Retail Store",
      "transactionHash": "0x5555..."
    }
  ]
}
```

---

## 7. Public Consumer Verification API (`/api/public/verify`)

### 7.1 Verify Product Authenticity (Unauthenticated)
`GET /api/public/verify/:productCode`
- **Response `200 OK`**:
```json
{
  "productCode": "PRD-EV-1001",
  "name": "High-Efficiency Battery Cell 4680",
  "category": "Energy Storage",
  "manufacturer": "Apex Electronics Ltd.",
  "status": "SOLD",
  "isAuthentic": true,
  "verificationStatus": "VERIFIED",
  "blockchainConfirmed": true,
  "timeline": [ ... ]
}
```

### 7.2 Stream QR Code Image
`GET /api/public/verify/:productCode/qr`
- **Response `200 OK`**: PNG image stream (`Content-Type: image/png`).

---

## 8. Blockchain Explorer API (`/api/blockchain`)

### 8.1 Node Status
`GET /api/blockchain/status`
- **Response `200 OK`**:
```json
{
  "connected": true,
  "network": "Hardhat Local",
  "chainId": 31337,
  "blockNumber": 42,
  "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
}
```

### 8.2 Transaction Stats
`GET /api/blockchain/stats`
- **Response `200 OK`**:
```json
{
  "totalTransactions": 158,
  "confirmedTransactions": 158,
  "failedTransactions": 0,
  "pendingTransactions": 0
}
```

### 8.3 List Indexed Transactions
`GET /api/blockchain/transactions?page=1&limit=10&eventType=ProductShipped`

### 8.4 Inspect Block by Number
`GET /api/blockchain/blocks/:blockNumber`

---

## 9. Dashboard API (`/api/dashboard`)

### 9.1 Summary Statistics
`GET /api/dashboard/statistics`
- **Response `200 OK`**:
```json
{
  "totalProducts": 48,
  "inTransit": 4,
  "received": 12,
  "sold": 22,
  "recalled": 1,
  "activeShipments": 6,
  "blockchainTransactions": 158
}
```

### 9.2 Analytics Charts
`GET /api/dashboard/charts`
- Returns datasets for status distribution, 7-day transaction velocity, and organization ecosystem breakdown.

---

## 10. Audit Logs API (`/api/audit-logs`)

### 10.1 Query Audit Logs
`GET /api/audit-logs?search=PRODUCT_SELL&page=1&limit=20`
- **Access**: `SUPER_ADMIN`, `AUDITOR`, or tenant-scoped `ORG_ADMIN`.

### 10.2 Filter Options
`GET /api/audit-logs/filters/options`
- Returns unique actions, entity types, and organizations present in the log history.