'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import {
  api,
  ProductItem,
  TraceabilityDetailResponse,
  TimelineEventItem,
  OwnershipHistoryItem,
} from '../../lib/api';

function TraceabilityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCode = searchParams.get('code') || searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState<string>(initialCode);
  const [activeIdentifier, setActiveIdentifier] = useState<string>(initialCode);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TraceabilityDetailResponse | null>(null);

  // Quick search product suggestions
  const [suggestions, setSuggestions] = useState<ProductItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);

  // Initial lookup if code param is present
  useEffect(() => {
    if (initialCode) {
      handleLookup(initialCode);
    }
  }, [initialCode]);

  // Load some products for quick selection
  useEffect(() => {
    let ignore = false;
    async function loadQuickProducts() {
      try {
        setLoadingSuggestions(true);
        const res = await api.traceability.search();
        if (!ignore && Array.isArray(res)) {
          setSuggestions(res.slice(0, 8));
        }
      } catch {
        // Silently ignore suggestion load failure
      } finally {
        if (!ignore) setLoadingSuggestions(false);
      }
    }
    loadQuickProducts();
    return () => {
      ignore = true;
    };
  }, []);

  const handleLookup = async (identifier: string) => {
    const clean = identifier.trim();
    if (!clean) return;

    try {
      setLoading(true);
      setError(null);
      setActiveIdentifier(clean);

      // Update URL without full reload
      router.push(`/traceability?code=${encodeURIComponent(clean)}`, { scroll: false });

      const res = await api.traceability.get(clean);
      setData(res);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to retrieve traceability record for this identifier';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      handleLookup(searchInput.trim());
    }
  };

  const formatTimestamp = (ts: string | number) => {
    if (!ts) return 'N/A';
    try {
      const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(ts);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'QUALITY_CHECKED':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'READY_TO_SHIP':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'RECEIVED':
      case 'STORED':
      case 'SOLD':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'RECALLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getTimelineBadgeColor = (color?: string) => {
    switch (color) {
      case 'emerald':
        return {
          dot: 'bg-emerald-500 ring-emerald-500/20',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'rose':
        return {
          dot: 'bg-rose-500 ring-rose-500/20',
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        };
      case 'amber':
        return {
          dot: 'bg-amber-500 ring-amber-500/20',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      case 'purple':
        return {
          dot: 'bg-purple-500 ring-purple-500/20',
          badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        };
      case 'blue':
      default:
        return {
          dot: 'bg-blue-500 ring-blue-500/20',
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        };
    }
  };

  return (
    <div className="min-vh-100 bg-slate-950 text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-widest text-blue-400 font-semibold">
                  Phase 10: Traceability
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  On-Chain Provenance
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Product Lifecycle Traceability
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                Cryptographically audited end-to-end provenance timeline, smart contract state
                synchronization, and multi-tenant custody history.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/products"
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                ← Back to Products
              </Link>
            </div>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8 backdrop-blur">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Product Code (e.g. PRD-APEX-001), Serial Number, or UUID..."
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Querying Registry...</span>
                </>
              ) : (
                <>
                  <span>Audit Traceability</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Quick Select Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 mr-1">Quick Select:</span>
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSearchInput(p.productCode);
                    handleLookup(p.productCode);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition font-mono ${
                    activeIdentifier === p.productCode
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {p.productCode}
                  <span className="ml-1.5 opacity-60 font-sans">({p.name})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <svg
              className="w-5 h-5 text-rose-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-semibold">Traceability Lookup Failed</p>
              <p className="mt-0.5 text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State when no query performed yet */}
        {!data && !loading && !error && (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">No Product Queried</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
              Enter a product code, serial number, or UUID above, or click one of the quick select tags to view complete lifecycle provenance.
            </p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-800 border-t-blue-500 mb-4" />
            <p className="text-slate-400 text-sm">
              Verifying smart contract state and querying event ledger...
            </p>
          </div>
        )}

        {/* Traceability Details View */}
        {data && !loading && (
          <div className="space-y-8">
            {/* Top Grid: Product Summary & Blockchain Verification Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product Info Card (2 Cols) */}
              <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-2xl font-bold text-white tracking-tight">
                        {data.product.name}
                      </h2>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getStatusBadge(
                          data.product.status,
                        )}`}
                      >
                        {data.product.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Code: <span className="text-slate-200">{data.product.productCode}</span> • SN: <span className="text-slate-200">{data.product.serialNumber}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500">Registry Timestamp</span>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">
                      {formatTimestamp(data.product.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                    <span className="text-xs text-slate-400 font-medium">Manufacturer</span>
                    <p className="text-sm font-semibold text-white mt-1">
                      {data.manufacturer?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Code: {data.manufacturer?.code} • {data.manufacturer?.type}
                    </p>
                    {data.manufacturer?.walletAddress && (
                      <p className="text-xs text-slate-400 font-mono truncate mt-1">
                        Wallet: {data.manufacturer.walletAddress}
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                    <span className="text-xs text-slate-400 font-medium">Current Custodian</span>
                    <p className="text-sm font-semibold text-emerald-400 mt-1">
                      {data.currentOwner?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Code: {data.currentOwner?.code} • {data.currentOwner?.type}
                    </p>
                    {data.currentOwner?.walletAddress && (
                      <p className="text-xs text-slate-400 font-mono truncate mt-1">
                        Wallet: {data.currentOwner.walletAddress}
                      </p>
                    )}
                  </div>
                </div>

                {data.product.description && (
                  <p className="text-xs text-slate-400 mt-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                    {data.product.description}
                  </p>
                )}
              </div>

              {/* Authoritative Blockchain Card (1 Col) */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Smart Contract State
                    </span>
                    {data.blockchainVerification.verified && data.blockchainVerification.hashMatch ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Hash Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                        Unconfirmed
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500">Contract Address</span>
                      <p className="font-mono text-slate-300 truncate mt-0.5">
                        {data.blockchainVerification.contractAddress || 'Local Hardhat Node'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500">On-Chain Token ID</span>
                        <p className="font-mono text-slate-200 mt-0.5">
                          {data.blockchainVerification.onChainProductId !== null
                            ? `#${data.blockchainVerification.onChainProductId}`
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Total Contract Events</span>
                        <p className="font-mono text-slate-200 mt-0.5">
                          {data.blockchainVerification.totalOnChainEvents} records
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500">Keccak-256 Digest (Deterministic)</span>
                      <p className="font-mono text-[11px] text-slate-400 break-all bg-slate-950 p-2 rounded-lg border border-slate-800/80 mt-1">
                        {data.blockchainVerification.computedHash || data.blockchainVerification.productHash || 'None'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        data.blockchainVerification.hashMatch ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    <span>
                      {data.blockchainVerification.hashMatch
                        ? 'Authoritative state matches off-chain hash'
                        : 'On-chain hash synchronization pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ownership Provenance Chain */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Chain of Custody & Ownership Provenance
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable transfer of title across supply chain organizations
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {data.ownershipHistory.length} Ownership Handshakes
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.ownershipHistory.map((owner, idx) => (
                  <div
                    key={owner.organizationId + idx}
                    className={`relative p-4 rounded-xl border transition ${
                      owner.isCurrentOwner
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                        : 'bg-slate-950/60 border-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Step #{idx + 1}
                      </span>
                      {owner.isCurrentOwner ? (
                        <span className="text-[11px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                          Active Custodian
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Historical Title</span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white truncate">
                      {owner.organizationName}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {owner.organizationCode} • {owner.organizationType}
                    </p>

                    <p className="text-xs text-slate-300 mt-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                      {owner.eventDescription}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400">
                      <span>Acquired: </span>
                      <span className="text-slate-300 font-mono">
                        {formatTimestamp(owner.acquiredAt)}
                      </span>
                    </div>

                    {owner.txHash && (
                      <p className="text-[10px] text-slate-500 font-mono truncate mt-1">
                        Tx: {owner.txHash}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chronological Event Timeline */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Chronological Lifecycle Timeline
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Unified event stream indexed across product registration, QC inspections, shipments, and delivery receipts
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {data.events.length} Audited Events
                </span>
              </div>

              {/* Timeline Tree */}
              <div className="relative pl-6 sm:pl-8 before:absolute before:inset-0 before:left-3 sm:before:left-4 before:w-0.5 before:bg-slate-800">
                {data.events.map((evt: TimelineEventItem, idx: number) => {
                  const colors = getTimelineBadgeColor(evt.badgeColor);
                  return (
                    <div key={evt.id || idx} className="relative mb-8 last:mb-2 group">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-1 h-3.5 w-3.5 rounded-full ring-4 ${colors.dot} transition group-hover:scale-125`}
                      />

                      {/* Content Card */}
                      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 sm:p-5 hover:border-slate-700 transition">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${colors.badge}`}
                            >
                              {evt.eventType.replace(/_/g, ' ')}
                            </span>
                            <h4 className="text-sm font-semibold text-white">
                              {evt.title}
                            </h4>
                          </div>

                          <span className="text-xs text-slate-400 font-mono">
                            {formatTimestamp(evt.timestamp)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {evt.description}
                        </p>

                        <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Actor:</span>
                            <span className="font-semibold text-slate-200">
                              {evt.actor}
                            </span>
                            {evt.actorRole && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
                                {evt.actorRole}
                              </span>
                            )}
                          </div>

                          {evt.blockchainTxHash && (
                            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                              <span className="text-slate-500">Tx:</span>
                              <span className="text-blue-400 truncate max-w-[140px] sm:max-w-[200px]">
                                {evt.blockchainTxHash}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TraceabilityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-vh-100 bg-slate-950 text-slate-100 p-8 text-center flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-blue-500" />
        </div>
      }
    >
      <TraceabilityContent />
    </Suspense>
  );
}
