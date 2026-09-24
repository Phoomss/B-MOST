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
} from '../../lib/api';
import {
  getProductStatusBadge,
  THAI_PRODUCT_STATUS,
  THAI_ORG_TYPE,
} from '../../lib/thai-locale';

function TraceabilityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCode = searchParams?.get('code') || searchParams?.get('search') || '';

  const [searchInput, setSearchInput] = useState<string>(initialCode);
  const [activeIdentifier, setActiveIdentifier] = useState<string>(initialCode);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TraceabilityDetailResponse | null>(null);

  // Quick search product suggestions
  const [suggestions, setSuggestions] = useState<ProductItem[]>([]);

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
        const res = await api.traceability.search();
        if (!ignore && Array.isArray(res)) {
          setSuggestions(res.slice(0, 8));
        }
      } catch {
        // Silently ignore suggestion load failure
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
          : 'ไม่สามารถดึงข้อมูลประวัติการตรวจสอบย้อนกลับสำหรับรหัสนี้ได้';
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
    if (!ts) return 'ไม่มีข้อมูล';
    try {
      const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
      return date.toLocaleString('th-TH', {
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

  const getTimelineBadgeColor = (color?: string) => {
    switch (color) {
      case 'emerald':
        return {
          dot: 'bg-emerald-500 ring-emerald-100',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'rose':
        return {
          dot: 'bg-red-500 ring-red-100',
          badge: 'bg-red-50 text-red-700 border-red-200',
        };
      case 'amber':
        return {
          dot: 'bg-amber-500 ring-amber-100',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'purple':
        return {
          dot: 'bg-purple-500 ring-purple-100',
          badge: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'blue':
      default:
        return {
          dot: 'bg-blue-600 ring-blue-100',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs uppercase tracking-wider text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  ระบบติดตามและตรวจสอบย้อนกลับ (Traceability)
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  On-Chain Provenance
                </span>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  ติดตามและตรวจสอบย้อนกลับสินค้า
                </h1>
                <span className="sr-only">Product Lifecycle Traceability</span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                  (Product Lifecycle Traceability)
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                ตรวจสอบประวัติห่วงโซ่อุปทานตั้งแต่การผลิต การทดสอบคุณภาพ การขนส่ง ตลอดจนการเปลี่ยนมือเจ้าของผ่านบล็อกเชน
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/products"
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition"
              >
                &larr; กลับหน้ารายการสินค้า
              </Link>
            </div>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs mb-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
                placeholder="ระบุรหัสสินค้า (Enter Product Code e.g. PRD-2026-0001), หมายเลขซีเรียล หรือ UUID..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังค้นหาข้อมูล...</span>
                </>
              ) : (
                <>
                  <span>ตรวจสอบประวัติ (Audit Traceability)</span>
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
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium mr-1">เลือกสินค้าตัวอย่าง:</span>
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSearchInput(p.productCode);
                    handleLookup(p.productCode);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition font-mono cursor-pointer ${
                    activeIdentifier === p.productCode
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
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
          <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
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
              <p className="font-semibold text-red-800">ค้นหาประวัติย้อนกลับไม่สำเร็จ</p>
              <p className="mt-0.5 text-xs text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State when no query performed yet */}
        {!data && !loading && !error && (
          <div className="text-center py-20 border border-dashed border-slate-300 rounded-2xl bg-white">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center mb-4 shadow-2xs">
              <svg
                className="w-7 h-7"
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
            <h3 className="text-base font-bold text-slate-900">ยังไม่ได้ระบุสินค้าที่ต้องการตรวจสอบ</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
              กรุณากรอกรหัสสินค้า หมายเลขซีเรียล หรือคลิกเลือกสินค้าตัวอย่างด้านบนเพื่อดูประวัติตลอดวงจรชีวิต
            </p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600 mb-4" />
            <p className="text-slate-600 text-sm font-medium">
              กำลังตรวจสอบข้อมูลบน Smart Contract และประวัติเหตุการณ์...
            </p>
          </div>
        )}

        {/* Traceability Details View */}
        {data && !loading && (
          <div className="space-y-8">
            {/* Top Grid: Product Summary & Blockchain Verification Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product Info Card (2 Cols) */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {data.product.name}
                      </h2>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                          getProductStatusBadge(data.product.status).bg
                        }`}
                      >
                        {getProductStatusBadge(data.product.status).text}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      รหัสสินค้า: <span className="font-bold text-slate-800">{data.product.productCode}</span> • ซีเรียล: <span className="font-bold text-slate-800">{data.product.serialNumber}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">วันที่ลงทะเบียน</span>
                    <p className="text-xs text-slate-700 font-mono mt-0.5">
                      {formatTimestamp(data.product.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-semibold block">ผู้ผลิต (Manufacturer)</span>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {data.manufacturer?.name || 'ไม่ระบุ'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      รหัส: {data.manufacturer?.code} • {THAI_ORG_TYPE[data.manufacturer?.type] || data.manufacturer?.type}
                    </p>
                    {data.manufacturer?.walletAddress && (
                      <p className="text-[11px] text-slate-500 font-mono truncate mt-1">
                        Wallet: {data.manufacturer.walletAddress}
                      </p>
                    )}
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                    <span className="text-xs text-emerald-800 font-semibold block">ผู้ถือครองปัจจุบัน (Current Custodian)</span>
                    <p className="text-sm font-bold text-emerald-900 mt-1">
                      {data.currentOwner?.name || 'ไม่ระบุ'}
                    </p>
                    <p className="text-xs text-emerald-700 font-mono mt-0.5">
                      รหัส: {data.currentOwner?.code} • {THAI_ORG_TYPE[data.currentOwner?.type] || data.currentOwner?.type}
                    </p>
                    {data.currentOwner?.walletAddress && (
                      <p className="text-[11px] text-emerald-700 font-mono truncate mt-1">
                        Wallet: {data.currentOwner.walletAddress}
                      </p>
                    )}
                  </div>
                </div>

                {data.product.description && (
                  <p className="text-xs text-slate-600 mt-4 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                    {data.product.description}
                  </p>
                )}
              </div>

              {/* Authoritative Blockchain Card (1 Col) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      สถานะ Smart Contract
                    </span>
                    {data.blockchainVerification.verified && data.blockchainVerification.hashMatch ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Hash Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                        รอการยืนยัน
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Smart Contract Address</span>
                      <p className="font-mono text-slate-800 text-[11px] truncate mt-0.5 bg-slate-50 p-1.5 rounded border border-slate-200">
                        {data.blockchainVerification.contractAddress || 'Local Hardhat Node'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block text-[11px]">On-Chain Token ID</span>
                        <p className="font-mono font-bold text-slate-900 mt-0.5">
                          {data.blockchainVerification.onChainProductId !== null
                            ? `#${data.blockchainVerification.onChainProductId}`
                            : 'ไม่มี'}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block text-[11px]">จำนวนรายการบนเชน</span>
                        <p className="font-mono font-bold text-slate-900 mt-0.5">
                          {data.blockchainVerification.totalOnChainEvents} รายการ
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium">Keccak-256 Digest (ค่าแฮชยืนยันข้อมูล)</span>
                      <p className="font-mono text-[11px] text-slate-700 break-all bg-slate-50 p-2 rounded-lg border border-slate-200 mt-1">
                        {data.blockchainVerification.computedHash || data.blockchainVerification.productHash || 'ไม่มี'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        data.blockchainVerification.hashMatch ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span>
                      {data.blockchainVerification.hashMatch
                        ? 'ข้อมูลบนบล็อกเชนตรงกับฐานข้อมูล 100%'
                        : 'กำลังรอการบันทึกหรือประสานข้อมูลกับเชน'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ownership Provenance Chain */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    ลำดับการโอนกรรมสิทธิ์ (Chain of Custody &amp; Ownership Provenance)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ประวัติการส่งมอบและการเปลี่ยนมือของสินค้าระหว่างองค์กรในห่วงโซ่อุปทาน
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {data.ownershipHistory.length} ขั้นตอนการโอนสิทธิ์
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.ownershipHistory.map((owner, idx) => (
                  <div
                    key={owner.organizationId + idx}
                    className={`relative p-4 rounded-xl border transition ${
                      owner.isCurrentOwner
                        ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        ขั้นตอนที่ #{idx + 1}
                      </span>
                      {owner.isCurrentOwner ? (
                        <span className="text-[11px] font-semibold text-emerald-800 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200">
                          ผู้ครอบครองปัจจุบัน (Active Custodian)
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">ประวัติในอดีต</span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {owner.organizationName}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {owner.organizationCode} • {THAI_ORG_TYPE[owner.organizationType] || owner.organizationType}
                    </p>

                    <p className="text-xs text-slate-700 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      {owner.eventDescription}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                      <span>ได้รับมอบเมื่อ: </span>
                      <span className="text-slate-800 font-mono font-medium">
                        {formatTimestamp(owner.acquiredAt)}
                      </span>
                    </div>

                    {owner.txHash && (
                      <p className="text-[11px] text-blue-600 font-mono truncate mt-1">
                        Tx: {owner.txHash}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chronological Event Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    ลำดับเหตุการณ์ตลอดวงจรชีวิต (Chronological Lifecycle Timeline)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ประวัติกิจกรรมทั้งหมด ตั้งแต่การสร้างสินค้า การตรวจสอบคุณภาพ การจัดส่ง และการรับมอบ
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {data.events.length} เหตุการณ์ที่ผ่านการตรวจสอบ
                </span>
              </div>

              {/* Timeline Tree */}
              <div className="relative pl-6 sm:pl-8 before:absolute before:inset-0 before:left-3 sm:before:left-4 before:w-0.5 before:bg-slate-200">
                {data.events.map((evt: TimelineEventItem, idx: number) => {
                  const colors = getTimelineBadgeColor(evt.badgeColor);
                  return (
                    <div key={evt.id || idx} className="relative mb-8 last:mb-2 group">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-1 h-3.5 w-3.5 rounded-full ring-4 ${colors.dot} transition group-hover:scale-125`}
                      />

                      {/* Content Card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-slate-300 transition shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${colors.badge}`}
                            >
                              {evt.eventType.replace(/_/g, ' ')}
                            </span>
                            <h4 className="text-sm font-semibold text-slate-900">
                              {evt.title}
                            </h4>
                          </div>

                          <span className="text-xs text-slate-500 font-mono">
                            {formatTimestamp(evt.timestamp)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {evt.description}
                        </p>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">ผู้ดำเนินการ:</span>
                            <span className="font-semibold text-slate-800">
                              {evt.actor}
                            </span>
                            {evt.actorRole && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-mono text-slate-600 border border-slate-200">
                                {evt.actorRole}
                              </span>
                            )}
                          </div>

                          {evt.blockchainTxHash && (
                            <div className="flex items-center gap-1 font-mono text-xs">
                              <span className="text-slate-400">Tx:</span>
                              <span className="text-blue-600 truncate max-w-[140px] sm:max-w-[200px]" title={evt.blockchainTxHash}>
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
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8 text-center flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-blue-600" />
        </div>
      }
    >
      <TraceabilityContent />
    </Suspense>
  );
}
