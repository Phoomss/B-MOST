# Getting Started

This guide provides step-by-step instructions to set up, build, and run the B-MOST supply chain platform on your local development machine.

---

## 1. Prerequisites

Before starting, ensure you have installed the following tools:

| Tool | Recommended Version | Verification Command | Notes |
| --- | --- | --- | --- |
| **Node.js** | `>= 20.18.0` | `node -v` | Active LTS recommended |
| **pnpm** | `11.1.1` (or `>= 10.x`) | `pnpm -v` | Declared in `package.json` packageManager |
| **Docker Engine & Compose** | Docker Desktop 4.x+ | `docker compose version` | Required for PostgreSQL & container workflow |
| **MetaMask Extension** | Latest | Browser extension | Needed for client-side signing on Sepolia |
| **Sepolia Test ETH** | > 0.05 SepoliaETH | MetaMask balance | Obtain from any public Sepolia faucet |

---

## 2. Initial Repository Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Phoomss/B-MOST.git
   cd B-MOST
   ```

2. **Install monorepo dependencies**:
   ```powershell
   pnpm install
   ```

3. **Configure Environment Variables**:
   Copy the master template to your root `.env` file:
   ```powershell
   Copy-Item .env.example .env
   ```
   Open `.env` in your editor and provide:
   - A valid Sepolia RPC endpoint (`BLOCKCHAIN_RPC_URL`).
   - A secure string for `JWT_SECRET`.
   - See [Environment Configuration](environment.md) for full variable descriptions.

---

## 3. Host Development Workflow

If you prefer running services directly on your host machine while using Docker only for PostgreSQL:

### Step 3.1: Start Local Database Container
```powershell
pnpm docker:db
```
This spins up PostgreSQL 16 on port `5433` (as mapped by `docker-compose.yml`).

### Step 3.2: Run Prisma Client Generation & Migrations
```powershell
pnpm db:generate
pnpm db:migrate
```

*(Optional)* Seed sample organizations, users, and demonstration products:
```powershell
pnpm db:seed
```

### Step 3.3: Launch Applications
Run both API and Web concurrently:
```powershell
pnpm dev
```
Or run individual applications in separate terminals:
- **Backend API**:
  ```powershell
  pnpm dev:api
  ```
  API will be live at `http://localhost:4000/api` with Swagger UI at `http://localhost:4000/api/docs`.
- **Frontend Web**:
  ```powershell
  pnpm dev:web
  ```
  Web will be live at `http://localhost:3000`.

> [!NOTE]
> On Windows PowerShell, the web app's `dev` script in `apps/web/package.json` uses `${PORT:-3000}`. If your shell does not evaluate Unix variable expansion, you can run `pnpm --filter @b-most/web exec next dev -p 3000` or use the Docker development path.

---

## 4. Verified Repository Scripts

All available commands are registered in the root `package.json`. Only use verified commands:

### Development & Execution
| Script | Command | Purpose |
| --- | --- | --- |
| `pnpm dev` | `pnpm --parallel run dev` | Runs both API and Web apps in parallel |
| `pnpm dev:api` | `pnpm --filter @b-most/api run start:dev` | Runs NestJS API in watch mode |
| `pnpm dev:web` | `pnpm --filter @b-most/web run dev` | Runs Next.js frontend in development mode |
| `pnpm build` | Parallel build | Compiles both API (`nest build`) and Web (`next build`) |

### Code Quality & Testing
| Script | Command | Purpose |
| --- | --- | --- |
| `pnpm lint` | `pnpm -r run lint` | Runs ESLint across all workspaces (*Note: API lint applies `--fix`*) |
| `pnpm typecheck` | Web & API typecheck | Validates TypeScript types across both web and api without emitting JS |
| `pnpm test` | `pnpm -r run test` | Runs Jest (API) and Vitest (Web) unit tests |
| `pnpm test:e2e` | NestJS e2e tests | Runs end-to-end API tests |
| `pnpm test:integration` | API integration test | Runs complete supply chain flow integration spec |

### Database Management
| Script | Command | Purpose |
| --- | --- | --- |
| `pnpm db:generate` | Prisma generate | Generates Prisma client types |
| `pnpm db:migrate` | Prisma migrate dev | Applies Prisma migrations against local database |
| `pnpm db:seed` | Seed script | Seeds initial organizations, roles, and users |
| `pnpm db:studio` | Prisma studio | Opens graphical web GUI for database inspection |

### Docker Operations
| Script | Command | Purpose |
| --- | --- | --- |
| `pnpm docker:dev` | Compose with dev override | Starts full stack with file watching and live sync |
| `pnpm docker:up` | `docker compose up -d` | Starts production container targets in detached mode |
| `pnpm docker:down` | `docker compose down` | Stops and removes container instances (preserves volume) |
| `pnpm docker:logs` | `docker compose logs -f` | Tails output logs from all running containers |
| `pnpm docker:db` | Compose postgres | Starts isolated PostgreSQL database container |

### Smart Contract Operations
| Script | Command | Purpose |
| --- | --- | --- |
| `pnpm blockchain:compile` | Hardhat compile | Compiles Solidity contracts under `packages/contracts` |
| `pnpm blockchain:test` | Hardhat test | Runs contract unit test suite |
| `pnpm blockchain:node` | Hardhat node | Starts standalone local EVM test node |
| `pnpm blockchain:deploy` | Hardhat run deploy | Deploys contracts to local node |
| `pnpm --filter @b-most/contracts abi:sync` | Sync ABI script | Updates shared ABI JSON from Hardhat artifacts |
