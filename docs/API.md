# Backend API Specification

## 1. API Style

Use REST API.

Base URL:

```text
/api
```

Authentication:

```text
Bearer JWT
```

---

# 2. Authentication

## POST /auth/login

Login.

Request:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:

```json
{
  "accessToken": "...",
  "user": {}
}
```

---

# 3. Organizations

## GET /organizations

List organizations.

## POST /organizations

Create organization.

## GET /organizations/:id

Get organization.

## PATCH /organizations/:id

Update organization.

## PATCH /organizations/:id/status

Activate/deactivate organization.

---

# 4. Users

## GET /users

List users.

## POST /users

Create user.

## GET /users/:id

Get user.

## PATCH /users/:id

Update user.

## PATCH /users/:id/status

Activate/deactivate user.

---

# 5. Products

## GET /products

Query:

```text
search
status
organizationId
page
limit
```

## POST /products

Create product.

## GET /products/:id

Get product.

## PATCH /products/:id

Update metadata.

## GET /products/:id/history

Get traceability history.

---

# 6. Product Blockchain Actions

## POST /products/:id/register-blockchain

Register product on blockchain.

## POST /products/:id/quality-check

Perform quality check.

## POST /products/:id/ship

Ship product.

## POST /products/:id/receive

Receive product.

## POST /products/:id/transfer

Transfer ownership.

## POST /products/:id/sell

Mark as sold.

## POST /products/:id/recall

Recall product.

---

# 7. Shipments

## GET /shipments

List shipments.

## POST /shipments

Create shipment.

## GET /shipments/:id

Get shipment.

## POST /shipments/:id/ship

Ship shipment.

## POST /shipments/:id/receive

Receive shipment.

---

# 8. Traceability

## GET /traceability/:productCode

Return complete product history.

Response should contain:

```json
{
  "product": {},
  "events": [],
  "blockchainVerification": {}
}
```

---

# 9. Public Verification

## GET /public/verify/:productCode

No authentication required.

Return safe public information.

Do not expose:

* passwords
* internal IDs where unnecessary
* private organization information
* internal audit metadata

---

# 10. Blockchain

## GET /blockchain/transactions

List indexed blockchain transactions.

## GET /blockchain/transactions/:txHash

Get transaction.

## GET /blockchain/status

Return blockchain connection status.

---

# 11. Audit

## GET /audit-logs

List audit logs.

Filters:

```text
organizationId
userId
action
entityType
dateFrom
dateTo
```

---

# 12. Dashboard

## GET /dashboard/statistics

Return:

```json
{
  "totalProducts": 0,
  "inTransit": 0,
  "received": 0,
  "sold": 0,
  "recalled": 0,
  "activeShipments": 0,
  "blockchainTransactions": 0
}
```

All values must be calculated from actual data.

---

# 13. Error Response

Use consistent format:

```json
{
  "statusCode": 400,
  "code": "INVALID_STATE_TRANSITION",
  "message": "Product cannot be shipped from its current state."
}
```

---

# 14. Authorization

Every protected endpoint must check:

1. Authentication
2. Role
3. Organization
4. Resource ownership/access

Never trust organization IDs sent from the frontend.

---

# 15. Validation

Use DTO validation.

Validate:

* email
* UUID
* enum
* required fields
* string length
* numeric ranges
* blockchain addresses

---

# 16. Swagger

Generate OpenAPI documentation.

Document:

* endpoint
* request
* response
* authentication
* errors
* examples