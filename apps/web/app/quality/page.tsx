'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { api, ProductItem, QualityCheckItem } from '../../lib/api';
import { executeUserSignedAction } from '../../lib/blockchain/wallet';
import { getQcBadge, THAI_PRODUCT_STATUS } from '../../lib/thai-locale';
import {
  CheckIcon,
  XIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  AlertTriangleIcon,
} from '../../components/Icons';

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
          const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลการตรวจสอบได้';
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
      setErrorMessage('กรุณาเลือกสินค้าที่ต้องการตรวจสอบ');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setSuccessData(null);

      const res = await executeUserSignedAction({
        action: 'recordQualityCheck',
        entityId: selectedProductId,
        passed: resultVerdict === 'PASSED',
        notes: notes.trim(),
      });

      setSuccessData({
        message: 'บันทึกผลการตรวจสอบคุณภาพเรียบร้อยแล้ว',
        txHash: res.transactionHash,
        productCode: res.product.productCode,
        newStatus: res.product?.status || (resultVerdict === 'PASSED' ? 'QUALITY_CHECKED' : 'RECALLED'),
      });

      setNotes('');

      const qcRes = await api.qualityChecks.list({ limit: 30 });
      setQcList(qcRes.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกผลการตรวจสอบ';
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Header */}
        <div className="pb-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            การตรวจสอบคุณภาพสินค้า (Quality Control)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            บันทึกผลการตรวจรับรองมาตรฐานสินค้า พร้อมส่งธุรกรรมยืนยันความถูกต้องลงบน Smart Contract
          </p>
        </div>

        {/* Success Alert */}
        {successData && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-start justify-between shadow-2xs">
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successData.message}</span>
              </div>
              <div className="text-xs mt-1">
                รหัสสินค้า: <span className="font-mono font-semibold">{successData.productCode}</span> |
                สถานะใหม่:{' '}
                <span className="font-semibold text-emerald-700">
                  {THAI_PRODUCT_STATUS[successData.newStatus] || successData.newStatus}
                </span>
              </div>
              {successData.txHash && (
                <div className="mt-2 text-xs font-mono text-blue-700 break-all">
                  Tx: {successData.txHash}
                </div>
              )}
            </div>
            <button
              onClick={() => setSuccessData(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
              aria-label="ปิดการแจ้งเตือน"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-start justify-between shadow-2xs">
            <div className="flex items-start gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">เกิดข้อผิดพลาด</div>
                <div className="text-xs mt-0.5">{errorMessage}</div>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-red-100 transition cursor-pointer"
              aria-label="ปิดการแจ้งเตือน"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2-Column: Left Form, Right History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form */}
          <div className="lg:col-span-1 border border-slate-200 bg-white rounded-xl p-5 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>บันทึกผลการตรวจสอบใหม่</span>
            </h2>

            <form onSubmit={handleSubmitQC} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกสินค้าที่ต้องการตรวจสอบ <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="">-- เลือกสินค้า --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productCode} — {p.name} [{THAI_PRODUCT_STATUS[p.status] || p.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้ตรวจสอบ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="เช่น ดร. อริส หรือ แผนก QC"
                  className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ผลการตรวจสอบ (Verdict) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResultVerdict('PASSED')}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                      resultVerdict === 'PASSED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ผ่าน (PASS)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultVerdict('FAILED')}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                      resultVerdict === 'FAILED'
                        ? 'bg-red-50 text-red-700 border-red-300 ring-2 ring-red-500/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <XIcon className="w-3.5 h-3.5 text-red-600" />
                    <span>ไม่ผ่าน (FAIL)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  * หากไม่ผ่าน ระบบจะเปลี่ยนสถานะสินค้าเป็น &ldquo;เรียกคืน (RECALLED)&rdquo; อัตโนมัติ
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุ / ผลการตรวจทางเทคนิค
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="บันทึกผลการทดสอบค่าความคลาดเคลื่อน ข้อมูลความปลอดภัย..."
                  className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังส่งธุรกรรมลง Blockchain...</span>
                  </>
                ) : (
                  <span>บันทึกผลการตรวจสอบ</span>
                )}
              </button>
            </form>
          </div>

          {/* Right History Table */}
          <div className="lg:col-span-2 border border-slate-200 bg-white rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-blue-600 shrink-0" />
                <span>ประวัติการตรวจสอบคุณภาพล่าสุด</span>
              </h2>
              <div className="flex items-center gap-1 text-xs">
                {['ALL', 'PASSED', 'FAILED'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterResult(tab)}
                    className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                      filterResult === tab
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab === 'ALL' ? 'ทั้งหมด' : tab === 'PASSED' ? 'ผ่าน' : 'ไม่ผ่าน'}
                  </button>
                ))}
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2 mx-auto"></div>
                กำลังโหลดประวัติการตรวจสอบ...
              </div>
            ) : filteredQcList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                ยังไม่มีประวัติการตรวจสอบคุณภาพ
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-3.5 py-3">สินค้า</th>
                      <th scope="col" className="px-3.5 py-3">ผู้ตรวจสอบ</th>
                      <th scope="col" className="px-3.5 py-3">ผลการตรวจ</th>
                      <th scope="col" className="px-3.5 py-3">หมายเหตุ</th>
                      <th scope="col" className="px-3.5 py-3">วันที่</th>
                      <th scope="col" className="px-3.5 py-3">Blockchain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQcList.map((item) => {
                      const badge = getQcBadge(item.result);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-3.5 py-3">
                            <div className="font-mono font-bold text-blue-600">
                              {item.product?.productCode || 'สินค้า'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.product?.name}
                            </div>
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-semibold text-slate-900">{item.inspectorName || '-'}</div>
                            <div className="text-[10px] text-slate-400">{item.organization?.name}</div>
                          </td>
                          <td className="px-3.5 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                              {badge.text}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-slate-600 max-w-xs truncate" title={item.notes || ''}>
                            {item.notes || '-'}
                          </td>
                          <td className="px-3.5 py-3 text-slate-400 font-mono text-[10px]">
                            {new Date(item.createdAt).toLocaleDateString('th-TH')}
                          </td>
                          <td className="px-3.5 py-3 font-mono text-[10px]">
                            {item.blockchainTxHash ? (
                              <span className="text-blue-600" title={item.blockchainTxHash}>
                                {item.blockchainTxHash.slice(0, 8)}...{item.blockchainTxHash.slice(-6)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function QualityPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">กำลังโหลด...</div>}>
      <QualityPageContent />
    </Suspense>
  );
}
