'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import {
  api,
  AuditLogItem,
  AuditFilterOptions,
  QueryAuditParams,
} from '../../lib/api';

function formatTimestamp(isoString: string): { date: string; time: string; full: string } {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return { date: isoString, time: '', full: isoString };
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
    return { date, time, full: `${date} ${time}` };
  } catch {
    return { date: isoString, time: '', full: isoString };
  }
}

function getActionBadgeStyle(action: string): { bg: string; text: string; border: string; dot: string } {
  const upper = action.toUpperCase();
  if (upper.includes('CREATE') || upper.includes('REGISTER') || upper.includes('CONFIRM')) {
    return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-400',
    };
  }
  if (upper.includes('UPDATE') || upper.includes('STATUS') || upper.includes('EDIT')) {
    return {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      dot: 'bg-blue-400',
    };
  }
  if (upper.includes('QUALITY') || upper.includes('CHECK') || upper.includes('INSPECT')) {
    return {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      dot: 'bg-purple-400',
    };
  }
  if (upper.includes('RECALL') || upper.includes('FAIL') || upper.includes('DELETE')) {
    return {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      dot: 'bg-rose-400',
    };
  }
  if (upper.includes('LOGIN') || upper.includes('AUTH') || upper.includes('TRANSFER')) {
    return {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      dot: 'bg-amber-400',
    };
  }
  return {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/20',
    dot: 'bg-slate-400',
  };
}

function getEntityTypeBadgeStyle(type: string): string {
  switch (type.toUpperCase()) {
    case 'PRODUCT':
      return 'bg-blue-900/40 text-blue-300 border-blue-700/50';
    case 'SHIPMENT':
      return 'bg-amber-900/40 text-amber-300 border-amber-700/50';
    case 'QUALITYCHECK':
    case 'QUALITY_CHECK':
      return 'bg-purple-900/40 text-purple-300 border-purple-700/50';
    case 'ORGANIZATION':
      return 'bg-cyan-900/40 text-cyan-300 border-cyan-700/50';
    case 'USER':
      return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

function AuditPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL state initialization
  const initialSearch = searchParams.get('search') || '';
  const initialAction = searchParams.get('action') || '';
  const initialEntityType = searchParams.get('entityType') || '';
  const initialOrgId = searchParams.get('organizationId') || '';
  const initialDateFrom = searchParams.get('dateFrom') || '';
  const initialDateTo = searchParams.get('dateTo') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialLimit = parseInt(searchParams.get('limit') || '15', 10);

  // Filter states
  const [searchInput, setSearchInput] = useState<string>(initialSearch);
  const [selectedAction, setSelectedAction] = useState<string>(initialAction);
  const [selectedEntityType, setSelectedEntityType] = useState<string>(initialEntityType);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(initialOrgId);
  const [dateFrom, setDateFrom] = useState<string>(initialDateFrom);
  const [dateTo, setDateTo] = useState<string>(initialDateTo);
  const [page, setPage] = useState<number>(initialPage);
  const [limit, setLimit] = useState<number>(initialLimit);

  // Data states
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter options state
  const [filterOptions, setFilterOptions] = useState<AuditFilterOptions>({
    actions: [],
    entityTypes: [],
    organizations: [],
  });

  // Modal / Detail state
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch filter options once
  useEffect(() => {
    let ignore = false;
    async function loadOptions() {
      try {
        const opts = await api.audit.getFilterOptions();
        if (!ignore && opts) {
          setFilterOptions(opts);
        }
      } catch (err) {
        console.error('Failed to load audit filter options:', err);
      }
    }
    loadOptions();
    return () => {
      ignore = true;
    };
  }, []);

  // Fetch audit records when filters or pagination change
  useEffect(() => {
    let ignore = false;

    async function fetchAuditLogs() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const params: QueryAuditParams = {
          page,
          limit,
        };

        if (searchInput.trim()) params.search = searchInput.trim();
        if (selectedAction) params.action = selectedAction;
        if (selectedEntityType) params.entityType = selectedEntityType;
        if (selectedOrgId) params.organizationId = selectedOrgId;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;

        const res = await api.audit.list(params);

        if (!ignore) {
          setLogs(res.data || []);
          setTotalCount(res.meta?.total || 0);
          setTotalPages(res.meta?.totalPages || 1);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load audit logs';
          setErrorMessage(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchAuditLogs();

    return () => {
      ignore = true;
    };
  }, [page, limit, searchInput, selectedAction, selectedEntityType, selectedOrgId, dateFrom, dateTo]);

  // Handle Search Form Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedAction('');
    setSelectedEntityType('');
    setSelectedOrgId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      'Timestamp',
      'Action',
      'Entity Type',
      'Entity ID',
      'User Name',
      'User Email',
      'User Role',
      'Organization Name',
      'Organization Code',
      'IP Address',
    ];

    const rows = logs.map((log) => [
      `"${log.createdAt}"`,
      `"${log.action}"`,
      `"${log.entityType}"`,
      `"${log.entityId}"`,
      `"${log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}"`,
      `"${log.user?.email || 'N/A'}"`,
      `"${log.user?.role || 'N/A'}"`,
      `"${log.organization?.name || 'N/A'}"`,
      `"${log.organization?.code || 'N/A'}"`,
      `"${log.ipAddress || 'N/A'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJSON = () => {
    if (logs.length === 0) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(logs, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `audit-logs-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Summary Metrics
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchInput.trim()) count++;
    if (selectedAction) count++;
    if (selectedEntityType) count++;
    if (selectedOrgId) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [searchInput, selectedAction, selectedEntityType, selectedOrgId, dateFrom, dateTo]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-2xl font-bold tracking-tight text-white">System Audit Logs</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Compliance & Traceability
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Immutable event log recording all critical administrative, operational, and multi-tenant actions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Export current view to CSV"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={logs.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Export current view to JSON"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Export JSON
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mt-6 bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Keyword Search */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Search Keywords
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by Entity ID, user email, action, IP..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Action Dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Action Type
                </label>
                <select
                  value={selectedAction}
                  onChange={(e) => {
                    setSelectedAction(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">All Actions</option>
                  {filterOptions.actions.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                  {/* Fallback default actions if dynamic options list empty */}
                  {filterOptions.actions.length === 0 && (
                    <>
                      <option value="PRODUCT_CREATED">PRODUCT_CREATED</option>
                      <option value="PRODUCT_STATUS_UPDATED">PRODUCT_STATUS_UPDATED</option>
                      <option value="SHIPMENT_CREATED">SHIPMENT_CREATED</option>
                      <option value="SHIPMENT_STATUS_UPDATED">SHIPMENT_STATUS_UPDATED</option>
                      <option value="QUALITY_CHECK_CREATED">QUALITY_CHECK_CREATED</option>
                      <option value="ORGANIZATION_CREATED">ORGANIZATION_CREATED</option>
                      <option value="ORGANIZATION_UPDATED">ORGANIZATION_UPDATED</option>
                      <option value="USER_LOGIN">USER_LOGIN</option>
                    </>
                  )}
                </select>
              </div>

              {/* Entity Type Dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Entity Type
                </label>
                <select
                  value={selectedEntityType}
                  onChange={(e) => {
                    setSelectedEntityType(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">All Entities</option>
                  {filterOptions.entityTypes.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                  {filterOptions.entityTypes.length === 0 && (
                    <>
                      <option value="Product">Product</option>
                      <option value="Shipment">Shipment</option>
                      <option value="QualityCheck">QualityCheck</option>
                      <option value="Organization">Organization</option>
                      <option value="User">User</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Second row of filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
              {/* Organization Dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Organization
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => {
                    setSelectedOrgId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">All Organizations</option>
                  {filterOptions.organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Filter Actions */}
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow transition"
                >
                  Apply Filters
                </button>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm transition"
                    title="Clear all filters"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Status / Error Banner */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => {
                setPage(1);
                setErrorMessage(null);
              }}
              className="text-xs underline hover:text-white font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Results Metadata Bar */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-200">{logs.length}</strong> of{' '}
              <strong className="text-slate-200">{totalCount}</strong> total audit records
            </span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                {activeFiltersCount} active {activeFiltersCount === 1 ? 'filter' : 'filters'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="mt-3 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Timestamp
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    User / Actor
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Organization
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Action
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Entity
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    IP Address
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal">
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-5 py-4">
                        <div className="h-4 bg-slate-800 rounded w-28 mb-1" />
                        <div className="h-3 bg-slate-800/60 rounded w-20" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 bg-slate-800 rounded w-32 mb-1" />
                        <div className="h-3 bg-slate-800/60 rounded w-24" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 bg-slate-800 rounded w-28" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-6 bg-slate-800 rounded-full w-32" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 bg-slate-800 rounded w-24 mb-1" />
                        <div className="h-3 bg-slate-800/60 rounded w-36" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 bg-slate-800 rounded w-20" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="h-7 bg-slate-800 rounded w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-medium text-slate-200">No audit logs found</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          No audit activity matches your selected filters. Try broadening your search or resetting filters.
                        </p>
                        {activeFiltersCount > 0 && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="mt-4 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                          >
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Data rows
                  logs.map((log) => {
                    const timeInfo = formatTimestamp(log.createdAt);
                    const badgeStyle = getActionBadgeStyle(log.action);
                    const isSystem = !log.user;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-800/40 transition group cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        {/* Timestamp */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-medium text-slate-200 text-xs">{timeInfo.date}</div>
                          <div className="text-[11px] font-mono text-slate-500">{timeInfo.time}</div>
                        </td>

                        {/* User / Actor */}
                        <td className="px-5 py-3.5">
                          {isSystem ? (
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-400">
                                SYS
                              </div>
                              <div>
                                <div className="text-xs font-medium text-slate-300">System Actor</div>
                                <div className="text-[11px] text-slate-500">Automated Event</div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-300">
                                {log.user?.firstName?.[0] || 'U'}
                                {log.user?.lastName?.[0] || ''}
                              </div>
                              <div>
                                <div className="text-xs font-medium text-slate-200">
                                  {log.user?.firstName} {log.user?.lastName}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                                  {log.user?.email}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Organization */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {log.organization ? (
                            <div>
                              <div className="text-xs font-medium text-slate-200">
                                {log.organization.name}
                              </div>
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                                {log.organization.code}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">None / Global</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${badgeStyle.dot}`} />
                            {log.action}
                          </span>
                        </td>

                        {/* Entity */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getEntityTypeBadgeStyle(
                                log.entityType,
                              )}`}
                            >
                              {log.entityType}
                            </span>
                            <span
                              className="text-[11px] font-mono text-slate-400 hover:text-blue-400 transition truncate max-w-[140px]"
                              title={log.entityId}
                            >
                              {log.entityId}
                            </span>
                          </div>
                        </td>

                        {/* IP Address */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-400">
                          {log.ipAddress ? (
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                              {log.ipAddress}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        {/* Inspect Details Button */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition"
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

          {/* Pagination Footer */}
          <div className="px-5 py-3.5 bg-slate-950/70 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Page <strong className="text-slate-200">{page}</strong> of{' '}
              <strong className="text-slate-200">{Math.max(totalPages, 1)}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                &larr; Previous
              </button>

              {/* Page numbers indicator */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setPage(pNum)}
                      className={`h-7 w-7 rounded text-xs font-medium transition ${
                        page === pNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Inspect Detail Modal */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    getActionBadgeStyle(selectedLog.action).bg
                  } ${getActionBadgeStyle(selectedLog.action).text} ${
                    getActionBadgeStyle(selectedLog.action).border
                  }`}
                >
                  {selectedLog.action}
                </span>
                <h3 className="text-base font-semibold text-white">Audit Entry Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Record Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <span className="block text-xs text-slate-500 uppercase font-semibold">Audit Record ID</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-xs text-slate-300 break-all">{selectedLog.id}</span>
                    <button
                      onClick={() => handleCopy(selectedLog.id, 'id')}
                      className="text-slate-500 hover:text-slate-300"
                      title="Copy ID"
                    >
                      {copiedKey === 'id' ? (
                        <span className="text-[10px] text-emerald-400 font-sans">Copied!</span>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-xs text-slate-500 uppercase font-semibold">Timestamp</span>
                  <span className="font-mono text-xs text-slate-300 mt-0.5 block">
                    {formatTimestamp(selectedLog.createdAt).full}
                  </span>
                </div>

                <div>
                  <span className="block text-xs text-slate-500 uppercase font-semibold">Actor (User)</span>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {selectedLog.user ? (
                      <>
                        <span className="font-medium text-white">
                          {selectedLog.user.firstName} {selectedLog.user.lastName}
                        </span>{' '}
                        <span className="text-slate-400">({selectedLog.user.email})</span>
                        <div className="text-[11px] text-blue-400 font-mono mt-0.5">
                          Role: {selectedLog.user.role}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-500 italic">System Process / Unauthenticated</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block text-xs text-slate-500 uppercase font-semibold">Organization</span>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {selectedLog.organization ? (
                      <>
                        <span className="font-medium text-white">{selectedLog.organization.name}</span>{' '}
                        <span className="text-slate-400">[{selectedLog.organization.code}]</span>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Type: {selectedLog.organization.type}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-500 italic">None / Global</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block text-xs text-slate-500 uppercase font-semibold">Target Entity</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getEntityTypeBadgeStyle(
                        selectedLog.entityType,
                      )}`}
                    >
                      {selectedLog.entityType}
                    </span>
                    <span className="font-mono text-xs text-slate-300 break-all">{selectedLog.entityId}</span>
                  </div>
                  {/* Entity contextual quick links */}
                  {selectedLog.entityType.toUpperCase() === 'PRODUCT' && (
                    <Link
                      href={`/traceability?search=${encodeURIComponent(selectedLog.entityId)}`}
                      className="inline-block text-[11px] text-blue-400 hover:text-blue-300 underline mt-1"
                    >
                      View in Traceability &rarr;
                    </Link>
                  )}
                  {selectedLog.entityType.toUpperCase() === 'SHIPMENT' && (
                    <Link
                      href="/shipments"
                      className="inline-block text-[11px] text-amber-400 hover:text-amber-300 underline mt-1"
                    >
                      View in Shipments &rarr;
                    </Link>
                  )}
                  {selectedLog.entityType.toUpperCase().includes('QUALITY') && (
                    <Link
                      href="/quality"
                      className="inline-block text-[11px] text-purple-400 hover:text-purple-300 underline mt-1"
                    >
                      View in Quality Checks &rarr;
                    </Link>
                  )}
                </div>

                <div>
                  <span className="block text-xs text-slate-500 uppercase font-semibold">Client IP & Origin</span>
                  <span className="font-mono text-xs text-slate-300 mt-0.5 block">
                    {selectedLog.ipAddress || 'Not recorded'}
                  </span>
                </div>
              </div>

              {/* Event Metadata / Payload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Metadata & Payload
                  </span>
                  {selectedLog.metadata && (
                    <button
                      onClick={() => handleCopy(JSON.stringify(selectedLog.metadata, null, 2), 'metadata')}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {copiedKey === 'metadata' ? 'Copied JSON!' : 'Copy JSON'}
                    </button>
                  )}
                </div>

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 ? (
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-64 leading-relaxed">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                ) : (
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-500 italic text-center">
                    No extra metadata associated with this audit entry.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <AuditPageContent />
    </Suspense>
  );
}
