# Security Architecture & Policies

## 1. Threat Model & Security Architecture

B-MOST coordinates supply chain operations across multiple competing or independent corporate entities. The security model must guarantee:
1. **Multi-Tenant Data Confidentiality**: An organization must never view or manipulate another organization's private operational records or shipment manifests without explicit authorization.
2. **Custodial Integrity**: Product ownership cannot be hijacked; only current custodians can transfer or dispatch physical inventory.
3. **Data Tamper Resistance**: Operational records stored in PostgreSQL cannot be secretly manipulated by a database administrator without triggering cryptographic hash verification alerts.
4. **Non-Repudiation**: Every critical lifecycle event is permanently signed, confirmed on-chain, and recorded in an immutable audit log with client IP tracking.

---

## 2. Authentication & Token Security

### 2.1 Password Hashing
- User passwords are encrypted using **bcrypt** with **10 salt rounds**.
- Plaintext passwords are never stored in the database, printed to application logs, or returned in API responses.

### 2.2 JWT (JSON Web Token) Security
- Tokens are digitally signed using the **HS256** algorithm with a high-entropy secret (`JWT_SECRET`) injected strictly via environment variables.
- Token lifetime is set to **7 days** (or configurable via `JWT_EXPIRES_IN`).
- Token payload contains minimal non-sensitive identity claims:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "MANUFACTURER",
  "organizationId": "org-uuid",
  "iat": 1727180000,
  "exp": 1727784800
}
```
- Tokens are validated on every authenticated request by `JwtStrategy` and `JwtAuthGuard`.

---

## 3. Multi-Tenant Organization Isolation

Data isolation between organizations is enforced at the server level via the `OrganizationIsolationGuard`:

```text
Incoming Request
      │
      ▼
Is user SUPER_ADMIN or AUDITOR?
      ├── YES ──► Grant cross-tenant read permission
      │
      └── NO  ──► Enforce Tenant Boundary:
                  1. Match user.organizationId against target resource.
                  2. Reject request with 403 Forbidden if tenant mismatch.
```

- When listing products, shipments, or audits, services automatically inject `{ currentOwnerId: user.organizationId }` into the Prisma query filter.
- Client-supplied `organizationId` query parameters are never trusted for non-admin accounts.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Operation | SUPER_ADMIN | ORG_ADMIN | MANUFACTURER | DISTRIBUTOR | WAREHOUSE | RETAILER | AUDITOR | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Create Organization | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Organization Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Product | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Register on Blockchain | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit Quality Check | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Create Shipment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ship Product | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Receive Shipment | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark as Stored | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Sell to Customer | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Product Recall | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| View Blockchain Explorer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View All Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| View Own Org Audit Logs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Enforcement in NestJS is declarative:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard, OrganizationIsolationGuard)
@Roles(UserRole.MANUFACTURER, UserRole.SUPER_ADMIN)
@Post()
createProduct(@Body() dto: CreateProductDto) { ... }
```

---

## 5. EVM Smart Contract Security

The `SupplyChainRegistry.sol` contract incorporates defense-in-depth protections:

1. **Role-Based Access Control (`AccessControl`)**:
   - Critical methods (`registerProduct`, `recordQualityCheck`, `shipProduct`, etc.) require explicit role membership or verifiable current ownership.
2. **State Transition Machine**:
   - State mutations verify that the product is in an authorized predecessor state before updating. For example, `receiveProduct` will revert with `INVALID_STATE_TRANSITION` if the product is not in `SHIPPED` or `IN_TRANSIT`.
3. **No Reentrancy Risk**:
   - The contract handles state and tracking data only. It does not accept or transfer ETH or ERC20 tokens, eliminating flash loan and reentrancy attack vectors.
4. **Collision & Duplicate Prevention**:
   - `_productCodeToId` mapping checks revert duplicate product registrations with `PRODUCT_ALREADY_EXISTS`.
5. **Signer Key Isolation**:
   - The backend signs blockchain transactions using an isolated deployer wallet. Private keys are never exposed in API responses or committed to source control.

---

## 6. Cryptographic Data Integrity

To guard against malicious or accidental modifications to the relational database:
1. When a product is created, its deterministic hash is calculated:
   $$\text{keccak256}(\text{productCode} \parallel \text{serialNumber} \parallel \text{manufacturerId} \parallel \text{name})$$
2. This hash is permanently anchored to the EVM contract.
3. On every traceability or public verification query, the backend recalculates the hash from the live PostgreSQL database row and compares it against `product.productHash` retrieved directly from the smart contract.
4. If a database record has been altered, the system flags the product with status `MISMATCH` and issues a security alert.

---

## 7. Declarative Audit Trail & Sanitization

1. **Automatic Interception**: The `@Audit()` decorator and `AuditInterceptor` capture every significant state change across the system.
2. **IP & Identity Capture**: Logs record the authenticated `userId`, `organizationId`, action name, target entity, client IP address (`x-forwarded-for` or socket IP), and timestamp.
3. **Credential Sanitization**: The interceptor sanitizes request bodies, stripping out sensitive keys (`password`, `confirmPassword`, `token`, `secret`, `authorization`) before persisting metadata to PostgreSQL.
4. **Immutability Policy**: Audit log records cannot be updated or deleted via any public or private API endpoint.

---

## 8. Public Verification Data Protection

The public verification endpoint (`GET /api/public/verify/:productCode`) is designed for unauthenticated consumer access while preventing data scraping or credential leaks:
- Returns only public marketing metadata: Name, Model, Category, Manufacturer Name, Lifecycle Status, and Milestones.
- Internal database UUIDs, user emails, personal names, internal billing addresses, and system logs are strictly excluded from the response DTO.

---

## 9. Input Validation & Defense-in-Depth

1. **Strict DTO Validation**:
   - NestJS uses a global `ValidationPipe` configured with:
     ```typescript
     new ValidationPipe({
       whitelist: true,
       forbidNonWhitelisted: true,
       transform: true,
     })
     ```
   - Unrecognized fields are rejected immediately with `400 Bad Request`.
2. **SQL Injection Prevention**:
   - All relational database queries use Prisma ORM parameterized queries.
3. **Cross-Origin Resource Sharing (CORS)**:
   - Configured with explicit origin allowances (`FRONTEND_URL`), restricting unauthorized origins from making credentialed requests.