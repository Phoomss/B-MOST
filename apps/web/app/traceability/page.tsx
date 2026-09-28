'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
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
  THAI_ORG_TYPE,
} from '../../lib/thai-locale';

function TraceabilityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCode = (searchParams?.get('code') || searchParams?.get('search') || '').trim();

  const [searchInput, setSearchInput] = useState<string>(initialCode);
  const [activeIdentifier, setActiveIdentifier] = useState<string>(initialCode);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TraceabilityDetailResponse | null>(null);
  const lastLookupCode = useRef('');
  const lookupRequestId = useRef(0);

  // Quick search product suggestions
  const [suggestions, setSuggestions] = useState<ProductItem[]>([]);

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

  const handleLookup = useCallback(async (identifier: string) => {
    const clean = identifier.trim();
    if (!clean) return;
    const requestId = ++lookupRequestId.current;
    lastLookupCode.current = clean;

    try {
      setLoading(true);
      setError(null);
      setSearchInput(clean);
      setActiveIdentifier(clean);

      // Update URL without full reload
      if (initialCode !== clean) router.push(`/traceability?code=${encodeURIComponent(clean)}`, { scroll: false });

      const res = await api.traceability.get(clean);
      if (requestId === lookupRequestId.current) setData(res);
    } catch {
      if (requestId === lookupRequestId.current) {
        setError('ไม่พบข้อมูลสินค้าสำหรับรหัสนี้ หรือไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบรหัสแล้วลองใหม่');
        setData(null);
      }
    } finally {
      if (requestId === lookupRequestId.current) setLoading(false);
    }
  }, [initialCode, router]);

  useEffect(() => {
    if (initialCode && lastLookupCode.current !== initialCode) void handleLookup(initialCode);
  }, [initialCode, handleLookup]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      void handleLookup(searchInput.trim());
    }
  };

  const formatTimestamp = (ts: string | number) => {
    if (!ts) return 'ไม่มีข้อมูล';
    try {
      const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
      if (Number.isNaN(date.getTime())) return 'ไม่มีข้อมูล';
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="mb-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Traceability
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">ตรวจสอบประวัติสินค้า</h1>
                <span className="sr-only">Product Lifecycle Traceability</span>
              </div>
              <p className="text-slate-600 text-sm mt-2 max-w-2xl leading-6">
                ดูสถานะปัจจุบัน ผู้ถือครอง และเหตุการณ์ตั้งแต่ผลิตจนถึงส่งมอบในหน้าเดียว
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/products"
                className="min-h-10 inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition"
              >
                &larr; กลับหน้ารายการสินค้า
              </Link>
            </div>
          </div>
        </div>

        {/* Search Bar Section */}
        <section aria-labelledby="trace-search-title" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm mb-7">
          <h2 id="trace-search-title" className="text-lg font-bold text-slate-900">ค้นหาสินค้าที่ต้องการติดตาม</h2>
          <p className="mt-1 text-sm text-slate-600">ใช้รหัสสินค้า หมายเลขซีเรียล หรือรหัส UUID</p>
          <form onSubmit={handleSearchSubmit} className="mt-4 flex flex-col sm:flex-row gap-3" role="search">
            <div className="relative flex-1">
              <label htmlFor="trace-search-input" className="sr-only">รหัสสินค้า หมายเลขซีเรียล หรือ UUID</label>
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
                id="trace-search-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="เช่น PRD-2026-0001"
                autoComplete="off"
                className="w-full min-h-12 pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="min-h-12 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังค้นหาข้อมูล...</span>
                </>
              ) : (
                <>
                  <span>ตรวจสอบประวัติ</span>
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
              <span className="text-sm text-slate-600 font-medium mr-1">เลือกจากรายการสินค้า:</span>
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSearchInput(p.productCode);
                    void handleLookup(p.productCode);
                  }}
                  className={`text-sm px-3 py-2 rounded-lg border transition cursor-pointer ${
                    activeIdentifier === p.productCode
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="font-mono">{p.productCode}</span>
                  <span className="ml-1.5 text-slate-500">· {p.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Error Notification */}
        {error && (
          <div role="alert" className="mb-7 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
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
              <p className="font-semibold text-red-800">ไม่สามารถแสดงประวัติสินค้า</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State when no query performed yet */}
        {!data && !loading && !error && (
          <div className="text-center px-5 py-14 sm:py-16 border border-dashed border-slate-300 rounded-2xl bg-white">
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
            <h3 className="text-lg font-bold text-slate-900">เริ่มจากค้นหาสินค้า</h3>
            <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto leading-6">
              กรอกรหัสสินค้าหรือหมายเลขซีเรียลด้านบน แล้วดูสถานะ ผู้ถือครอง และประวัติการส่งมอบ
            </p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div role="status" className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600 mb-4" />
            <p className="text-slate-600 text-sm font-medium">
              กำลังโหลดประวัติสินค้า...
            </p>
          </div>
        )}

        {/* Traceability Details View */}
        {data && !loading && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">ผลการค้นหา: <span className="font-mono font-bold text-slate-900">{data.product.productCode}</span></p>
              <nav aria-label="ส่วนของประวัติสินค้า" className="flex flex-wrap gap-2 text-sm">
                <a href="#ownership-history" className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-blue-700 hover:bg-blue-50">ผู้ถือครอง</a>
                <a href="#product-timeline" className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-blue-700 hover:bg-blue-50">ลำดับเหตุการณ์</a>
              </nav>
            </div>
            {/* Top Grid: Product Summary & Blockchain Verification Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product Info Card (2 Cols) */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
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
                    <p className="text-sm text-slate-600 mt-2">
                      รหัสสินค้า: <span className="font-mono font-bold text-slate-800">{data.product.productCode}</span>
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      หมายเลขซีเรียล: <span className="font-mono text-slate-800">{data.product.serialNumber || 'ไม่ระบุ'}</span>
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-xs text-slate-500 block font-medium">วันที่ลงทะเบียน</span>
                    <p className="text-sm text-slate-700 mt-0.5">
                      {formatTimestamp(data.product.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-sm text-slate-600 font-semibold block">ผู้ผลิต</span>
                    <p className="text-base font-bold text-slate-900 mt-1">
                      {data.manufacturer?.name || 'ไม่ระบุ'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {data.manufacturer?.code || 'ไม่ระบุรหัส'} · {THAI_ORG_TYPE[data.manufacturer?.type] || data.manufacturer?.type || 'ไม่ระบุประเภท'}
                    </p>
                    {data.manufacturer?.walletAddress && (
                      <p className="text-[11px] text-slate-500 font-mono truncate mt-1">
                        Wallet: {data.manufacturer.walletAddress}
                      </p>
                    )}
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                    <span className="text-sm text-emerald-800 font-semibold block">ผู้ถือครองปัจจุบัน</span>
                    <p className="text-base font-bold text-emerald-900 mt-1">
                      {data.currentOwner?.name || 'ไม่ระบุ'}
                    </p>
                    <p className="text-xs text-emerald-700 font-mono mt-0.5">
                      {data.currentOwner?.code || 'ไม่ระบุรหัส'} · {THAI_ORG_TYPE[data.currentOwner?.type] || data.currentOwner?.type || 'ไม่ระบุประเภท'}
                    </p>
                    {data.currentOwner?.walletAddress && (
                      <p className="text-[11px] text-emerald-700 font-mono truncate mt-1">
                        Wallet: {data.currentOwner.walletAddress}
                      </p>
                    )}
                  </div>
                </div>

                {data.product.description && (
                  <p className="text-sm text-slate-700 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-6">
                    {data.product.description}
                  </p>
                )}
              </div>

              {/* Authoritative Blockchain Card (1 Col) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-900">
                      การยืนยันบนบล็อกเชน
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
                        ยืนยันข้อมูลแล้ว
                      </span>
                    ) : data.blockchainVerification.verified ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold">
                        ข้อมูลไม่ตรงกัน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                        รอการยืนยัน
                      </span>
                    )}
                  </div>

                  <p className="mb-4 text-sm leading-6 text-slate-600">
                    {data.blockchainVerification.verified && data.blockchainVerification.hashMatch
                      ? 'ข้อมูลสินค้าตรงกับข้อมูลที่บันทึกบนบล็อกเชน'
                      : data.blockchainVerification.verified
                        ? 'ข้อมูลสินค้าในระบบไม่ตรงกับข้อมูลบนบล็อกเชน กรุณาตรวจสอบรายละเอียด'
                        : 'ยังไม่สามารถยืนยันข้อมูลสินค้าบนบล็อกเชนได้'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-xs">รหัสสินค้าบนเชน</span>
                      <p className="font-mono font-bold text-slate-900 mt-1">
                        {data.blockchainVerification.onChainProductId != null
                          ? `#${data.blockchainVerification.onChainProductId}`
                          : 'ไม่มี'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-xs">เหตุการณ์บนเชน</span>
                      <p className="font-mono font-bold text-slate-900 mt-1">{data.blockchainVerification.totalOnChainEvents} รายการ</p>
                    </div>
                  </div>

                  <details className="mt-4 border-t border-slate-100 pt-4 text-xs">
                    <summary className="cursor-pointer font-semibold text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">ดูรายละเอียดทางเทคนิค</summary>
                    <div className="mt-3 space-y-3">
                    <div>
                      <span className="text-slate-500 font-medium">ที่อยู่ Smart Contract</span>
                      <p className="font-mono text-slate-800 break-all mt-1 bg-slate-50 p-2 rounded border border-slate-200">
                        {data.blockchainVerification.contractAddress || 'ไม่มีข้อมูล'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">ค่าแฮชยืนยันข้อมูล</span>
                      <p className="font-mono text-slate-700 break-all bg-slate-50 p-2 rounded-lg border border-slate-200 mt-1">
                        {data.blockchainVerification.computedHash || data.blockchainVerification.productHash || 'ไม่มี'}
                      </p>
                    </div>
                    </div>
                  </details>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        data.blockchainVerification.verified
                          ? data.blockchainVerification.hashMatch ? 'bg-emerald-500' : 'bg-red-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span>
                      {data.blockchainVerification.verified && data.blockchainVerification.hashMatch
                        ? 'ข้อมูลตรงกัน'
                        : data.blockchainVerification.verified ? 'ข้อมูลไม่ตรงกัน' : 'รอการยืนยันข้อมูล'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ownership Provenance Chain */}
            <section id="ownership-history" aria-labelledby="ownership-title" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm scroll-mt-24">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 id="ownership-title" className="text-lg font-bold text-slate-900 tracking-tight">
                    ประวัติผู้ถือครอง
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    ดูว่าองค์กรใดเคยถือครองสินค้า และใครเป็นผู้ถือครองปัจจุบัน
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
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        ลำดับ {idx + 1}
                      </span>
                      {owner.isCurrentOwner ? (
                        <span className="text-[11px] font-semibold text-emerald-800 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200">
                          ผู้ถือครองปัจจุบัน
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">ประวัติในอดีต</span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-slate-900 break-words">
                      {owner.organizationName}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {owner.organizationCode} • {THAI_ORG_TYPE[owner.organizationType] || owner.organizationType}
                    </p>

                    <p className="text-sm text-slate-700 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {owner.eventDescription}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                      <span>ได้รับมอบเมื่อ: </span>
                      <span className="text-slate-800 font-mono font-medium">
                        {formatTimestamp(owner.acquiredAt)}
                      </span>
                    </div>

                    {owner.txHash && (
                      <p className="text-xs text-blue-700 font-mono break-all mt-1">
                        Tx: {owner.txHash}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {data.ownershipHistory.length === 0 && <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีประวัติการเปลี่ยนผู้ถือครอง</p>}
            </section>

            {/* Chronological Event Timeline */}
            <section id="product-timeline" aria-labelledby="timeline-title" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm scroll-mt-24">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-8 pb-4 border-b border-slate-100">
                <div>
                  <h3 id="timeline-title" className="text-lg font-bold text-slate-900 tracking-tight">
                    ลำดับเหตุการณ์สินค้า
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    การลงทะเบียน ตรวจสอบคุณภาพ จัดส่ง และรับมอบสินค้า
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {data.events.length} เหตุการณ์
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
                            <h4 className="text-base font-semibold text-slate-900">
                              {evt.title}
                            </h4>
                          </div>

                          <span className="text-xs text-slate-500 font-mono">
                            {formatTimestamp(evt.timestamp)}
                          </span>
                        </div>

                        <p className="text-sm text-slate-700 leading-6">
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
              {data.events.length === 0 && <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีเหตุการณ์สำหรับสินค้านี้</p>}
            </section>
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
