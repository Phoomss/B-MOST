'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { api, ProductItem } from '../../lib/api';

const STATUS_OPTIONS = [
  'ALL',
  'REGISTERED',
  'QUALITY_CHECKED',
  'READY_TO_SHIP',
  'SHIPPED',
  'IN_TRANSIT',
  'RECEIVED',
  'STORED',
  'SOLD',
  'RECALLED',
];

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.products.list({
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: 10,
      });
      setProducts(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalCount(res.meta?.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load products';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await api.products.list({
          search: search.trim() || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          page,
          limit: 10,
        });
        if (!ignore) {
          setProducts(res.data || []);
          setTotalPages(res.meta?.totalPages || 1);
          setTotalCount(res.meta?.total || 0);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load products';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [search, statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'QUALITY_CHECKED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'READY_TO_SHIP':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'RECEIVED':
      case 'STORED':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'SOLD':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'RECALLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Product Registry
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {totalCount} Total
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage manufactured products, compute cryptographic hashes, and register onto the blockchain.
            </p>
          </div>
          <Link
            href="/products/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 transition self-start md:self-auto"
          >
            <span>+</span> Create New Product
          </Link>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, serial, or name..."
              className="bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Table / Cards */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => fetchProducts()}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded text-xs transition"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-slate-400">Loading products from ledger and database...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="border border-dashed border-slate-800 bg-slate-950/20 rounded-xl p-12 text-center">
            <div className="text-slate-600 text-4xl mb-3">📦</div>
            <h3 className="text-base font-semibold text-white mb-1">No products found</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Create your first product to begin tracking its provenance and immutably recording events on the smart contract.
            </p>
            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
            >
              + Create Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Product Code</th>
                  <th scope="col" className="px-6 py-3.5">Product Name</th>
                  <th scope="col" className="px-6 py-3.5">Manufacturer</th>
                  <th scope="col" className="px-6 py-3.5">Current Owner</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5">Blockchain</th>
                  <th scope="col" className="px-6 py-3.5">Created</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-6 py-4 font-mono font-medium text-white">
                      <Link
                        href={`/products/${p.id}`}
                        className="text-blue-400 hover:text-blue-300 transition"
                      >
                        {p.productCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">
                      <div>{p.name}</div>
                      {p.category && (
                        <div className="text-xs text-slate-500">{p.category}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {p.manufacturer?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {p.currentOwner?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                          p.status,
                        )}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {p.blockchainProductId ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          On-Chain #{p.blockchainProductId}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          Pending Ledger
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/products/${p.id}`}
                        className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 text-sm text-slate-400">
            <div>
              Showing page <span className="font-semibold text-slate-200">{page}</span> of{' '}
              <span className="font-semibold text-slate-200">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-200 transition text-xs"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-200 transition text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
