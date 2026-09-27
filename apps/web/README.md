# B-MOST Web Application

Next.js 16 App Router frontend for product management, quality inspections, shipment dispatch, traceability, audit logs, and public verification views. The web app integrates with viem and MetaMask for client-side Sepolia writes.

From the workspace root, see [Getting Started](../../docs/development/getting-started.md) and [Environment Configuration](../../docs/development/environment.md). The default local URL is `http://localhost:3000`.

```powershell
pnpm --filter @b-most/web test
```

The package `dev` script uses Unix-style `${PORT:-3000}` expansion. Use the documented Docker command on PowerShell, or a Unix-compatible shell for direct host web development. See the [Web Route Hierarchy](../../docs/architecture/system-architecture.md#4-frontend-route-structure).
