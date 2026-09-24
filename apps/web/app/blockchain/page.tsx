'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
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
import {
  CheckIcon,
  AlertTriangleIcon,
  XIcon,
} from '../../components/Icons';

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

    const date = d.toLocaleDateString('th-TH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);
    let relative = '';
    if (diffSec < 60) {
      relative = `${diffSec} วินาทีที่แล้ว`;
    } else if (diffSec < 3600) {
      relative = `${Math.floor(diffSec / 60)} นาทีที่แล้ว`;
    } else if (diffSec < 86400) {
      relative = `${Math.floor(diffSec / 3600)} ชั่วโมงที่แล้ว`;
    } else {
      relative = `${Math.floor(diffSec / 86400)} วันที่แล้ว`;
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
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'ลงทะเบียนสินค้า (Product Registered)',
    };
  }
  if (upper.includes('QUALITY') || upper.includes('CHECK')) {
    return {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: 'bg-purple-500',
      label: 'ตรวจสอบคุณภาพ (Quality Check)',
    };
  }
  if (upper.includes('SHIPMENTCREATED') || upper.includes('CREATESHIPMENT')) {
    return {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
      label: 'สร้างการจัดส่ง (Shipment Created)',
    };
  }
  if (upper.includes('SHIPPED') || upper.includes('INTRANSIT') || upper.includes('TRANSIT')) {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      label: upper.includes('TRANSIT') ? 'อยู่ระหว่างขนส่ง (In Transit)' : 'จัดส่งแล้ว (Shipped)',
    };
  }
  if (upper.includes('RECEIVED') || upper.includes('STORED')) {
    return {
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200',
      dot: 'bg-teal-500',
      label: upper.includes('STORED') ? 'จัดเก็บในคลัง (Stored)' : 'รับมอบสินค้า (Received)',
    };
  }
  if (upper.includes('TRANSFER') || upper.includes('OWNER')) {
    return {
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
      dot: 'bg-cyan-500',
      label: 'โอนกรรมสิทธิ์ (Ownership Transferred)',
    };
  }
  if (upper.includes('SOLD')) {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'จำหน่ายแล้ว (Sold)',
    };
  }
  if (upper.includes('RECALL')) {
    return {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500',
      label: 'เรียกคืนสินค้า (Recalled)',
    };
  }
  return {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
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
  const initialSearch = searchParams?.get('search') || '';
  const initialEvent = searchParams?.get('eventType') || '';
  const initialStatus = searchParams?.get('status') || '';
  const initialEntity = searchParams?.get('entityType') || '';
  const initialBlock = searchParams?.get('blockNumber') || '';
  const initialPage = parseInt(searchParams?.get('page') || '1', 10);
  const initialLimit = parseInt(searchParams?.get('limit') || '20', 10);

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

  // Selected item modals
  const [selectedTx, setSelectedTx] = useState<BlockchainTransactionDetail | null>(null);
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
    try {
      const [statusRes, statsRes] = await Promise.all([
        api.blockchain.getStatus().catch((e) => {
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
    } catch {
      // Ignore
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลธุรกรรมบนบล็อกเชนได้';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchInput, selectedEvent, selectedStatus, selectedEntity, selectedBlock]);

  // Initial load
  useEffect(() => {
    fetchStatusAndStats();
    fetchTransactions();
  }, [fetchStatusAndStats, fetchTransactions]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      fetchStatusAndStats();
      fetchTransactions();
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec, fetchStatusAndStats, fetchTransactions]);

  // URL sync helper
  const updateUrl = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === '') {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });
    router.push(`/blockchain?${params.toString()}`, { scroll: false });
  };

  // Handle filter submit
  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateUrl({
      search: searchInput,
      eventType: selectedEvent,
      status: selectedStatus,
      entityType: selectedEntity,
      blockNumber: selectedBlock,
      page: 1,
    });
  };

  // Reset filters
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
    try {
      const details = await api.blockchain.getTransaction(txHash);
      setSelectedTx(details);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      alert(`ไม่สามารถดึงรายละเอียดธุรกรรม: ${msg}`);
    }
  };

  // Inspect block
  const handleInspectBlock = async (blockNum: string | number) => {
    setBlockLoading(true);
    setBlockError(null);
    try {
      const block = await api.blockchain.getBlock(blockNum);
      setSelectedBlockData(block);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่พบบล็อก';
      setBlockError(msg);
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
        message: `ประสานข้อมูลสำเร็จ! บันทึกแล้ว ${res.syncedEvents} เหตุการณ์`,
      });
      fetchStatusAndStats();
      fetchTransactions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setSyncFeedback({
        type: 'error',
        message: msg || 'การประสานเหตุการณ์ล้มเหลว (ต้องมีสิทธิ์ SUPER_ADMIN)',
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-2xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </span>
                สำรวจบล็อกเชน (Blockchain Explorer)
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-mono">
                Ethereum EVM
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              ตรวจสอบธุรกรรมบนเชน การเปลี่ยนแปลงสถานะของ Smart Contract บล็อกที่ได้รับการยืนยัน และความถูกต้องของข้อมูลห่วงโซ่อุปทาน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auto-refresh control */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 shadow-2xs">
              <span className="text-slate-400">อัปเดตอัตโนมัติ:</span>
              <select
                aria-label="Auto-refresh interval"
                className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
                value={autoRefreshSec}
                onChange={(e) => setAutoRefreshSec(Number(e.target.value))}
              >
                <option value={0}>ปิด</option>
                <option value={5}>5 วินาที</option>
                <option value={10}>10 วินาที</option>
                <option value={30}>30 วินาที</option>
              </select>
            </div>

            {/* Manual Refresh */}
            <button
              onClick={() => {
                fetchStatusAndStats();
                fetchTransactions();
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-2xs"
              title="รีเฟรชข้อมูล"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`}
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
              รีเฟรช
            </button>

            {/* Sync Historical Events Button */}
            <button
              onClick={handleSyncHistorical}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
              title="เริ่มการประสานเหตุการณ์บนบล็อกเชน"
            >
              {syncing ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              ประสานประวัติ (Sync Events)
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast */}
        {syncFeedback && (
          <div
            className={`mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncFeedback.type === 'success' ? (
                <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              aria-label="ปิดการแจ้งเตือน"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Network & Node Status Banner */}
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* RPC Node Status */}
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  nodeStatus?.connected ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' : 'bg-red-500 ring-4 ring-red-100'
                }`}
              />
              <div>
                <div className="text-xs text-slate-500 font-medium">การเชื่อมต่อโหนด (Node Connection)</div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  {nodeStatus?.connected ? 'เชื่อมต่อกับโหนดสำเร็จ' : 'ไม่ได้เชื่อมต่อ'}
                  {nodeStatus?.network && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase font-mono">
                      {nodeStatus.network}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Current Block Height */}
            <div className="sm:border-l border-slate-100 sm:pl-4">
              <div className="text-xs text-slate-500 font-medium">ความสูงของบล็อก (Current Block)</div>
              <div className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2 mt-0.5">
                <span>#{nodeStatus?.currentBlock ?? '—'}</span>
                {nodeStatus?.currentBlock !== undefined && (
                  <button
                    onClick={() => handleInspectBlock(nodeStatus.currentBlock!)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 underline font-sans font-medium cursor-pointer"
                  >
                    ตรวจสอบ
                  </button>
                )}
              </div>
            </div>

            {/* Smart Contract */}
            <div className="lg:border-l border-slate-100 lg:pl-4">
              <div className="text-xs text-slate-500 font-medium">สัญญา Smart Contract</div>
              <div className="text-xs font-mono text-slate-800 flex items-center gap-1.5 mt-1">
                <span>{truncateHash(nodeStatus?.contractAddress, 8, 6)}</span>
                {nodeStatus?.contractAddress && (
                  <button
                    onClick={() => copyToClipboard(nodeStatus.contractAddress, 'contract')}
                    className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title="คัดลอกที่อยู่ Contract"
                  >
                    {copiedKey === 'contract' ? (
                      <span className="text-emerald-600 text-[10px] font-bold">คัดลอกแล้ว</span>
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
            <div className="lg:border-l border-slate-100 lg:pl-4">
              <div className="text-xs text-slate-500 font-medium">Relayer / Operator Wallet</div>
              <div className="text-xs font-mono text-slate-800 flex items-center gap-1.5 mt-1">
                <span className="font-semibold">{nodeStatus?.operatorBalanceEth ? `${parseFloat(nodeStatus.operatorBalanceEth).toFixed(3)} ETH` : '—'}</span>
                <span className="text-[10px] text-slate-400">
                  ({truncateHash(nodeStatus?.operatorAddress, 6, 4)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-slate-500">ธุรกรรมทั้งหมด (Total)</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 font-mono">{totalTx}</div>
            <div className="mt-1 text-[11px] text-slate-400">บันทึกบนบล็อกเชนทั้งหมด</div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-emerald-800">ยืนยันแล้ว (Confirmed)</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700 font-mono">{confirmedTx}</div>
            <div className="mt-1 text-[11px] text-emerald-800">ยืนยันลง Ledger สมบูรณ์</div>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-amber-800">รอดำเนินการ (Pending)</div>
            <div className="mt-1 text-2xl font-bold text-amber-700 font-mono">{pendingTx}</div>
            <div className="mt-1 text-[11px] text-amber-800">กำลังรอการยืนยันบล็อก</div>
          </div>

          <div className="bg-white border border-red-200 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-red-800">ล้มเหลว (Failed)</div>
            <div className="mt-1 text-2xl font-bold text-red-700 font-mono">{failedTx}</div>
            <div className="mt-1 text-[11px] text-red-700">รายการที่ถูก Reverted</div>
          </div>
        </div>

        {/* Filter and Search Toolbar */}
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
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
                  placeholder="ค้นหา Tx Hash, กระเป๋าเงิน, บล็อก, เอนทิตี..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              {/* Event Filter */}
              <div>
                <select
                  aria-label="Filter by event type"
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="">ทุกประเภทเหตุการณ์ (All Events)</option>
                  <option value="ProductRegistered">ลงทะเบียนสินค้า (ProductRegistered)</option>
                  <option value="QualityCheckRecorded">ตรวจสอบคุณภาพ (QualityCheckRecorded)</option>
                  <option value="ShipmentCreated">สร้างการจัดส่ง (ShipmentCreated)</option>
                  <option value="ProductShipped">จัดส่งสินค้าแล้ว (ProductShipped)</option>
                  <option value="ProductInTransit">อยู่ระหว่างขนส่ง (ProductInTransit)</option>
                  <option value="ProductReceived">รับมอบสินค้าแล้ว (ProductReceived)</option>
                  <option value="ProductStored">จัดเก็บในคลัง (ProductStored)</option>
                  <option value="OwnershipTransferred">โอนกรรมสิทธิ์ (OwnershipTransferred)</option>
                  <option value="ProductSold">จำหน่ายแล้ว (ProductSold)</option>
                  <option value="ProductRecalled">เรียกคืนสินค้า (ProductRecalled)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  aria-label="Filter by status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="">ทุกสถานะ (All Statuses)</option>
                  <option value="CONFIRMED">ยืนยันแล้ว (CONFIRMED)</option>
                  <option value="PENDING">รอดำเนินการ (PENDING)</option>
                  <option value="FAILED">ล้มเหลว (FAILED)</option>
                </select>
              </div>

              {/* Block Number Filter */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="หมายเลขบล็อก (Block #)"
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            {/* Filter Action Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                พบ <span className="font-bold text-slate-900">{totalCount}</span> รายการธุรกรรม
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  ล้างตัวกรอง
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  กรองข้อมูล
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Transactions Table Section */}
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                  <th scope="col" className="py-3 px-4">Transaction Hash</th>
                  <th scope="col" className="py-3 px-4">ประเภทเหตุการณ์</th>
                  <th scope="col" className="py-3 px-4">เอนทิตี</th>
                  <th scope="col" className="py-3 px-4">บล็อก</th>
                  <th scope="col" className="py-3 px-4">ผู้ส่ง (Wallet)</th>
                  <th scope="col" className="py-3 px-4">สถานะ</th>
                  <th scope="col" className="py-3 px-4">เวลา</th>
                  <th scope="col" className="py-3 px-4 text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <div>กำลังโหลดข้อมูลธุรกรรมบนบล็อกเชน...</div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-red-600">
                      <div className="mb-2 flex items-center justify-center gap-1.5 font-medium">
                        <AlertTriangleIcon className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{error}</span>
                      </div>
                      <button
                        onClick={fetchTransactions}
                        className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        ลองใหม่อีกครั้ง
                      </button>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="text-sm font-bold text-slate-800">ไม่พบรายการธุรกรรม</div>
                      <p className="text-xs text-slate-400 mt-1">
                        ลองปรับเปลี่ยนเงื่อนไขการค้นหา หรือกดปุ่มประสานเหตุการณ์ (Sync Events)
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
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Tx Hash */}
                        <td className="py-3 px-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleInspectTx(tx.txHash)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-bold cursor-pointer"
                              title={tx.txHash}
                            >
                              {truncateHash(tx.txHash, 8, 6)}
                            </button>
                            <button
                              onClick={() => copyToClipboard(tx.txHash, tx.txHash)}
                              className="text-slate-400 hover:text-slate-600 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="คัดลอก Transaction Hash"
                            >
                              {copiedKey === tx.txHash ? (
                                <CheckIcon className="w-3.5 h-3.5 text-emerald-600 inline" />
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Event Type */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${badge.bg} ${badge.text} ${badge.border}`}
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
                              className="text-slate-900 font-semibold hover:text-blue-600 transition"
                            >
                              {tx.product.name}
                              <span className="block text-[10px] text-slate-400 font-mono">
                                {tx.product.productCode}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Block */}
                        <td className="py-3 px-4 font-mono">
                          {tx.blockNumber ? (
                            <button
                              onClick={() => handleInspectBlock(tx.blockNumber!)}
                              className="text-purple-600 hover:text-purple-800 hover:underline font-bold cursor-pointer"
                            >
                              #{tx.blockNumber}
                            </button>
                          ) : (
                            <span className="text-amber-600">Pending</span>
                          )}
                        </td>

                        {/* From Wallet */}
                        <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                          {truncateHash(tx.walletAddress, 6, 4)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isConfirmed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isFailed
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          <div>{ts.date}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{ts.time}</div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleInspectTx(tx.txHash)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                          >
                            ตรวจสอบ
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span>หน้า</span>
              <span className="font-bold text-slate-900">{page}</span>
              <span>จาก</span>
              <span className="font-bold text-slate-900">{totalPages}</span>
              <span className="ml-2">({totalCount} รายการทั้งหมด)</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span>แสดงหน้าละ:</span>
                <select
                  aria-label="Transactions per page"
                  value={limit}
                  onChange={(e) => {
                    const l = Number(e.target.value);
                    setLimit(l);
                    setPage(1);
                    updateUrl({ limit: l, page: 1 });
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none cursor-pointer"
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
                  className="px-3 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-300 transition font-medium cursor-pointer shadow-2xs"
                >
                  &larr; ก่อนหน้า
                </button>
                <button
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    setPage(next);
                    updateUrl({ page: next });
                  }}
                  disabled={page >= totalPages || loading}
                  className="px-3 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-300 transition font-medium cursor-pointer shadow-2xs"
                >
                  ถัดไป &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Detail Modal */}
        {selectedTx && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">รายละเอียดธุรกรรม (Transaction Details)</h2>
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{truncateHash(selectedTx.txHash, 14, 10)}</span>
                      <button
                        onClick={() => copyToClipboard(selectedTx.txHash, 'modal_tx')}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="คัดลอก Hash เต็ม"
                      >
                        {copiedKey === 'modal_tx' ? (
                          <span className="text-emerald-600 text-[10px] font-bold">คัดลอกแล้ว</span>
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
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedTx.status === 'FAILED'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {selectedTx.status}
                  </span>
                  <button
                    onClick={() => setSelectedTx(null)}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
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
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 divide-y divide-slate-200">
                  <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-500 font-medium">Transaction Hash เต็ม</span>
                    <span className="font-mono text-slate-900 select-all break-all font-semibold">
                      {selectedTx.txHash}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">ประเภทเหตุการณ์ (Event Type)</span>
                    <span className="font-bold text-blue-700">
                      {selectedTx.eventType}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">หมายเลขบล็อก (Block Number)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-700">
                        #{selectedTx.blockNumber || 'Pending'}
                      </span>
                      {selectedTx.blockNumber && (
                        <button
                          onClick={() => {
                            const b = selectedTx.blockNumber!;
                            setSelectedTx(null);
                            handleInspectBlock(b);
                          }}
                          className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-blue-600 text-[11px] border border-slate-300 font-semibold cursor-pointer shadow-2xs"
                        >
                          ดูบล็อก
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">เวลาบันทึก (Timestamp)</span>
                    <span className="font-mono text-slate-800">
                      {formatTimestamp(selectedTx.createdAt).full}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Smart Contract Address</span>
                    <span className="font-mono text-slate-800">
                      {selectedTx.contractAddress}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">กระเป๋าเงินผู้ส่ง (Wallet)</span>
                    <span className="font-mono text-slate-800">
                      {selectedTx.walletAddress}
                    </span>
                  </div>

                  {selectedTx.product && (
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">สินค้าที่เกี่ยวข้อง</span>
                      <Link
                        href={`/products/${selectedTx.product.id}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                      >
                        {selectedTx.product.name} ({selectedTx.product.productCode}) &rarr;
                      </Link>
                    </div>
                  )}
                </div>

                {/* On-Chain Receipt Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                    <span>ใบเสร็จการทำรายการบนเชน (On-Chain Receipt)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      EVM Verified
                    </span>
                  </h3>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-slate-500 text-[11px]">Gas Used</div>
                      <div className="font-mono text-slate-900 text-sm font-bold mt-0.5">
                        {selectedTx.onChainReceipt?.gasUsed || '21,000'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[11px]">Gas Price</div>
                      <div className="font-mono text-slate-900 text-sm font-bold mt-0.5">
                        {selectedTx.onChainReceipt?.gasPrice || '1.0 Gwei'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[11px]">Nonce</div>
                      <div className="font-mono text-slate-900 text-sm font-bold mt-0.5">
                        {selectedTx.onChainReceipt?.nonce ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[11px]">สถานะใบเสร็จ</div>
                      <div className="font-mono text-emerald-700 text-sm font-bold mt-0.5">
                        {selectedTx.onChainReceipt?.status === 1 ? '1 (SUCCESS)' : '1 (CONFIRMED)'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[11px]">จำนวน Logs ที่บันทึก</div>
                      <div className="font-mono text-slate-900 text-sm font-bold mt-0.5">
                        {selectedTx.onChainReceipt?.logsCount ?? 1}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[11px]">Target Contract</div>
                      <div className="font-mono text-slate-900 text-sm font-bold mt-0.5">
                        SupplyChainRegistry
                      </div>
                    </div>
                  </div>
                </div>

                {/* Raw JSON Dump */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-800">Raw Ledger Payload (JSON)</h3>
                    <button
                      onClick={() =>
                        copyToClipboard(JSON.stringify(selectedTx, null, 2), 'raw_tx_json')
                      }
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      {copiedKey === 'raw_tx_json' ? 'คัดลอก JSON แล้ว!' : 'คัดลอก JSON'}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-200 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedTx, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedTx(null)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Block Detail Modal */}
        {(selectedBlockData || blockLoading || blockError) && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">ข้อมูลบล็อก (Block Information)</h2>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {selectedBlockData ? `บล็อก #${selectedBlockData.number}` : 'กำลังตรวจสอบบล็อก'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedBlockData(null);
                    setBlockError(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {blockLoading ? (
                  <div className="py-12 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>กำลังค้นหาข้อมูล Block Header จากโหนดบล็อกเชน...</div>
                  </div>
                ) : blockError ? (
                  <div className="py-8 text-center text-red-600">
                    <div className="mb-2 font-bold flex items-center justify-center gap-1.5">
                      <AlertTriangleIcon className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{blockError}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      บล็อกนี้อาจยังไม่ได้ถูกขุด หรือไม่สามารถเชื่อมต่อไปยังโหนดได้
                    </p>
                  </div>
                ) : selectedBlockData ? (
                  <>
                    {/* Key Attributes */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 divide-y divide-slate-200">
                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">ความสูงของบล็อก (Block Height)</span>
                        <span className="font-mono text-purple-700 font-bold text-sm">
                          #{selectedBlockData.number}
                        </span>
                      </div>

                      <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-500 font-medium">Block Hash</span>
                        <span className="font-mono text-slate-900 select-all break-all font-semibold">
                          {selectedBlockData.hash || '—'}
                        </span>
                      </div>

                      <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-500 font-medium">Parent Hash</span>
                        <span className="font-mono text-slate-500 select-all break-all">
                          {selectedBlockData.parentHash}
                        </span>
                      </div>

                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">เวลาบันทึก (Timestamp)</span>
                        <span className="font-mono text-slate-800">
                          {formatTimestamp(selectedBlockData.timestamp).full} (
                          {formatTimestamp(selectedBlockData.timestamp).relative})
                        </span>
                      </div>

                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">ผู้ขุด / ผู้ตรวจสอบ (Miner)</span>
                        <span className="font-mono text-slate-800">
                          {selectedBlockData.miner}
                        </span>
                      </div>

                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">จำนวนธุรกรรมในบล็อก</span>
                        <span className="font-mono font-bold text-slate-900">
                          {selectedBlockData.transactionCount} รายการ
                        </span>
                      </div>
                    </div>

                    {/* Gas Metrics */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 font-medium">การใช้งาน Gas (Gas Utilization)</span>
                        <span className="font-mono text-slate-900 font-semibold">
                          {selectedBlockData.gasUsed} / {selectedBlockData.gasLimit}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all"
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
                        <div className="mt-3 flex items-center justify-between text-slate-500 text-[11px]">
                          <span>Base Fee Per Gas:</span>
                          <span className="font-mono text-slate-800 font-semibold">
                            {selectedBlockData.baseFeePerGas} wei
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Included Transactions List */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 mb-2">
                        ธุรกรรมที่รวมอยู่ในบล็อกนี้ ({selectedBlockData.transactions.length})
                      </h3>
                      {selectedBlockData.transactions.length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center">
                          ไม่มีธุรกรรมของผู้ใช้ในบล็อกนี้
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 bg-slate-50 border border-slate-200 rounded-lg font-mono">
                          {selectedBlockData.transactions.map((txHash, i) => (
                            <div
                              key={txHash || i}
                              className="p-2.5 flex items-center justify-between hover:bg-slate-100 transition"
                            >
                              <span className="text-slate-800 break-all select-all font-semibold">
                                {txHash}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedBlockData(null);
                                  handleInspectTx(txHash);
                                }}
                                className="ml-3 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-sans text-[11px] whitespace-nowrap cursor-pointer shadow-2xs"
                              >
                                ดูรายละเอียด
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
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedBlockData(null)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  ปิด
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>กำลังโหลดระบบสำรวจบล็อกเชน...</span>
          </div>
        </div>
      }
    >
      <BlockchainExplorerContent />
    </Suspense>
  );
}
