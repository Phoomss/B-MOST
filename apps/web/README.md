<div align="center">
  <img src="public/brand_logo.png" alt="B-MOST Logo" width="380" />

  # @b-most/web
  ### B-MOST Supply Chain Traceability Frontend Application
  **เว็บแอปพลิเคชันระบบติดตามและตรวจสอบห่วงโซ่อุปทานด้วยเทคโนโลยีบล็อกเชน**

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-16.3-black?logo=next.js" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss" alt="Tailwind CSS v4" />
    <img src="https://img.shields.io/badge/EVM%20Client-Viem-yellow" alt="Viem" />
  </p>
</div>

---

## 📖 Overview

The **@b-most/web** package is the Next.js 16 App Router frontend for the B-MOST platform. It provides role-based interfaces for Manufacturers, Distributors, Warehouses, Retailers, Auditors, Super Admins, and Consumers.

### Key Capabilities
- **Role-Based Workflows**: Custom dashboard and task views per participant role.
- **EVM Blockchain Interactivity**: Direct MetaMask / browser wallet integration via `viem` to write tamper-proof supply chain milestones on Ethereum Sepolia.
- **Consumer Verification**: Instant QR code scanning & verification at `/verify/[code]` without requiring login.
- **Full Traceability Graph**: Interactive custody timeline and quality inspection history.

---

## 🚀 Getting Started

### Local Development
```bash
# From workspace root
pnpm --filter @b-most/web dev

# Direct in apps/web
pnpm dev
```

Application will run at `http://localhost:3000`.

### Environment Configuration
Ensure `.env.local` or environment variables contain:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a
NEXT_PUBLIC_BLOCKCHAIN_ABI_READY=true
```

### Running Tests
```bash
pnpm --filter @b-most/web test
```
