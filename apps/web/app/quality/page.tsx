'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { api, ProductItem, QualityCheckItem } from '../../lib/api';

function QualityPageContent() {
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get('productId') || '';

  // Form states
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(preselectedProductId);
  const [inspectorName, setInspectorName] = useState<string>('QC Inspector');
  const [resultVerdict, setResultVerdict] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [notes, setNotes] = useState<string>('');

  // Execution states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    message: string;
    txHash: string;
    productCode: string;
    newStatus: string;
  } | null>(null);

  // History list states
  const [qcList, setQcList] = useState<QualityCheckItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [filterResult, setFilterResult] = useState<string>('ALL');

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        const [prodRes, qcRes] = await Promise.all([
          api.products.list({ limit: 50 }).catch(() => ({ data: [] })),
          api.qualityChecks.list({ limit: 30 }).catch(() => ({ data: [] })),
        ]);

        if (!ignore) {
          setProducts(prodRes.data || []);
          setQcList(qcRes.data || []);
          if (preselectedProductId && !selectedProductId) {
            setSelectedProductId(preselectedProductId);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load initial data';
          setErrorMessage(msg);
        }
      } finally {
        if (!ignore) {
          setLoadingHistory(false);
        }
      }
    }

    fetchData();

    return () => {
      ignore = true;
    };
  }, [preselectedProductId, selectedProductId]);

  const handleSubmitQC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMessage('Please select a product for inspection.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setSuccessData(null);

      const res = await api.qualityChecks.create({
        productId: selectedProductId,
        result: resultVerdict,
        inspectorName: inspectorName.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setSuccessData({
        message: res.message,
        txHash: res.blockchain?.txHash || '',
        productCode: res.product?.productCode || '',
        newStatus: res.product?.status || (resultVerdict === 'PASSED' ? 'QUALITY_CHECKED' : 'RECALLED'),
      });

      // Clear input notes
      setNotes('');

      // Refresh recent inspections
      const updatedQc = await api.qualityChecks.list({ limit: 30 }).catch(() => null);
      if (updatedQc?.data) {
        setQcList(updatedQc.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Quality check submission failed';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQcList = qcList.filter((item) => {
    if (filterResult === 'ALL') return true;
    return item.result === filterResult;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Quality Control & Assurance
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Phase 8 — Execute formal quality verification, record cryptographic verdicts on-chain, and maintain audit provenance.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            &larr; View Products Catalog
          </Link>
        </div>

        {/* Success Alert Banner with Blockchain Receipt */}
        {successData && (
          <div className="p-5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-200 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm text-emerald-300">
                <span className="text-emerald-400 text-base">✓</span>
                <span>{successData.message}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Status: {successData.newStatus}
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1 font-mono pt-1 border-t border-emerald-800/40">
              <div>
                <span className="text-slate-400">Product Code:</span>{' '}
                <span className="text-white font-semibold">{successData.productCode}</span>
              </div>
              <div className="break-all">
                <span className="text-slate-400">Blockchain Tx Hash:</span>{' '}
                <span className="text-blue-400 font-semibold">{successData.txHash}</span>
              </div>
            </div>
            <div className="pt-1">
              <Link
                href={`/products/${encodeURIComponent(selectedProductId)}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
              >
                Inspect Product Traceability &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between">
            <div>
              <span className="font-semibold block mb-0.5">Inspection Failed</span>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 text-sm ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2-Column Layout: Form & Guidelines */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 spans): Quality Check Submission Form */}
          <div className="lg:col-span-2 border border-slate-800 bg-slate-950/60 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span>📝</span> Record Quality Inspection
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                EVM Smart Contract Verified
              </span>
            </div>

            <form onSubmit={handleSubmitQC} className="space-y-5">
              {/* Product Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Product to Inspect <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">-- Choose a Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.productCode}] {p.name} — Status: {p.status}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Only products in non-recalled and non-sold states can undergo inspection.
                </p>
              </div>

              {/* Inspector Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Inspector Name & Designation
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="e.g. Dr. Jane Smith, Senior QA Engineer"
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Inspection Verdict (PASS / FAIL) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Inspection Result Verdict <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setResultVerdict('PASSED')}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition ${
                      resultVerdict === 'PASSED'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    PASS (Quality Checked)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultVerdict('FAILED')}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition ${
                      resultVerdict === 'FAILED'
                        ? 'bg-rose-600/20 border-rose-500 text-rose-400 shadow-md shadow-rose-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                    FAIL (Recall Product)
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {resultVerdict === 'PASSED'
                    ? 'Product status will advance to QUALITY_CHECKED, allowing downstream logistics and shipping.'
                    : 'Product status will immediately lock to RECALLED, permanently halting supply chain movement.'}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Inspection Notes & Test Observations
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Record optical calibration tests, thermal limits, voltage tolerance, or failure defects..."
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !selectedProductId}
                  className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing & Broadcasting Blockchain Transaction...</span>
                    </>
                  ) : (
                    <>
                      <span>⛓️ Sign Quality Check On-Chain</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: QC Protocol Guidelines */}
          <div className="space-y-6">
            <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-5 text-xs space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>📋</span> Inspection Protocol
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Under ISO 9001 and B-MOST smart contract specifications, all registered products must receive formal inspection before entering shipping logistics.
              </p>
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">1.</span>
                  <span className="text-slate-300">
                    <strong className="text-white">PASS Verdict:</strong> Emits on-chain event{' '}
                    <code className="text-blue-400">QualityChecked(productId, true)</code>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">2.</span>
                  <span className="text-slate-300">
                    <strong className="text-white">FAIL Verdict:</strong> Automatically invokes product recall on the Ethereum ledger.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">3.</span>
                  <span className="text-slate-300">
                    <strong className="text-white">Immutability:</strong> All inspector signatures and timestamped records become tamper-evident.
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-5 text-xs text-slate-400 space-y-2">
              <div className="font-semibold text-slate-200">Authorized Roles</div>
              <p>
                Only certified independent Auditors, accredited Manufacturers, and Super Administrators hold permissions to post quality verification records.
              </p>
            </div>
          </div>
        </div>

        {/* Quality Check Inspection History Table */}
        <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span>📜</span> Historical Quality Inspections
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audited inspection reports synchronized from PostgreSQL and EVM smart contract events.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setFilterResult('ALL')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  filterResult === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterResult('PASSED')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  filterResult === 'PASSED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Passed
              </button>
              <button
                onClick={() => setFilterResult('FAILED')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  filterResult === 'FAILED'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Failed
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              Loading inspection records...
            </div>
          ) : filteredQcList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
              No quality check inspections found matching current criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-medium">Product</th>
                    <th className="py-3 px-4 font-medium">Verdict</th>
                    <th className="py-3 px-4 font-medium">Inspector</th>
                    <th className="py-3 px-4 font-medium">Notes</th>
                    <th className="py-3 px-4 font-medium">Blockchain Tx</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredQcList.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {item.product?.productCode || item.productId || 'Unknown'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.product?.name || 'Item'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                            item.result === 'PASSED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.result === 'PASSED' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          ></span>
                          {item.result}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {item.inspectorName || 'Lead Auditor'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {item.notes || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-blue-400">
                        {item.blockchainTxHash ? (
                          <span title={item.blockchainTxHash}>
                            {item.blockchainTxHash.slice(0, 10)}...{item.blockchainTxHash.slice(-6)}
                          </span>
                        ) : (
                          <span className="text-slate-500">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.product?.id && (
                          <Link
                            href={`/products/${item.product.id}`}
                            className="text-xs text-blue-400 hover:text-blue-300 transition font-medium"
                          >
                            View &rarr;
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function QualityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Loading Quality Control Interface...
          </div>
        </div>
      }
    >
      <QualityPageContent />
    </Suspense>
  );
}
