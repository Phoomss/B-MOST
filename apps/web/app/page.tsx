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
      const msg = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
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
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'blue':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'purple':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'amber':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'rose':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return 'bg-blue-500';
      case 'QUALITY_CHECKED':
        return 'bg-teal-400';
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return 'bg-purple-500';
      case 'RECEIVED':
      case 'DELIVERED':
        return 'bg-emerald-500';
      case 'SOLD':
        return 'bg-sky-400';
      case 'RECALLED':
        return 'bg-rose-500';
      case 'PENDING':
        return 'bg-amber-400';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Supply Chain Operations &amp; Ledger
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                EVM Smart Contract Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time multi-organization provenance, custody analytics, and verifiable blockchain transactions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg
                className={`w-3.5 h-3.5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`}
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
              <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>

            <Link
              href="/verify"
              className="px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-xs font-semibold text-emerald-400 transition"
            >
              Scan QR &rarr;
            </Link>

            <Link
              href="/products/new"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow shadow-blue-500/20 transition"
            >
              + Create Product
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadDashboardData()}
              className="underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* 7 Core KPI Metrics Cards (docs/UI.md Section 3 & docs/API.md Section 12) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Operational Metrics
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              Calculated from active database records
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            {/* 1. Total Products */}
            <Link
              href="/products"
              className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 transition group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400">Total Products</span>
                <span className="text-blue-400 text-xs font-bold">📦</span>
              </div>
              <div className="text-2xl font-bold text-white group-hover:text-blue-400 transition">
                {loading ? <span className="animate-pulse">--</span> : stats?.totalProducts ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Registered in Registry</span>
            </Link>

            {/* 2. Active Shipments */}
            <Link
              href="/shipments"
              className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 transition group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400">Active Shipments</span>
                <span className="text-amber-400 text-xs font-bold">🚚</span>
              </div>
              <div className="text-2xl font-bold text-white group-hover:text-amber-400 transition">
                {loading ? <span className="animate-pulse">--</span> : stats?.activeShipments ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Pending / In Transit</span>
            </Link>

            {/* 3. In Transit */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400">In Transit</span>
                <span className="text-purple-400 text-xs font-bold">✈️</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">
                {loading ? <span className="animate-pulse">--</span> : stats?.inTransit ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">En Route to Hubs</span>
            </div>

            {/* 4. Received */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400">Received</span>
                <span className="text-emerald-400 text-xs font-bold">🏬</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {loading ? <span className="animate-pulse">--</span> : stats?.received ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">In Warehouses / Retail</span>
            </div>

            {/* 5. Sold */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400">Sold</span>
                <span className="text-sky-400 text-xs font-bold">🛍️</span>
              </div>
              <div className="text-2xl font-bold text-sky-400">
                {loading ? <span className="animate-pulse">--</span> : stats?.sold ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Retail to Consumer</span>
            </div>

            {/* 6. Recalled */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400">Recalled</span>
                <span className="text-rose-400 text-xs font-bold">⚠️</span>
              </div>
              <div className="text-2xl font-bold text-rose-400">
                {loading ? <span className="animate-pulse">--</span> : stats?.recalled ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Safety Quarantine</span>
            </div>

            {/* 7. Blockchain Transactions */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400">Blockchain Txs</span>
                <span className="text-teal-400 text-xs font-bold">⛓️</span>
              </div>
              <div className="text-2xl font-bold text-teal-400 font-mono">
                {loading ? <span className="animate-pulse">--</span> : stats?.blockchainTransactions ?? 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Indexed On-Chain</span>
            </div>
          </div>
        </section>

        {/* Charts & Visual Analytics Section */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Lifecycle &amp; Ecosystem Visual Analytics
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Product Status Breakdown */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Product Lifecycle Status</h3>
                  <p className="text-xs text-slate-400">Distribution across supply chain states</p>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {stats?.totalProducts ?? 0} Items
                </span>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                {charts?.productStatus.map((item) =>
                  item.percentage > 0 ? (
                    <div
                      key={item.status}
                      style={{ width: `${item.percentage}%` }}
                      className={`${getStatusColor(item.status)} transition-all duration-500`}
                      title={`${item.label}: ${item.count} (${item.percentage}%)`}
                    />
                  ) : null
                )}
              </div>

              {/* Status Breakdown Legend & Counts */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                {charts?.productStatus.map((item) => (
                  <div
                    key={item.status}
                    className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)} shrink-0`} />
                      <span className="text-slate-300 truncate">{item.label}</span>
                    </div>
                    <div className="font-mono text-right ml-2 shrink-0">
                      <span className="font-semibold text-white">{item.count}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Shipment Activity */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Shipment Activity &amp; Velocity</h3>
                  <p className="text-xs text-slate-400">Consignment pipeline and delivery tracking</p>
                </div>
                <Link
                  href="/shipments"
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  View All &rarr;
                </Link>
              </div>

              {/* Stacked Shipment Bar */}
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                {charts?.shipmentActivity.map((item) =>
                  item.percentage > 0 ? (
                    <div
                      key={item.status}
                      style={{ width: `${item.percentage}%` }}
                      className={`${getStatusColor(item.status)} transition-all duration-500`}
                      title={`${item.label}: ${item.count} (${item.percentage}%)`}
                    />
                  ) : null
                )}
              </div>

              {/* Shipment Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                {charts?.shipmentActivity.map((item) => (
                  <div
                    key={item.status}
                    className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)} shrink-0`} />
                      <span className="text-slate-300 truncate">{item.label}</span>
                    </div>
                    <div className="font-mono text-right ml-2 shrink-0">
                      <span className="font-semibold text-white">{item.count}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 3: Organization Activity */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Organization Ecosystem</h3>
                  <p className="text-xs text-slate-400">Multi-tenant participant nodes by enterprise role</p>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {charts?.organizationActivity.reduce((acc, o) => acc + o.count, 0) ?? 0} Orgs
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {charts?.organizationActivity.map((org) => {
                  const totalOrgs =
                    charts.organizationActivity.reduce((acc, o) => acc + o.count, 0) || 1;
                  const pct = Math.round((org.count / totalOrgs) * 100);
                  return (
                    <div key={org.type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{org.label}</span>
                        <div className="font-mono text-slate-400">
                          <span className="text-white font-bold">{org.count}</span>
                          <span className="text-[10px] ml-1">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 4: Blockchain Activity & Daily Trend */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Blockchain Ledger Health</h3>
                  <p className="text-xs text-slate-400">Ethereum smart contract transaction throughput</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>100% Verified</span>
                </div>
              </div>

              {/* Status Split */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase text-slate-500 block">Confirmed</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {charts?.blockchainActivity.confirmedTransactions ?? 0}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase text-slate-500 block">Pending</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">
                    {charts?.blockchainActivity.pendingTransactions ?? 0}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase text-slate-500 block">Failed</span>
                  <span className="text-lg font-bold text-rose-400 font-mono">
                    {charts?.blockchainActivity.failedTransactions ?? 0}
                  </span>
                </div>
              </div>

              {/* 7-Day Trend Bars */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>7-Day Transaction Trend</span>
                  <span className="text-[10px] text-slate-500 font-mono">Past 7 days</span>
                </div>
                <div className="h-16 w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-2 flex items-end justify-between gap-1.5">
                  {charts?.blockchainActivity.dailyTrend.map((day) => {
                    const maxVal = Math.max(
                      ...charts.blockchainActivity.dailyTrend.map((d) => d.count),
                      1
                    );
                    const heightPct = Math.max(Math.round((day.count / maxVal) * 100), 8);
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full bg-teal-500/80 hover:bg-teal-400 rounded-t transition-all cursor-pointer"
                          title={`${day.date}: ${day.count} txs`}
                        />
                        <span className="text-[9px] text-slate-500 font-mono block truncate w-full text-center">
                          {day.date.substring(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Recent Activity & On-Chain Transactions Feed */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Supply Chain Events */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-white">Recent Supply Chain Events</h3>
                <p className="text-xs text-slate-400">Chronological activity across inventory and logistics</p>
              </div>
              <span className="text-xs font-mono text-slate-500">Live</span>
            </div>

            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getActivityBadgeClasses(
                            act.badgeColor
                          )}`}
                        >
                          {act.type.replace('_', ' ')}
                        </span>
                        <span className="font-semibold text-white">{act.title}</span>
                      </div>
                      <p className="text-slate-400 text-xs">{act.description}</p>
                      <div className="text-[10px] text-slate-500">
                        {new Date(act.timestamp).toLocaleString()}
                      </div>
                    </div>

                    {act.blockchainTxHash && (
                      <button
                        onClick={() => copyHash(act.blockchainTxHash || '')}
                        className="font-mono text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded shrink-0 transition"
                        title="Copy Tx Hash"
                      >
                        {copiedHash === act.blockchainTxHash ? '✓ Copied' : 'Tx Copy'}
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No recent operational events recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Recent On-Chain Transactions */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-white">Recent Smart Contract Transactions</h3>
                <p className="text-xs text-slate-400">Immutable ledger blocks and event proofs</p>
              </div>
              <span className="text-xs font-mono text-emerald-400">EVM Synced</span>
            </div>

            <div className="space-y-2.5">
              {charts?.blockchainActivity.recentTransactions &&
              charts.blockchainActivity.recentTransactions.length > 0 ? (
                charts.blockchainActivity.recentTransactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 truncate mr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 text-[10px] font-bold">✓</span>
                        <span className="font-mono text-slate-300 truncate">
                          {tx.txHash}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                        <span>Event: {tx.eventType || 'Transaction'}</span>
                        {tx.blockNumber && <span>Block #{tx.blockNumber}</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => copyHash(tx.txHash)}
                      className="font-mono text-[10px] text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded shrink-0 transition"
                    >
                      {copiedHash === tx.txHash ? '✓' : 'Copy'}
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No blockchain transactions indexed yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        B-MOST &mdash; Blockchain Multi-Organization Supply Chain Traceability Platform &bull; Phase 12 Dashboard
      </footer>
    </div>
  );
}
