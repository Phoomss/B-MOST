<div align="center">
  <img src="../../assets/brand_logo.png" alt="B-MOST Logo" width="380" />

  ### B-MOST Backend REST API & Blockchain Sync Engine
  **ระบบบริการหลังบ้านและเชื่อมโยงบล็อกเชน (NestJS 11 + Prisma ORM)**

  <p align="center">
    <img src="https://img.shields.io/badge/NestJS-11.0-e0234e?logo=nestjs" alt="NestJS" />
    <img src="https://img.shields.io/badge/Prisma-6.5-2d3748?logo=prisma" alt="Prisma ORM" />
    <img src="https://img.shields.io/badge/Database-PostgreSQL%2016-336791?logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Swagger-OpenAPI%203.0-85ea2d?logo=swagger" alt="Swagger" />
  </p>
</div>

---

## 📖 Overview

The **@b-most/api** service is the central business logic and data indexing server for B-MOST. It provides:
- **Authentication & RBAC**: JWT-based session tokens with role validation across 6 distinct supply-chain roles.
- **Supply Chain Management**: Endpoints for organizations, products, quality inspections, custody transfers, and shipments.
- **Blockchain Event Indexing**: Background synchronization of EVM events from `SupplyChainRegistry.sol` to PostgreSQL.
- **Cryptographic Audit Trail**: Automatic Keccak-256 hash generation for every supply-chain milestone.

---

## 🚀 Getting Started

### Local Development
```bash
# From workspace root
pnpm --filter @b-most/api start:dev

# Direct in apps/api
pnpm start:dev
```

- API Server: `http://localhost:4000/api`
- Interactive Swagger UI: `http://localhost:4000/api/docs`

### Database Migrations & Seeding
```bash
pnpm --filter @b-most/api prisma migrate dev
pnpm --filter @b-most/api db:seed
```

### Running Tests
```bash
pnpm --filter @b-most/api test
```
