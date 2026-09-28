'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { api, ProductItem, QualityCheckItem } from '../../lib/api';
import { executeUserSignedAction } from '../../lib/blockchain/wallet';
import { getBlockchainErrorMessage, isBlockchainRejection } from '../../lib/blockchain/errors';
import { getQcBadge, THAI_PRODUCT_STATUS } from '../../lib/thai-locale';
import {
  CheckIcon,
  XIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  AlertTriangleIcon,
  SearchIcon,
} from '../../components/Icons';

function QualityPageContent() {
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get('productId') || '';

  // Form states
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(preselectedProductId);
  const [resultVerdict, setResultVerdict] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [notes, setNotes] = useState<string>('');

  // Execution states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blockchainCancelled, setBlockchainCancelled] = useState(false);
  const [successData, setSuccessData] = useState<{
    message: string;
    txHash: string;
    productCode: string;
    newStatus: string;
  } | null>(null);

  // History list states
  const [qcList, setQcList] = useState<QualityCheckItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterResult, setFilterResult] = useState<string>('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const needsBlockchainRegistration = Boolean(selectedProduct && !selectedProduct.blockchainProductId);
  const wrongStatus = Boolean(selectedProduct && selectedProduct.blockchainProductId && selectedProduct.status !== 'REGISTERED');
  const passedCount = qcList.filter((item) => item.result === 'PASSED').length;
  const failedCount = qcList.filter((item) => item.result === 'FAILED').length;

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        const [prodRes, qcRes] = await Promise.allSettled([
          api.products.list({ limit: 50 }),
          api.qualityChecks.list({ limit: 30 }),
        ]);

        if (!ignore) {
          if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data || []);
          if (qcRes.status === 'fulfilled') setQcList(qcRes.value.data || []);
          if (prodRes.status === 'rejected' || qcRes.status === 'rejected') setLoadError('โหลดข้อมูลบางส่วนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        }
      } catch {
        if (!ignore) {
          setLoadError('ไม่สามารถโหลดข้อมูลการตรวจสอบได้ กรุณาลองใหม่อีกครั้ง');
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
  }, []);

  const handleSubmitQC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMessage('กรุณาเลือกสินค้าที่ต้องการตรวจสอบ');
      return;
    }
    if (needsBlockchainRegistration || wrongStatus || !selectedProduct) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setBlockchainCancelled(false);
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
      setProducts((current) => current.map((product) => product.id === selectedProductId
        ? { ...product, status: res.product?.status || (resultVerdict === 'PASSED' ? 'QUALITY_CHECKED' : 'RECALLED') }
        : product));

      setNotes('');

      try {
        const qcRes = await api.qualityChecks.list({ limit: 30 });
        setQcList(qcRes.data || []);
      } catch {
        setLoadError('บันทึกผลสำเร็จแล้ว แต่โหลดประวัติใหม่ไม่สำเร็จ กรุณารีเฟรชหน้า');
      }
    } catch (err: unknown) {
      setBlockchainCancelled(isBlockchainRejection(err));
      setErrorMessage(getBlockchainErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQcList = qcList.filter((item) => {
    if (filterResult !== 'ALL' && item.result !== filterResult) return false;
    const query = historySearch.trim().toLocaleLowerCase();
    if (!query) return true;
    return [item.product?.productCode, item.product?.name, item.inspectorName, item.organization?.name]
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Header */}
        <div className="pb-2">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"><ShieldCheckIcon className="h-4 w-4" /> Quality Control</div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            ตรวจสอบคุณภาพสินค้า
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl">
            เลือกสินค้าที่ลงทะเบียนแล้ว บันทึกผลการตรวจ และยืนยันธุรกรรมด้วยกระเป๋าเงินของคุณ
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4" aria-label="สรุปประวัติการตรวจล่าสุด">
          {[
            { label: 'รายการล่าสุด', value: qcList.length, color: 'text-slate-900' },
            { label: 'ผ่าน', value: passedCount, color: 'text-emerald-700' },
            { label: 'ไม่ผ่าน', value: failedCount, color: 'text-red-700' },
          ].map((summary) => (
            <div key={summary.label} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
              <p className="text-xs sm:text-sm text-slate-500">{summary.label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${summary.color}`}>{loadingHistory ? '–' : summary.value}</p>
            </div>
          ))}
        </div>

        {loadError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{loadError} <button type="button" onClick={() => window.location.reload()} className="font-semibold underline underline-offset-2">ลองใหม่</button></div>}

        {/* Success Alert */}
        {successData && (
          <div role="status" className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-start justify-between shadow-2xs">
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
          <div role={blockchainCancelled ? 'status' : 'alert'} className={`p-4 rounded-xl border text-sm flex items-start justify-between shadow-2xs ${blockchainCancelled ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <div className="flex items-start gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">{blockchainCancelled ? 'ยกเลิกการทำรายการ' : 'เกิดข้อผิดพลาด'}</div>
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

        <div className="space-y-6">
          {/* Left Form */}
          <section aria-labelledby="new-check-title" className="border border-slate-200 bg-white rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
            <h2 id="new-check-title" className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>บันทึกผลการตรวจใหม่</span>
            </h2>
            <p className="text-sm text-slate-600">ผู้ตรวจสอบจะเป็นบัญชีที่ลงชื่อเข้าใช้และยืนยันธุรกรรม</p>

            <form onSubmit={handleSubmitQC} className="space-y-6 text-sm">
              <div>
                <label htmlFor="qc-product" className="block text-sm font-semibold text-slate-700 mb-2">
                  1. เลือกสินค้า <span className="text-red-500">*</span>
                </label>
                <select
                  id="qc-product"
                  value={selectedProductId}
                  onChange={(e) => { setSelectedProductId(e.target.value); setErrorMessage(null); }}
                  required
                  disabled={loadingHistory}
                  className="w-full min-h-11 rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer disabled:bg-slate-100"
                >
                  <option value="">{loadingHistory ? 'กำลังโหลดสินค้า...' : 'เลือกสินค้าที่ต้องการตรวจ'}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productCode} — {p.name} [{THAI_PRODUCT_STATUS[p.status] || p.status}]
                    </option>
                  ))}
                </select>
                {selectedProduct && <p className="mt-2 text-sm text-slate-600">สถานะปัจจุบัน: <strong className="text-slate-900">{THAI_PRODUCT_STATUS[selectedProduct.status] || selectedProduct.status}</strong></p>}
                {!loadingHistory && products.length === 0 && !loadError && <p className="mt-2 text-sm text-slate-600">ยังไม่มีสินค้าในรายการ <Link href="/products" className="font-semibold text-blue-700 underline underline-offset-2">ดูสินค้าทั้งหมด</Link></p>}
                {needsBlockchainRegistration && (
                  <div role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <p className="font-semibold">สินค้านี้ยังไม่ได้บันทึกบน Blockchain</p>
                    <p className="mt-1 leading-relaxed">กรุณาบันทึกสินค้าบน Sepolia ก่อน แล้วกลับมาตรวจคุณภาพ</p>
                    <Link href={`/products/${selectedProductId}`} className="mt-2 inline-flex font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900">
                      ไปหน้าสินค้า
                    </Link>
                  </div>
                )}
                {wrongStatus && <div role="status" className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">บันทึกผลตรวจได้เฉพาะสินค้าที่มีสถานะ “ลงทะเบียนแล้ว” กรุณาเลือกสินค้าอื่น</div>}
              </div>

              <fieldset>
                <legend className="block text-sm font-semibold text-slate-700 mb-2">2. ผลการตรวจ <span className="text-red-500">*</span></legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    { value: 'PASSED', title: 'ผ่านการตรวจ', detail: 'สินค้าพร้อมเข้าสู่ขั้นตอนถัดไป' },
                    { value: 'FAILED', title: 'ไม่ผ่านการตรวจ', detail: 'ระบบจะเปลี่ยนสถานะเป็นเรียกคืน' },
                  ] as const).map((option) => (
                    <label key={option.value} className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition focus-within:ring-2 focus-within:ring-blue-300 ${resultVerdict === option.value ? option.value === 'PASSED' ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="qc-result" value={option.value} checked={resultVerdict === option.value} onChange={() => setResultVerdict(option.value)} className="mt-1 h-4 w-4 accent-blue-600" />
                      <span><span className="block text-sm font-semibold">{option.title}</span><span className="mt-1 block text-xs text-slate-600">{option.detail}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="qc-notes" className="block text-sm font-semibold text-slate-700 mb-2">
                  3. หมายเหตุผลการตรวจ <span className="font-normal text-slate-500">(ไม่บังคับ)</span>
                </label>
                <textarea
                  id="qc-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น รายละเอียดการทดสอบหรือเหตุผลที่ไม่ผ่าน"
                  className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-xs text-slate-500">หมายเหตุจะถูกบันทึกพร้อมผลการตรวจ</p>
              </div>

              <p className="border-t border-slate-100 pt-5 text-xs text-slate-600">ตรวจสอบสินค้าและผลอีกครั้งก่อนกดบันทึก จากนั้นยืนยันธุรกรรมในกระเป๋าเงินของคุณ</p>
              <button
                type="submit"
                disabled={submitting || !selectedProduct || needsBlockchainRegistration || wrongStatus}
                className="w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-xs transition cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
          </section>

          <section aria-labelledby="history-title" className="border border-slate-200 bg-white rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
            <div className="space-y-3 pb-4 border-b border-slate-100">
              <h2 id="history-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-blue-600 shrink-0" />
                <span>ประวัติการตรวจล่าสุด</span>
              </h2>
              <p className="text-sm text-slate-500">แสดงรายการตรวจล่าสุดสูงสุด 30 รายการ</p>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit" aria-label="กรองผลการตรวจ">
                {['ALL', 'PASSED', 'FAILED'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterResult(tab)}
                    aria-pressed={filterResult === tab}
                    className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition ${
                      filterResult === tab
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'ALL' ? 'ทั้งหมด' : tab === 'PASSED' ? 'ผ่าน' : 'ไม่ผ่าน'}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:max-w-64">
                <label htmlFor="qc-history-search" className="sr-only">ค้นหาประวัติการตรวจ</label>
                <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <input id="qc-history-search" type="search" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="ค้นหาสินค้าหรือผู้ตรวจ" className="min-h-10 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </div>
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2 mx-auto"></div>
                กำลังโหลดประวัติการตรวจสอบ...
              </div>
            ) : filteredQcList.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                {qcList.length === 0 ? 'ยังไม่มีประวัติการตรวจ' : 'ไม่พบรายการที่ตรงกับตัวกรอง'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                    {filteredQcList.map((item, index) => {
                      const badge = getQcBadge(item.result);
                      return (
                        <article key={item.id || `${item.productId}-${item.createdAt}-${index}`} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {item.product?.id ? <Link href={`/products/${item.product.id}`} className="font-mono text-sm font-bold text-blue-700 hover:underline">{item.product.productCode}</Link> : <span className="font-mono text-sm font-bold">{item.product?.productCode || 'สินค้า'}</span>}
                              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.bg}`}>{badge.text}</span>
                            </div>
                            <p className="mt-0.5 text-sm text-slate-700">{item.product?.name || 'ไม่ระบุชื่อสินค้า'}</p>
                            <p className="mt-2 text-xs text-slate-500">ผู้ตรวจ: {item.inspectorName || 'ไม่ระบุ'}{item.organization?.name ? ` · ${item.organization.name}` : ''}</p>
                            {item.notes && <p className="mt-2 break-words text-sm leading-6 text-slate-700">{item.notes}</p>}
                          </div>
                          <div className="text-xs text-slate-500 sm:text-right">
                            <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                            {item.blockchainTxHash && <p className="mt-1 font-mono text-blue-700" title={item.blockchainTxHash}>Tx: {item.blockchainTxHash.slice(0, 8)}...{item.blockchainTxHash.slice(-6)}</p>}
                          </div>
                        </article>
                      );
                    })}
              </div>
            )}
          </section>
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
