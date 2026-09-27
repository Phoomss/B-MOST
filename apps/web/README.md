# B-MOST web app

Next.js 16 App Router frontend for product, quality, shipment, traceability, audit, and public verification views. The web app uses viem and MetaMask for Sepolia writes.

From the workspace root, see [development setup](../../docs/DEVELOPMENT.md) and [environment configuration](../../docs/ENVIRONMENT.md). The default local URL is `http://localhost:3000`.

```powershell
pnpm --filter @b-most/web test
```

The package `dev` script uses Unix-style `${PORT:-3000}` expansion. Use the documented Docker command on PowerShell, or a Unix-compatible shell for direct host web development. See [web routes](../../docs/UI.md).
