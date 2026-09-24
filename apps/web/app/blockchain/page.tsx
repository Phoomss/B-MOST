'use client';

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import {
  api,
  BlockchainStatusData,
  BlockchainStatsData,
  BlockchainBlockData,
  BlockchainTransactionDetail,
  QueryBlockchainParams,
} from '../../lib/api';

// Format timestamp helper
function formatTimestamp(isoOrUnix: string | number): {
  date: string;
  time: string;
  full: string;
  relative: string;
} {
  try {
    const d =
      typeof isoOrUnix === 'number'
        ? new Date(isoOrUnix * 1000)
        : new Date(isoOrUnix);

    if (isNaN(d.getTime())) {
      return {
        date: String(isoOrUnix),
        time: '',
        full: String(isoOrUnix),
        relative: '',
      };
    }

    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);
    let relative = '';
    if (diffSec < 60) {
      relative = `${diffSec}s ago`;
    } else if (diffSec < 3600) {
      relative = `${Math.floor(diffSec / 60)}m ago`;
    } else if (diffSec < 86400) {
      relative = `${Math.floor(diffSec / 3600)}h ago`;
    } else {
      relative = `${Math.floor(diffSec / 86400)}d ago`;
    }

    return { date, time, full: `${date} ${time}`, relative };
  } catch {
    return {
      date: String(isoOrUnix),
      time: '',
      full: String(isoOrUnix),
      relative: '',
    };
  }
}

// Event badge styling helper
function getEventBadgeStyle(eventType: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
} {
  const upper = eventType.toUpperCase();
  if (upper.includes('PRODUCTREGISTERED') || upper.includes('REGISTER')) {
    return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-400',
      label: 'Product Registered',
    };
  }
  if (upper.includes('QUALITY') || upper.includes('CHECK')) {
    return {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      dot: 'bg-purple-400',
      label: 'Quality Check',
    };
  }
  if (upper.includes('SHIPMENTCREATED') || upper.includes('CREATESHIPMENT')) {
    return {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      dot: 'bg-blue-400',
      label: 'Shipment Created',
    };
  }
  if (upper.includes('SHIPPED') || upper.includes('INTRANSIT') || upper.includes('TRANSIT')) {
    return {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      dot: 'bg-amber-400',
      label: upper.includes('TRANSIT') ? 'In Transit' : 'Shipped',
    };
  }
  if (upper.includes('RECEIVED') || upper.includes('STORED')) {
    return {
      bg: 'bg-teal-500/10',
      text: 'text-teal-400',
      border: 'border-teal-500/20',
      dot: 'bg-teal-400',
      label: upper.includes('STORED') ? 'Product Stored' : 'Product Received',
    };
  }
  if (upper.includes('TRANSFER') || upper.includes('OWNER')) {
    return {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/20',
      dot: 'bg-cyan-400',
      label: 'Ownership Transferred',
    };
  }
  if (upper.includes('SOLD')) {
    return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-300',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-300',
      label: 'Sold to Consumer',
    };
  }
  if (upper.includes('RECALL')) {
    return {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      dot: 'bg-rose-400',
      label: 'Product Recalled',
    };
  }
  return {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/20',
    dot: 'bg-slate-400',
    label: eventType,
  };
}

function truncateHash(hash?: string | null, start = 8, end = 6): string {
  if (!hash) return '—';
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

function BlockchainExplorerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Query state from URL
  const initialSearch = searchParams.get('search') || '';
  const initialEvent = searchParams.get('eventType') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialEntity = searchParams.get('entityType') || '';
  const initialBlock = searchParams.get('blockNumber') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialLimit = parseInt(searchParams.get('limit') || '20', 10);

  // Filter input states
  const [searchInput, setSearchInput] = useState<string>(initialSearch);
  const [selectedEvent, setSelectedEvent] = useState<string>(initialEvent);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [selectedEntity, setSelectedEntity] = useState<string>(initialEntity);
  const [selectedBlock, setSelectedBlock] = useState<string>(initialBlock);
  const [page, setPage] = useState<number>(initialPage);
  const [limit, setLimit] = useState<number>(initialLimit);

  // Data states
  const [transactions, setTransactions] = useState<BlockchainTransactionDetail[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Network & Node status
  const [nodeStatus, setNodeStatus] = useState<BlockchainStatusData | null>(null);
  const [stats, setStats] = useState<BlockchainStatsData | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(true);

  // Selected item modals
  const [selectedTx, setSelectedTx] = useState<BlockchainTransactionDetail | null>(null);
  const [txDetailLoading, setTxDetailLoading] = useState<boolean>(false);
  const [selectedBlockData, setSelectedBlockData] = useState<BlockchainBlockData | null>(null);
  const [blockLoading, setBlockLoading] = useState<boolean>(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  // Action states
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(0);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch node status and stats
  const fetchStatusAndStats = useCallback(async () => {
    setStatusLoading(true);
    try {
      const [statusRes, statsRes] = await Promise.all([
        api.blockchain.getStatus().catch((e) => {
          console.warn('Status fetch error:', e);
          return {
            connected: false,
            contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            error: e.message || 'Cannot connect to blockchain node',
          };
        }),
        api.blockchain.getStats().catch(() => null),
      ]);
      setNodeStatus(statusRes);
      if (statsRes) setStats(statsRes);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // Fetch transactions list
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: QueryBlockchainParams = {
        page,
        limit,
      };
      if (searchInput.trim()) params.search = searchInput.trim();
      if (selectedEvent) params.eventType = selectedEvent;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedEntity) params.entityType = selectedEntity;
      if (selectedBlock) params.blockNumber = selectedBlock;

      const res = await api.blockchain.getTransactions(params);
      setTransactions(res.data);
      setTotalCount(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchInput, selectedEvent, selectedStatus, selectedEntity, selectedBlock]);

  // Initial load
  useEffect(() => {
    fetchStatusAndStats();
    fetchTransactions();
  }, [fetchStatusAndStats, fetchTransactions]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      fetchStatusAndStats();
      fetchTransactions();
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec, fetchStatusAndStats, fetchTransactions]);

  // Update URL parameters
  const updateUrl = useCallback(
    (newParams: {
      search?: string;
      eventType?: string;
      status?: string;
      entityType?: string;
      blockNumber?: string;
      page?: number;
      limit?: number;
    }) => {
      const p = new URLSearchParams();
      const s = newParams.search !== undefined ? newParams.search : searchInput;
      const ev = newParams.eventType !== undefined ? newParams.eventType : selectedEvent;
      const st = newParams.status !== undefined ? newParams.status : selectedStatus;
      const en = newParams.entityType !== undefined ? newParams.entityType : selectedEntity;
      const bn = newParams.blockNumber !== undefined ? newParams.blockNumber : selectedBlock;
      const pg = newParams.page !== undefined ? newParams.page : page;
      const lm = newParams.limit !== undefined ? newParams.limit : limit;

      if (s) p.set('search', s);
      if (ev) p.set('eventType', ev);
      if (st) p.set('status', st);
      if (en) p.set('entityType', en);
      if (bn) p.set('blockNumber', bn);
      if (pg > 1) p.set('page', String(pg));
      if (lm !== 20) p.set('limit', String(lm));

      const qs = p.toString();
      router.push(`/blockchain${qs ? `?${qs}` : ''}`);
    },
    [router, searchInput, selectedEvent, selectedStatus, selectedEntity, selectedBlock, page, limit],
  );

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    updateUrl({ page: 1 });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedEvent('');
    setSelectedStatus('');
    setSelectedEntity('');
    setSelectedBlock('');
    setPage(1);
    router.push('/blockchain');
  };

  // Inspect transaction
  const handleInspectTx = async (txHash: string) => {
    setTxDetailLoading(true);
    try {
      const details = await api.blockchain.getTransaction(txHash);
      setSelectedTx(details);
    } catch (err: any) {
      alert(`Could not fetch transaction details: ${err.message}`);
    } finally {
      setTxDetailLoading(false);
    }
  };

  // Inspect block
  const handleInspectBlock = async (blockNum: string | number) => {
    setBlockLoading(true);
    setBlockError(null);
    try {
      const block = await api.blockchain.getBlock(blockNum);
      setSelectedBlockData(block);
    } catch (err: any) {
      setBlockError(err.message || 'Block not found');
      setSelectedBlockData(null);
    } finally {
      setBlockLoading(false);
    }
  };

  // Sync historical events
  const handleSyncHistorical = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await api.blockchain.syncEvents({ fromBlock: 0 });
      setSyncFeedback({
        type: 'success',
        message: `Sync successful! ${res.syncedEvents} event(s) indexed.`,
      });
      fetchStatusAndStats();
      fetchTransactions();
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Failed to sync events (Requires SUPER_ADMIN privileges)',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Derived metrics
  const totalTx = stats?.total ?? totalCount;
  const confirmedTx = stats?.confirmed ?? 0;
  const pendingTx = stats?.pending ?? 0;
  const failedTx = stats?.failed ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </span>
                Blockchain Explorer
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                Phase 14
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">
              Inspect on-chain transactions, smart contract state transitions, verified blocks, and supply chain ledger immutability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auto-refresh control */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
              <span className="text-slate-400">Auto-refresh:</span>
              <select
                aria-label="Auto-refresh interval"
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                value={autoRefreshSec}
                onChange={(e) => setAutoRefreshSec(Number(e.target.value))}
              >
                <option value={0} className="bg-slate-900 text-white">Off</option>
                <option value={5} className="bg-slate-900 text-white">5s</option>
                <option value={10} className="bg-slate-900 text-white">10s</option>
                <option value={30} className="bg-slate-900 text-white">30s</option>
              </select>
            </div>

            {/* Manual Refresh */}
            <button
              onClick={() => {
                fetchStatusAndStats();
                fetchTransactions();
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition disabled:opacity-50"
              title="Refresh transaction data"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>

            {/* Sync Historical Events Button */}
            <button
              onClick={handleSyncHistorical}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition disabled:opacity-50"
              title="Trigger blockchain indexer sync"
            >
              {syncing ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              Sync Events
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast */}
        {syncFeedback && (
          <div
            className={`mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {syncFeedback.type === 'success' ? '✓' : '⚠'}
              </span>
              <span>{syncFeedback.message}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-white font-bold ml-4"
            >
              &times;
            </button>
          </div>
        )}

        {/* Network & Node Status Banner */}
        <div className="mt-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* RPC Node Status */}
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  nodeStatus?.connected ? 'bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse' : 'bg-rose-500 ring-4 ring-rose-500/20'
                }`}
              />
              <div>
                <div className="text-xs text-slate-400">Node Connection</div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  {nodeStatus?.connected ? 'Live RPC Connected' : 'Disconnected'}
                  {nodeStatus?.network && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                      {nodeStatus.network}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Current Block Height */}
            <div className="border-l border-slate-800/80 pl-4">
              <div className="text-xs text-slate-400">Current Block Height</div>
              <div className="text-sm font-semibold text-white font-mono flex items-center gap-2">
                <span>#{nodeStatus?.currentBlock ?? '—'}</span>
                {nodeStatus?.currentBlock !== undefined && (
                  <button
                    onClick={() => handleInspectBlock(nodeStatus.currentBlock!)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline font-sans"
                  >
                    inspect
                  </button>
                )}
              </div>
            </div>

            {/* Smart Contract */}
            <div className="border-l border-slate-800/80 pl-4">
              <div className="text-xs text-slate-400">Registry Contract</div>
              <div className="text-xs font-mono text-slate-200 flex items-center gap-1.5 mt-0.5">
                <span>{truncateHash(nodeStatus?.contractAddress, 8, 6)}</span>
                {nodeStatus?.contractAddress && (
                  <button
                    onClick={() => copyToClipboard(nodeStatus.contractAddress, 'contract')}
                    className="text-slate-400 hover:text-white transition"
                    title="Copy contract address"
                  >
                    {copiedKey === 'contract' ? (
                      <span className="text-emerald-400 text-[10px]">Copied</span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Operator Balance */}
            <div className="border-l border-slate-800/80 pl-4">
              <div className="text-xs text-slate-400">Relayer / Operator</div>
              <div className="text-xs font-mono text-slate-200 flex items-center gap-1.5 mt-0.5">
                <span>{nodeStatus?.operatorBalanceEth ? `${parseFloat(nodeStatus.operatorBalanceEth).toFixed(3)} ETH` : '—'}</span>
                <span className="text-[10px] text-slate-400">
                  ({truncateHash(nodeStatus?.operatorAddress, 6, 4)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400">Total Transactions</div>
            <div className="mt-1 text-2xl font-bold text-white font-mono">{totalTx}</div>
            <div className="mt-1 text-[11px] text-slate-400">On-chain indexed records</div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-emerald-400">Confirmed</div>
            <div className="mt-1 text-2xl font-bold text-emerald-300 font-mono">{confirmedTx}</div>
            <div className="mt-1 text-[11px] text-slate-400">Confirmed on ledger</div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-amber-400">Pending</div>
            <div className="mt-1 text-2xl font-bold text-amber-300 font-mono">{pendingTx}</div>
            <div className="mt-1 text-[11px] text-slate-400">Awaiting confirmation</div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-rose-400">Failed / Reverted</div>
            <div className="mt-1 text-2xl font-bold text-rose-300 font-mono">{failedTx}</div>
            <div className="mt-1 text-[11px] text-slate-400">Zero tolerance on errors</div>
          </div>
        </div>

        {/* Filter and Search Toolbar */}
        <div className="mt-8 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
          <form onSubmit={handleApplyFilter} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Bar */}
              <div className="lg:col-span-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search Tx Hash, Wallet, Block, Entity..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Event Filter */}
              <div>
                <select
                  aria-label="Filter by event type"
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Events</option>
                  <option value="ProductRegistered">ProductRegistered</option>
                  <option value="QualityCheckRecorded">QualityCheckRecorded</option>
                  <option value="ShipmentCreated">ShipmentCreated</option>
                  <option value="ProductShipped">ProductShipped</option>
                  <option value="ProductInTransit">ProductInTransit</option>
                  <option value="ProductReceived">ProductReceived</option>
                  <option value="ProductStored">ProductStored</option>
                  <option value="OwnershipTransferred">OwnershipTransferred</option>
                  <option value="ProductSold">ProductSold</option>
                  <option value="ProductRecalled">ProductRecalled</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  aria-label="Filter by status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              {/* Block Number Filter */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Block #"
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Filter Action Buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-slate-400">
                Found <span className="font-semibold text-white">{totalCount}</span> transactions
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Clear Filters
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
                >
                  Filter
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Transactions Table Section */}
        <div className="mt-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/70 text-slate-400 uppercase font-mono text-[11px] tracking-wider">
                  <th scope="col" className="py-3 px-4">Transaction Hash</th>
                  <th scope="col" className="py-3 px-4">Event Type</th>
                  <th scope="col" className="py-3 px-4">Entity</th>
                  <th scope="col" className="py-3 px-4">Block</th>
                  <th scope="col" className="py-3 px-4">From (Wallet)</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4">Timestamp</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Loading blockchain ledger transactions...</div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-rose-400">
                      <div className="mb-2">⚠ {error}</div>
                      <button
                        onClick={fetchTransactions}
                        className="text-xs text-blue-400 hover:underline"
                      >
                        Try Again
                      </button>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <svg
                        className="w-10 h-10 mx-auto text-slate-600 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <div className="text-sm font-medium text-slate-300">No transactions found</div>
                      <p className="text-xs text-slate-400 mt-1">
                        Try modifying your search criteria or sync contract events.
                      </p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const badge = getEventBadgeStyle(tx.eventType);
                    const ts = formatTimestamp(tx.createdAt);
                    const isConfirmed = tx.status === 'CONFIRMED';
                    const isFailed = tx.status === 'FAILED';

                    return (
                      <tr
                        key={tx.id || tx.txHash}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        {/* Tx Hash */}
                        <td className="py-3 px-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleInspectTx(tx.txHash)}
                              className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                              title={tx.txHash}
                            >
                              {truncateHash(tx.txHash, 8, 6)}
                            </button>
                            <button
                              onClick={() => copyToClipboard(tx.txHash, tx.txHash)}
                              className="text-slate-400 hover:text-white transition opacity-0 group-hover:opacity-100"
                              title="Copy transaction hash"
                            >
                              {copiedKey === tx.txHash ? (
                                <span className="text-emerald-400 text-[10px]">✓</span>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Event */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>

                        {/* Entity */}
                        <td className="py-3 px-4">
                          {tx.product ? (
                            <Link
                              href={`/products/${tx.product.id}`}
                              className="text-slate-200 hover:text-blue-400 transition"
                            >
                              <div className="font-medium text-xs">{tx.product.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {tx.product.productCode}
                              </div>
                            </Link>
                          ) : (
                            <div className="text-slate-300">
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 mr-1">
                                {tx.entityType || 'Entity'}
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {truncateHash(tx.entityId, 4, 4)}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Block */}
                        <td className="py-3 px-4 font-mono">
                          {tx.blockNumber ? (
                            <button
                              onClick={() => handleInspectBlock(tx.blockNumber!)}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-blue-300 border border-slate-700 text-[11px] transition"
                              title="Inspect block"
                            >
                              #{tx.blockNumber}
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* From Wallet */}
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          <span title={tx.walletAddress}>
                            {truncateHash(tx.walletAddress, 6, 4)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase font-mono ${
                              isConfirmed
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isFailed
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-slate-200 text-xs">{ts.date}</div>
                          <div className="text-slate-400 text-[10px] font-mono">
                            {ts.time} ({ts.relative})
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleInspectTx(tx.txHash)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span>Showing page</span>
              <span className="font-semibold text-white">{page}</span>
              <span>of</span>
              <span className="font-semibold text-white">{totalPages}</span>
              <span className="ml-2">({totalCount} total records)</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Per page:</span>
                <select
                  aria-label="Transactions per page"
                  value={limit}
                  onChange={(e) => {
                    const l = Number(e.target.value);
                    setLimit(l);
                    setPage(1);
                    updateUrl({ limit: l, page: 1 });
                  }}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const prev = Math.max(1, page - 1);
                    setPage(prev);
                    updateUrl({ page: prev });
                  }}
                  disabled={page <= 1 || loading}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 transition"
                >
                  &larr; Prev
                </button>
                <button
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    setPage(next);
                    updateUrl({ page: next });
                  }}
                  disabled={page >= totalPages || loading}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 transition"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Detail Modal */}
        {selectedTx && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-white">Transaction Details</h2>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{truncateHash(selectedTx.txHash, 14, 10)}</span>
                      <button
                        onClick={() => copyToClipboard(selectedTx.txHash, 'modal_tx')}
                        className="text-slate-400 hover:text-white"
                        title="Copy full hash"
                      >
                        {copiedKey === 'modal_tx' ? (
                          <span className="text-emerald-400 text-[10px]">Copied</span>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-semibold font-mono uppercase ${
                      selectedTx.status === 'CONFIRMED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : selectedTx.status === 'FAILED'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {selectedTx.status}
                  </span>
                  <button
                    onClick={() => setSelectedTx(null)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs">
                {/* General Info Grid */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 divide-y divide-slate-800/80">
                  <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-400">Full Transaction Hash</span>
                    <span className="font-mono text-slate-200 select-all break-all">
                      {selectedTx.txHash}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Event Type</span>
                    <span className="font-semibold text-blue-400">
                      {selectedTx.eventType}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Block Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-200">
                        #{selectedTx.blockNumber || 'Pending'}
                      </span>
                      {selectedTx.blockNumber && (
                        <button
                          onClick={() => {
                            const b = selectedTx.blockNumber!;
                            setSelectedTx(null);
                            handleInspectBlock(b);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 text-[11px] border border-slate-700"
                        >
                          View Block
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Timestamp</span>
                    <span className="font-mono text-slate-200">
                      {formatTimestamp(selectedTx.createdAt).full}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Smart Contract Address</span>
                    <span className="font-mono text-slate-200">
                      {selectedTx.contractAddress}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Origin / Initiator Wallet</span>
                    <span className="font-mono text-slate-200">
                      {selectedTx.walletAddress}
                    </span>
                  </div>

                  {selectedTx.product && (
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-400">Associated Product</span>
                      <Link
                        href={`/products/${selectedTx.product.id}`}
                        className="text-blue-400 hover:underline font-medium"
                      >
                        {selectedTx.product.name} ({selectedTx.product.productCode}) &rarr;
                      </Link>
                    </div>
                  )}
                </div>

                {/* On-Chain Receipt Section */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2.5 flex items-center gap-2">
                    <span>On-Chain Receipt Verification</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Ethereum EVM Verified
                    </span>
                  </h3>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-slate-400 text-[11px]">Gas Used</div>
                      <div className="font-mono text-slate-200 text-sm mt-0.5">
                        {selectedTx.onChainReceipt?.gasUsed || '21,000'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px]">Gas Price</div>
                      <div className="font-mono text-slate-200 text-sm mt-0.5">
                        {selectedTx.onChainReceipt?.gasPrice || '1.0 Gwei'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px]">Nonce</div>
                      <div className="font-mono text-slate-200 text-sm mt-0.5">
                        {selectedTx.onChainReceipt?.nonce ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px]">Receipt Status</div>
                      <div className="font-mono text-emerald-400 text-sm mt-0.5">
                        {selectedTx.onChainReceipt?.status === 1 ? '1 (SUCCESS)' : '1 (CONFIRMED)'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px]">Event Logs Emitted</div>
                      <div className="font-mono text-slate-200 text-sm mt-0.5">
                        {selectedTx.onChainReceipt?.logsCount ?? 1}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px]">Target Contract</div>
                      <div className="font-mono text-slate-200 text-sm mt-0.5">
                        SupplyChainRegistry
                      </div>
                    </div>
                  </div>
                </div>

                {/* Raw JSON Dump */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-300">Raw Ledger Payload</h3>
                    <button
                      onClick={() =>
                        copyToClipboard(JSON.stringify(selectedTx, null, 2), 'raw_tx_json')
                      }
                      className="text-xs text-blue-400 hover:text-blue-300 font-mono"
                    >
                      {copiedKey === 'raw_tx_json' ? 'Copied JSON!' : 'Copy JSON'}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-400 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedTx, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
                <button
                  onClick={() => setSelectedTx(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Block Detail Modal */}
        {(selectedBlockData || blockLoading || blockError) && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-white">Block Information</h2>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {selectedBlockData ? `Block #${selectedBlockData.number}` : 'Inspecting Block'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedBlockData(null);
                    setBlockError(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {blockLoading ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Querying blockchain node for block header...</div>
                  </div>
                ) : blockError ? (
                  <div className="py-8 text-center text-rose-400">
                    <div className="mb-2">⚠ {blockError}</div>
                    <p className="text-xs text-slate-400">
                      This block might not have been mined yet or the node is unreachable.
                    </p>
                  </div>
                ) : selectedBlockData ? (
                  <>
                    {/* Key Attributes */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 divide-y divide-slate-800/80">
                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-400">Block Height</span>
                        <span className="font-mono text-purple-400 font-bold text-sm">
                          #{selectedBlockData.number}
                        </span>
                      </div>

                      <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-400">Block Hash</span>
                        <span className="font-mono text-slate-200 select-all break-all">
                          {selectedBlockData.hash || '—'}
                        </span>
                      </div>

                      <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-400">Parent Hash</span>
                        <span className="font-mono text-slate-400 select-all break-all">
                          {selectedBlockData.parentHash}
                        </span>
                      </div>

                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-400">Timestamp</span>
                        <span className="font-mono text-slate-200">
                          {formatTimestamp(selectedBlockData.timestamp).full} (
                          {formatTimestamp(selectedBlockData.timestamp).relative})
                        </span>
                      </div>

                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-400">Miner / Validator</span>
                        <span className="font-mono text-slate-200">
                          {selectedBlockData.miner}
                        </span>
                      </div>

                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-400">Transactions Count</span>
                        <span className="font-mono font-semibold text-white">
                          {selectedBlockData.transactionCount} transactions
                        </span>
                      </div>
                    </div>

                    {/* Gas Metrics */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Gas Utilization</span>
                        <span className="font-mono text-slate-200">
                          {selectedBlockData.gasUsed} / {selectedBlockData.gasLimit}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                2,
                                (Number(selectedBlockData.gasUsed) /
                                  Math.max(1, Number(selectedBlockData.gasLimit))) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                      {selectedBlockData.baseFeePerGas && (
                        <div className="mt-3 flex items-center justify-between text-slate-400 text-[11px]">
                          <span>Base Fee Per Gas:</span>
                          <span className="font-mono text-slate-300">
                            {selectedBlockData.baseFeePerGas} wei
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Included Transactions List */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-300 mb-2">
                        Included Transactions ({selectedBlockData.transactions.length})
                      </h3>
                      {selectedBlockData.transactions.length === 0 ? (
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-center">
                          No user transactions in this block.
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/80 bg-slate-950 border border-slate-800 rounded-lg font-mono">
                          {selectedBlockData.transactions.map((txHash, i) => (
                            <div
                              key={txHash || i}
                              className="p-2.5 flex items-center justify-between hover:bg-slate-900 transition"
                            >
                              <span className="text-slate-300 break-all select-all">
                                {txHash}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedBlockData(null);
                                  handleInspectTx(txHash);
                                }}
                                className="ml-3 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-sans text-[11px] whitespace-nowrap"
                              >
                                View Details
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
                <button
                  onClick={() => setSelectedBlockData(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BlockchainExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading Blockchain Explorer...</span>
          </div>
        </div>
      }
    >
      <BlockchainExplorerContent />
    </Suspense>
  );
}
