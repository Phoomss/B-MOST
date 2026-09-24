import Link from 'next/link';

export function Navbar() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            B
          </div>
          <div>
            <span className="font-semibold tracking-tight text-white text-sm">B-MOST</span>
            <span className="hidden sm:inline-block ml-2 text-xs text-slate-400 font-normal border-l border-slate-700 pl-2">
              Supply Chain Platform
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
          >
            Overview
          </Link>
          <Link
            href="/products"
            className="px-3 py-1.5 rounded-md text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition"
          >
            Products
          </Link>
          <Link
            href="/shipments"
            className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
          >
            Shipments
          </Link>
          <Link
            href="/quality"
            className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
          >
            Quality
          </Link>
          <Link
            href="/traceability"
            className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
          >
            Traceability
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/products/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
        >
          + Create Product
        </Link>
        <a
          href="http://localhost:4000/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-slate-300 font-mono transition"
        >
          API Docs &rarr;
        </a>
      </div>
    </header>
  );
}
