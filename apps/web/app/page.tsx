'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '../components/Navbar';
import {
  api,
  DashboardStatistics,
  DashboardCharts,
  DashboardRecentActivityItem,
} from '../lib/api';
import {
  THAI_PRODUCT_STATUS,
  THAI_SHIPMENT_STATUS,
  THAI_ORG_TYPE,
  getProductStatusBadge,
} from '../lib/thai-locale';
import {
  BoxIcon,
  TruckIcon,
  BuildingIcon,
  CartIcon,
  AlertTriangleIcon,
  MapPinIcon,
  LinkIcon,
  QrCodeIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
} from '../components/Icons';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [activities, setActivities] = useState<DashboardRecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [statsData, chartsData, activityData] = await Promise.all([
        api.dashboard.getStatistics().catch(() => null),
        api.dashboard.getCharts().catch(() => null),
        api.dashboard.getRecentActivity().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      if (chartsData) setCharts(chartsData);
      setActivities(activityData || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลภาพรวมระบบได้';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch {
      // Fallback
    }
  };

  const getActivityBadgeClasses = (color: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'blue':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rose':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return 'bg-blue-500';
      case 'QUALITY_CHECKED':
        return 'bg-emerald-500';
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return 'bg-amber-500';
      case 'RECEIVED':
      case 'DELIVERED':
        return 'bg-indigo-500';
      case 'SOLD':
        return 'bg-purple-500';
      case 'RECALLED':
        return 'bg-red-500';
      case 'PENDING':
        return 'bg-amber-400';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                ภาพรวมระบบห่วงโซ่อุปทาน
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                EVM Smart Contract ออนไลน์
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              การติดตามสถานะสินค้า การจัดส่งหลายองค์กร และธุรกรรมบนบล็อกเชนแบบเรียลไทม์
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <svg
                className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรชข้อมูล'}</span>
            </button>

            <Link
              href="/verify"
              className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-xs font-semibold text-emerald-700 transition flex items-center gap-1.5"
            >
              <QrCodeIcon className="w-3.5 h-3.5" />
              <span>สแกน QR Code</span>
            </Link>

            <Link
              href="/products/new"
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-1"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>เพิ่มสินค้า</span>
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-xs text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadDashboardData()}
              className="underline font-semibold hover:text-red-900 cursor-pointer"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}

        {/* 7 Core KPI Metrics Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              ตัวชี้วัดการดำเนินงาน (Key Metrics)
            </h2>
            <span className="text-[11px] text-slate-400">
              คำนวณจากฐานข้อมูลจริง
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            {/* 1. Total Products */}
            <Link
              href="/products"
              className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-xl p-4 transition group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-600">สินค้าทั้งหมด</span>
                <BoxIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition">
                {loading ? <span className="animate-pulse">--</span> : stats?.totalProducts ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">ลงทะเบียนในระบบ</span>
            </Link>

            {/* 2. In Transit */}
            <Link
              href="/shipments"
              className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-xs rounded-xl p-4 transition group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-600">อยู่ระหว่างขนส่ง</span>
                <TruckIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-600 transition">
                {loading ? <span className="animate-pulse">--</span> : stats?.inTransit ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">กำลังจัดส่ง</span>
            </Link>

            {/* 3. Received */}
            <Link
              href="/shipments"
              className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xs rounded-xl p-4 transition group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-600">รับสินค้าแล้ว</span>
                <BuildingIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 transition">
                {loading ? <span className="animate-pulse">--</span> : stats?.received ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">จัดเก็บในคลัง</span>
            </Link>

            {/* 4. Sold */}
            <Link
              href="/products"
              className="bg-white border border-slate-200 hover:border-purple-400 hover:shadow-xs rounded-xl p-4 transition group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-600">จำหน่ายแล้ว</span>
                <CartIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600 transition">
                {loading ? <span className="animate-pulse">--</span> : stats?.sold ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">ส่งมอบลูกค้า</span>
            </Link>

            {/* 5. Recalled */}
            <Link
              href="/products"
              className="bg-white border border-slate-200 hover:border-red-400 hover:shadow-xs rounded-xl p-4 transition group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-600">เรียกคืน</span>
                <AlertTriangleIcon className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600 transition">
                {loading ? <span className="animate-pulse">--</span> : stats?.recalled ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">ระงับจำหน่าย</span>
            </Link>

            {/* 6. Active Shipments */}
            <Link
              href="/shipments"
              className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-xl p-4 transition group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-600">การจัดส่งที่ดำเนินอยู่</span>
                <MapPinIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600 transition">
                {loading ? <span className="animate-pulse">--</span> : stats?.activeShipments ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">รอดำเนินการ/ขนส่ง</span>
            </Link>

            {/* 7. Blockchain Transactions */}
            <Link
              href="/blockchain"
              className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-xl p-4 transition group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-600">ธุรกรรม Blockchain</span>
                <LinkIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition">
                {loading ? <span className="animate-pulse">--</span> : stats?.blockchainTransactions ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">เก็บบันทึกบนบล็อกเชน</span>
            </Link>
          </div>
        </section>

        {/* Visual Analytics Sections */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product Status Distribution */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                สถานะสินค้าในระบบ
              </h3>
              <Link href="/products" className="text-xs text-blue-600 hover:underline">
                ดูทั้งหมด &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : charts?.productStatus && charts.productStatus.length > 0 ? (
              <div className="space-y-3.5">
                {charts.productStatus.map((item) => {
                  const badge = getProductStatusBadge(item.status);
                  return (
                    <div key={item.status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">
                          {THAI_PRODUCT_STATUS[item.status] || item.status}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{item.count}</span>
                          <span className="text-[10px] text-slate-400">({item.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getStatusColor(item.status)}`}
                          style={{ width: `${Math.max(item.percentage, item.count > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                ยังไม่มีข้อมูลสถานะสินค้า
              </div>
            )}
          </div>

          {/* Middle: Shipment Activity Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                กิจกรรมการจัดส่งสินค้า
              </h3>
              <Link href="/shipments" className="text-xs text-blue-600 hover:underline">
                จัดการการจัดส่ง &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : charts?.shipmentActivity && charts.shipmentActivity.length > 0 ? (
              <div className="space-y-3.5">
                {charts.shipmentActivity.map((item) => (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">
                        {THAI_SHIPMENT_STATUS[item.status] || item.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.count}</span>
                        <span className="text-[10px] text-slate-400">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getStatusColor(item.status)}`}
                        style={{ width: `${Math.max(item.percentage, item.count > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                ยังไม่มีข้อมูลการจัดส่งสินค้า
              </div>
            )}
          </div>

          {/* Right: Organization Ecosystem */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                องค์กรในเครือข่ายห่วงโซ่อุปทาน
              </h3>
              <span className="text-xs text-slate-500">
                {charts?.organizationActivity?.reduce((acc, o) => acc + o.count, 0) || 0} องค์กร
              </span>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : charts?.organizationActivity && charts.organizationActivity.length > 0 ? (
              <div className="space-y-2.5">
                {charts.organizationActivity.map((org) => (
                  <div
                    key={org.type}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span className="text-xs font-medium text-slate-700">
                        {THAI_ORG_TYPE[org.type] || org.type}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">{org.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                ยังไม่มีข้อมูลองค์กร
              </div>
            )}
          </div>
        </section>

        {/* Blockchain 7-Day Velocity & Recent Ledger Confirmations */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>แนวโน้มธุรกรรมบน Blockchain (7 วันย้อนหลัง)</span>
                <span className="text-xs font-normal text-slate-500">
                  | ยืนยันแล้ว {charts?.blockchainActivity?.confirmedTransactions ?? 0} รายการ
                </span>
              </h3>
            </div>
            <Link href="/blockchain" className="text-xs text-blue-600 hover:underline">
              ดูธุรกรรมทั้งหมด &rarr;
            </Link>
          </div>

          {/* Daily Bar Chart */}
          <div className="grid grid-cols-7 gap-2 pt-2 pb-4">
            {charts?.blockchainActivity?.dailyTrend?.map((day) => {
              const maxCount = Math.max(
                ...charts.blockchainActivity.dailyTrend.map((d) => d.count),
                1,
              );
              const heightPct = Math.round((day.count / maxCount) * 100);
              return (
                <div key={day.date} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-700">{day.count}</span>
                  <div className="w-full bg-slate-100 rounded-md h-20 flex items-end p-1">
                    <div
                      className="w-full bg-blue-600 rounded-sm transition-all duration-500"
                      style={{ height: `${Math.max(heightPct, 6)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {day.date.split('-').slice(1).join('/')}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Real-Time Activity Feed */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>กิจกรรมล่าสุดในห่วงโซ่อุปทาน</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ประวัติการเคลื่อนไหวของสินค้า การตรวจคุณภาพ และการจัดส่งที่เพิ่งเกิดขึ้น
              </p>
            </div>
            <Link href="/traceability" className="text-xs text-blue-600 hover:underline">
              ตรวจสอบย้อนกลับ &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {activities.map((act) => (
                <div key={act.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-1 rounded text-[11px] font-semibold uppercase border shrink-0 ${getActivityBadgeClasses(
                        act.badgeColor,
                      )}`}
                    >
                      {act.type === 'PRODUCT_CREATED'
                        ? 'ลงทะเบียนสินค้า'
                        : act.type === 'QUALITY_CHECK'
                          ? 'ตรวจคุณภาพ'
                          : 'การจัดส่ง'}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{act.title}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{act.description}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        โดย: {act.organizationName || act.actor}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:text-right shrink-0">
                    {act.blockchainTxHash && (
                      <button
                        onClick={() => copyHash(act.blockchainTxHash || '')}
                        className="text-[10px] text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 transition font-mono cursor-pointer"
                        title={act.blockchainTxHash}
                      >
                        {copiedHash === act.blockchainTxHash ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckIcon className="w-3 h-3" /> คัดลอกแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <CopyIcon className="w-3 h-3" /> คัดลอก Tx Hash
                          </span>
                        )}
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(act.timestamp).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-slate-400">
              ยังไม่มีกิจกรรมล่าสุดในระบบ
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
