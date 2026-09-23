export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
            B
          </div>
          <div>
            <h1 className="font-semibold tracking-tight text-white">B-MOST Platform</h1>
            <p className="text-xs text-slate-400">Supply Chain Traceability</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Phase 1 Ready
          </span>
          <a
            href="http://localhost:4000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            API Docs &rarr;
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            Blockchain Multi-Organization Supply Chain
          </h2>
          <p className="text-slate-400 text-base md:text-lg">
            ระบบติดตามและตรวจสอบห่วงโซ่อุปทานหลายองค์กรด้วยเทคโนโลยีบล็อกเชน
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition">
            <div className="text-blue-400 font-semibold mb-1">Frontend Service</div>
            <div className="text-2xl font-bold mb-2">Next.js 16</div>
            <p className="text-sm text-slate-400 mb-4">
              Modern App Router with TypeScript and Tailwind CSS for responsive UI and QR verification.
            </p>
            <div className="text-xs font-mono text-slate-500">Port: 3000</div>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition">
            <div className="text-emerald-400 font-semibold mb-1">Backend Service</div>
            <div className="text-2xl font-bold mb-2">NestJS 11</div>
            <p className="text-sm text-slate-400 mb-4">
              Modular REST API architecture with OpenAPI/Swagger, JWT auth, and blockchain service hooks.
            </p>
            <div className="text-xs font-mono text-slate-500">Port: 4000 | {apiUrl}</div>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition">
            <div className="text-amber-400 font-semibold mb-1">Storage & Ledger</div>
            <div className="text-2xl font-bold mb-2">Postgres & EVM</div>
            <p className="text-sm text-slate-400 mb-4">
              PostgreSQL 16 for relational operational data with Docker Compose and EVM smart contracts.
            </p>
            <div className="text-xs font-mono text-slate-500">Docker: bmost-postgres</div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <a
            href="http://localhost:4000/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-600/30"
          >
            Check Backend Health API
          </a>
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500">
        B-MOST &mdash; Blockchain-Based Multi-Organization Supply Chain Traceability Platform
      </footer>
    </div>
  );
}
