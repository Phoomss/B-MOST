# Security Requirements

## 1. Authentication

Use JWT-based authentication.

Passwords must be hashed using a secure password hashing algorithm.

Never store plaintext passwords.

---

# 2. Authorization

Authorization must be enforced on the backend.

Implement:

```text
Authentication
      ↓
Role Check
      ↓
Organization Check
      ↓
Resource Check
      ↓
Action
```

---

# 3. RBAC

Permissions must be mapped to roles.

Example:

```text
MANUFACTURER
→ register product
→ quality check
→ create shipment

DISTRIBUTOR
→ receive product
→ create shipment
→ transfer ownership

WAREHOUSE
→ receive
→ store
→ ship

RETAILER
→ receive
→ sell

AUDITOR
→ read-only audit access
```

---

# 4. Organization Isolation

Users must not access another organization's private operational data unless explicitly permitted.

Never rely on:

```text
organizationId
```

from the frontend.

The backend must determine organization scope from the authenticated user.

---

# 5. Input Validation

Validate all external input.

Use DTO validation.

Protect against:

* SQL injection
* XSS
* malformed IDs
* invalid blockchain addresses
* oversized input
* invalid enum values

---

# 6. API Security

Implement:

* CORS
* Helmet
* rate limiting where appropriate
* request validation
* secure headers

---

# 7. JWT Security

Secrets must be stored in environment variables.

Never hardcode:

```text
JWT_SECRET
```

Use appropriate token expiration.

---

# 8. Blockchain Security

Smart Contract must:

* restrict unauthorized functions
* validate state transitions
* prevent duplicate products
* validate ownership
* validate organization permissions
* emit events
* reject invalid operations

---

# 9. Private Keys

Never store private keys in:

* source code
* Git
* database
* frontend

Use environment variables for local development.

Use secure secret management for deployment.

---

# 10. On-Chain Privacy

Never store:

* passwords
* personal sensitive data
* private documents
* authentication tokens

on-chain.

---

# 11. QR Security

QR codes must contain only public verification references.

Do not place:

* JWT tokens
* private IDs
* secrets

inside QR codes.

---

# 12. Audit Security

Audit logs should not be freely editable or deletable by normal users.

Only authorized administrators may access sensitive audit information.

---

# 13. Transaction Integrity

A transaction is successful only when:

```text
Blockchain Receipt
+
Required Event
```

has been confirmed.

Do not mark a product as blockchain-registered merely because a transaction was submitted.

---

# 14. Database Security

Use:

* parameterized queries through Prisma
* foreign keys
* constraints
* least-privilege database users

---

# 15. Environment Variables

Required secrets:

```text
DATABASE_URL
JWT_SECRET
DEPLOYER_PRIVATE_KEY
```

must exist only in environment configuration.

Provide `.env.example` with empty values.

---

# 16. Logging

Do not log:

* passwords
* JWT tokens
* private keys
* sensitive credentials

Safe logs may contain:

* transaction hash
* user ID
* organization ID
* event type
* error code

---

# 17. Error Messages

Do not expose internal stack traces to production users.

Return safe application errors.

---

# 18. Dependency Security

Keep dependencies updated.

Run package audit tools periodically.

---

# 19. Smart Contract Testing

Tests must cover:

* unauthorized access
* duplicate registration
* invalid state transitions
* ownership validation
* recall
* event emission